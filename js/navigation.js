/**
 * Date navigation and view selection. Both are persisted in settings so a
 * refresh returns the family to the same day and view.
 */

import { getData, updateSettings } from './state.js';
import { periodHeadline, shiftMonthKey } from './periods.js';
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

/** Previous/next respects the open view: day, week or month. */
export function moveSelectedPeriod(direction) {
  const data = getData();
  const step = Number(direction) || 0;
  if (!step) return;
  const { currentView, selectedDate } = data.settings;

  if (currentView === 'week') {
    setSelectedDate(addDays(selectedDate, step * 7));
    return;
  }
  if (currentView === 'month') {
    setSelectedDate(shiftMonthKey(selectedDate, step));
    return;
  }
  setSelectedDate(addDays(selectedDate, step));
}

export function goToToday() {
  setSelectedDate(todayKey());
}

export function setView(viewId) {
  if (!VIEW_IDS.includes(viewId)) return;
  updateSettings({ currentView: viewId });
}

export function dateHeadline(dateKey, view = 'day') {
  if (view === 'week' || view === 'month') {
    const period = periodHeadline(dateKey, view);
    return {
      label: period.label,
      sub: period.sub,
      short: period.short,
      tiny: period.tiny,
    };
  }

  const date = parseDateKey(dateKey);
  return {
    label: formatLongDate(dateKey),
    sub: relativeDayLabel(dateKey) || 'Tampilan hari',
    short: `${date.toLocaleDateString('id-ID', { weekday: 'short' })}, ${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
    tiny: `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
  };
}
