/**
 * Dialog for the visible time range (SPEC.md §9).
 *
 * Full day / Morning / Afternoon / Evening presets plus a custom from→to
 * window. The custom window is validated and persisted as local wall-clock
 * strings ("HH:mm"); zoom is adjusted in the toolbar buttons.
 */

import { getData, update } from './state.js';
import { RANGE_PRESETS, resolveTimeWindow, rangeSummary, presetForRange } from './time-range.js';
import { escapeHtml } from './utils.js';

let closeDialog = null;

export function openRangeDialog() {
  const data = getData();
  const window = resolveTimeWindow(data.settings);

  const dlg = document.getElementById('rangeDialog');
  if (!dlg) return;

  const list = dlg.querySelector('.range-presets');
  list.innerHTML = RANGE_PRESETS.map((preset) => {
    const active = presetForRange(window.start, window.end) === preset.id;
    return `
      <button type="button" class="range-btn${active ? ' is-active' : ''}"
        data-preset="${preset.id}" ${active ? 'aria-pressed="true"' : ''}>
        <span>${escapeHtml(preset.label)}</span>
        <span class="range-short">${escapeHtml(preset.short)}</span>
      </button>`;
  }).join('');

  const customWrap = dlg.querySelector('.range-custom');
  const startInput = dlg.querySelector('#rangeCustomStart');
  const endInput = dlg.querySelector('#rangeCustomEnd');
  const isCustom = presetForRange(window.start, window.end) === 'custom';
  customWrap.classList.toggle('is-active', isCustom);
  startInput.value = window.start;
  endInput.value = window.end === '24:00' ? '' : window.end;

  const summary = dlg.querySelector('.range-summary');
  summary.textContent = rangeSummary(data.settings);

  closeDialog = () => { dlg.close(); closeDialog = null; };
  dlg.showModal();
}

function closeRangeDialog() {
  if (closeDialog) closeDialog();
}

export function bindRangeDialog() {
  const dlg = document.getElementById('rangeDialog');
  if (!dlg) return;

  dlg.addEventListener('click', (event) => {
    if (event.target === dlg) { closeRangeDialog(); return; }

    const presetBtn = event.target.closest('[data-preset]');
    if (presetBtn) {
      const preset = RANGE_PRESETS.find((p) => p.id === presetBtn.dataset.preset);
      if (preset) {
        update((draft) => {
          draft.settings.visibleTimeRange = { start: preset.start, end: preset.end, preset: preset.id };
        }, preset === 'full' ? 'Tampilkan sepanjang hari.' : `Rentang ${preset.label}.`);
      }
      closeRangeDialog();
      return;
    }

    const saveBtn = event.target.closest('[data-action="save-range"]');
    if (saveBtn) {
      const start = dlg.querySelector('#rangeCustomStart').value;
      const end = dlg.querySelector('#rangeCustomEnd').value;
      if (!start || !end) {
        dlg.querySelector('#rangeCustomError').hidden = false;
        return;
      }
      if (end <= start) {
        dlg.querySelector('#rangeCustomError').textContent = 'Waktu akhir harus lebih dari waktu awal.';
        dlg.querySelector('#rangeCustomError').hidden = false;
        return;
      }
      const minutes = (Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5)))
        - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)));
      if (minutes < 60) {
        dlg.querySelector('#rangeCustomError').textContent = 'Rentang waktu minimal 60 menit.';
        dlg.querySelector('#rangeCustomError').hidden = false;
        return;
      }
      dlg.querySelector('#rangeCustomError').hidden = true;
      mutate((draft) => {
        draft.settings.visibleTimeRange = { start, end, preset: 'custom' };
      }, 'Rentang waktu khusus disimpan.');
      closeRangeDialog();
      return;
    }

    const cancelBtn = event.target.closest('[data-action="cancel-range"]');
    if (cancelBtn) closeRangeDialog();
  });

  const customWrap = dlg.querySelector('.range-custom');
  const customToggle = dlg.querySelector('[data-action="toggle-custom"]');
  if (customToggle) {
    customToggle.addEventListener('click', () => {
      const active = customWrap.classList.toggle('is-active');
      customToggle.setAttribute('aria-pressed', String(active));
    });
  }

  dlg.addEventListener('cancel', closeRangeDialog);
}
