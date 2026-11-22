/**
 * Direct manipulation for the day timeline (SPEC.md §6, Phase 2).
 *
 * - Tap / click an empty area: create a 30-minute activity.
 * - Drag the middle of a block: move it, preserving duration.
 * - Drag the top or bottom handle: resize one edge.
 * - Tap a block or its pencil button: open the lightweight editor.
 *
 * All values snap to the 10-minute interval from settings (default 10), with a
 * minimum duration of 10 minutes. Gestures use Pointer Events so mouse, touch,
 * pen and stylus behave the same. The timeline rerenders only when the gesture
 * ends; during the gesture the block is previewed in place.
 */

import { openEventEditor } from './event-editor.js';
import { getData, update } from './state.js';
import { showToast } from './ui.js';
import {
  eventEndMinutes,
  eventStartMinutes,
  formatDurationLabel,
  minutesToTime,
  pad2,
  snapMinutes,
  uid,
} from './utils.js';

const DAY_MINUTES = 1440;
const DEFAULT_DURATION = 30;
const MIN_DURATION = 10;
/** Finger travel that proves the user means to drag (after the long press). */
const DRAG_THRESHOLD_PX = 8;
/** Finger travel allowed while waiting for the long press; more means "swipe". */
const LONG_PRESS_TOLERANCE_PX = 10;
const LONG_PRESS_DELAY_MS = 380;
const SWIPE_CLICK_SUPPRESS_MS = 400;
const MAX_END = 1439; // storage sanitizer requires end > start on the same day

let stage = null;
let suppressClickUntil = 0;
let canvasPointerDown = null;
let activeGesture = null;

function snapInterval() {
  const value = Number(getData().settings.snapInterval);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function findEvent(eventId) {
  return getData().events.find((entry) => entry.id === eventId) || null;
}

/* --------------------------------------------------------------- preview --- */

function applyPreview(block, startMinutes, endMinutes) {
  const duration = Math.max(1, endMinutes - startMinutes);
  block.style.top = `calc(${((startMinutes / DAY_MINUTES) * 100).toFixed(4)}% + 1px)`;
  block.style.height = `calc(${((duration / DAY_MINUTES) * 100).toFixed(4)}% - 2px)`;
  const time = block.querySelector('.event-time-text');
  if (time) {
    time.textContent = `${pad2(Math.floor(startMinutes / 60))}:${pad2(startMinutes % 60)} – ${minutesToTime(endMinutes)}`;
  }
  block.querySelectorAll('.event-duration').forEach((label) => {
    label.textContent = formatDurationLabel(duration);
  });
}

/* --------------------------------------------------------------- gesture --- */

function startGesture(pointerEvent, block, mode) {
  if (pointerEvent.button !== 0) return;
  if (pointerEvent.target.closest('[data-edit-event]')) return;

  const eventId = block.dataset.eventId;
  const original = findEvent(eventId);
  if (!original) return;

  const canvas = stage.querySelector('.time-canvas');
  if (!canvas) return;

  const canvasHeight = canvas.getBoundingClientRect().height;
  if (canvasHeight <= 0) return;
  const pixelsPerMinute = canvasHeight / DAY_MINUTES;

  const dateKey = String(original.start).slice(0, 10);
  const originalStart = eventStartMinutes(original);
  const originalEnd = eventEndMinutes(original);
  const duration = originalEnd - originalStart;
  const startX = pointerEvent.clientX;
  const startY = pointerEvent.clientY;
  const originalTop = block.style.top;
  const originalHeight = block.style.height;
  const timeEl = block.querySelector('.event-time-text');
  const originalTimeText = timeEl ? timeEl.textContent : '';

  const pointerId = pointerEvent.pointerId;
  const token = {};
  // Touch and pen must hold still before anything moves; a mouse drags at once.
  const touchLike = pointerEvent.pointerType !== 'mouse';
  let previewStart = originalStart;
  let previewEnd = originalEnd;
  let moved = false;
  let gestureStarted = false;
  let anchorY = startY;
  let longPressTimer = null;

  const step = snapInterval();

  /* Touch scrolling is driven by touchmove, so a non-passive preventDefault is
     the reliable way to keep the page still once the drag owns the finger. */
  const holdPageStill = (event) => {
    if (event.cancelable) event.preventDefault();
  };

  const resetPreview = () => {
    block.style.top = originalTop;
    block.style.height = originalHeight;
    if (timeEl) timeEl.textContent = originalTimeText;
    block.querySelectorAll('.event-duration').forEach((label) => {
      label.textContent = formatDurationLabel(duration);
    });
  };

  const armDrag = () => {
    if (gestureStarted) return;
    longPressTimer = null;
    gestureStarted = true;
    block.classList.add('is-gesturing');
    block.classList.toggle('is-resize-start', mode === 'start');
    block.classList.toggle('is-resize-end', mode === 'end');
    block.classList.toggle('is-moving', mode === 'move');
    document.body.classList.add('is-gesturing');
    if (touchLike) {
      window.addEventListener('touchmove', holdPageStill, { passive: false });
      try {
        block.setPointerCapture?.(pointerId);
      } catch {
        /* capture is best-effort */
      }
      try {
        navigator.vibrate?.(10);
      } catch {
        /* haptics are best-effort */
      }
    }
  };

  const cleanup = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('touchmove', holdPageStill);
    block.classList.remove('is-gesturing', 'is-resize-start', 'is-resize-end', 'is-moving');
    document.body.classList.remove('is-gesturing');
    if (activeGesture?.token === token) activeGesture = null;
    if (block.hasPointerCapture?.(pointerId)) block.releasePointerCapture(pointerId);
  };

  /* The finger travels before the hold completes: this is a scroll, not a drag.
     Hand it back to the browser and make sure the release is not read as a tap. */
  const abandon = () => {
    cleanup();
    resetPreview();
    suppressClickUntil = Date.now() + SWIPE_CLICK_SUPPRESS_MS;
  };

  const onMove = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;

    if (!gestureStarted) {
      if (Math.hypot(deltaX, deltaY) > LONG_PRESS_TOLERANCE_PX) abandon();
      return;
    }

    if (!moved) {
      if (Math.abs(deltaY) < DRAG_THRESHOLD_PX) return;
      // Anchor at the activation point so the first snapped step cannot jump.
      moved = true;
      anchorY = moveEvent.clientY;
    }

    if (moveEvent.cancelable) moveEvent.preventDefault();
    updatePreview((moveEvent.clientY - anchorY) / pixelsPerMinute);
  };

  const updatePreview = (deltaMinutes) => {
    if (mode === 'move') {
      const start = clamp(
        snapMinutes(originalStart + deltaMinutes, step),
        0,
        MAX_END - duration,
      );
      previewStart = start;
      previewEnd = start + duration;
    } else if (mode === 'start') {
      previewStart = clamp(
        snapMinutes(originalStart + deltaMinutes, step),
        0,
        originalEnd - MIN_DURATION,
      );
      previewEnd = originalEnd;
    } else {
      previewStart = originalStart;
      previewEnd = clamp(
        snapMinutes(originalEnd + deltaMinutes, step),
        originalStart + MIN_DURATION,
        MAX_END,
      );
    }

    applyPreview(block, previewStart, previewEnd);
  };

  const onUp = (upEvent) => {
    if (upEvent.pointerId !== pointerId) return;

    // A fast flick can arrive as one coalesced move followed by pointerup; apply
    // that movement before deciding whether anything changed.
    if (gestureStarted && !moved) {
      const deltaY = upEvent.clientY - startY;
      if (Math.abs(deltaY) >= DRAG_THRESHOLD_PX) {
        moved = true;
        updatePreview((deltaY - Math.sign(deltaY) * DRAG_THRESHOLD_PX) / pixelsPerMinute);
      }
    }

    cleanup();

    // A plain press or tap: let the click handler open the editor.
    if (!gestureStarted) return;

    // Only a real move/resize swallows the follow-up click.
    if (moved) suppressClickUntil = Date.now() + 500;

    if (previewStart === originalStart && previewEnd === originalEnd) {
      resetPreview();
      return;
    }

    const saved = update((draft) => {
      const target = draft.events.find((entry) => entry.id === eventId);
      if (!target) return;
      target.start = `${dateKey}T${minutesToTime(previewStart)}`;
      target.end = `${dateKey}T${minutesToTime(previewEnd)}`;
      target.updatedAt = new Date().toISOString();
    });
    if (!saved) {
      resetPreview();
      showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.');
    }
  };

  const onCancel = (cancelEvent) => {
    if (cancelEvent.pointerId !== pointerId) return;
    cleanup();
    resetPreview();
  };

  activeGesture = { token, abandon };

  if (touchLike) {
    longPressTimer = setTimeout(armDrag, LONG_PRESS_DELAY_MS);
  } else {
    armDrag();
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

/* ---------------------------------------------------------------- create --- */

function createAtPointer(clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.height <= 0) return;

  const rawMinutes = ((clientY - rect.top) / rect.height) * DAY_MINUTES;
  const step = snapInterval();
  const start = clamp(
    Math.floor(rawMinutes / step) * step,
    0,
    MAX_END - DEFAULT_DURATION,
  );
  const end = start + DEFAULT_DURATION;
  const dateKey = getData().settings.selectedDate;
  const now = new Date().toISOString();

  const saved = update((draft) => {
    draft.events.push({
      id: uid('evt'),
      title: 'Kegiatan baru',
      start: `${dateKey}T${minutesToTime(start)}`,
      end: `${dateKey}T${minutesToTime(end)}`,
      profileIds: [],
      note: '',
      createdAt: now,
      updatedAt: now,
    });
  });

  if (saved) {
    showToast('Kegiatan 30 menit dibuat. Ketuk blok untuk mengubah nama dan peserta.');
  } else {
    showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.');
  }
}

/* ----------------------------------------------------------------- events --- */

function handlePointerDown(event) {
  const block = event.target.closest('.event-block');
  if (block) {
    const resizeHandle = event.target.closest('[data-resize]');
    startGesture(event, block, resizeHandle ? resizeHandle.dataset.resize : 'move');
    return;
  }

  canvasPointerDown = event.target.closest('.time-canvas')
    ? { x: event.clientX, y: event.clientY, at: Date.now() }
    : null;
}

function handleClick(event) {
  if (Date.now() < suppressClickUntil) return;

  const editButton = event.target.closest('[data-edit-event]');
  if (editButton) {
    openEventEditor(editButton.dataset.editEvent);
    return;
  }

  if (event.target.closest('.event-block')) {
    const block = event.target.closest('.event-block');
    if (block?.dataset.eventId) openEventEditor(block.dataset.eventId);
    return;
  }

  const canvas = event.target.closest('.time-canvas');
  if (!canvas) return;

  // A click that ended a scroll/drag on empty canvas must not create a block.
  if (canvasPointerDown) {
    const distance = Math.hypot(
      event.clientX - canvasPointerDown.x,
      event.clientY - canvasPointerDown.y,
    );
    const stale = Date.now() - canvasPointerDown.at > 1000;
    canvasPointerDown = null;
    if (!stale && distance > 8) return;
  }

  createAtPointer(event.clientY, canvas);
}

export function initCalendarInteractions(stageElement) {
  stage = stageElement;
  if (!stage) return;

  stage.addEventListener('pointerdown', handlePointerDown);
  stage.addEventListener('click', handleClick);
  const cancelGesture = () => {
    activeGesture?.abandon();
    canvasPointerDown = null;
    suppressClickUntil = Date.now() + SWIPE_CLICK_SUPPRESS_MS;
  };
  window.addEventListener('tbk:pinch-start', cancelGesture);
  window.addEventListener('tbk:cancel-block-gesture', cancelGesture);
}
