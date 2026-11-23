/**
 * Shared day timeline rendering.
 *
 * One canvas for the whole family: event blocks are positioned by percentage of
 * the day, so the layout stays correct at every viewport height without
 * recalculating pixels. Phase 1 renders a single lane per event (lanes and
 * conflict markers arrive in Phase 3).
 */

import { buildDayLayout } from './layout-engine.js';
import {
  monthHeadline,
  monthSummary,
  shiftWeekKey,
  SPECIAL_TYPES,
  weekHeadline,
  weekSummary,
  WEEKDAY_SHORT,
} from './periods.js';
import {
  calculatePrayerTimes,
  PRAYER_LABELS,
  PRAYER_ORDER,
  prayerTimeLabel,
} from './prayer-times.js';
import {
  addDays,
  escapeHtml,
  formatDurationLabel,
  formatLongDate,
  hexToRgba,
  nowMinutes,
  pad2,
  relativeDayLabel,
  todayKey,
} from './utils.js';

let previousDateKey = null;
let previousScrollTop = null;
let nextScrollTop = null;

/** The next calendar render opens at this scroll position (used by swipe). */
export function preserveScrollForNextRender(top) {
  const value = Number(top);
  nextScrollTop = Number.isFinite(value) && value >= 0 ? value : null;
}

const HOUR_LABEL_COUNT = 24;

function hourLabels() {
  return Array.from({ length: HOUR_LABEL_COUNT + 1 }, (_, hour) => (
    `<span class="hour-label" style="top:calc(var(--hour-height) * ${hour})">${pad2(hour)}:00</span>`
  )).join('');
}

function hourRows() {
  return Array.from({ length: HOUR_LABEL_COUNT }, () => '<div class="hour-row"></div>').join('');
}

function renderParticipants(participants) {
  const shown = participants.slice(0, 4);
  const people = shown.map((profile) => (
    `<span class="person" style="--person-color:${escapeHtml(profile.color)}" title="${escapeHtml(profile.name)}" aria-label="${escapeHtml(profile.name)}">${escapeHtml(profile.emoji)}</span>`
  )).join('');
  const extra = participants.length > shown.length
    ? `<span class="person-more" aria-label="${participants.length - shown.length} peserta lain">+${participants.length - shown.length}</span>`
    : '';
  return `<div class="event-people">${people}${extra}</div>`;
}

function renderBlock(block) {
  const compact = block.durationMinutes < 60;
  const short = block.durationMinutes >= 60 && block.durationMinutes < 90;
  const tall = block.durationMinutes >= 120;
  const narrow = block.laneCount >= 3;
  const tiny = block.laneCount >= 4;
  const hasConflict = block.conflicts.length > 0;
  const classes = [
    'event-block',
    compact ? 'is-compact' : '',
    short ? 'is-short' : '',
    tall ? 'is-tall' : '',
    narrow ? 'is-narrow' : '',
    tiny ? 'is-tiny' : '',
    block.isNeutral ? 'is-neutral' : '',
    hasConflict ? 'is-conflict' : '',
  ].filter(Boolean).join(' ');

  const style = [
    `top:calc(${block.topPercent.toFixed(4)}% + 1px)`,
    `height:calc(${block.heightPercent.toFixed(4)}% - 2px)`,
    `--ev-left:${block.leftPercent.toFixed(4)}%`,
    `--ev-width:${block.widthPercent.toFixed(4)}%`,
    `--ev-stripe:${block.stripe}`,
    block.tint ? `--ev-bg:${block.tint}` : '',
    block.border ? `--ev-border:${block.border}` : '',
  ].filter(Boolean).join(';');

  const note = block.note
    ? `<span class="event-note-icon" title="${escapeHtml(block.note)}" aria-hidden="true">📝</span>`
    : '';

  const conflictText = block.conflicts
    .map((entry) => `${entry.title} (${entry.timeLabel})`)
    .join(', ');
  const conflictLabel = hasConflict
    ? `Bentrok dengan ${conflictText}${block.conflictProfiles.length ? ` untuk ${block.conflictProfiles.join(', ')}` : ''}.`
    : '';

  const label = [
    block.title,
    block.timeLabel,
    formatDurationLabel(block.durationMinutes),
    block.participants.length
      ? block.participants.map((profile) => profile.name).join(', ')
      : 'Tanpa peserta',
    block.note ? `Catatan: ${block.note}` : '',
    conflictLabel,
  ].filter(Boolean).join('. ');

  const duration = formatDurationLabel(block.durationMinutes);

  return `
    <article class="${classes}" data-event-id="${escapeHtml(block.id)}" data-lanes="${block.laneCount}" style="${style}" aria-label="${escapeHtml(label)}"${hasConflict ? ` title="${escapeHtml(conflictLabel)}"` : ''}>
      <span class="event-resize event-resize-start" data-resize="start" aria-hidden="true"></span>
      <span class="event-resize event-resize-end" data-resize="end" aria-hidden="true"></span>
      <button type="button" class="event-edit" data-edit-event="${escapeHtml(block.id)}"
        aria-label="Ubah kegiatan ${escapeHtml(block.title)}" title="Ubah kegiatan">✏️</button>
      ${note}
      <div class="event-time"><span class="event-time-text">${escapeHtml(block.timeLabel)}</span><span class="event-duration event-duration-inline" aria-hidden="true">${duration}</span></div>
      <div class="event-title">${escapeHtml(block.title)}</div>
      <span class="event-duration event-duration-chip" aria-hidden="true">${duration}</span>
      ${hasConflict ? `<span class="event-conflict-mark" aria-hidden="true" title="${escapeHtml(conflictLabel)}">⚠</span>` : ''}
      ${renderParticipants(block.participants)}
    </article>`;
}

function nowLineMarkup(dateKey) {
  if (dateKey !== todayKey()) return '';
  const minutes = nowMinutes();
  return `
    <div class="now-line" style="top:${((minutes / 1440) * 100).toFixed(4)}%">
      <span class="now-label">${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}</span>
    </div>`;
}

// Notices dismissed during this page session. Keyed by date + notice type so
// the hint comes back on another day, but not right after being closed.
const dismissedNoticeKeys = new Set();

export function dismissNotice(key) {
  if (key) dismissedNoticeKeys.add(key);
}

function noticeKey(data, kind) {
  return `${data.settings.selectedDate}:${kind}`;
}

function noticeMarkup(data, kind, icon, html) {
  const key = noticeKey(data, kind);
  if (dismissedNoticeKeys.has(key)) return '';
  return `
    <p class="notice" data-notice-key="${escapeHtml(key)}">
      <span class="notice-icon" aria-hidden="true">${icon}</span>
      <span class="notice-body">${html}</span>
      <button type="button" class="notice-close" data-action="dismiss-notice"
        data-notice-key="${escapeHtml(key)}" aria-label="Tutup pemberitahuan">✕</button>
    </p>`;
}

function dayNotices(data, layout) {
  const messages = [];
  const visibleProfiles = data.profiles.filter((profile) => profile.visible);

  if (data.profiles.length > 0 && visibleProfiles.length === 0) {
    messages.push(['profiles-hidden', '👀', '<strong>Semua profil sedang disembunyikan.</strong> Kegiatan tetap tersimpan. Tampilkan profil dengan mengetuk namanya di atas.']);
  } else if (layout.totalCount === 0) {
    messages.push(['empty', '✏️', '<strong>Belum ada kegiatan pada tanggal ini.</strong> Ketuk area kosong di timeline untuk membuat kegiatan 30 menit.']);
  } else if (layout.hiddenCount > 0) {
    messages.push(['hidden-events', '🙈', `<strong>${layout.hiddenCount} kegiatan disembunyikan</strong> karena profil pesertanya tidak ditampilkan.`]);
  }

  return messages.map(([kind, icon, html]) => noticeMarkup(data, kind, icon, html)).join('');
}

function conflictNotice(data, layout) {
  if (layout.conflictCount === 0) return '';
  const key = noticeKey(data, 'conflicts');
  if (dismissedNoticeKeys.has(key)) return '';

  const people = [...new Set(layout.conflictPairs.flatMap((pair) => pair.profileNames))];
  const details = layout.conflictPairs.map((pair) => `
    <li>
      ${escapeHtml(pair.aTitle)} (${escapeHtml(pair.aTime)}) &amp;
      ${escapeHtml(pair.bTitle)} (${escapeHtml(pair.bTime)})${pair.profileNames.length ? ` — ${escapeHtml(pair.profileNames.join(', '))}` : ''}
    </li>`).join('');

  return `
    <div class="notice notice-warning notice-collapsible" data-conflict-notice data-notice-key="${escapeHtml(key)}">
      <button type="button" class="notice-summary" data-action="toggle-conflict-notice" aria-expanded="false">
        <span class="notice-icon" aria-hidden="true">⚠️</span>
        <span class="notice-text"><strong>${layout.conflictCount} jadwal bentrok</strong>${people.length ? ` · ${escapeHtml(people.join(', '))}` : ''}</span>
        <span class="notice-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" class="notice-close" data-action="dismiss-notice"
        data-notice-key="${escapeHtml(key)}" aria-label="Tutup pemberitahuan">✕</button>
      <div class="notice-detail" hidden>
        <p>Blok bergaris putus-putus perlu dicek. Data tidak dihapus dan tidak diblokir.</p>
        <ul>${details}</ul>
      </div>
    </div>`;
}

function prayerMarkersMarkup(data, dateKey) {
  if (data.settings.prayerSettings?.showMarkers === false) return '';
  const times = calculatePrayerTimes(
    dateKey,
    data.settings.location,
    data.settings.prayerSettings,
  );
  if (!times) return '';

  return `
    <div class="prayer-layer" aria-hidden="true">
      ${PRAYER_ORDER.map((key) => {
    const minutes = times[key];
    const top = ((minutes / 1440) * 100).toFixed(4);
    return `<div class="prayer-line" style="top:${top}%">
          <span class="prayer-label">${PRAYER_LABELS[key]}<span class="prayer-time">${prayerTimeLabel(minutes)}</span></span>
        </div>`;
  }).join('')}
    </div>`;
}

function dayViewMarkup(data, layout) {
  const dateKey = data.settings.selectedDate;
  const relative = relativeDayLabel(dateKey);
  const prayerMarkers = prayerMarkersMarkup(data, dateKey);

  return `
    <div class="timeline-area">
      <div class="notice-layer">${dayNotices(data, layout)}${conflictNotice(data, layout)}</div>
      <div class="timeline-card">
        <div class="timeline-scroll" id="timelineScroll" role="region" aria-label="Garis waktu ${escapeHtml(relative || dateKey)}" tabindex="0">
          <div class="timeline">
            <div class="time-gutter" aria-hidden="true">${hourLabels()}</div>
            <div class="time-canvas">
              ${hourRows()}
            </div>
            <div class="event-layer">
              ${layout.blocks.map(renderBlock).join('')}
              ${nowLineMarkup(dateKey)}
            </div>
            ${prayerMarkers}
            <div class="scroll-zone" aria-hidden="true"></div>
          </div>
        </div>
        <div class="timeline-legend">
          <div class="legend-items">
            <span class="legend-item"><span class="dot" style="--dot-color:var(--now)"></span> Waktu sekarang</span>
            ${prayerMarkers ? '<span class="legend-item"><span class="prayer-legend-mark" aria-hidden="true"></span> Waktu shalat</span>' : ''}
            <span class="legend-item"><span class="shared-marks" aria-hidden="true">👥</span> <span class="legend-long">Kegiatan bersama tampil satu kali</span><span class="legend-short">Kegiatan bersama</span></span>
            ${layout.conflictCount > 0 ? '<span class="legend-item legend-conflict"><span aria-hidden="true">⚠</span> <span class="legend-long">Peserta bentrok</span><span class="legend-short">Bentrok</span></span>' : ''}
            <span class="legend-item legend-hint">Ketuk area kosong untuk menambah · geser untuk pindah hari · tahan blok untuk memindah · cubit untuk zoom</span>
          </div>
          <button type="button" class="zoom-reset" data-action="reset-zoom" hidden>Zoom 100%</button>
          <span>${layout.visibleCount} kegiatan</span>
        </div>
      </div>
    </div>`;
}

function weekHourLabels() {
  return Array.from({ length: 25 }, (_, hour) => (
    `<span class="week-hour" style="top:calc(var(--week-head-height) + var(--week-hour-height) * ${hour})">${pad2(hour)}:00</span>`
  )).join('');
}

function weekEvent(block) {
  const laned = block.laneCount > 1;
  const classes = [
    'week-event',
    laned ? 'is-laned' : '',
    block.isConflict ? 'is-conflict' : '',
    block.isNeutral ? 'is-neutral' : '',
    block.heightPercent < 2.2 ? 'is-thin' : '',
  ].filter(Boolean).join(' ');
  const style = [
    `top:calc(${block.topPercent.toFixed(4)}% + 1px)`,
    `height:calc(${block.heightPercent.toFixed(4)}% - 2px)`,
    `--we-left:${block.leftPercent.toFixed(4)}%`,
    `--we-width:${block.widthPercent.toFixed(4)}%`,
    `--we-stripe:${block.stripe}`,
    block.color ? `--we-bg:${hexToRgba(block.color, 0.18)}` : '',
  ].filter(Boolean).join(';');

  return `
    <button type="button" class="${classes}" style="${style}"
      data-action="edit-week-event" data-event-id="${escapeHtml(block.id)}"
      title="${escapeHtml(`${block.title} · ${block.timeLabel}`)}"
      aria-label="Ubah kegiatan ${escapeHtml(block.title)}, ${escapeHtml(block.timeLabel)}">
      <span class="week-event-time">${escapeHtml(block.timeLabel)}</span>
      <span class="week-event-title">${escapeHtml(block.title)}</span>
    </button>`;
}

function weekColumn(day, dateKey) {
  const classes = [
    'week-col',
    day.isToday ? 'is-today' : '',
    day.isSelected ? 'is-selected' : '',
    day.isWeekend ? 'is-weekend' : '',
  ].filter(Boolean).join(' ');

  const now = day.isToday
    ? `<div class="week-now" style="top:${((nowMinutes() / 1440) * 100).toFixed(4)}%"><span></span></div>`
    : '';

  return `
    <div class="${classes}">
      <button type="button" class="week-col-head" data-action="open-day" data-date="${day.dateKey}"
        aria-label="Buka ${day.weekdayLong}, ${formatLongDate(day.dateKey)}">
        <span class="week-wd">${day.weekdayShort}</span>
        <span class="week-num">${day.dayNumber}</span>
        ${day.specialDays.length ? `<span class="week-special" aria-hidden="true">${day.specialDays[0].type === 'birthday' ? '🎂' : day.specialDays[0].type === 'holiday' ? '🎉' : '⭐'}</span>` : ''}
        ${day.conflictCount ? `<span class="week-conflict" aria-hidden="true">⚠</span>` : ''}
      </button>
      <div class="week-col-track" style="height:calc(var(--week-hour-height) * 24)">
        ${day.blocks.map(weekEvent).join('')}
        ${now}
      </div>
    </div>`;
}

function weekPrayerMarkersMarkup(data, dateKey) {
  if (data.settings.prayerSettings?.showMarkers === false) return '';
  const times = calculatePrayerTimes(
    dateKey,
    data.settings.location,
    data.settings.prayerSettings,
  );
  if (!times) return '';

  return `
    <div class="week-prayer-layer" aria-hidden="true">
      ${PRAYER_ORDER.map((key) => {
    const minutes = times[key];
    const top = ((minutes / 1440) * 100).toFixed(4);
    const title = `${PRAYER_LABELS[key]} · ${prayerTimeLabel(minutes)}`;
    return `<div class="prayer-line week-prayer-line" style="top:${top}%">
          <span class="prayer-label week-prayer-label" title="${title}">${PRAYER_LABELS[key]}</span>
        </div>`;
  }).join('')}
    </div>`;
}

function weekViewMarkup(data) {
  const dateKey = data.settings.selectedDate;
  const summary = weekSummary(data, dateKey);
  const headline = weekHeadline(dateKey);
  const prayerMarkers = weekPrayerMarkersMarkup(data, dateKey);

  return `
    <div class="period-card week-card">
      <div class="period-head">
        <div>
          <h3 class="period-title">${escapeHtml(headline.label)}</h3>
          <p class="period-sub">${summary.totalCount} kegiatan${summary.conflictCount ? ` · ${summary.conflictCount} bentrok` : ''}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="go-today">Minggu ini</button>
      </div>
      <div class="week-scroll">
        <div class="week-grid">
          <div class="week-gutter" aria-hidden="true">${weekHourLabels()}</div>
          <div class="week-cols">
            ${summary.days.map((day) => weekColumn(day, dateKey)).join('')}
            ${prayerMarkers}
          </div>
        </div>
      </div>
      <p class="period-hint">Geser ke kiri/kanan untuk pindah minggu · tahan blok lalu geser untuk pindah hari · cubit untuk zoom · ketuk blok untuk mengubah. <button type="button" class="zoom-reset" data-action="reset-zoom" hidden>Zoom 100%</button></p>
      ${prayerMarkers ? '<p class="period-hint week-prayer-hint">Garis putus-putus = waktu shalat untuk tanggal terpilih.</p>' : ''}
    </div>`;
}

function monthDay(day) {
  const classes = [
    'month-day',
    day.isCurrentMonth ? '' : 'is-outside',
    day.isToday ? 'is-today' : '',
    day.isSelected ? 'is-selected' : '',
    day.isWeekend ? 'is-weekend' : '',
  ].filter(Boolean).join(' ');

  const dots = day.colors.map((color) => (
    `<span class="month-dot" style="--dot-color:${escapeHtml(color)}" aria-hidden="true"></span>`
  )).join('');
  const special = day.specialDays.length
    ? `<span class="month-special" aria-hidden="true">${SPECIAL_TYPES[day.specialDays[0].type]?.icon || '⭐'}</span>`
    : '';
  const conflict = day.conflictCount
    ? '<span class="month-conflict" aria-hidden="true">⚠</span>'
    : '';
  const label = `${formatLongDate(day.dateKey)}. ${day.count} kegiatan${day.conflictCount ? `, ${day.conflictCount} bentrok` : ''}`;

  return `
    <button type="button" class="${classes}" data-action="open-day" data-date="${day.dateKey}"
      aria-label="${escapeHtml(label)}">
      <span class="month-num">${day.dayNumber}</span>
      ${special}${conflict}
      <span class="month-dots" aria-hidden="true">${dots}</span>
      ${day.count ? `<span class="month-count">${day.count}</span>` : ''}
    </button>`;
}

function monthViewMarkup(data) {
  const dateKey = data.settings.selectedDate;
  const summary = monthSummary(data, dateKey);
  const headline = monthHeadline(dateKey);

  return `
    <div class="period-card month-card">
      <div class="period-head">
        <div>
          <h3 class="period-title">${escapeHtml(headline.label)}</h3>
          <p class="period-sub">${summary.totalCount} kegiatan${summary.conflictCount ? ` · ${summary.conflictCount} bentrok` : ''}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="go-today">Hari ini</button>
      </div>
      <div class="month-grid" role="grid" aria-label="Kalender ${escapeHtml(headline.label)}">
        <div class="month-weekdays" role="row">
          ${WEEKDAY_SHORT.map((day) => `<span role="columnheader">${day}</span>`).join('')}
        </div>
        <div class="month-weeks" style="--month-weeks:${summary.weeks.length}">
          ${summary.weeks.map((week) => `
            <div class="month-week" role="row">${week.map(monthDay).join('')}</div>
          `).join('')}
        </div>
      </div>
      <p class="period-hint">Ketuk tanggal untuk membuka tampilan hari.</p>
    </div>`;
}

// Scroll assignments can be clamped to 0 when the flex layout has not been
// measured yet (resize, rotation, browser zoom). Re-apply them next frame.
function setScrollTop(container, top) {
  container.scrollTop = top;
  if (top > 0 && container.scrollTop < top - 1) {
    requestAnimationFrame(() => { container.scrollTop = top; });
  }
}

function restoreScroll(stage, dateKey, forcedTop = null) {
  const container = stage.querySelector('#timelineScroll');
  if (!container) return;
  const row = container.querySelector('.hour-row');
  const hourHeight = row ? row.getBoundingClientRect().height : 60;

  if (forcedTop !== null) {
    setScrollTop(container, forcedTop);
  } else if (previousDateKey === dateKey && previousScrollTop !== null) {
    setScrollTop(container, previousScrollTop);
  } else if (dateKey === todayKey()) {
    // Keep the current time ~1.75 hours below the top so the ongoing block is
    // fully visible with a little context above it.
    setScrollTop(container, Math.max(0, (nowMinutes() / 60 - 1.75) * hourHeight));
  } else {
    setScrollTop(container, 5.5 * hourHeight);
  }

  if (!container.dataset.scrollBound) {
    container.dataset.scrollBound = 'true';
    container.addEventListener('scroll', () => {
      previousScrollTop = container.scrollTop;
    }, { passive: true });
  }
}

/** Markup for the neighbouring day/week, used as a peek during a swipe. */
export function adjacentGridMarkup(data, direction) {
  const view = data.settings.currentView;
  if (view !== 'day' && view !== 'week') return '';

  const current = data.settings.selectedDate;
  const nextKey = view === 'week'
    ? shiftWeekKey(current, direction)
    : addDays(current, direction);
  const nextData = { ...data, settings: { ...data.settings, selectedDate: nextKey } };
  const holder = document.createElement('div');

  if (view === 'week') holder.innerHTML = weekViewMarkup(nextData);
  else holder.innerHTML = dayViewMarkup(nextData, buildDayLayout(nextData, nextKey));

  return holder.querySelector(view === 'week' ? '.week-grid' : '.timeline')?.outerHTML || '';
}

export function renderCalendar(stage, data) {
  const previousContainer = stage.querySelector('#timelineScroll');
  if (previousContainer) previousScrollTop = previousContainer.scrollTop;
  const forcedScrollTop = nextScrollTop;
  nextScrollTop = null;

  const view = data.settings.currentView;
  const dateKey = data.settings.selectedDate;

  if (view === 'week') {
    const previousWeekScroll = stage.querySelector('.week-scroll');
    const weekScrollTop = forcedScrollTop !== null
      ? forcedScrollTop
      : (previousWeekScroll ? previousWeekScroll.scrollTop : 0);
    stage.innerHTML = weekViewMarkup(data);
    const nextWeekScroll = stage.querySelector('.week-scroll');
    if (nextWeekScroll) setScrollTop(nextWeekScroll, weekScrollTop);
    previousDateKey = null;
    previousScrollTop = null;
    return;
  }

  if (view === 'month') {
    stage.innerHTML = monthViewMarkup(data);
    previousDateKey = null;
    previousScrollTop = null;
    return;
  }

  const layout = buildDayLayout(data, dateKey);
  stage.innerHTML = dayViewMarkup(data, layout);
  restoreScroll(stage, dateKey, forcedScrollTop);
  previousDateKey = dateKey;
}

/** Repaint only the current-time marker (called once a minute). */
export function refreshNowIndicator(data) {
  const canvas = document.querySelector('#calendarStage .time-canvas');
  if (!canvas) return;
  const existing = canvas.querySelector('.now-line');
  const markup = nowLineMarkup(data.settings.selectedDate);
  if (!markup) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.outerHTML = markup.trim();
    return;
  }
  canvas.querySelector('.event-layer')?.insertAdjacentHTML('beforeend', markup);
}
