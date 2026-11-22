/**
 * Week-view helpers (Phase 4, step 1).
 *
 * A week runs Monday–Sunday. Each day summary is built from the same layout
 * engine as the day view, so hidden profiles and conflicts stay consistent.
 */

import { buildDayLayout } from './layout-engine.js';
import { addDays, dateKeyFromDate, parseDateKey, todayKey } from './utils.js';

export const WEEKDAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
export const WEEKDAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const SPECIAL_TYPES = {
  holiday: { icon: '🎉', label: 'Libur' },
  special: { icon: '⭐', label: 'Hari khusus' },
  birthday: { icon: '🎂', label: 'Ulang tahun' },
};

export function weekdayIndex(dateKey) {
  return (parseDateKey(dateKey).getDay() + 6) % 7;
}

export function startOfWeek(dateKey) {
  return addDays(dateKey, -weekdayIndex(dateKey));
}

export function shiftWeekKey(dateKey, amount) {
  return addDays(dateKey, amount * 7);
}

/** Move a whole month, keeping the day-of-month when it exists in the target. */
export function shiftMonthKey(dateKey, amount) {
  const source = parseDateKey(dateKey);
  const day = source.getDate();
  const target = new Date(source.getFullYear(), source.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return dateKeyFromDate(target);
}

function daySummary(data, dateKey) {
  const layout = buildDayLayout(data, dateKey);
  const colors = [];
  layout.blocks.forEach((block) => {
    block.participants.forEach((profile) => {
      if (!colors.includes(profile.color)) colors.push(profile.color);
    });
  });
  const specialDays = (data.specialDays || []).filter((entry) => entry.date === dateKey);

  return {
    dateKey,
    count: layout.visibleCount,
    conflictCount: layout.conflictCount,
    colors: colors.slice(0, 3),
    specialDays,
    blocks: layout.blocks.map((block) => ({
      id: block.id,
      title: block.title,
      timeLabel: block.timeLabel,
      topPercent: block.topPercent,
      heightPercent: block.heightPercent,
      durationMinutes: block.durationMinutes,
      lane: block.lane,
      laneCount: block.laneCount,
      leftPercent: block.leftPercent,
      widthPercent: block.widthPercent,
      isConflict: block.conflicts.length > 0,
      isNeutral: block.isNeutral,
      color: block.baseColor,
      stripe: block.stripe,
    })),
  };
}

export function weekSummary(data, dateKey) {
  const start = startOfWeek(dateKey);
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = addDays(start, index);
    const date = parseDateKey(key);
    return {
      ...daySummary(data, key),
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

export function weekHeadline(dateKey) {
  const start = startOfWeek(dateKey);
  const end = addDays(start, 6);
  const from = parseDateKey(start);
  const to = parseDateKey(end);
  const month = (date) => date.toLocaleDateString('id-ID', { month: 'short' });
  const monthLong = (date) => date.toLocaleDateString('id-ID', { month: 'long' });
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();

  const label = sameMonth
    ? `${from.getDate()}–${to.getDate()} ${monthLong(to)} ${to.getFullYear()}`
    : `${from.getDate()} ${monthLong(from)} – ${to.getDate()} ${monthLong(to)} ${to.getFullYear()}`;
  const short = sameMonth
    ? `${from.getDate()}–${to.getDate()} ${month(to)}`
    : `${from.getDate()} ${month(from)} – ${to.getDate()} ${month(to)}`;
  const tiny = sameMonth
    ? `${from.getDate()}–${to.getDate()} ${month(to)}`
    : `${from.getDate()}/${from.getMonth() + 1}–${to.getDate()}/${to.getMonth() + 1}`;

  const today = todayKey();
  return {
    label,
    sub: today >= start && today <= end ? 'Minggu ini' : 'Tampilan minggu',
    short,
    tiny,
  };
}

/** Six Monday–Sunday weeks so every month keeps the same grid height. */
export function monthSummary(data, dateKey) {
  const selected = parseDateKey(dateKey);
  const firstKey = dateKeyFromDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const start = addDays(firstKey, -weekdayIndex(firstKey));
  const today = todayKey();

  const days = Array.from({ length: 42 }, (_, index) => {
    const key = addDays(start, index);
    const date = parseDateKey(key);
    const column = index % 7;
    return {
      ...daySummary(data, key),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === selected.getMonth()
        && date.getFullYear() === selected.getFullYear(),
      isToday: key === today,
      isSelected: key === dateKey,
      isWeekend: column >= 5,
    };
  });
  const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));

  return {
    start,
    end: addDays(start, 41),
    weeks,
    totalCount: days.reduce((sum, day) => sum + day.count, 0),
    conflictCount: days.reduce((sum, day) => sum + day.conflictCount, 0),
  };
}

export function monthHeadline(dateKey) {
  const date = parseDateKey(dateKey);
  const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const short = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  const tiny = date.toLocaleDateString('id-ID', { month: 'short' });
  const sub = todayKey().slice(0, 7) === String(dateKey).slice(0, 7)
    ? 'Bulan ini'
    : 'Tampilan bulan';
  return { label, short, tiny, sub };
}
