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
function fitTitle(title, lines, maxFontPx = Infinity) {
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
  const target = Math.min(base * scale, maxFontPx);

  if (target < base * 0.99) {
    title.style.fontSize = `${Math.max(6, target).toFixed(2)}px`;
    title.style.fontWeight = '500';
  }
}

/* ------------------------------------------------------------- callouts --- */

function calloutLayer() {
  const timeline = document.querySelector('#calendarStage .timeline');
  if (!timeline) return null;

  let layer = timeline.querySelector(':scope > .callout-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'callout-layer';
    timeline.appendChild(layer);
  }
  return { timeline, layer };
}

function renderCallouts() {
  const found = calloutLayer();
  if (!found) return;
  const { timeline, layer } = found;

  const microBlocks = [...document.querySelectorAll('.event-block.is-micro')]
    .filter((block) => block.querySelector('.event-title')?.textContent.trim());
  layer.replaceChildren();
  timeline.classList.toggle('has-callouts', microBlocks.length > 0);
  if (microBlocks.length === 0) return;

  const space = parseFloat(getComputedStyle(timeline).getPropertyValue('--callout-space')) || 150;
  const timelineRect = timeline.getBoundingClientRect();
  const items = microBlocks.map((block) => {
    if (!block.dataset.calloutWidth) {
      block.dataset.calloutWidth = block.style.getPropertyValue('--ev-width');
    }
    block.style.setProperty('--ev-width', `calc(100% - ${space}px)`);

    const title = block.querySelector('.event-title').textContent.trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'callout';
    button.dataset.action = 'edit-week-event';
    button.dataset.eventId = block.dataset.eventId;
    button.title = title;
    button.style.setProperty('--leader-color', block.style.getPropertyValue('--ev-stripe') || 'var(--primary)');
    button.innerHTML = `<span class="callout-title"></span>`;
    button.firstChild.textContent = title;

    const leader = document.createElement('span');
    leader.className = 'callout-leader';
    leader.style.setProperty('--leader-color', block.style.getPropertyValue('--ev-stripe') || 'var(--primary)');

    layer.append(leader, button);
    return { block, button, leader };
  });

  // Measure after insertion, then push overlapping labels down in time order.
  items.sort((a, b) => (
    a.block.getBoundingClientRect().top - b.block.getBoundingClientRect().top
  ));
  let previousBottom = -Infinity;
  items.forEach(({ block, button, leader }) => {
    const blockRect = block.getBoundingClientRect();
    const labelHeight = button.getBoundingClientRect().height;
    const desired = blockRect.top + blockRect.height / 2 - timelineRect.top - labelHeight / 2;
    const top = Math.max(desired, previousBottom + 4);
    button.style.top = `${top}px`;
    previousBottom = top + labelHeight;
  });

  items.forEach(({ block, button, leader }) => {
    const blockRect = block.getBoundingClientRect();
    const labelRect = button.getBoundingClientRect();
    const startX = blockRect.right - timelineRect.left;
    const endX = labelRect.left - timelineRect.left;
    const y = blockRect.top + blockRect.height / 2 - timelineRect.top;
    leader.style.left = `${startX}px`;
    leader.style.top = `${y}px`;
    leader.style.width = `${Math.max(0, endX - startX - 3)}px`;
  });
}

/** Re-measure every block after a zoom, a re-render or an orientation change. */
export function refreshBlockDetail() {
  document.querySelectorAll('.event-block').forEach((block) => {
    const height = block.getBoundingClientRect().height;
    applyRooms(block, height, DAY_LEVELS);
    const micro = height < 24;
    block.classList.toggle('is-micro', micro);
    if (!micro && block.dataset.calloutWidth) {
      block.style.setProperty('--ev-width', block.dataset.calloutWidth);
      delete block.dataset.calloutWidth;
    }
    // The normal block style shaves 2px off the slot for breathing room. A
    // micro block needs every pixel, so let it use the whole slot.
    if (block.style.height) {
      block.style.height = micro
        ? block.style.height.replace('- 2px)', '- 0px)')
        : block.style.height.replace('- 0px)', '- 2px)');
    }
    const lines = block.classList.contains('room-4') ? 3 : block.classList.contains('room-2') ? 2 : 1;
    fitTitle(block.querySelector('.event-title'), lines, micro ? 7 : Infinity);
  });
  document.querySelectorAll('.week-event').forEach((block) => {
    const height = block.getBoundingClientRect().height;
    applyRooms(block, height, WEEK_LEVELS);
    const micro = height < 20;
    block.classList.toggle('is-micro', micro);
    if (block.style.height) {
      block.style.height = micro
        ? block.style.height.replace('- 2px)', '- 0px)')
        : block.style.height.replace('- 0px)', '- 2px)');
    }
    const lines = block.classList.contains('room-3') ? 4 : block.classList.contains('room-2') ? 3 : block.classList.contains('room-1') ? 2 : 1;
    fitTitle(block.querySelector('.week-event-title'), lines, micro ? 7 : Infinity);
  });
  renderCallouts();
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
  if (event.target.closest?.('.zoom-reset, .callout')) return;
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
