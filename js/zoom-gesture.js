/**
 * Pinch zoom for the day and week timelines (Phase 4).
 *
 * Two fingers on a timeline scale the hour height instead of zooming the whole
 * page. The content point under the middle of the fingers stays put, so the
 * user does not lose orientation. Day and week share one zoom value because
 * both draw the same 24-hour grid.
 *
 * Block detail is chosen from the block's ACTUAL pixel height, not from the
 * zoom number: a short block that suddenly gets taller shows its time first,
 * then its participants and notes, in priority order.
 *
 * A trackpad pinch (ctrl + wheel) is supported too.
 */

import { showToast } from './ui.js';

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;
const PINCH_START_EVENT = 'tbk:pinch-start';

// Minimum pixel height for each extra piece of information, in priority order.
// day: time -> two title lines -> participants/note -> three title lines.
// week: time -> two title lines -> three title lines.
const DAY_LEVELS = [36, 58, 84, 110];
const WEEK_LEVELS = [32, 48, 72];
const ROOM_CLASSES = ['room-1', 'room-2', 'room-3', 'room-4'];

let stage = null;
let pinch = null;
let suppressClickUntil = 0;
const measureCanvas = document.createElement('canvas');
const measureContext = measureCanvas.getContext('2d');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentZoom() {
  const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function applyRooms(element, height, levels) {
  element.classList.remove(...ROOM_CLASSES);
  levels.forEach((minimum, index) => {
    if (height >= minimum) element.classList.add(ROOM_CLASSES[index]);
  });
}

/**
 * Shrink a title that cannot fit its box instead of clipping the big bold text.
 * The font keeps its CSS base size; we only apply a per-block scale so a tiny
 * 30-minute block still shows its whole title in a quiet, lighter weight.
 */
function fitTitle(title, lines) {
  if (!title) return;
  const text = title.textContent.trim();
  if (!text) return;

  // Start from the stylesheet value on every pass, never from a previous scale.
  title.style.fontSize = '';
  title.style.fontWeight = '';
  const style = getComputedStyle(title);
  const base = parseFloat(style.fontSize);
  if (!Number.isFinite(base) || base <= 0) return;

  measureContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const textWidth = measureContext.measureText(text).width;
  if (textWidth <= 0) return;

  const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const available = Math.max(1, title.clientWidth - padding) * lines;
  const scale = clamp(available / textWidth, 0.6, 1);

  if (scale < 0.99) {
    title.style.fontSize = `${Math.max(7, base * scale).toFixed(2)}px`;
    title.style.fontWeight = '500';
  }
}

/** Re-measure every block after a zoom, a re-render or an orientation change. */
export function refreshBlockDetail() {
  document.querySelectorAll('.event-block').forEach((block) => {
    applyRooms(block, block.getBoundingClientRect().height, DAY_LEVELS);
    const lines = block.classList.contains('room-4') ? 3 : block.classList.contains('room-2') ? 2 : 1;
    fitTitle(block.querySelector('.event-title'), lines);
  });
  document.querySelectorAll('.week-event').forEach((block) => {
    applyRooms(block, block.getBoundingClientRect().height, WEEK_LEVELS);
    const lines = block.classList.contains('room-3') ? 4 : block.classList.contains('room-2') ? 3 : block.classList.contains('room-1') ? 2 : 1;
    fitTitle(block.querySelector('.week-event-title'), lines);
  });
}

function setZoom(next) {
  const zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
  document.documentElement.style.setProperty('--zoom', String(zoom));
  refreshBlockDetail();
  syncZoomControls();
  return zoom;
}

export function syncZoomControls() {
  const zoom = currentZoom();
  document.querySelectorAll('.zoom-reset').forEach((button) => {
    button.hidden = Math.abs(zoom - 1) < 0.01;
    button.textContent = `Zoom ${Math.round(zoom * 100)}%`;
  });
}

export function resetZoom() {
  const changed = Math.abs(currentZoom() - 1) > 0.01;
  setZoom(1);
  if (changed) showToast('Zoom kembali 100%.');
}

function scrollerFor(target) {
  return target.closest?.('#timelineScroll, .week-scroll') || null;
}

function trackOrigin(scroller) {
  const track = scroller.querySelector('.time-canvas, .week-col-track');
  if (!track) return 0;
  return track.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

function applyScroll(scroller, top) {
  const next = Math.max(0, top);
  scroller.scrollTop = next;
  if (next > 0 && scroller.scrollTop < next - 1) {
    requestAnimationFrame(() => { scroller.scrollTop = next; });
  }
}

function zoomAround(scroller, clientY, nextZoom) {
  const before = currentZoom();
  const zoom = setZoom(nextZoom);
  if (zoom === before) return;

  const rect = scroller.getBoundingClientRect();
  const viewportY = clientY - rect.top;
  const origin = trackOrigin(scroller);
  const anchor = viewportY + scroller.scrollTop - origin;
  applyScroll(scroller, origin + anchor * (zoom / before) - viewportY);
}

function beginPinch(touches, scroller) {
  if (pinch) return;
  const [a, b] = touches;
  const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if (distance < 20) return;

  const rect = scroller.getBoundingClientRect();
  const middleY = (a.clientY + b.clientY) / 2 - rect.top;
  const origin = trackOrigin(scroller);

  pinch = {
    scroller,
    distance,
    zoom: currentZoom(),
    origin,
    anchor: middleY + scroller.scrollTop - origin,
    middleY,
  };

  // A second finger means zoom, never a move/resize/tap.
  window.dispatchEvent(new Event(PINCH_START_EVENT));
  suppressClickUntil = Date.now() + 600;
  document.body.classList.add('is-pinching');
}

function onTouchStart(event) {
  if (event.touches.length !== 2) return;
  const scroller = scrollerFor(event.target);
  if (!scroller) return;

  // Stop the browser from claiming the gesture as a page zoom or a scroll.
  if (event.cancelable) event.preventDefault();
  beginPinch([event.touches[0], event.touches[1]], scroller);
}

function onTouchMove(event) {
  if (!pinch || event.touches.length < 2) return;
  if (event.cancelable) event.preventDefault();

  const [a, b] = event.touches;
  const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if (distance < 10) return;

  const nextZoom = clamp(pinch.zoom * (distance / pinch.distance), MIN_ZOOM, MAX_ZOOM);
  if (Math.abs(nextZoom - currentZoom()) < 0.001) return;

  document.documentElement.style.setProperty('--zoom', String(nextZoom));
  refreshBlockDetail();
  syncZoomControls();
  applyScroll(
    pinch.scroller,
    pinch.origin + pinch.anchor * (nextZoom / pinch.zoom) - pinch.middleY,
  );
}

function endPinch() {
  if (!pinch) return;
  const changed = Math.abs(currentZoom() - pinch.zoom) > 0.01;
  pinch = null;
  document.body.classList.remove('is-pinching');
  if (changed) showToast(`Zoom ${Math.round(currentZoom() * 100)}%.`);
}

function onTouchEnd(event) {
  if (!pinch || event.touches.length >= 2) return;
  if (event.cancelable) event.preventDefault();
  endPinch();
}

function onWheel(event) {
  // Trackpad pinch arrives as ctrl + wheel; a plain wheel keeps scrolling.
  if (!event.ctrlKey) return;
  const scroller = scrollerFor(event.target);
  if (!scroller) return;

  event.preventDefault();
  zoomAround(scroller, event.clientY, currentZoom() * Math.exp(-event.deltaY * 0.002));
}

function handleClickCapture(event) {
  if (Date.now() >= suppressClickUntil) return;
  // The reset button is app UI, not a timeline tap left over from the pinch.
  if (event.target.closest?.('.zoom-reset')) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopPropagation();
}

export function initPinchZoom(stageElement) {
  stage = stageElement;
  if (!stage) return;

  stage.addEventListener('touchstart', onTouchStart, { passive: false });
  stage.addEventListener('touchmove', onTouchMove, { passive: false });
  stage.addEventListener('touchend', onTouchEnd, { passive: false });
  stage.addEventListener('touchcancel', onTouchEnd, { passive: false });
  stage.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', refreshBlockDetail);
  document.addEventListener('click', handleClickCapture, true);
  refreshBlockDetail();
  syncZoomControls();
}
