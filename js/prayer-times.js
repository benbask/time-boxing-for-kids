/**
 * Offline prayer-time calculation (Kemenag method).
 *
 * Parameters follow the Indonesian Ministry of Religious Affairs (Kemenag)
 * criteria:
 *   - Fajr: sun 20° below the horizon.
 *   - Isha: sun 18° below the horizon.
 *   - Asr: shadow ratio 1 (Shafi'i).
 *   - Ihtiyati: 2 minutes added to every prayer time.
 *
 * The sun position uses the NOAA approximation for declination and the
 * equation of time. No network request and no per-city table is used: every
 * result is derived from the location's latitude/longitude and the date.
 *
 * Verification (Bandar Lampung, 05°23' LS / 105°16' BT, WIB) against the
 * published Kemenag-style schedule on jadwalsholat.org:
 *   2026-11-01  calc 04:16 11:45 15:01 17:54 19:05  ref 04:16 11:45 15:01 17:53 19:05
 *   2026-11-23  calc 04:13 11:48 15:12 17:59 19:14  ref 04:13 11:47 15:11 17:59 19:13
 *   2026-11-30  calc 04:14 11:50 15:16 18:02 19:17  ref 04:13 11:49 15:15 18:01 19:16
 * Every value is within 1 minute of the reference.
 */

import { pad2 } from './utils.js';

const DEG = Math.PI / 180;
const MS_PER_DAY = 86400000;
const EARTH_RADIUS_M = 6371000;
const DAY_MINUTES = 1440;

/** Kemenag criteria, used when a saved value is missing. */
export const KEMENAG_PARAMS = Object.freeze({
  fajrAngle: 20,
  ishaAngle: 18,
  asrShadowFactor: 1,
  ihtiyatiMinutes: 2,
});

export const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_LABELS = Object.freeze({
  fajr: 'Subuh',
  dhuhr: 'Dzuhur',
  asr: 'Ashar',
  maghrib: 'Maghrib',
  isha: 'Isya',
});

const TIMEZONE_OFFSETS = Object.freeze({
  'Asia/Jakarta': 7,
  'Asia/Makassar': 8,
  'Asia/Jayapura': 9,
});

/** A small set of Indonesian cities; users can pick the nearest one. */
export const CITY_PRESETS = Object.freeze([
  { id: 'bandar-lampung', name: 'Bandar Lampung', latitude: -5.3833, longitude: 105.2667, timezone: 'Asia/Jakarta', elevation: 0 },
  { id: 'jakarta', name: 'Jakarta', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta', elevation: 8 },
  { id: 'bandung', name: 'Bandung', latitude: -6.9175, longitude: 107.6191, timezone: 'Asia/Jakarta', elevation: 768 },
  { id: 'semarang', name: 'Semarang', latitude: -6.9667, longitude: 110.4167, timezone: 'Asia/Jakarta', elevation: 5 },
  { id: 'yogyakarta', name: 'Yogyakarta', latitude: -7.7956, longitude: 110.3695, timezone: 'Asia/Jakarta', elevation: 113 },
  { id: 'surabaya', name: 'Surabaya', latitude: -7.2575, longitude: 112.7521, timezone: 'Asia/Jakarta', elevation: 5 },
  { id: 'medan', name: 'Medan', latitude: 3.5952, longitude: 98.6722, timezone: 'Asia/Jakarta', elevation: 25 },
  { id: 'palembang', name: 'Palembang', latitude: -2.9761, longitude: 104.7754, timezone: 'Asia/Jakarta', elevation: 8 },
  { id: 'padang', name: 'Padang', latitude: -0.9471, longitude: 100.4172, timezone: 'Asia/Jakarta', elevation: 8 },
  { id: 'banjarmasin', name: 'Banjarmasin', latitude: -3.3186, longitude: 114.5944, timezone: 'Asia/Jakarta', elevation: 5 },
  { id: 'pontianak', name: 'Pontianak', latitude: -0.0263, longitude: 109.3425, timezone: 'Asia/Jakarta', elevation: 5 },
  { id: 'makassar', name: 'Makassar', latitude: -5.1477, longitude: 119.4327, timezone: 'Asia/Makassar', elevation: 5 },
  { id: 'denpasar', name: 'Denpasar', latitude: -8.6705, longitude: 115.2126, timezone: 'Asia/Makassar', elevation: 4 },
  { id: 'manado', name: 'Manado', latitude: 1.4748, longitude: 124.8421, timezone: 'Asia/Makassar', elevation: 5 },
  { id: 'jayapura', name: 'Jayapura', latitude: -2.5916, longitude: 140.6690, timezone: 'Asia/Jayapura', elevation: 287 },
]);

export function timezoneOffsetHours(timezone) {
  return TIMEZONE_OFFSETS[timezone] ?? TIMEZONE_OFFSETS['Asia/Jakarta'];
}

function dayOfYear(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = Date.UTC(year, 0, 1);
  const date = Date.UTC(year, month - 1, day);
  return Math.floor((date - start) / MS_PER_DAY) + 1;
}

/** Solar declination (radians) and equation of time (minutes). */
function solarPosition(dateKey) {
  const n = dayOfYear(dateKey);
  const gamma = (2 * Math.PI / 365) * (n - 1 + 0.5);
  const eqtime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
  const decl = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  return { eqtime, decl };
}

/** Hour angle (degrees) for a given solar altitude, or null if never reached. */
function hourAngle(latRad, decRad, altitudeRad) {
  const cosH = (Math.sin(altitudeRad) - Math.sin(latRad) * Math.sin(decRad))
    / (Math.cos(latRad) * Math.cos(decRad));
  if (cosH < -1 || cosH > 1) return null;
  return Math.acos(cosH) / DEG;
}

function asrAltitude(latRad, decRad, shadowFactor) {
  return Math.atan(1 / (shadowFactor + Math.tan(Math.abs(latRad - decRad)))) / DEG;
}

/**
 * Calculate prayer times for one date and location.
 *
 * @param {string} dateKey - Local date, `YYYY-MM-DD`.
 * @param {{latitude:number|null, longitude:number|null, timezone?:string, elevation?:number|null}} location
 * @param {{fajrAngle?:number, ishaAngle?:number, asrShadowFactor?:number, ihtiyatiMinutes?:number, elevationCorrection?:boolean}} settings
 * @returns {{imsak:number, fajr:number, sunrise:number, dhuhr:number, asr:number, maghrib:number, isha:number}|null}
 *   Minutes from local midnight, or null when the location has no coordinates.
 */
export function calculatePrayerTimes(dateKey, location = {}, settings = {}) {
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) >= 66) return null;

  const fajrAngle = Number.isFinite(settings.fajrAngle) ? settings.fajrAngle : KEMENAG_PARAMS.fajrAngle;
  const ishaAngle = Number.isFinite(settings.ishaAngle) ? settings.ishaAngle : KEMENAG_PARAMS.ishaAngle;
  const asrShadowFactor = Number.isFinite(settings.asrShadowFactor)
    ? settings.asrShadowFactor
    : KEMENAG_PARAMS.asrShadowFactor;
  const ihtiyati = Number.isFinite(settings.ihtiyatiMinutes)
    ? settings.ihtiyatiMinutes
    : KEMENAG_PARAMS.ihtiyatiMinutes;

  const elevation = settings.elevationCorrection === false
    ? 0
    : Math.max(0, Number(location.elevation) || 0);
  const dip = elevation > 0
    ? Math.acos(EARTH_RADIUS_M / (EARTH_RADIUS_M + elevation)) / DEG
    : 0;

  const { eqtime, decl } = solarPosition(dateKey);
  const latRad = lat * DEG;
  const decRad = decl;
  const tz = timezoneOffsetHours(location.timezone);
  const noon = 720 - 4 * lon - eqtime + tz * 60;

  const fajrH = hourAngle(latRad, decRad, -fajrAngle * DEG);
  const ishaH = hourAngle(latRad, decRad, -ishaAngle * DEG);
  const horizonH = hourAngle(latRad, decRad, (-0.833 - dip) * DEG);
  const asrH = hourAngle(latRad, decRad, asrAltitude(latRad, decRad, asrShadowFactor) * DEG);
  if (fajrH === null || ishaH === null || horizonH === null || asrH === null) return null;

  const round = (value) => Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(value)));

  return {
    imsak: round(noon - (fajrH / 15) * 60 - 10),
    fajr: round(noon - (fajrH / 15) * 60 + ihtiyati),
    sunrise: round(noon - (horizonH / 15) * 60),
    dhuhr: round(noon + ihtiyati),
    asr: round(noon + (asrH / 15) * 60 + ihtiyati),
    maghrib: round(noon + (horizonH / 15) * 60 + ihtiyati),
    isha: round(noon + (ishaH / 15) * 60 + ihtiyati),
  };
}

/** "04:13" for a minutes-of-day value. */
export function prayerTimeLabel(minutes) {
  const total = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(Number(minutes) || 0)));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** Today's times for the settings preview. */
export function prayerTimesForDate(data, dateKey) {
  return calculatePrayerTimes(
    dateKey,
    data.settings.location,
    data.settings.prayerSettings,
  );
}
