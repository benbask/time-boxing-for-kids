/**
 * Date navigation and view selection. Both are persisted in settings so a
 * refresh returns the family to the same day and view.
 */

import { getData, updateSettings } from './state.js';
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

export function goToToday() {
  setSelectedDate(todayKey());
}

export function setView(viewId) {
  if (!VIEW_IDS.includes(viewId)) return;
  updateSettings({ currentView: viewId });
}

export function dateHeadline(dateKey) {
  const date = parseDateKey(dateKey);
  return {
    label: formatLongDate(dateKey),
    sub: relativeDayLabel(dateKey) || 'Tampilan hari',
    short: `${date.toLocaleDateString('id-ID', { weekday: 'short' })}, ${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
  };
}
