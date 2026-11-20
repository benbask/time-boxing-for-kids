/**
 * Shared day timeline rendering.
 *
 * One canvas for the whole family: event blocks are positioned by percentage of
 * the day, so the layout stays correct at every viewport height without
 * recalculating pixels. Phase 1 renders a single lane per event (lanes and
 * conflict markers arrive in Phase 3).
 */

import { buildDayLayout } from './layout-engine.js';
import { weekHeadline, weekSummary } from './periods.js';
import {
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

const HOUR_LABEL_COUNT = 24;

function hourLabels() {
  return Array.from({ length: HOUR_LABEL_COUNT }, (_, hour) => (
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
  const tall = block.durationMinutes >= 120;
  const narrow = block.laneCount >= 3;
  const tiny = block.laneCount >= 4;
  const hasConflict = block.conflicts.length > 0;
  const classes = [
    'event-block',
    compact ? 'is-compact' : '',
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

function dayNotices(data, layout) {
  const messages = [];
  const visibleProfiles = data.profiles.filter((profile) => profile.visible);

  if (data.profiles.length > 0 && visibleProfiles.length === 0) {
    messages.push({
      icon: '👀',
      html: '<strong>Semua profil sedang disembunyikan.</strong> Kegiatan tetap tersimpan. Tampilkan profil dengan mengetuk namanya di atas.',
    });
  } else if (layout.totalCount === 0) {
    messages.push({
      icon: '✏️',
      html: '<strong>Belum ada kegiatan pada tanggal ini.</strong> Ketuk area kosong di timeline untuk membuat kegiatan 30 menit.',
    });
  } else if (layout.hiddenCount > 0) {
    messages.push({
      icon: '🙈',
      html: `<strong>${layout.hiddenCount} kegiatan disembunyikan</strong> karena profil pesertanya tidak ditampilkan.`,
    });
  }

  return messages.map((message) => (
    `<p class="notice"><span class="notice-icon" aria-hidden="true">${message.icon}</span><span>${message.html}</span></p>`
  )).join('');
}

function conflictNotice(layout) {
  if (layout.conflictCount === 0) return '';

  const people = [...new Set(layout.conflictPairs.flatMap((pair) => pair.profileNames))];
  const details = layout.conflictPairs.map((pair) => `
    <li>
      ${escapeHtml(pair.aTitle)} (${escapeHtml(pair.aTime)}) &amp;
      ${escapeHtml(pair.bTitle)} (${escapeHtml(pair.bTime)})${pair.profileNames.length ? ` — ${escapeHtml(pair.profileNames.join(', '))}` : ''}
    </li>`).join('');

  return `
    <div class="notice notice-warning notice-collapsible" data-conflict-notice>
      <button type="button" class="notice-summary" data-action="toggle-conflict-notice" aria-expanded="false">
        <span class="notice-icon" aria-hidden="true">⚠️</span>
        <span class="notice-text"><strong>${layout.conflictCount} jadwal bentrok</strong>${people.length ? ` · ${escapeHtml(people.join(', '))}` : ''}</span>
        <span class="notice-chevron" aria-hidden="true">›</span>
      </button>
      <div class="notice-detail" hidden>
        <p>Blok bergaris putus-putus perlu dicek. Data tidak dihapus dan tidak diblokir.</p>
        <ul>${details}</ul>
      </div>
    </div>`;
}

function dayViewMarkup(data, layout) {
  const dateKey = data.settings.selectedDate;
  const relative = relativeDayLabel(dateKey);

  return `
    ${dayNotices(data, layout)}
    ${conflictNotice(layout)}
    <div class="timeline-card">
      <div class="timeline-scroll" id="timelineScroll" role="region" aria-label="Garis waktu ${escapeHtml(relative || dateKey)}" tabindex="0">
        <div class="timeline">
          <div class="time-gutter" aria-hidden="true">${hourLabels()}</div>
          <div class="time-canvas">
            ${hourRows()}
            <div class="event-layer">
              ${layout.blocks.map(renderBlock).join('')}
              ${nowLineMarkup(dateKey)}
            </div>
          </div>
          <div class="scroll-zone" aria-hidden="true"></div>
        </div>
      </div>
      <div class="timeline-legend">
        <div class="legend-items">
          <span class="legend-item"><span class="dot" style="--dot-color:var(--now)"></span> Waktu sekarang</span>
          <span class="legend-item"><span class="shared-marks" aria-hidden="true">👥</span> <span class="legend-long">Kegiatan bersama tampil satu kali</span><span class="legend-short">Kegiatan bersama</span></span>
          ${layout.conflictCount > 0 ? '<span class="legend-item legend-conflict"><span aria-hidden="true">⚠</span> <span class="legend-long">Peserta bentrok</span><span class="legend-short">Bentrok</span></span>' : ''}
          <span class="legend-item legend-hint">Ketuk area kosong untuk menambah · tahan blok untuk memindah</span>
        </div>
        <span>${layout.visibleCount} kegiatan</span>
      </div>
    </div>`;
}

function weekHourLabels() {
  return Array.from({ length: 24 }, (_, hour) => (
    `<span class="week-hour" style="top:calc(var(--week-head-height) + var(--week-hour-height) * ${hour})">${pad2(hour)}:00</span>`
  )).join('');
}

function weekEvent(block) {
  const classes = [
    'week-event',
    block.isConflict ? 'is-conflict' : '',
    block.isNeutral ? 'is-neutral' : '',
    block.heightPercent < 2.2 ? 'is-thin' : '',
  ].filter(Boolean).join(' ');
  const style = [
    `top:calc(${block.topPercent.toFixed(4)}% + 1px)`,
    `height:calc(${block.heightPercent.toFixed(4)}% - 2px)`,
    `--we-stripe:${block.stripe}`,
    block.color ? `--we-bg:${hexToRgba(block.color, 0.18)}` : '',
  ].filter(Boolean).join(';');

  return `
    <button type="button" class="${classes}" style="${style}"
      data-action="edit-week-event" data-event-id="${escapeHtml(block.id)}"
      title="${escapeHtml(`${block.title} · ${block.timeLabel}`)}"
      aria-label="Ubah kegiatan ${escapeHtml(block.title)}, ${escapeHtml(block.timeLabel)}">
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

function weekViewMarkup(data) {
  const dateKey = data.settings.selectedDate;
  const summary = weekSummary(data, dateKey);
  const headline = weekHeadline(dateKey);

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
          </div>
        </div>
      </div>
      <p class="period-hint">Ketuk judul hari untuk membuka tampilan hari · ketuk blok untuk mengubah kegiatan.</p>
    </div>`;
}

function placeholderMarkup() {
  return `
    <div class="placeholder-card">
      <span class="placeholder-icon" aria-hidden="true">🗓️</span>
      <span class="phase-tag">Fase 4</span>
      <h3>Tampilan bulan</h3>
      <p>Kalender bulanan, jumlah kegiatan, dan hari khusus akan hadir pada Fase 4. Sementara ini, gunakan tombol ‹ dan › untuk berpindah hari.</p>
      <button type="button" class="btn btn-primary" data-action="set-view" data-view="day">Kembali ke tampilan hari</button>
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

function restoreScroll(stage, dateKey) {
  const container = stage.querySelector('#timelineScroll');
  if (!container) return;
  const row = container.querySelector('.hour-row');
  const hourHeight = row ? row.getBoundingClientRect().height : 60;

  if (previousDateKey === dateKey && previousScrollTop !== null) {
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

export function renderCalendar(stage, data) {
  const previousContainer = stage.querySelector('#timelineScroll');
  if (previousContainer) previousScrollTop = previousContainer.scrollTop;

  const view = data.settings.currentView;
  const dateKey = data.settings.selectedDate;

  if (view === 'week') {
    stage.innerHTML = weekViewMarkup(data);
    previousDateKey = null;
    previousScrollTop = null;
    return;
  }

  if (view === 'month') {
    stage.innerHTML = placeholderMarkup();
    previousDateKey = null;
    previousScrollTop = null;
    return;
  }

  const layout = buildDayLayout(data, dateKey);
  stage.innerHTML = dayViewMarkup(data, layout);
  restoreScroll(stage, dateKey);
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
