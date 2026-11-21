/**
 * Pinch zoom for the day and week timelines (Phase 4).
 *
 * Two fingers on a timeline scale the hour height instead of zooming the whole
 * page. The content point under the middle of the fingers stays put, so the
 * user does not lose orientation. Day and week share one zoom value because
 * both draw the same 24-hour grid.
 *
 * A trackpad pinch (ctrl + wheel) is supported too, which also makes the
 * gesture testable on a desktop.
 */

import { showToast } from './ui.js';

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3;
const PINCH_START_EVENT = 'tbk:pinch-start';

let stage = null;
const pointers = new Map();
let pinch = null;
let suppressClickUntil = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentZoom() {
  const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function setZoom(next) {
  const zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
  document.documentElement.style.setProperty('--zoom', String(zoom));
  applyDetailLevel(zoom);
  syncZoomControls();
  return zoom;
}

/* A bigger block has room for more than a clipped title. These classes let the
   block styles reveal the time, participants and notes as the user zooms in. */
function applyDetailLevel(zoom) {
  document.body.classList.toggle('zoom-detail-1', zoom >= 1.3);
  document.body.classList.toggle('zoom-detail-2', zoom >= 1.8);
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
  // A fresh zoom can clamp the assignment before layout settles; try once more.
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

function beginPinch(scroller) {
  if (pinch || pointers.size < 2) return;
  const [a, b] = [...pointers.values()].slice(0, 2);
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  if (distance < 20) return;

  const rect = scroller.getBoundingClientRect();
  const middleY = (a.y + b.y) / 2 - rect.top;
  const origin = trackOrigin(scroller);

  pinch = {
    scroller,
    distance,
    zoom: currentZoom(),
    origin,
    anchor: middleY + scroller.scrollTop - origin,
    middleY,
  };

  // A second finger means this is a zoom, never a move/resize/tap.
  window.dispatchEvent(new Event(PINCH_START_EVENT));
  suppressClickUntil = Date.now() + 600;
  document.body.classList.add('is-pinching');
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse') return;
  const scroller = scrollerFor(event.target);
  if (!scroller) return;

  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) beginPinch(scroller);
}

function onPointerMove(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!pinch) return;

  if (event.cancelable) event.preventDefault();
  const [a, b] = [...pointers.values()].slice(0, 2);
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  if (distance < 10) return;

  const nextZoom = clamp(pinch.zoom * (distance / pinch.distance), MIN_ZOOM, MAX_ZOOM);
  if (Math.abs(nextZoom - currentZoom()) < 0.001) return;

  document.documentElement.style.setProperty('--zoom', String(nextZoom));
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

function onPointerEnd(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.delete(event.pointerId);
  if (pinch && pointers.size < 2) {
    if (event.cancelable) event.preventDefault();
    endPinch();
  }
}

function onTouchMove(event) {
  if (pinch && event.cancelable) event.preventDefault();
}

function onWheel(event) {
  // Trackpad pinch arrives as ctrl + wheel; a plain wheel keeps scrolling.
  if (!event.ctrlKey) return;
  const scroller = scrollerFor(event.target);
  if (!scroller) return;

  event.preventDefault();
  const next = currentZoom() * Math.exp(-event.deltaY * 0.002);
  zoomAround(scroller, event.clientY, next);
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

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerEnd);
  window.addEventListener('pointercancel', onPointerEnd);
  document.addEventListener('click', handleClickCapture, true);
  applyDetailLevel(currentZoom());
  syncZoomControls();
}
