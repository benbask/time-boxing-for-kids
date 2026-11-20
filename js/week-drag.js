/**
 * Week-view day drag (Phase 4).
 *
 * A long press arms the gesture, then a horizontal drag moves the activity to
 * the previous or next day. Only the date part changes; the times stay put.
 * Vertical scrolling stays normal until the hold completes, so a swipe still
 * scrolls the week.
 */

import { getData, update } from './state.js';
import { addDays, eventDateKey, parseDateKey } from './utils.js';
import { showToast } from './ui.js';

const LONG_PRESS_DELAY_MS = 380;
const SWIPE_TOLERANCE_PX = 10;
const DRAG_THRESHOLD_PX = 8;
const CLICK_SUPPRESS_MS = 500;

let stage = null;
let gesture = null;
let suppressClickUntil = 0;

function columns() {
  return stage ? [...stage.querySelectorAll('.week-cols > .week-col')] : [];
}

function columnAt(clientX, rects) {
  if (rects.length === 0) return 0;

  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    if (clientX >= rect.left && clientX <= rect.right) return index;
  }
  if (clientX < rects[0].left) return 0;
  if (clientX > rects[rects.length - 1].right) return rects.length - 1;

  let nearest = 0;
  let nearestDistance = Infinity;
  rects.forEach((rect, index) => {
    const distance = Math.abs(clientX - (rect.left + rect.width / 2));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

function setDropTarget(index) {
  columns().forEach((column, position) => {
    column.classList.toggle('is-drop-target', position === index);
  });
}

function clearDropTarget() {
  document.querySelectorAll('.week-col.is-drop-target')
    .forEach((column) => column.classList.remove('is-drop-target'));
}

function holdPageStill(event) {
  const current = gesture;
  if (!current || !event.cancelable || !event.touches?.length) return;

  const touch = event.touches[0];
  const dx = touch.clientX - current.startX;
  const dy = touch.clientY - current.startY;

  // Once held, a clearly vertical move means "scroll", not "move to another day".
  // Hand it back to the browser instead of trapping the finger.
  if (!current.dragging
    && Math.abs(dy) > SWIPE_TOLERANCE_PX
    && Math.abs(dy) > Math.abs(dx) + DRAG_THRESHOLD_PX) {
    cleanup();
    return;
  }
  event.preventDefault();
}

function armDrag() {
  const current = gesture;
  if (!current || current.armed) return;

  current.armed = true;
  current.timer = null;
  current.rects = columns().map((column) => column.getBoundingClientRect());
  current.block.classList.add('is-week-dragging');
  document.body.classList.add('is-gesturing');

  if (current.touchLike) {
    window.addEventListener('touchmove', holdPageStill, { passive: false });
    try {
      current.block.setPointerCapture?.(current.pointerId);
    } catch {
      /* capture is best-effort */
    }
    try {
      navigator.vibrate?.(10);
    } catch {
      /* haptics are best-effort */
    }
  }
}

function cleanup() {
  const current = gesture;
  if (!current) return;
  gesture = null;

  if (current.timer) window.clearTimeout(current.timer);
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onCancel);
  window.removeEventListener('touchmove', holdPageStill);

  current.block.classList.remove('is-week-dragging');
  current.block.style.transform = '';
  document.body.classList.remove('is-gesturing');
  clearDropTarget();

  if (current.block.hasPointerCapture?.(current.pointerId)) {
    try {
      current.block.releasePointerCapture(current.pointerId);
    } catch {
      /* best-effort */
    }
  }
}

function onMove(event) {
  const current = gesture;
  if (!current || event.pointerId !== current.pointerId) return;

  const dx = event.clientX - current.startX;
  const dy = event.clientY - current.startY;

  if (!current.armed) {
    // Moving before the hold completes means a swipe or a scroll.
    if (Math.hypot(dx, dy) > SWIPE_TOLERANCE_PX) cleanup();
    return;
  }

  if (!current.dragging) {
    if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    current.dragging = true;
    current.block.classList.add('is-week-dragging');
  }

  if (event.cancelable) event.preventDefault();
  current.block.style.transform = `translateX(${dx}px)`;

  const next = columnAt(event.clientX, current.rects);
  if (next !== current.targetIndex) {
    current.targetIndex = next;
    setDropTarget(next);
  }
}

function onUp(event) {
  const current = gesture;
  if (!current || event.pointerId !== current.pointerId) return;

  const { dragging, sourceIndex, targetIndex, eventId, dateKey } = current;
  cleanup();
  if (!dragging) return; // a plain tap: the click handler opens the editor

  suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
  const shift = targetIndex - sourceIndex;
  if (shift === 0) return;

  const nextKey = addDays(dateKey, shift);
  const saved = update((draft) => {
    const target = draft.events.find((entry) => entry.id === eventId);
    if (!target) return;
    target.start = `${nextKey}T${target.start.slice(11)}`;
    target.end = `${nextKey}T${target.end.slice(11)}`;
    target.updatedAt = new Date().toISOString();
  });

  if (!saved) {
    showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.');
    return;
  }

  const nextDate = parseDateKey(nextKey);
  const label = nextDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  showToast(`Dipindah ke ${label}.`);
}

function onCancel(event) {
  const current = gesture;
  if (!current || event.pointerId !== current.pointerId) return;
  cleanup();
}

function handlePointerDown(event) {
  if (gesture || !event.isPrimary) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  const block = event.target.closest('.week-event');
  if (!block) return;

  const eventId = block.dataset.eventId;
  const column = block.closest('.week-col');
  const container = column?.parentElement;
  if (!eventId || !column || !container) return;

  const record = getData().events.find((entry) => entry.id === eventId);
  if (!record) return;

  const sourceIndex = [...container.children].indexOf(column);
  if (sourceIndex < 0) return;

  gesture = {
    block,
    eventId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    sourceIndex,
    targetIndex: sourceIndex,
    dateKey: eventDateKey(record),
    touchLike: event.pointerType !== 'mouse',
    armed: false,
    dragging: false,
    timer: null,
    rects: [],
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  if (gesture.touchLike) {
    gesture.timer = window.setTimeout(armDrag, LONG_PRESS_DELAY_MS);
  } else {
    armDrag();
  }
}

function handleClickCapture(event) {
  if (Date.now() >= suppressClickUntil) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopPropagation();
}

export function initWeekDrag(stageElement) {
  stage = stageElement;
  if (!stage) return;

  stage.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('click', handleClickCapture, true);
}
