/**
 * LocalStorage persistence, defaults and seed data.
 *
 * Storage key: timeboxing-kids:data
 * Schema version: 1 (see SPEC.md §22.4)
 *
 * Stored calendar values are local wall-clock strings:
 *   event.start / event.end  -> "YYYY-MM-DDTHH:mm"
 *   settings.selectedDate     -> "YYYY-MM-DD"
 * createdAt/updatedAt are ISO audit stamps only and never place events.
 */

import { DEFAULT_THEME, isThemeId } from './themes.js';
import {
  dateKeyFromDate,
  isDateKey,
  isTimeOfDay,
  todayKey,
  uid,
} from './utils.js';

export const STORAGE_KEY = 'timeboxing-kids:data';
export const CORRUPT_BACKUP_KEY = 'timeboxing-kids:data:corrupt-backup';
export const SCHEMA_VERSION = 1;

export const VIEW_IDS = ['day', 'week', 'month', 'profiles', 'settings'];

export const DEFAULT_PROFILE_COLORS = [
  '#2F80ED',
  '#E05C94',
  '#27AE60',
  '#F2994A',
  '#9B51E0',
  '#00A0A8',
  '#E2574C',
  '#7A5AF8',
  '#8D6E63',
  '#C48A00',
];

const DEFAULT_PALETTE_FALLBACK = '#2F80ED';

export function defaultSettings(selectedDate = todayKey()) {
  return {
    activeTheme: DEFAULT_THEME,
    currentView: 'day',
    selectedDate,
    // Full-day range by default; presets arrive in Phase 4.
    visibleTimeRange: { start: '00:00', end: '24:00', preset: 'full' },
    snapInterval: 10,
    location: {
      name: '',
      latitude: null,
      longitude: null,
      timezone: 'Asia/Jakarta',
      elevation: null,
    },
    // Placeholders only: no prayer parameter is assumed in Phase 1.
    prayerSettings: {
      method: 'kemenag',
      fajrAngle: null,
      ishaAngle: null,
      asrShadowFactor: null,
      elevationCorrection: true,
      ihtiyatiMinutes: 0,
      showMarkers: true,
      preparationMinutes: 0,
    },
  };
}

function seedProfiles() {
  const now = new Date().toISOString();
  return [
    { name: 'Ayah', emoji: '👨', color: '#2F80ED' },
    { name: 'Ibu', emoji: '👩', color: '#E05C94' },
    { name: 'Anak 1', emoji: '👦', color: '#27AE60' },
    { name: 'Anak 2', emoji: '👧', color: '#F2994A' },
    { name: 'Anak 3', emoji: '🧒', color: '#9B51E0' },
  ].map((profile, index) => ({
    id: `prof_seed_${index + 1}`,
    name: profile.name,
    emoji: profile.emoji,
    color: profile.color,
    visible: true,
    createdAt: now,
  }));
}

function seedEvents(profiles) {
  const day = dateKeyFromDate(new Date());
  const now = new Date().toISOString();
  const idOf = (name) => profiles.find((profile) => profile.name === name)?.id;
  const everyone = profiles.map((profile) => profile.id);

  const rows = [
    {
      title: 'Siap-siap sekolah',
      from: '06:30',
      to: '07:00',
      profileIds: [idOf('Anak 1'), idOf('Anak 2')],
      note: 'Mandiri: sikat gigi, pakai seragam, bawa tas.',
    },
    {
      title: 'Sarapan bersama',
      from: '07:00',
      to: '08:00',
      profileIds: everyone,
      note: 'Satu kegiatan untuk seluruh keluarga.',
    },
    {
      title: 'Baca buku',
      from: '08:30',
      to: '09:30',
      profileIds: [idOf('Anak 2')],
      note: '',
    },
    {
      title: 'Menyiapkan makan siang',
      from: '10:00',
      to: '11:00',
      profileIds: [idOf('Ibu')],
      note: 'Contoh kegiatan milik satu profil.',
    },
    {
      title: 'Istirahat siang',
      from: '13:00',
      to: '14:00',
      profileIds: [idOf('Anak 3')],
      note: '',
    },
    {
      title: 'Bermain di taman',
      from: '16:00',
      to: '17:00',
      profileIds: [idOf('Anak 1'), idOf('Anak 3')],
      note: '',
    },
    {
      title: "Baca Al-Qur'an bersama",
      from: '19:30',
      to: '20:00',
      profileIds: [idOf('Ayah'), idOf('Anak 1')],
      note: 'Contoh kegiatan bersama: satu blok, dua peserta.',
    },
  ];

  return rows
    .filter((row) => row.profileIds.filter(Boolean).length > 0)
    .map((row, index) => ({
      id: `evt_seed_${index + 1}`,
      title: row.title,
      start: `${day}T${row.from}`,
      end: `${day}T${row.to}`,
      profileIds: row.profileIds.filter(Boolean),
      note: row.note,
      createdAt: now,
      updatedAt: now,
    }));
}

export function createSeedData() {
  const profiles = seedProfiles();
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles,
    events: seedEvents(profiles),
    specialDays: [],
    settings: defaultSettings(),
  };
}

/* ------------------------------------------------------------ sanitizing --- */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'];

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeProfile(raw, index, fallbackColor) {
  if (!raw || typeof raw !== 'object') return null;
  const name = asString(raw.name).trim();
  if (!name) return null;
  return {
    id: asString(raw.id) || `prof_import_${index}_${uid('p')}`,
    name: name.slice(0, 20),
    emoji: asString(raw.emoji, '🙂').slice(0, 8) || '🙂',
    color: HEX_COLOR.test(raw.color) ? raw.color.toUpperCase() : fallbackColor,
    visible: raw.visible !== false,
    createdAt: asString(raw.createdAt, new Date().toISOString()),
  };
}

function sanitizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const start = asString(raw.start);
  const end = asString(raw.end);
  if (!LOCAL_DATETIME.test(start) || !LOCAL_DATETIME.test(end)) return null;
  if (start.slice(0, 10) !== end.slice(0, 10)) return null; // single-day events in v1
  if (end <= start) return null;
  const title = asString(raw.title).trim() || 'Kegiatan';
  return {
    id: asString(raw.id),
    title: title.slice(0, 80),
    start,
    end,
    profileIds: Array.isArray(raw.profileIds)
      ? [...new Set(raw.profileIds.filter((id) => typeof id === 'string'))]
      : [],
    note: asString(raw.note).slice(0, 500),
    createdAt: asString(raw.createdAt, new Date().toISOString()),
    updatedAt: asString(raw.updatedAt, new Date().toISOString()),
  };
}

function sanitizeSpecialDay(raw, index) {
  if (!raw || typeof raw !== 'object' || !isDateKey(raw.date)) return null;
  const title = asString(raw.title).trim();
  if (!title) return null;
  return {
    id: asString(raw.id) || `special_import_${index}_${uid('s')}`,
    date: raw.date,
    title: title.slice(0, 60),
    type: ['holiday', 'special', 'birthday'].includes(raw.type) ? raw.type : 'special',
  };
}

function sanitizeSettings(raw) {
  const defaults = defaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const range = raw.visibleTimeRange && typeof raw.visibleTimeRange === 'object'
    ? raw.visibleTimeRange
    : {};
  const location = raw.location && typeof raw.location === 'object' ? raw.location : {};
  const prayer = raw.prayerSettings && typeof raw.prayerSettings === 'object' ? raw.prayerSettings : {};

  const snapCandidates = [5, 10, 15, 30];
  const snap = Number(raw.snapInterval);

  return {
    activeTheme: isThemeId(raw.activeTheme) ? raw.activeTheme : defaults.activeTheme,
    currentView: VIEW_IDS.includes(raw.currentView) ? raw.currentView : defaults.currentView,
    selectedDate: isDateKey(raw.selectedDate) ? raw.selectedDate : defaults.selectedDate,
    visibleTimeRange: {
      start: isTimeOfDay(range.start) ? range.start : defaults.visibleTimeRange.start,
      end: range.end === '24:00'
        ? '24:00'
        : (isTimeOfDay(range.end) ? range.end : defaults.visibleTimeRange.end),
      preset: asString(range.preset, defaults.visibleTimeRange.preset),
    },
    snapInterval: snapCandidates.includes(snap) ? snap : defaults.snapInterval,
    location: {
      name: asString(location.name).slice(0, 60),
      latitude: Number.isFinite(Number(location.latitude)) && location.latitude !== null
        ? Number(location.latitude)
        : null,
      longitude: Number.isFinite(Number(location.longitude)) && location.longitude !== null
        ? Number(location.longitude)
        : null,
      timezone: TIMEZONES.includes(location.timezone) ? location.timezone : defaults.location.timezone,
      elevation: Number.isFinite(Number(location.elevation)) && location.elevation !== null
        ? Number(location.elevation)
        : null,
    },
    prayerSettings: {
      method: 'kemenag',
      fajrAngle: Number.isFinite(Number(prayer.fajrAngle)) && prayer.fajrAngle !== null
        ? Number(prayer.fajrAngle)
        : null,
      ishaAngle: Number.isFinite(Number(prayer.ishaAngle)) && prayer.ishaAngle !== null
        ? Number(prayer.ishaAngle)
        : null,
      asrShadowFactor: Number.isFinite(Number(prayer.asrShadowFactor)) && prayer.asrShadowFactor !== null
        ? Number(prayer.asrShadowFactor)
        : null,
      elevationCorrection: prayer.elevationCorrection !== false,
      ihtiyatiMinutes: Number.isFinite(Number(prayer.ihtiyatiMinutes))
        ? Number(prayer.ihtiyatiMinutes)
        : 0,
      showMarkers: prayer.showMarkers !== false,
      preparationMinutes: Number.isFinite(Number(prayer.preparationMinutes))
        ? Number(prayer.preparationMinutes)
        : 0,
    },
  };
}

/**
 * Normalise any parsed JSON into a usable store.
 * Throws for structurally unsupported payloads; drops individual invalid rows.
 */
export function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Data bukan objek JSON yang valid.');
  }
  const version = Number(raw.schemaVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Versi skema data tidak dikenali.');
  }
  if (version > SCHEMA_VERSION) {
    throw new Error(`Versi skema ${version} lebih baru dari yang didukung aplikasi ini (${SCHEMA_VERSION}).`);
  }

  const profiles = [];
  const seenProfileIds = new Set();
  const rawProfiles = Array.isArray(raw.profiles) ? raw.profiles : [];
  rawProfiles.forEach((entry, index) => {
    const profile = sanitizeProfile(
      entry,
      index,
      DEFAULT_PROFILE_COLORS[index % DEFAULT_PROFILE_COLORS.length],
    );
    if (!profile) return;
    if (seenProfileIds.has(profile.id)) profile.id = `${profile.id}_${index}`;
    seenProfileIds.add(profile.id);
    profiles.push(profile);
  });

  const events = [];
  const seenEventIds = new Set();
  const rawEvents = Array.isArray(raw.events) ? raw.events : [];
  rawEvents.forEach((entry) => {
    const event = sanitizeEvent(entry);
    if (!event) return;
    event.profileIds = event.profileIds.filter((id) => seenProfileIds.has(id));
    if (!event.id || seenEventIds.has(event.id)) event.id = uid('evt');
    seenEventIds.add(event.id);
    events.push(event);
  });

  const specialDays = [];
  const seenSpecialIds = new Set();
  (Array.isArray(raw.specialDays) ? raw.specialDays : []).forEach((entry, index) => {
    const day = sanitizeSpecialDay(entry, index);
    if (!day) return;
    if (seenSpecialIds.has(day.id)) day.id = uid('special');
    seenSpecialIds.add(day.id);
    specialDays.push(day);
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    profiles,
    events,
    specialDays,
    settings: sanitizeSettings(raw.settings),
  };
}

/* ---------------------------------------------------------------- storage --- */

function storageAvailable() {
  try {
    const probe = '__tbk_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch (error) {
    return false;
  }
}

export const STORAGE_AVAILABLE = storageAvailable();

export function loadData() {
  if (!STORAGE_AVAILABLE) {
    console.warn('[storage] LocalStorage tidak tersedia. Data tidak akan bertahan setelah refresh.');
    return createSeedData();
  }

  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('[storage] Gagal membaca LocalStorage.', error);
    return createSeedData();
  }

  if (!raw) {
    const seeded = createSeedData();
    saveData(seeded);
    return seeded;
  }

  try {
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    console.error('[storage] Data tersimpan tidak dapat dibaca.', error);
    try {
      window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch (backupError) {
      console.error('[storage] Gagal menyimpan cadangan data rusak.', backupError);
    }
    const fresh = createSeedData();
    saveData(fresh);
    return fresh;
  }
}

export function saveData(data) {
  if (!STORAGE_AVAILABLE) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[storage] Gagal menyimpan data (mungkin kuota penuh).', error);
    return false;
  }
}

export function getStorageStats(data) {
  let bytes = 0;
  try {
    bytes = new Blob([window.localStorage.getItem(STORAGE_KEY) || '']).size;
  } catch (error) {
    bytes = 0;
  }
  return {
    profiles: data.profiles.length,
    events: data.events.length,
    specialDays: data.specialDays.length,
    bytes,
    available: STORAGE_AVAILABLE,
  };
}
