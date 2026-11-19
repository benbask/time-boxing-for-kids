/**
 * Dialog for custom special days / holidays (SPEC.md §8).
 *
 * Stored as { id, date: "YYYY-MM-DD", title, type: 'holiday'|'special'|'birthday' }.
 * No external calendar API — everything is local.
 */

import { getData, update } from './state.js';
import { SPECIAL_TYPES } from './periods.js';
import { escapeHtml, uid } from './utils.js';

let editingId = null;
let closeDialog = null;

export function openSpecialDayDialog(special = null) {
  const dlg = document.getElementById('specialDayDialog');
  if (!dlg) return;

  editingId = special ? special.id : null;
  dlg.querySelector('#specialDayDialogTitle').textContent = special ? 'Ubah hari khusus' : 'Tambah hari khusus';
  dlg.querySelector('#specialDayDate').value = special ? special.date : '';
  dlg.querySelector('#specialDayTitle').value = special ? special.title : '';
  dlg.querySelector('#specialDayType').value = special ? special.type : 'special';

  const typeOpts = dlg.querySelector('#specialDayType');
  typeOpts.innerHTML = Object.entries(SPECIAL_TYPES).map(([id, type]) => (
    `<option value="${id}">${escapeHtml(type.label)}</option>`
  )).join('');

  const error = dlg.querySelector('.special-error');
  error.hidden = true;

  closeDialog = () => { dlg.close(); closeDialog = null; };
  dlg.showModal();
}

export function bindSpecialDayDialog() {
  const dlg = document.getElementById('specialDayDialog');
  if (!dlg) return;

  dlg.querySelector('#specialDayForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const date = dlg.querySelector('#specialDayDate').value;
    const title = String(dlg.querySelector('#specialDayTitle').value).trim();
    const type = dlg.querySelector('#specialDayType').value;
    const error = dlg.querySelector('.special-error');

    if (!date) { error.textContent = 'Pilih tanggal.'; error.hidden = false; return; }
    if (!title) { error.textContent = 'Nama hari khusus tidak boleh kosong.'; error.hidden = false; return; }

    update((draft) => {
      const existing = editingId
        ? draft.specialDays.find((entry) => entry.id === editingId)
        : null;
      if (existing) {
        existing.date = date;
        existing.title = title.slice(0, 60);
        existing.type = type;
      } else {
        draft.specialDays = draft.specialDays || [];
        draft.specialDays.push({
          id: `special_${Date.now()}`,
          date,
          title: title.slice(0, 60),
          type,
          createdAt: new Date().toISOString(),
        });
      }
    }, editingId ? 'Hari khusus diperbarui.' : 'Hari khusus ditambahkan.');

    closeDialog();
  });

  dlg.querySelector('[data-action="cancel-special-day"]')?.addEventListener('click', () => {
    closeDialog();
  });

  dlg.addEventListener('click', (event) => {
    if (event.target === dlg) closeDialog();
  });
  dlg.addEventListener('cancel', () => { closeDialog = null; });
}
