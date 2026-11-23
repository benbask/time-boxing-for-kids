/**
 * Lazy loader and search for the full list of Indonesian regencies/cities.
 *
 * The dataset lives in `data/cities.json` so the main app bundle stays small.
 * It is fetched only when the city picker is first opened, and follows the
 * `?v=` asset version from the page URL just like the CSS/JS files.
 *
 * Rows are compact arrays: [id, name, latitude, longitude, elevation, tz, province].
 * Source: emsifa/api-wilayah-indonesia (MIT), derived from Kepmendagri/BIG.
 * Elevation is intentionally zero for every row: Kemenag's published schedules
 * match an uncorrected horizon, and applying elevation shifted Maghrib by 2–3
 * minutes in the Bandar Lampung reference check.
 */

const TIMEZONES = Object.freeze({
  7: 'Asia/Jakarta',
  8: 'Asia/Makassar',
  9: 'Asia/Jayapura',
});

export const CITY_LIST_URL = 'data/cities.json';

let cache = null;
let pending = null;

function versionQuery() {
  const version = new URLSearchParams(window.location.search).get('v');
  return version ? `?v=${encodeURIComponent(version)}` : '';
}

export function loadCities() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = fetch(`${CITY_LIST_URL}${versionQuery()}`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      cache = (payload.cities || []).map((row) => ({
        id: row[0],
        name: row[1],
        latitude: row[2],
        longitude: row[3],
        elevation: row[4],
        tz: row[5],
        timezone: TIMEZONES[row[5]] || TIMEZONES[7],
        province: row[6],
      }));
      return cache;
    })
    .finally(() => { pending = null; });

  return pending;
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Max 30 results; every word in the query must appear in the name or province. */
export function searchCities(cities, query, limit = 30) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return cities.slice(0, limit);
  return cities.filter((city) => {
    const haystack = fold(`${city.name} ${city.province}`);
    return words.every((word) => haystack.includes(word));
  }).slice(0, limit);
}

/** Nearest city by equirectangular distance; used to inherit its timezone. */
export function nearestCity(cities, latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let best = null;
  let bestDistance = Infinity;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  cities.forEach((city) => {
    const dLat = city.latitude - latitude;
    const dLon = (city.longitude - longitude) * cosLat;
    const distance = dLat * dLat + dLon * dLon;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  });
  return best;
}

/** Resolve a location saved before city IDs existed (matched by name). */
export function resolveSavedCity(cities, location) {
  if (!location) return null;
  if (location.id) {
    const byId = cities.find((city) => city.id === location.id);
    if (byId) return byId;
  }
  if (!location.name) return null;
  const wanted = fold(location.name);
  return cities.find((city) => fold(city.name) === wanted)
    || cities.find((city) => fold(city.name).includes(wanted))
    || null;
}
