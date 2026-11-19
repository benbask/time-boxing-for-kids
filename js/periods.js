/**
 * Period helpers for the week and month views (SPEC.md §8).
 *
 * Weeks start on Monday, matching Indonesian calendars. Every summary is built
 * from the same layout engine as the day view, so hidden profiles, conflicts
 * and participant colours stay consistent across all three views.
 */

import { buildDayLayout } from './layout-engine.js';
import {
  addDays,
  dateKeyFromDate,
  parseDateKey,
  todayKey,
} from './utils.js';

export const SPECIAL_TYPES = {
  holiday: { icon: '🎉', label: 'Libur' },
  special: { icon: '⭐', label: 'Hari khusus' },
  birthday: { icon: '🎂', label: 'Ulang tahun' },
};

const WEEKDAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const WEEKDAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export function weekdayIndex(dateKey) {
  return (parseDateKey(dateKey).getDay() + 6) % 7; // Monday = 0
}

export function startOfWeek(dateKey) {
  return addDays(dateKey, -weekdayIndex(dateKey));
}

export function endOfWeek(dateKey) {
  return addDays(startOfWeek(dateKey), 6);
}

export function shiftMonthKey(dateKey, amount) {
  const date = parseDateKey(dateKey);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return dateKeyFromDate(target);
}

export function startOfMonth(dateKey) {
  const date = parseDateKey(dateKey);
  return dateKeyFromDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function specialDaysForDate(data, dateKey) {
  return (data.specialDays || []).filter((entry) => entry.date === dateKey);
}

function openDaySummary(data, dateKey) {
  const layout = buildDayLayout(data, dateKey);
  const specialDays = specialDaysForDate(data, dateKey);
  const colors = [];
  (layout.blocks || []).forEach((block) => {
    block.participants.forEach((profile) => {
      if (!colors.includes(profile.color)) colors.push(profile.color);
    });
  });

  return {
    dateKey,
    layout,
    specialDays,
    colors: colors.slice(0, 4),
    extraColors: Math.max(0, colors.length - 4),
    count: layout.visibleCount,
    hiddenCount: layout.hiddenCount,
    conflictCount: layout.conflictCount,
    hasConflict: layout.conflictCount > 0,
    segments: (layout.blocks || []).map((block) => ({
      id: block.id,
      left: (block.startMinutes / 1440) * 100,
      width: (Math.max(1, block.endMinutes - block.startMinutes) / 1440) * 100,
      color: block.baseColor || 'var(--border-strong)',
      stripe: block.stripe,
      conflict: block.conflicts.length > 0,
    })),
  };
}

export function weekSummary(data, dateKey) {
  const start = startOfWeek(dateKey);
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = addDays(start, index);
    const date = parseDateKey(key);
    return {
      ...openDaySummary(data, key),
      weekdayShort: WEEKDAY_SHORT[index],
      weekdayLong: WEEKDAY_LONG[index],
      dayNumber: date.getDate(),
      isToday: key === todayKey(),
      isSelected: key === dateKey,
      isWeekend: index >= 5,
    };
  });

  return {
    start,
    end: addDays(start, 6),
    days,
    totalCount: days.reduce((sum, day) => sum + day.count, 0),
    conflictCount: days.reduce((sum, day) => sum + day.conflictCount, 0),
  };
}

export function monthSummary(data, dateKey, selectedDate = dateKey) {
  const monthStart = startOfMonth(dateKey);
  const gridStart = startOfWeek(monthStart);
  const monthDate = parseDateKey(monthStart);
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const lastKey = dateKeyFromDate(new Date(year, month + 1, 0));
  const gridEnd = addDays(lastKey, 6 - weekdayIndex(lastKey));

  const cells = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const date = parseDateKey(cursor);
    const summary = openDaySummary(data, cursor);
    cells.push({
      ...summary,
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: cursor === todayKey(),
      isSelected: cursor === selectedDate,
      weekdayIndex: weekdayIndex(cursor),
    });
    cursor = addDays(cursor, 1);
  }

  const monthSpecialDays = (data.specialDays || [])
    .filter((entry) => entry.date >= monthStart && entry.date <= lastKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    monthStart,
    lastKey,
    cells,
    monthSpecialDays,
    totalCount: cells
      .filter((cell) => cell.inMonth)
      .reduce((sum, cell) => sum + cell.count, 0),
  };
}

/* --------------------------------------------------------------- labels --- */

function shortMonth(date) {
  return date.toLocaleDateString('id-ID', { month: 'short' });
}

function longMonth(date) {
  return date.toLocaleDateString('id-ID', { month: 'long' });
}

function rangeLabel(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);

  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return {
      label: `${from.getDate()}–${to.getDate()} ${longMonth(to)} ${to.getFullYear()}`,
      short: `${from.getDate()}–${to.getDate()} ${shortMonth(to)}`,
      tiny: `${from.getDate()}–${to.getDate()} ${shortMonth(to)}`,
    };
  }

  if (from.getFullYear() === to.getFullYear()) {
    return {
      label: `${from.getDate()} ${longMonth(from)} – ${to.getDate()} ${longMonth(to)} ${to.getFullYear()}`,
      short: `${from.getDate()} ${shortMonth(from)} – ${to.getDate()} ${shortMonth(to)}`,
      tiny: `${from.getDate()}/${from.getMonth() + 1}–${to.getDate()}/${to.getMonth() + 1}`,
    };
  }

  return {
    label: `${from.getDate()} ${longMonth(from)} ${from.getFullYear()} – ${to.getDate()} ${longMonth(to)} ${to.getFullYear()}`,
    short: `${from.getDate()} ${shortMonth(from)} ${from.getFullYear()} – ${to.getDate()} ${shortMonth(to)} ${to.getFullYear()}`,
    tiny: `${from.getDate()}/${from.getMonth() + 1}/${String(from.getFullYear()).slice(2)}–${to.getDate()}/${to.getMonth() + 1}/${String(to.getFullYear()).slice(2)}`,
  };
}

/** Toolbar headline for week and month; the day view keeps dateHeadline(). */
export function periodHeadline(dateKey, view) {
  if (view === 'week') {
    const start = startOfWeek(dateKey);
    const end = addDays(start, 6);
    const labels = rangeLabel(start, end);
    const today = todayKey();
    const isThisWeek = today >= start && today <= end;
    return {
      ...labels,
      sub: isThisWeek ? 'Minggu ini' : 'Tampilan minggu',
    };
  }

  const date = parseDateKey(dateKey);
  const month = `${longMonth(date)} ${date.getFullYear()}`;
  const short = `${shortMonth(date)} ${date.getFullYear()}`;
  const isThisMonth = todayKey().slice(0, 7) === dateKey.slice(0, 7);
  return {
    label: month,
    short,
    tiny: short,
    sub: isThisMonth ? 'Bulan ini' : 'Tampilan bulan',
  };
}

export { WEEKDAY_SHORT };
