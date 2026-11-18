/**
 * Lightweight editor for one activity: title, participating profiles, notes.
 * Save and delete live here so the timeline module never owns dialog logic.
 * Times are edited directly on the timeline (move / resize), not in this form.
 */

import { getData, update } from './state.js';
import { confirmAction, showToast } from './ui.js';
import { escapeHtml } from './utils.js';

const els = {};
let editingId = null;

function checkedProfileIds() {
  return [...els.profiles.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => input.value);
}

function renderProfileOptions(profiles, selectedIds) {
  if (profiles.length === 0) {
    els.profiles.innerHTML = '<p class="event-profiles-empty">Belum ada profil. Tambahkan profil di halaman Profil untuk menandai peserta.</p>';
    return;
  }

  const selected = new Set(selectedIds);
  els.profiles.innerHTML = profiles.map((profile) => `
    <label class="event-profile-option" style="--person-color:${escapeHtml(profile.color)}">
      <input type="checkbox" value="${escapeHtml(profile.id)}"${selected.has(profile.id) ? ' checked' : ''}>
      <span class="event-profile-emoji" aria-hidden="true">${escapeHtml(profile.emoji)}</span>
      <span class="event-profile-name">${escapeHtml(profile.name)}</span>
    </label>`).join('');
}

function closeEditor() {
  editingId = null;
  if (els.dialog.open) els.dialog.close();
}

export function openEventEditor(eventId) {
  const data = getData();
  const event = data.events.find((entry) => entry.id === eventId);
  if (!event || !els.dialog) return;

  editingId = event.id;
  els.form.reset();
  els.error.hidden = true;
  els.title.value = event.title;
  els.note.value = event.note || '';
  els.time.textContent = `${event.start.slice(11, 16)} – ${event.end.slice(11, 16)}`;
  renderProfileOptions(data.profiles, event.profileIds);

  els.dialog.showModal();
  els.title.focus();
  els.title.select();
}

function handleSubmit(event) {
  event.preventDefault();
  if (!editingId) return;

  const title = els.title.value.trim();
  if (!title) {
    els.error.textContent = 'Nama kegiatan tidak boleh kosong.';
    els.error.hidden = false;
    els.title.focus();
    return;
  }

  const profileIds = checkedProfileIds();
  const note = els.note.value.trim();
  const targetId = editingId;
  const saved = update((draft) => {
    const target = draft.events.find((entry) => entry.id === targetId);
    if (!target) return;
    target.title = title.slice(0, 80);
    target.profileIds = profileIds;
    target.note = note.slice(0, 500);
    target.updatedAt = new Date().toISOString();
  });

  if (!saved) {
    showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.');
    return;
  }

  closeEditor();
  showToast('Kegiatan disimpan.');
}

async function handleDelete() {
  if (!editingId) return;
  const targetId = editingId;
  const event = getData().events.find((entry) => entry.id === targetId);
  if (!event) {
    closeEditor();
    return;
  }

  const confirmed = await confirmAction({
    title: `Hapus kegiatan "${event.title}"?`,
    message: `${event.start.slice(11, 16)} – ${event.end.slice(11, 16)} akan dihapus dari kalender keluarga. Tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: 'Hapus kegiatan',
  });
  if (!confirmed) return;

  closeEditor();
  const saved = update((draft) => {
    draft.events = draft.events.filter((entry) => entry.id !== targetId);
  });
  if (saved) showToast('Kegiatan dihapus.');
  else showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.');
}

export function initEventEditor() {
  const dialog = document.getElementById('eventDialog');
  if (!dialog) return;

  els.dialog = dialog;
  els.form = dialog.querySelector('#eventForm');
  els.title = dialog.querySelector('#eventTitle');
  els.time = dialog.querySelector('#eventDialogTime');
  els.profiles = dialog.querySelector('#eventProfiles');
  els.note = dialog.querySelector('#eventNote');
  els.error = dialog.querySelector('#eventFormError');
  els.delete = dialog.querySelector('#eventDelete');
  els.cancel = dialog.querySelector('#eventCancel');

  els.form.addEventListener('submit', handleSubmit);
  els.delete.addEventListener('click', () => {
    handleDelete().catch((error) => {
      console.error('[event-editor] Hapus gagal.', error);
      showToast('Terjadi kesalahan. Coba lagi.');
    });
  });
  els.cancel.addEventListener('click', closeEditor);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeEditor();
  });
  dialog.addEventListener('close', () => {
    editingId = null;
    els.error.hidden = true;
  });
}
