/**
 * Horizontal swipe navigation for the day and week timelines.
 *
 * A swipe on empty timeline space moves to the previous/next day (day view) or
 * week (week view). Blocks are excluded: their horizontal gestures belong to
 * event dragging, and a vertical swipe there still scrolls the timeline.
 */

import { moveSelectedDate, moveSelectedPeriod } from './navigation.js';
import { getData } from './state.js';

const MIN_DISTANCE_PX = 50;
const AXIS_RATIO = 1.5;
const CLICK_SUPPRESS_MS = 400;

let start = null;
let suppressClickUntil = 0;

function isSwipeTarget(target) {
  if (target.closest?.('.event-block, .week-event, .event-resize, .callout')) return false;
  return Boolean(target.closest?.('#timelineScroll, .week-scroll'));
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' || !event.isPrimary) return;
  if (!isSwipeTarget(event.target)) return;

  start = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    view: getData().settings.currentView,
  };
}

function onPointerEnd(event, cancelled = false) {
  if (!start || event.pointerId !== start.id) return;

  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  const { view } = start;
  start = null;
  if (cancelled) return;

  const horizontal = Math.abs(dx) >= MIN_DISTANCE_PX && Math.abs(dx) > Math.abs(dy) * AXIS_RATIO;
  if (!horizontal || (view !== 'day' && view !== 'week')) return;

  // Swiping left reveals the next period, like flipping a calendar page.
  const direction = dx < 0 ? 1 : -1;
  if (view === 'week') moveSelectedPeriod(direction);
  else moveSelectedDate(direction);
  suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
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
  window.addEventListener('pointerup', (event) => onPointerEnd(event));
  window.addEventListener('pointercancel', (event) => onPointerEnd(event, true));
  document.addEventListener('click', handleClickCapture, true);
}
