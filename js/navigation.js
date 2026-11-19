/**
 * Date navigation and view selection. Both are persisted in settings so a
 * refresh returns the family to the same day and view.
 */

import { getData, updateSettings } from './state.js';
import { shiftWeekKey, weekHeadline } from './periods.js';
import { VIEW_IDS } from './storage.js';
import {
  addDays,
  formatLongDate,
  isDateKey,
  parseDateKey,
  relativeDayLabel,
  todayKey,
} from './utils.js';

export function getSelectedDate() {
  return getData().settings.selectedDate;
}

export function setSelectedDate(dateKey) {
  if (!isDateKey(dateKey)) return;
  updateSettings({ selectedDate: dateKey });
}

export function moveSelectedDate(days) {
  setSelectedDate(addDays(getSelectedDate(), days));
}

/** In week view the ‹/› buttons jump a whole week. */
export function moveSelectedPeriod(direction) {
  const data = getData();
  const step = Number(direction) || 0;
  if (!step) return;
  if (data.settings.currentView === 'week') {
    setSelectedDate(shiftWeekKey(data.settings.selectedDate, step));
    return;
  }
  setSelectedDate(addDays(data.settings.selectedDate, step));
}

export function goToToday() {
  setSelectedDate(todayKey());
}

export function setView(viewId) {
  if (!VIEW_IDS.includes(viewId)) return;
  updateSettings({ currentView: viewId });
}

export function dateHeadline(dateKey, view = 'day') {
  if (view === 'week') {
    const h = weekHeadline(dateKey);
    return { label: h.label, sub: h.sub, short: h.short, tiny: h.tiny };
  }

  const date = parseDateKey(dateKey);
  return {
    label: formatLongDate(dateKey),
    sub: relativeDayLabel(dateKey) || 'Tampilan hari',
    short: `${date.toLocaleDateString('id-ID', { weekday: 'short' })}, ${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
    tiny: `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
  };
}
