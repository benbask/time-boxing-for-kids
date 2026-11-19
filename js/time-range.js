/**
 * Visible time range and zoom helpers (SPEC.md §9).
 *
 * The range is stored as local wall-clock strings in settings.visibleTimeRange:
 *   { start: "HH:mm", end: "HH:mm" | "24:00", preset: "full" | ... }
 *
 * The day timeline renders only this window, so a family that only needs
 * 04:00–12:00 gets a canvas twice as tall per hour without any device zoom.
 * Zoom is a separate multiplier on the hour height and never changes the
 * duration stored on an event.
 */

import { isTimeOfDay, timeToMinutes } from './utils.js';

export const RANGE_PRESETS = [
  { id: 'full', label: 'Sepanjang hari', short: '00–24', start: '00:00', end: '24:00' },
  { id: 'morning', label: 'Pagi', short: '04–12', start: '04:00', end: '12:00' },
  { id: 'afternoon', label: 'Siang', short: '12–18', start: '12:00', end: '18:00' },
  { id: 'evening', label: 'Sore–malam', short: '18–24', start: '18:00', end: '24:00' },
  { id: 'custom', label: 'Khusus', short: 'Khusus', start: null, end: null },
];

export const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2];
export const DEFAULT_ZOOM = 1;
export const MIN_RANGE_MINUTES = 60;

const DAY_MINUTES = 1440;

export function rangePreset(id) {
  return RANGE_PRESETS.find((preset) => preset.id === id) || RANGE_PRESETS[0];
}

export function endToMinutes(end) {
  return end === '24:00' ? DAY_MINUTES : timeToMinutes(end);
}

/**
 * Resolve stored settings into minutes. Values that would produce an empty or
 * inverted window fall back to the full day rather than hiding the calendar.
 */
export function resolveTimeWindow(settings) {
  const range = settings?.visibleTimeRange || {};
  const preset = rangePreset(range.preset);

  let start = isTimeOfDay(range.start) ? range.start : preset.start || '00:00';
  let end = range.end === '24:00'
    ? '24:00'
    : (isTimeOfDay(range.end) ? range.end : preset.end || '24:00');

  let startMin = timeToMinutes(start);
  let endMin = endToMinutes(end);

  if (endMin - startMin < MIN_RANGE_MINUTES) {
    start = '00:00';
    end = '24:00';
    startMin = 0;
    endMin = DAY_MINUTES;
  }

  return {
    start,
    end,
    startMin,
    endMin,
    minutes: endMin - startMin,
    hours: (endMin - startMin) / 60,
    preset: preset.id,
  };
}

/** Human summary used by the menu item and the time dialog. */
export function rangeSummary(settings) {
  const window = resolveTimeWindow(settings);
  const preset = rangePreset(window.preset);
  if (preset.id !== 'custom' && preset.start === window.start && preset.end === window.end) {
    return `${preset.label} · ${preset.short}`;
  }
  return `${window.start}–${window.end}`;
}

/** Pick a preset id from concrete times, so imports and edits stay consistent. */
export function presetForRange(start, end) {
  const match = RANGE_PRESETS.find((preset) => (
    preset.start === start && preset.end === end
  ));
  return match ? match.id : 'custom';
}

export function normalizeZoom(value) {
  const zoom = Number(value);
  return ZOOM_LEVELS.includes(zoom) ? zoom : DEFAULT_ZOOM;
}

export function zoomPercent(settings) {
  return Math.round(normalizeZoom(settings?.zoom) * 100);
}
