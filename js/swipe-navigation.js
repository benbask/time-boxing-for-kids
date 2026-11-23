/**
 * Horizontal swipe navigation for the day and week timelines.
 *
 * The timeline follows the finger while swiping, then either snaps back or
 * slides out and advances the date. Swipes start only on empty timeline space;
 * blocks keep their own drag/resize gestures.
 */

import { adjacentGridMarkup, preserveScrollForNextRender } from './calendar.js';
import { moveSelectedDate, moveSelectedPeriod } from './navigation.js';
import { getData } from './state.js';

const MIN_DISTANCE_PX = 50;
const AXIS_RATIO = 1.5;
const START_TOLERANCE_PX = 10;
const BLOCK_TOLERANCE_PX = 12;
const SLIDE_OUT_MS = 160;
const SNAP_BACK_MS = 200;
const CLICK_SUPPRESS_MS = 400;

let gesture = null;
let finishTimer = null;
let suppressClickUntil = 0;
let lastNavigateAt = 0;

function isSwipeTarget(target) {
  // Every part of the timeline is swipeable — including resize handles and
  // floating callout labels. A tap still opens the editor; only a real
  // horizontal swipe navigates.
  return Boolean(target.closest?.('#timelineScroll, .week-scroll'));
}

function navigate(view, direction) {
  if (view === 'week') moveSelectedPeriod(direction);
  else if (view === 'day') moveSelectedDate(direction);
}

/* Pointer Events and the direct touch fallback can both report one physical
   swipe. Accept only the first one within a short window. */
function handleNavigation(view, direction) {
  const now = Date.now();
  if (now - lastNavigateAt < 350) return;
  lastNavigateAt = now;
  const scroller = document.querySelector('#timelineScroll, .week-scroll');
  if (scroller) preserveScrollForNextRender(scroller.scrollTop);
  navigate(view, direction);
  suppressClickUntil = now + CLICK_SUPPRESS_MS;
}

function previewOffset(g) {
  const width = g.scroller.clientWidth;
  return g.previewDirection > 0 ? width : -width;
}

function showPreview(g, direction) {
  if (g.previewDirection === direction) return;
  g.preview?.remove();
  const holder = document.createElement('div');
  holder.className = 'swipe-preview';
  holder.innerHTML = adjacentGridMarkup(getData(), direction);
  holder.style.width = `${g.scroller.clientWidth}px`;
  holder.style.height = `${g.grid.scrollHeight}px`;
  g.scroller.appendChild(holder);
  g.preview = holder;
  g.previewDirection = direction;
}

function stopGesture() {
  if (finishTimer) {
    window.clearTimeout(finishTimer);
    finishTimer = null;
  }
  if (gesture?.grid) {
    gesture.grid.style.transition = '';
    gesture.grid.style.transform = '';
  }
  gesture?.preview?.remove();
  gesture?.scroller?.classList.remove('is-swiping');
  gesture = null;
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' || !event.isPrimary) return;
  if (!isSwipeTarget(event.target)) return;
  if (gesture) stopGesture();

  const scroller = event.target.closest('#timelineScroll, .week-scroll');
  const grid = scroller?.querySelector('.timeline, .week-grid');
  if (!grid) return;

  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    view: getData().settings.currentView,
    grid,
    scroller,
    swiping: false,
    onBlock: Boolean(event.target.closest?.('.event-block, .week-event')),
  };
}

function onPointerMove(event) {
  if (!gesture || event.pointerId !== gesture.id) return;

  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;

  if (!gesture.swiping) {
    // Only an actually armed block gesture (set by the long-press handlers)
    // owns the pointer. Merely resting a finger does not cancel a swipe.
    if (gesture.onBlock && document.body.classList.contains('is-gesturing')) {
      stopGesture();
      return;
    }
    const tolerance = gesture.onBlock ? BLOCK_TOLERANCE_PX : START_TOLERANCE_PX;
    // Vertical intent belongs to the scroll container, not to this swipe.
    if (Math.abs(dy) > tolerance && Math.abs(dy) >= Math.abs(dx)) {
      stopGesture();
      return;
    }
    if (Math.abs(dx) < tolerance) return;
    gesture.swiping = true;
    gesture.scroller.classList.add('is-swiping');
    gesture.grid.style.transition = 'none';
    // Cancel the block's own pointer gesture before this swipe takes over.
    if (gesture.onBlock) window.dispatchEvent(new Event('tbk:cancel-block-gesture'));
  }

  if (event.cancelable) event.preventDefault();
  // A little resistance at longer distances keeps the motion calm.
  const resistance = Math.abs(dx) > 120 ? 0.65 : 1;
  const offset = dx * resistance;
  gesture.grid.style.transform = `translateX(${offset.toFixed(1)}px)`;

  const direction = dx < 0 ? 1 : -1;
  showPreview(gesture, direction);
  if (gesture.preview) {
    // The preview is absolutely positioned at the scroller's content origin,
    // exactly like the current grid, so only X needs to move.
    const base = previewOffset(gesture);
    gesture.preview.style.transform = `translateX(${(base + offset).toFixed(1)}px)`;
  }
}

function onPointerEnd(event, cancelled = false) {
  if (!gesture || event.pointerId !== gesture.id) return;

  const g = gesture;
  const dx = event.clientX - g.x;
  const dy = event.clientY - g.y;
  const horizontal = Math.abs(dx) >= MIN_DISTANCE_PX && Math.abs(dx) > Math.abs(dy) * AXIS_RATIO;
  const direction = dx < 0 ? 1 : -1;

  if (g.swiping && !cancelled && horizontal) {
    g.grid.style.transition = `transform ${SLIDE_OUT_MS}ms ease-out`;
    g.grid.style.transform = `translateX(${direction > 0 ? -window.innerWidth : window.innerWidth}px)`;
    if (g.preview) {
      g.preview.style.transition = `transform ${SLIDE_OUT_MS}ms ease-out`;
      g.preview.style.transform = 'translateX(0px)';
    }
    finishTimer = window.setTimeout(() => {
      gesture = null;
      finishTimer = null;
      g.preview?.remove();
      handleNavigation(g.view, direction);
    }, SLIDE_OUT_MS);
    return;
  }

  if (g.swiping) {
    g.grid.style.transition = `transform ${SNAP_BACK_MS}ms ease`;
    g.grid.style.transform = 'translateX(0px)';
    if (g.preview) {
      g.preview.style.transition = `transform ${SNAP_BACK_MS}ms ease`;
      g.preview.style.transform = `translateX(${previewOffset(g).toFixed(1)}px)`;
    }
    finishTimer = window.setTimeout(() => stopGesture(), SNAP_BACK_MS);
    suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
    return;
  }

  stopGesture();
  if (!cancelled && horizontal) handleNavigation(g.view, direction);
}

function handleClickCapture(event) {
  if (Date.now() >= suppressClickUntil) return;
  if (event.target.closest?.('.zoom-reset, .callout')) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopPropagation();
}

export function initSwipeNavigation(stageElement) {
  if (!stageElement) return;
  stageElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', (event) => onPointerEnd(event));
  window.addEventListener('pointercancel', (event) => onPointerEnd(event, true));
  window.addEventListener('tbk:pinch-start', () => stopGesture());
  window.addEventListener('tbk:callout-swipe', (event) => {
    handleNavigation(getData().settings.currentView, event.detail.direction);
  });
  document.addEventListener('click', handleClickCapture, true);
}
