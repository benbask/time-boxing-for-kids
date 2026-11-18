/**
 * Tiny UI helpers: transient toast and a promise-based confirmation dialog.
 * Kept separate so feature modules never manipulate each other's DOM.
 */

let toastTimer = null;

export function showToast(message, { duration = 2800 } = {}) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

let confirmResolver = null;
let confirmElements = null;

export function initConfirmDialog() {
  const dialog = document.getElementById('confirmDialog');
  if (!dialog) return;

  confirmElements = {
    dialog,
    title: dialog.querySelector('#confirmTitle'),
    message: dialog.querySelector('#confirmMessage'),
    accept: dialog.querySelector('[data-action="accept-confirm"]'),
    cancel: dialog.querySelector('[data-action="cancel-confirm"]'),
  };

  const settle = (result) => {
    if (!confirmResolver) return;
    const resolve = confirmResolver;
    confirmResolver = null;
    if (dialog.open) dialog.close();
    resolve(result);
  };

  confirmElements.accept.addEventListener('click', () => settle(true));
  confirmElements.cancel.addEventListener('click', () => settle(false));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    settle(false);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) settle(false);
  });
}

/**
 * @returns {Promise<boolean>} true when the user confirms
 */
export function confirmAction({
  title = 'Konfirmasi',
  message = '',
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  danger = true,
} = {}) {
  if (!confirmElements) return Promise.resolve(window.confirm(message || title));

  const { dialog } = confirmElements;
  if (confirmResolver) {
    confirmResolver(false);
    confirmResolver = null;
  }

  confirmElements.title.textContent = title;
  confirmElements.message.textContent = message;
  confirmElements.accept.textContent = confirmLabel;
  confirmElements.cancel.textContent = cancelLabel;
  confirmElements.accept.classList.toggle('btn-danger', danger);
  confirmElements.accept.classList.toggle('btn-primary', !danger);

  return new Promise((resolve) => {
    confirmResolver = resolve;
    dialog.showModal();
    confirmElements.cancel.focus();
  });
}
