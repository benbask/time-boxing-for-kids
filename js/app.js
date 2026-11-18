/**
 * Application bootstrap and the single delegated event layer.
 *
 * Modules own their rendering; this file owns wiring, dialogs and toasts.
 */

import { renderCalendar, refreshNowIndicator } from './calendar.js';
import { initEventEditor } from './event-editor.js';
import { initCalendarInteractions } from './event-interactions.js';
import {
  dateHeadline,
  goToToday,
  moveSelectedDate,
  setView,
} from './navigation.js';
import {
  COLOR_CHOICES,
  EMOJI_CHOICES,
  eventCountForProfile,
  renderProfileChips,
  renderProfileList,
} from './profiles.js';
import { getData, initState, subscribe, update } from './state.js';
import { getStorageStats } from './storage.js';
import { THEMES, applyTheme } from './themes.js';
import { confirmAction, initConfirmDialog, showToast } from './ui.js';
import { escapeHtml, formatBytes, uid } from './utils.js';

const els = {
  calendarView: document.getElementById('calendarView'),
  profilesView: document.getElementById('profilesView'),
  settingsView: document.getElementById('settingsView'),
  calendarStage: document.getElementById('calendarStage'),
  profileChips: document.getElementById('profileChips'),
  profileList: document.getElementById('profileList'),
  dateLabel: document.getElementById('dateLabel'),
  dateSub: document.getElementById('dateSub'),
  focusBar: document.getElementById('focusBar'),
  focusDate: document.getElementById('focusDate'),
  themeGrid: document.getElementById('themeGrid'),
  storageStats: document.getElementById('storageStats'),
  profileDialog: document.getElementById('profileDialog'),
  profileDialogTitle: document.getElementById('profileDialogTitle'),
  profileForm: document.getElementById('profileForm'),
  profileFormError: document.getElementById('profileFormError'),
  emojiSelect: document.getElementById('emojiSelect'),
  colorPicker: document.getElementById('colorPicker'),
  gestureHint: document.getElementById('gestureHint'),
};

/* ------------------------------------------------------------------ render --- */
// Focus mode is temporary UI state: deliberately not written to settings or
// exported, and it resets on reload.
let focusMode = false;

const GESTURE_HINT_KEY = 'timeboxing-kids:gesture-hint-dismissed';

function maybeShowGestureHint(data) {
  const view = data.settings.currentView;
  const isCalendar = view === 'day' || view === 'week' || view === 'month';
  if (!isCalendar) return;
  if (localStorage.getItem(GESTURE_HINT_KEY)) return;
  if (els.gestureHint) {
    els.gestureHint.hidden = false;
  }
}

function dismissGestureHint() {
  localStorage.setItem(GESTURE_HINT_KEY, 'true');
  if (els.gestureHint) {
    els.gestureHint.hidden = true;
  }
}

function renderHeadline(data) {
  const { label, sub, short } = dateHeadline(data.settings.selectedDate);
  els.dateLabel.textContent = label;
  els.dateSub.textContent = sub;
  els.focusDate.textContent = short;
}

function applyChrome(data) {
  const view = data.settings.currentView;
  const isCalendar = view === 'day' || view === 'week' || view === 'month';
  if (!isCalendar) focusMode = false;

  const active = focusMode && isCalendar;
  document.body.classList.toggle('is-focus', active);
  els.focusBar.hidden = !active;

  document.querySelectorAll('.focus-toggle, .focus-exit').forEach((button) => {
    button.setAttribute('aria-pressed', String(active));
  });
}

function toggleFocus() {
  const view = getData().settings.currentView;
  if (view !== 'day' && view !== 'week' && view !== 'month') return;
  focusMode = !focusMode;
  applyChrome(getData());
}

function renderNav(data) {
  const view = data.settings.currentView;

  document.querySelectorAll('.nav-btn').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  document.querySelectorAll('.seg-btn').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderViews(data) {
  const view = data.settings.currentView;
  const isCalendar = view === 'day' || view === 'week' || view === 'month';

  els.calendarView.hidden = !isCalendar;
  els.profilesView.hidden = view !== 'profiles';
  els.settingsView.hidden = view !== 'settings';
}

function themeCardMarkup(theme, activeTheme) {
  const swatches = theme.swatches
    .map((color) => `<i style="background:${color}"></i>`)
    .join('');
  const isActive = theme.id === activeTheme;
  return `
    <button type="button" class="theme-card" role="radio" aria-checked="${isActive}"
      tabindex="${isActive ? '0' : '-1'}"
      data-action="set-theme" data-theme-id="${theme.id}">
      <span class="theme-swatches" aria-hidden="true">${swatches}</span>
      <span class="theme-name">${escapeHtml(theme.name)}</span>
      <span class="theme-check" aria-hidden="true">${isActive ? '✓' : ''}</span>
    </button>`;
}

function renderSettings(data) {
  els.themeGrid.innerHTML = THEMES
    .map((theme) => themeCardMarkup(theme, data.settings.activeTheme))
    .join('');

  const stats = getStorageStats(data);
  els.storageStats.innerHTML = `
    <div><dt>Profil</dt><dd>${stats.profiles}</dd></div>
    <div><dt>Kegiatan</dt><dd>${stats.events}</dd></div>
    <div><dt>Hari khusus</dt><dd>${stats.specialDays}</dd></div>
    <div><dt>Ukuran data</dt><dd>${formatBytes(stats.bytes)}</dd></div>
    <div><dt>Penyimpanan</dt><dd>${stats.available ? 'Tersedia' : 'Tidak tersedia'}</dd></div>`;
}

function renderAll() {
  const data = getData();
  applyTheme(data.settings.activeTheme);

  renderHeadline(data);
  renderNav(data);
  renderViews(data);
  renderProfileChips(els.profileChips, data);
  renderProfileList(els.profileList, data);
  renderSettings(data);

  // Keep the calendar untouched while another page is open, so its scroll
  // position survives navigation between Day and Profiles/Settings.
  const view = data.settings.currentView;
  if (view === 'day' || view === 'week' || view === 'month') {
    renderCalendar(els.calendarStage, data);
  }

  applyChrome(data);

  maybeShowGestureHint(data);
}

/* ------------------------------------------------------------------ mutate --- */

function mutate(mutator, successMessage = '') {
  const saved = update(mutator);
  if (!saved) {
    showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.');
    return false;
  }
  if (successMessage) showToast(successMessage);
  return true;
}

/* ---------------------------------------------------------------- profiles --- */

function toggleProfile(profileId) {
  const profile = getData().profiles.find((entry) => entry.id === profileId);
  if (!profile) return;
  mutate((draft) => {
    const target = draft.profiles.find((entry) => entry.id === profileId);
    if (target) target.visible = !target.visible;
  });
}

function setAllProfilesVisible(visible) {
  const data = getData();
  if (data.profiles.length === 0) {
    showToast('Belum ada profil untuk ditampilkan.');
    return;
  }
  if (data.profiles.every((profile) => profile.visible === visible)) {
    showToast(visible ? 'Semua profil sudah ditampilkan.' : 'Semua profil sudah disembunyikan.');
    return;
  }
  mutate((draft) => {
    draft.profiles.forEach((profile) => { profile.visible = visible; });
  }, visible ? 'Semua profil ditampilkan.' : 'Semua profil disembunyikan. Kegiatan tetap tersimpan.');
}

function fillEmojiOptions(selected) {
  const choices = [...EMOJI_CHOICES];
  if (selected && !choices.includes(selected)) choices.unshift(selected);
  els.emojiSelect.innerHTML = choices
    .map((emoji) => `<option value="${emoji}">${emoji}</option>`)
    .join('');
  if (selected) els.emojiSelect.value = selected;
}

function renderColorChoices(selected) {
  const choices = [...COLOR_CHOICES];
  if (selected && !choices.includes(selected.toUpperCase())) choices.unshift(selected.toUpperCase());
  els.colorPicker.innerHTML = choices.map((color) => `
    <button type="button" class="color-swatch" data-color="${color}"
      aria-pressed="${color === (selected || choices[0]).toUpperCase()}"
      aria-label="Warna ${color}" style="--swatch:${color}"></button>`).join('');
}

function nextUnused(choices, usedValues) {
  const used = new Set(usedValues.map((value) => String(value).toUpperCase()));
  return choices.find((value) => !used.has(String(value).toUpperCase())) || choices[0];
}

function openProfileDialog(profile = null) {
  els.profileForm.reset();
  els.profileFormError.hidden = true;
  els.profileDialogTitle.textContent = profile ? 'Ubah profil' : 'Tambah profil';
  els.profileForm.elements.profileId.value = profile ? profile.id : '';
  els.profileForm.elements.name.value = profile ? profile.name : '';

  const data = getData();
  const defaultEmoji = profile
    ? profile.emoji
    : nextUnused(EMOJI_CHOICES, data.profiles.map((entry) => entry.emoji));
  const defaultColor = profile
    ? profile.color
    : nextUnused(COLOR_CHOICES, data.profiles.map((entry) => entry.color));

  fillEmojiOptions(defaultEmoji);
  renderColorChoices(defaultColor);
  els.profileDialog.showModal();
  els.profileForm.elements.name.focus();
}

function closeProfileDialog() {
  if (els.profileDialog.open) els.profileDialog.close();
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.profileForm);
  const name = String(formData.get('name') || '').trim();
  const emoji = String(formData.get('emoji') || '🙂');
  const profileId = String(formData.get('profileId') || '');
  const color = els.colorPicker.querySelector('[aria-pressed="true"]')?.dataset.color || COLOR_CHOICES[0];

  if (!name) {
    els.profileFormError.textContent = 'Nama profil tidak boleh kosong.';
    els.profileFormError.hidden = false;
    els.profileForm.elements.name.focus();
    return;
  }

  if (profileId) {
    const saved = mutate((draft) => {
      const target = draft.profiles.find((entry) => entry.id === profileId);
      if (!target) return;
      target.name = name;
      target.emoji = emoji;
      target.color = color;
    }, 'Profil diperbarui.');
    if (saved) closeProfileDialog();
    return;
  }

  const saved = mutate((draft) => {
    draft.profiles.push({
      id: uid('prof'),
      name,
      emoji,
      color,
      visible: true,
      createdAt: new Date().toISOString(),
    });
  }, 'Profil ditambahkan.');
  if (saved) closeProfileDialog();
}

async function deleteProfile(profileId) {
  const data = getData();
  const profile = data.profiles.find((entry) => entry.id === profileId);
  if (!profile) return;

  const count = eventCountForProfile(data, profileId);
  const confirmed = await confirmAction({
    title: `Hapus profil ${profile.name}?`,
    message: count === 0
      ? 'Profil ini belum memiliki kegiatan. Tindakan ini tidak dapat dibatalkan.'
      : `${count} kegiatan yang melibatkan profil ini tetap tersimpan. Kegiatan bersama tetap dimiliki peserta lain; kegiatan tunggal menjadi kegiatan tanpa peserta. Tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: 'Hapus profil',
  });
  if (!confirmed) return;

  mutate((draft) => {
    draft.profiles = draft.profiles.filter((entry) => entry.id !== profileId);
    const now = new Date().toISOString();
    draft.events.forEach((event) => {
      if (!event.profileIds.includes(profileId)) return;
      event.profileIds = event.profileIds.filter((id) => id !== profileId);
      event.updatedAt = now;
    });
  }, 'Profil dihapus.');
}

/* ------------------------------------------------------------------ events --- */

async function handleActionClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget || !document.contains(actionTarget)) return;

  const action = actionTarget.dataset.action;
  // These two are owned by ui.js (confirmation dialog).
  if (action === 'accept-confirm' || action === 'cancel-confirm') return;

  switch (action) {
    case 'set-view':
      setView(actionTarget.dataset.view);
      break;
    case 'shift-date':
      moveSelectedDate(Number(actionTarget.dataset.days) || 0);
      break;
    case 'go-today':
      goToToday();
      break;
    case 'toggle-focus':
      toggleFocus();
      break;
    case 'toggle-profile':
      toggleProfile(actionTarget.dataset.profileId);
      break;
    case 'show-all-profiles':
      setAllProfilesVisible(true);
      break;
    case 'hide-all-profiles':
      setAllProfilesVisible(false);
      break;
    case 'new-profile':
      openProfileDialog();
      break;
    case 'edit-profile': {
      const profile = getData().profiles.find((entry) => entry.id === actionTarget.dataset.profileId);
      if (profile) openProfileDialog(profile);
      break;
    }
    case 'delete-profile':
      await deleteProfile(actionTarget.dataset.profileId);
      break;
    case 'close-profile-dialog':
      closeProfileDialog();
      break;
    case 'set-theme':
      mutate((draft) => { draft.settings.activeTheme = actionTarget.dataset.themeId; });
      els.themeGrid.querySelector('.theme-card[aria-checked="true"]')?.focus();
      break;
    case 'dismiss-gesture-hint':
      dismissGestureHint();
      break;
    default:
      break;
  }
}

/* -------------------------------------------------------------------- boot --- */

function bindEvents() {
  document.addEventListener('click', (event) => {
    handleActionClick(event).catch((error) => {
      console.error('[app] Aksi gagal.', error);
      showToast('Terjadi kesalahan. Coba lagi.');
    });
  });

  els.profileForm.addEventListener('submit', handleProfileSubmit);

  els.themeGrid.addEventListener('keydown', (event) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    if (!keys.includes(event.key)) return;
    const cards = [...els.themeGrid.querySelectorAll('.theme-card')];
    const index = cards.indexOf(document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    cards[(index + step + cards.length) % cards.length].click();
  });

  els.colorPicker.addEventListener('click', (event) => {
    const swatch = event.target.closest('.color-swatch');
    if (!swatch) return;
    els.colorPicker.querySelectorAll('.color-swatch').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === swatch));
    });
  });

  els.profileDialog.addEventListener('click', (event) => {
    if (event.target === els.profileDialog) closeProfileDialog();
  });
  els.profileDialog.addEventListener('close', () => {
    els.profileFormError.hidden = true;
  });

  initConfirmDialog();
  initEventEditor();
  initCalendarInteractions(els.calendarStage);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !focusMode) return;
    if (document.querySelector('dialog[open]')) return;
    toggleFocus();
  });

  window.addEventListener('focus', () => refreshNowIndicator(getData()));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshNowIndicator(getData());
  });
}

function startClock() {
  window.setInterval(() => {
    if (document.hidden) return;
    refreshNowIndicator(getData());
  }, 30000);
}

function init() {
  initState();
  bindEvents();
  subscribe(renderAll);
  renderAll();
  startClock();
}

init();
