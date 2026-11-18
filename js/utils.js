/**
 * Small pure helpers shared by the UI modules.
 *
 * Calendar values are LOCAL wall-clock strings ("YYYY-MM-DD", "YYYY-MM-DDTHH:mm").
 * They are never parsed with Date.parse(), so a stored calendar value cannot be
 * shifted by a device timezone.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey() {
  return dateKeyFromDate(new Date());
}

/** @returns {Date} local midnight for a "YYYY-MM-DD" key */
export function parseDateKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return !Number.isNaN(date.getTime()) && dateKeyFromDate(date) === value;
}

export function addDays(key, amount) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return dateKeyFromDate(date);
}

export function diffInDays(fromKey, toKey) {
  return Math.round((parseDateKey(toKey) - parseDateKey(fromKey)) / DAY_MS);
}

export function formatLongDate(key) {
  return parseDateKey(key).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function relativeDayLabel(key) {
  const delta = diffInDays(todayKey(), key);
  if (delta === 0) return 'Hari ini';
  if (delta === 1) return 'Besok';
  if (delta === -1) return 'Kemarin';
  return '';
}

/* ------------------------------------------------------------------ time --- */

export function isTimeOfDay(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(time) {
  if (!isTimeOfDay(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes of the day (0–1439) from a local datetime string. */
export function eventStartMinutes(event) {
  return timeToMinutes(String(event.start).slice(11, 16));
}

/** Minutes of the day for the end; "00:00" means end of day. */
export function eventEndMinutes(event) {
  const end = String(event.end).slice(11, 16);
  return end === '00:00' ? 1440 : timeToMinutes(end);
}

export function eventDateKey(event) {
  return String(event.start).slice(0, 10);
}

export function formatEventRange(event) {
  const start = String(event.start).slice(11, 16);
  const end = String(event.end).slice(11, 16);
  return `${start} – ${end}`;
}

/** Human duration for a block: "30 mnt", "1 j", "1 j 30 mnt". */
export function formatDurationLabel(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} mnt`;
  if (rest === 0) return `${hours} j`;
  return `${hours} j ${rest} mnt`;
}

export function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Minutes of the day → "HH:mm". Values are clamped to 00:00–23:59. */
export function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

/** Round to the nearest snap interval (default 10 minutes). */
export function snapMinutes(minutes, interval = 10) {
  const step = Number(interval) > 0 ? Number(interval) : 10;
  return Math.round(minutes / step) * step;
}

/* ----------------------------------------------------------------- colour --- */

export function hexToRgba(hex, alpha) {
  const normalized = String(hex || '').replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return `rgba(90, 120, 131, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/* ------------------------------------------------------------------- misc --- */

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function uid(prefix = 'id') {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes || 0))} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
