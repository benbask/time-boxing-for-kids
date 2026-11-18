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
  escapeHtml,
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
    `<span class="hour-label" style="top:${(hour / HOUR_LABEL_COUNT) * 100}%">${pad2(hour)}:00</span>`
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
  const classes = [
    'event-block',
    compact ? 'is-compact' : '',
    tall ? 'is-tall' : '',
    block.isNeutral ? 'is-neutral' : '',
  ].filter(Boolean).join(' ');

  const style = [
    `top:calc(${block.topPercent.toFixed(4)}% + 1px)`,
    `height:calc(${block.heightPercent.toFixed(4)}% - 2px)`,
    `--ev-stripe:${block.stripe}`,
    block.tint ? `--ev-bg:${block.tint}` : '',
    block.border ? `--ev-border:${block.border}` : '',
  ].filter(Boolean).join(';');

  const note = block.note
    ? `<span class="event-note-icon" title="${escapeHtml(block.note)}" aria-hidden="true">📝</span>`
    : '';

  const label = [
    block.title,
    block.timeLabel,
    block.participants.length
      ? block.participants.map((profile) => profile.name).join(', ')
      : 'Tanpa peserta',
    block.note ? `Catatan: ${block.note}` : '',
  ].filter(Boolean).join('. ');

  return `
    <article class="${classes}" data-event-id="${escapeHtml(block.id)}" style="${style}" aria-label="${escapeHtml(label)}">
      <span class="event-resize event-resize-start" data-resize="start" aria-hidden="true"></span>
      <span class="event-resize event-resize-end" data-resize="end" aria-hidden="true"></span>
      <button type="button" class="event-edit" data-edit-event="${escapeHtml(block.id)}"
        aria-label="Ubah kegiatan ${escapeHtml(block.title)}" title="Ubah kegiatan">✏️</button>
      ${note}
      <div class="event-time">${escapeHtml(block.timeLabel)}</div>
      <div class="event-title">${escapeHtml(block.title)}</div>
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

function dayViewMarkup(data, layout) {
  const dateKey = data.settings.selectedDate;
  const relative = relativeDayLabel(dateKey);

  return `
    ${dayNotices(data, layout)}
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
        </div>
      </div>
      <div class="timeline-legend">
        <div class="legend-items">
          <span class="legend-item"><span class="dot" style="--dot-color:var(--now)"></span> Waktu sekarang</span>
          <span class="legend-item"><span class="shared-marks" aria-hidden="true">👥</span> Kegiatan bersama tampil satu kali</span>
          <span class="legend-item legend-hint">Ketuk area kosong untuk menambah · geser blok untuk memindah</span>
        </div>
        <span>${layout.visibleCount} kegiatan</span>
      </div>
    </div>`;
}

function placeholderMarkup(view) {
  if (view === 'week') {
    return `
      <div class="placeholder-card">
        <span class="placeholder-icon" aria-hidden="true">📅</span>
        <span class="phase-tag">Fase 4</span>
        <h3>Tampilan minggu</h3>
        <p>Tujuh hari dengan indikator kegiatan akan hadir pada Fase 4. Sementara ini, gunakan tombol ‹ dan › untuk berpindah hari.</p>
        <button type="button" class="btn btn-primary" data-action="set-view" data-view="day">Kembali ke tampilan hari</button>
      </div>`;
  }
  return `
    <div class="placeholder-card">
      <span class="placeholder-icon" aria-hidden="true">🗓️</span>
      <span class="phase-tag">Fase 4</span>
      <h3>Tampilan bulan</h3>
      <p>Kalender bulanan, jumlah kegiatan, dan hari khusus akan hadir pada Fase 4. Sementara ini, gunakan tombol ‹ dan › untuk berpindah hari.</p>
      <button type="button" class="btn btn-primary" data-action="set-view" data-view="day">Kembali ke tampilan hari</button>
    </div>`;
}

function restoreScroll(stage, dateKey) {
  const container = stage.querySelector('#timelineScroll');
  if (!container) return;
  const row = container.querySelector('.hour-row');
  const hourHeight = row ? row.getBoundingClientRect().height : 60;

  if (previousDateKey === dateKey && previousScrollTop !== null) {
    container.scrollTop = previousScrollTop;
  } else if (dateKey === todayKey()) {
    // Keep the current time ~1.75 hours below the top so the ongoing block is
    // fully visible with a little context above it.
    container.scrollTop = Math.max(0, (nowMinutes() / 60 - 1.75) * hourHeight);
  } else {
    container.scrollTop = 5.5 * hourHeight;
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

  if (view === 'week' || view === 'month') {
    stage.innerHTML = placeholderMarkup(view);
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
