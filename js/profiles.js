/**
 * Family profile UI: the always-visible chip bar and the Profiles page.
 * Profiles own colour and visibility; they never own calendar columns.
 */

import { escapeHtml, hexToRgba } from './utils.js';

export const EMOJI_CHOICES = [
  '👨', '👩', '👦', '👧', '🧒', '👶', '👴', '👵',
  '🧑', '👨‍🦰', '👩‍🦱', '🧕', '👳', '🐱', '🐰', '🦊',
  '🐼', '🐨', '🦁', '🌟', '⚽', '🎨', '📚', '🎵',
];

export const COLOR_CHOICES = [
  '#2F80ED', '#00A0A8', '#27AE60', '#7CB342', '#C48A00',
  '#F2994A', '#E2574C', '#E05C94', '#9B51E0', '#7A5AF8',
];

export function eventCountForProfile(data, profileId) {
  return data.events.filter((event) => event.profileIds.includes(profileId)).length;
}

export function renderProfileChips(container, data) {
  const previousScrollLeft = container.scrollLeft;

  if (data.profiles.length === 0) {
    container.innerHTML = '<p class="hint">Belum ada profil. Tambahkan anggota keluarga di halaman Profil.</p>';
    return;
  }

  container.innerHTML = data.profiles.map((profile) => {
    const isVisible = profile.visible !== false;
    return `
      <button type="button"
        class="profile-chip"
        data-action="toggle-profile"
        data-profile-id="${escapeHtml(profile.id)}"
        aria-pressed="${isVisible}"
        aria-label="${escapeHtml(profile.name)} — ${isVisible ? 'tampil' : 'disembunyikan'}"
        title="${isVisible ? 'Sembunyikan' : 'Tampilkan'} ${escapeHtml(profile.name)}"
        style="--chip-color:${escapeHtml(profile.color)};--chip-tint:${hexToRgba(profile.color, 0.16)}">
        <span class="chip-emoji" aria-hidden="true">${escapeHtml(profile.emoji)}</span>
        <span class="chip-name">${escapeHtml(profile.name)}</span>
      </button>`;
  }).join('');

  if (previousScrollLeft > 0) container.scrollLeft = previousScrollLeft;
}

function profileRowMarkup(data, profile) {
  const isVisible = profile.visible !== false;
  const count = eventCountForProfile(data, profile.id);
  return `
    <div class="profile-row" data-profile-row="${escapeHtml(profile.id)}"
      style="--avatar-color:${escapeHtml(profile.color)};--avatar-tint:${hexToRgba(profile.color, 0.16)}">
      <span class="profile-avatar" aria-hidden="true">${escapeHtml(profile.emoji)}</span>

      <div class="profile-identity">
        <p class="profile-name">
          <span class="color-dot" aria-hidden="true"></span>
          ${escapeHtml(profile.name)}
        </p>
        <p class="profile-meta">${count} kegiatan · ${isVisible ? 'ditampilkan' : 'disembunyikan'}</p>
      </div>

      <div class="profile-controls">
        <button type="button" class="switch" data-action="toggle-profile" data-profile-id="${escapeHtml(profile.id)}"
          aria-pressed="${isVisible}" aria-label="${isVisible ? 'Sembunyikan' : 'Tampilkan'} ${escapeHtml(profile.name)}">
          <span class="switch-track" aria-hidden="true"></span>
          <span>${isVisible ? 'Tampil' : 'Sembunyi'}</span>
        </button>
        <button type="button" class="row-btn" data-action="edit-profile" data-profile-id="${escapeHtml(profile.id)}"
          aria-label="Ubah profil ${escapeHtml(profile.name)}" title="Ubah">✏️</button>
        <button type="button" class="row-btn" data-action="delete-profile" data-profile-id="${escapeHtml(profile.id)}"
          aria-label="Hapus profil ${escapeHtml(profile.name)}" title="Hapus">🗑️</button>
      </div>
    </div>`;
}

export function renderProfileList(container, data) {
  if (data.profiles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Belum ada profil keluarga. Tambahkan anggota pertama dengan tombol <strong>Tambah profil</strong>.
      </div>`;
    return;
  }
  container.innerHTML = data.profiles.map((profile) => profileRowMarkup(data, profile)).join('');
}
