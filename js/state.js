/**
 * Single in-memory store. Every successful mutation is persisted immediately,
 * then subscribers re-render. No module keeps its own copy of the data.
 */

import { loadData, saveData } from './storage.js';

let data = null;
const listeners = new Set();

export function initState() {
  data = loadData();
  return data;
}

export function getData() {
  if (!data) throw new Error('State belum diinisialisasi.');
  return data;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Apply a synchronous mutation and persist it.
 * @param {(draft: object) => void} mutator
 * @returns {boolean} whether the change was written to storage
 */
export function update(mutator) {
  const current = getData();
  mutator(current);
  const saved = saveData(current);
  listeners.forEach((listener) => listener(current));
  return saved;
}

export function updateSettings(patch) {
  return update((draft) => {
    Object.assign(draft.settings, patch);
  });
}
