/**
 * Calendar rendering — day, week and month (Phase 4).
 *
 * One canvas for the whole family: event blocks are positioned by percentage of
 * the visible time window, so the layout stays correct at every viewport height
 * and for every zoom level without recalculating pixels. Week and month views
 * reuse the same layout engine, which keeps hidden profiles, participant
 * colours, conflicts and special days consistent across all views.
 */

import { buildDayLayout } from './layout-engine.js';
import {
  monthSummary,
  periodHeadline,
  SPECIAL_TYPES,
  WEEKDAY_SHORT,
  weekSummary,
} from './periods.js';
import {
  resolveTimeWindow,
  zoomPercent,
} from './time-range.js';
import {
  escapeHtml,
  formatDurationLabel,
  formatLongDate,
  nowMinutes,
  pad2,
  parseDateKey,
  relativeDayLabel,
  todayKey,
} from './utils.js';

let previousScrollKey = null;
let previousScrollTop = null;

/* --------------------------------------------------------------- helpers --- */

function hourMarks(window) {
  const marks = [];
  const firstHour = Math.ceil(window.startMin / 60);
  for (let hour = firstHour; hour * 60 < window.endMin; hour += 1) {
    const offsetHours = (hour * 60 - window.startMin) / 60;
    marks.push(
      `<span class="hour-label" style="top:calc(var(--hour-height) * ${offsetHours})">${pad2(hour)}:00</span>`,
    );
  }
  return marks.join('');
}

function gridOffsetHours(window) {
  return (Math.ceil(window.startMin / 60) * 60 - window.startMin) / 60;
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
    block.isClippedStart ? 'is-clipped-start' : '',
    block.isClippedEnd ? 'is-clipped-end' : '',
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

  const clippedLabel = block.isClippedStart || block.isClippedEnd
    ? 'Sebagian kegiatan berada di luar rentang waktu yang ditampilkan.'
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
    clippedLabel,
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

function nowLineMarkup(dateKey, window) {
  if (dateKey !== todayKey()) return '';
  const minutes = nowMinutes();
  if (minutes < window.startMin || minutes > window.endMin) return '';
  const percent = ((minutes - window.startMin) / window.minutes) * 100;
  return `
    <div class="now-line" style="top:${percent.toFixed(4)}%">
      <span class="now-label">${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}</span>
    </div>`;
}

function specialDayIcons(specialDays) {
  return specialDays
    .map((entry) => {
      const type = SPECIAL_TYPES[entry.type] || SPECIAL_TYPES.special;
      return `<span class="special-icon" title="${escapeHtml(type.label)}: ${escapeHtml(entry.title)}" aria-label="${escapeHtml(type.label)}: ${escapeHtml(entry.title)}">${type.icon}</span>`;
    })
    .join('');
}

function specialDayNotice(data, dateKey) {
  const specialDays = (data.specialDays || []).filter((entry) => entry.date === dateKey);
  if (specialDays.length === 0) return '';

  const items = specialDays.map((entry) => {
    const type = SPECIAL_TYPES[entry.type] || SPECIAL_TYPES.special;
    return `<li>
      <span aria-hidden="true">${type.icon}</span>
      <strong>${escapeHtml(entry.title)}</strong>
      <span class="special-type">${escapeHtml(type.label)}</span>
      <button type="button" class="link-btn" data-action="edit-special-day" data-id="${escapeHtml(entry.id)}">Ubah</button>
    </li>`;
  }).join('');

  return `<ul class="notice notice-special special-list">${items}</ul>`;
}

function rangeNotice(layout, window) {
  if (!layout.outsideWindowCount) return '';
  return `
    <p class="notice notice-range">
      <span class="notice-icon" aria-hidden="true">🕒</span>
      <span><strong>${layout.outsideWindowCount} kegiatan di luar ${window.start}–${window.end}.</strong>
        <button type="button" class="link-btn" data-action="set-range-preset" data-preset="full">Tampilkan sepanjang hari</button>
      </span>
    </p>`;
}

function dayNotices(data, layout, window) {
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

  const base = messages.map((message) => (
    `<p class="notice"><span class="notice-icon" aria-hidden="true">${message.icon}</span><span>${message.html}</span></p>`
  )).join('');

  return base + rangeNotice(layout, window);
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

function zoomControl(percent) {
  return `
    <div class="zoom-control" role="group" aria-label="Zoom tampilan waktu">
      <button type="button" class="zoom-btn" data-action="zoom-out" aria-label="Perkecil tampilan" ${percent <= 75 ? 'disabled' : ''}>−</button>
      <button type="button" class="zoom-value" data-action="open-range-dialog" title="Atur rentang waktu dan zoom" aria-label="Zoom ${percent} persen. Atur rentang waktu">${percent}%</button>
      <button type="button" class="zoom-btn" data-action="zoom-in" aria-label="Perbesar tampilan" ${percent >= 200 ? 'disabled' : ''}>+</button>
    </div>`;
}

function dayViewMarkup(data, layout, window) {
  const dateKey = data.settings.selectedDate;
  const relative = relativeDayLabel(dateKey);
  const percent = zoomPercent(data.settings);
  const offset = gridOffsetHours(window);

  return `
    <div class="day-view">
      ${specialDayNotice(data, dateKey)}
      ${dayNotices(data, layout, window)}
      ${conflictNotice(layout)}
      <div class="timeline-card">
        <div class="timeline-scroll" id="timelineScroll" role="region" aria-label="Garis waktu ${escapeHtml(relative || dateKey)}" tabindex="0">
          <div class="timeline" style="--grid-offset:calc(var(--hour-height) * ${offset})">
            <div class="time-gutter" aria-hidden="true">${hourMarks(window)}</div>
            <div class="time-canvas" data-window-start="${window.startMin}" data-window-end="${window.endMin}" style="height:calc(var(--hour-height) * ${window.hours})">
              <div class="event-layer">
                ${layout.blocks.map(renderBlock).join('')}
                ${nowLineMarkup(dateKey, window)}
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
          <span>${layout.inWindowCount} kegiatan</span>
        </div>
        ${zoomControl(percent)}
      </div>
    </div>`;
}

/* ------------------------------------------------------------ week view --- */

function weekSegments(segments) {
  return segments.map((segment) => (
    `<span class="week-seg${segment.conflict ? ' is-conflict' : ''}" style="left:${segment.left.toFixed(3)}%;width:${Math.max(0.6, segment.width).toFixed(3)}%;--seg:${segment.stripe}"></span>`
  )).join('');
}

function weekRow(day) {
  const classes = [
    'week-row',
    day.isToday ? 'is-today' : '',
    day.isSelected ? 'is-selected' : '',
    day.isWeekend ? 'is-weekend' : '',
    day.specialDays.length ? 'has-special' : '',
  ].filter(Boolean).join(' ');

  const date = day.dateKey;
  const specialLabel = day.specialDays.map((entry) => entry.title).join(', ');
  const label = [
    `${day.weekdayLong}, ${formatLongDate(date)}`,
    `${day.count} kegiatan`,
    day.conflictCount ? `${day.conflictCount} bentrok` : '',
    specialLabel,
    day.isToday ? 'Hari ini' : '',
  ].filter(Boolean).join('. ');

  return `
    <button type="button" class="${classes}" data-action="open-day" data-date="${date}" aria-label="${escapeHtml(label)}" ${day.isSelected ? 'aria-current="date"' : ''}>
      <span class="week-day">
        <span class="week-wd">${day.weekdayShort}</span>
        <span class="week-num">${day.dayNumber}</span>
      </span>
      <span class="week-body">
        <span class="week-track" aria-hidden="true">${weekSegments(day.segments)}</span>
        <span class="week-meta">
          <span class="week-count">${day.count} kegiatan</span>
          ${day.conflictCount ? `<span class="week-conflict" aria-hidden="true">⚠ ${day.conflictCount}</span>` : ''}
          ${day.specialDays.length ? `<span class="week-special">${specialDayIcons(day.specialDays)}<span class="week-special-title">${escapeHtml(day.specialDays[0].title)}</span></span>` : ''}
          ${day.isToday ? '<span class="week-today">Hari ini</span>' : ''}
        </span>
      </span>
    </button>`;
}

function weekViewMarkup(data) {
  const dateKey = data.settings.selectedDate;
  const summary = weekSummary(data, dateKey);
  const headline = periodHeadline(dateKey, 'week');

  return `
    <div class="period-card week-card">
      <div class="period-head">
        <div>
          <h3 class="period-title">${escapeHtml(headline.label)}</h3>
          <p class="period-sub">${summary.totalCount} kegiatan${summary.conflictCount ? ` · ${summary.conflictCount} bentrok` : ''}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="go-today">Minggu ini</button>
      </div>
      <div class="week-list">
        ${summary.days.map(weekRow).join('')}
      </div>
      <p class="period-hint">Ketuk satu hari untuk membuka tampilan hari.</p>
    </div>`;
}

/* ----------------------------------------------------------- month view --- */

function monthCell(cell) {
  const classes = [
    'month-cell',
    cell.inMonth ? '' : 'is-outside',
    cell.isToday ? 'is-today' : '',
    cell.isSelected ? 'is-selected' : '',
    cell.weekdayIndex >= 5 ? 'is-weekend' : '',
    cell.specialDays.length ? 'has-special' : '',
    cell.conflictCount ? 'has-conflict' : '',
  ].filter(Boolean).join(' ');

  const dots = cell.colors.map((color) => (
    `<span class="month-dot" style="--dot-color:${escapeHtml(color)}"></span>`
  )).join('');

  const date = parseDateLabel(cell.dateKey);
  const specialLabel = cell.specialDays.map((entry) => entry.title).join(', ');
  const label = [
    date,
    `${cell.count} kegiatan`,
    cell.conflictCount ? `${cell.conflictCount} bentrok` : '',
    specialLabel,
  ].filter(Boolean).join('. ');

  return `
    <button type="button" class="${classes}" data-action="open-day" data-date="${cell.dateKey}" aria-label="${escapeHtml(label)}">
      <span class="month-cell-top">
        <span class="month-num">${cell.dayNumber}</span>
        ${cell.specialDays.length ? `<span class="month-special" title="${escapeHtml(specialLabel)}">${specialDayIcons(cell.specialDays)}</span>` : ''}
      </span>
      <span class="month-dots" aria-hidden="true">${dots}</span>
      <span class="month-cell-bottom">
        ${cell.count ? `<span class="month-count">${cell.count}</span>` : ''}
        ${cell.conflictCount ? '<span class="month-conflict" aria-hidden="true">⚠</span>' : ''}
      </span>
    </button>`;
}

function parseDateLabel(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function monthSpecialFooter(summary) {
  if (summary.monthSpecialDays.length === 0) {
    return `
      <div class="month-footer">
        <span class="month-footer-text">Belum ada hari khusus bulan ini.</span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="new-special-day">+ Hari khusus</button>
      </div>`;
  }

  const items = summary.monthSpecialDays.map((entry) => {
    const type = SPECIAL_TYPES[entry.type] || SPECIAL_TYPES.special;
    return `<li>
      <button type="button" class="special-link" data-action="edit-special-day" data-id="${escapeHtml(entry.id)}">
        <span aria-hidden="true">${type.icon}</span>
        <span class="special-link-date">${entry.date.slice(8, 10)}</span>
        <span class="special-link-title">${escapeHtml(entry.title)}</span>
      </button>
    </li>`;
  }).join('');

  return `
    <div class="month-footer">
      <ul class="month-special-list">${items}</ul>
      <button type="button" class="btn btn-ghost btn-sm" data-action="new-special-day">+ Hari khusus</button>
    </div>`;
}

function monthViewMarkup(data) {
  const dateKey = data.settings.selectedDate;
  const summary = monthSummary(data, dateKey, dateKey);
  const headline = periodHeadline(dateKey, 'month');

  return `
    <div class="period-card month-card">
      <div class="period-head">
        <div>
          <h3 class="period-title">${escapeHtml(headline.label)}</h3>
          <p class="period-sub">${summary.totalCount} kegiatan · ${summary.monthSpecialDays.length} hari khusus</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="go-today">Bulan ini</button>
      </div>
      <div class="month-scroll">
        <div class="month-grid">
          ${WEEKDAY_SHORT.map((name) => `<span class="month-weekday" aria-hidden="true">${name}</span>`).join('')}
          ${summary.cells.map(monthCell).join('')}
        </div>
      </div>
      <div class="period-legend">
        <span class="legend-item"><span class="dot" style="--dot-color:var(--primary)"></span> Warna profil</span>
        <span class="legend-item"><span aria-hidden="true">⭐</span> Hari khusus</span>
        <span class="legend-item legend-conflict"><span aria-hidden="true">⚠</span> Bentrok</span>
      </div>
      ${monthSpecialFooter(summary)}
    </div>`;
}

/* ------------------------------------------------------------------ scroll --- */

// Scroll assignments can be clamped to 0 when the flex layout has not been
// measured yet (resize, rotation, browser zoom). Re-apply them next frame.
function setScrollTop(container, top) {
  container.scrollTop = top;
  if (top > 0 && container.scrollTop < top - 1) {
    requestAnimationFrame(() => { container.scrollTop = top; });
  }
}

function restoreScroll(stage, dateKey, window, percent) {
  const container = stage.querySelector('#timelineScroll');
  if (!container) return;

  const canvas = container.querySelector('.time-canvas');
  const hourHeight = canvas
    ? canvas.getBoundingClientRect().height / Math.max(1, window.hours)
    : 60;
  const scrollKey = `${dateKey}|${window.start}|${window.end}|${percent}`;

  if (previousScrollKey === scrollKey && previousScrollTop !== null) {
    setScrollTop(container, previousScrollTop);
  } else if (dateKey === todayKey()) {
    const now = nowMinutes();
    if (now >= window.startMin && now <= window.endMin) {
      const minutesFromStart = now - window.startMin;
      setScrollTop(container, Math.max(0, (minutesFromStart / 60 - 1.75) * hourHeight));
    } else {
      setScrollTop(container, 0);
    }
  } else {
    setScrollTop(container, Math.min(5.5 * hourHeight, Math.max(0, container.scrollHeight - container.clientHeight)));
  }

  if (!container.dataset.scrollBound) {
    container.dataset.scrollBound = 'true';
    container.addEventListener('scroll', () => {
      previousScrollTop = container.scrollTop;
      previousScrollKey = container.dataset.scrollKey || previousScrollKey;
    }, { passive: true });
  }
  container.dataset.scrollKey = scrollKey;
}

/* ------------------------------------------------------------------ export --- */

export function renderCalendar(stage, data) {
  const previousContainer = stage.querySelector('#timelineScroll');
  if (previousContainer) previousScrollTop = previousContainer.scrollTop;

  const view = data.settings.currentView;
  const dateKey = data.settings.selectedDate;

  if (view === 'week') {
    stage.innerHTML = weekViewMarkup(data);
    return;
  }

  if (view === 'month') {
    stage.innerHTML = monthViewMarkup(data);
    return;
  }

  const window = resolveTimeWindow(data.settings);
  const layout = buildDayLayout(data, dateKey, window);
  stage.innerHTML = dayViewMarkup(data, layout, window);
  restoreScroll(stage, dateKey, window, zoomPercent(data.settings));
}

/** Repaint only the current-time marker (called once a minute). */
export function refreshNowIndicator(data) {
  const canvas = document.querySelector('#calendarStage .time-canvas');
  if (!canvas) return;
  const existing = canvas.querySelector('.now-line');
  const window = resolveTimeWindow(data.settings);
  const markup = nowLineMarkup(data.settings.selectedDate, window);
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
