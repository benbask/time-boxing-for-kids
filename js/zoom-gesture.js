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

  const svgNS = 'http://www.w3.org/2000/svg';
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2F80ED';
  const space = parseFloat(getComputedStyle(timeline).getPropertyValue('--callout-space')) || 175;
  const timelineRect = timeline.getBoundingClientRect();

  const items = microBlocks.map((block) => {
    if (!block.dataset.calloutWidth) {
      block.dataset.calloutWidth = block.style.getPropertyValue('--ev-width');
    }
    block.style.setProperty('--ev-width', `calc(100% - ${space}px)`);

    const stripe = block.style.getPropertyValue('--ev-stripe').trim();
    const color = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(stripe) ? stripe : primary;
    const title = block.querySelector('.event-title').textContent.trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'callout';
    button.dataset.action = 'edit-week-event';
    button.dataset.eventId = block.dataset.eventId;
    button.title = title;
    button.style.setProperty('--leader-color', color);
    // Reuse the block's own tint and edge so the floating label matches it.
    const tint = block.style.getPropertyValue('--ev-bg').trim();
    const edge = block.style.getPropertyValue('--ev-border').trim();
    button.style.setProperty('--callout-bg', tint || 'color-mix(in srgb, var(--surface) 86%, transparent)');
    button.style.setProperty('--callout-border', edge || 'var(--text-muted)');

    const titleSpan = document.createElement('span');
    titleSpan.className = 'callout-title';
    titleSpan.textContent = title;
    button.appendChild(titleSpan);
    return { block, button, color };
  });

  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('callout-lines');
  svg.setAttribute('width', String(timeline.scrollWidth));
  svg.setAttribute('height', String(timeline.scrollHeight));
  layer.appendChild(svg);
  items.forEach(({ button }) => layer.appendChild(button));

  // Label spacing mirrors the real time-boxes: touching blocks produce
  // touching labels; a 5- or 10-minute gap produces that same pixel gap.
  items.sort((a, b) => (
    a.block.getBoundingClientRect().top - b.block.getBoundingClientRect().top
  ));
  let previousBottom = -Infinity;
  let previousBlockBottom = null;
  items.forEach(({ block, button }, index) => {
    const blockRect = block.getBoundingClientRect();
    const labelHeight = button.getBoundingClientRect().height;
    let top;
    if (index === 0) {
      top = blockRect.top + blockRect.height / 2 - timelineRect.top - labelHeight / 2;
    } else {
      const realGap = Math.max(0, blockRect.top - previousBlockBottom);
      top = previousBottom + realGap;
    }
    button.style.top = `${top}px`;
    previousBottom = top + labelHeight;
    previousBlockBottom = blockRect.bottom;
  });

  // Smooth S-curves. To keep curves off each other without moving the boxes,
  // their end dots fan out horizontally inside the floating label.
  const MIN_LINE_GAP = 8;

  const updateGeometry = (item) => {
    item.startX = Math.max(item.blockLeftX + 8, item.startBaseX - item.startOffset);
    item.endX = Math.min(item.labelRightX - 10, item.endBaseX + item.endOffset);
    item.bend = Math.max(24, (item.endX - item.startX) * 0.55);
  };

  let lastStartY = -Infinity;
  let stagger = 0;
  items.forEach((item) => {
    const blockRect = item.block.getBoundingClientRect();
    const labelRect = item.button.getBoundingClientRect();
    item.labelHeight = labelRect.height;
    item.startY = blockRect.top + blockRect.height / 2 - timelineRect.top;
    if (item.startY - lastStartY < 10) stagger += 14;
    else stagger = 0;
    lastStartY = item.startY;

    item.blockLeftX = blockRect.left - timelineRect.left;
    item.labelRightX = labelRect.right - timelineRect.left;
    item.startBaseX = blockRect.right - timelineRect.left - 12 - stagger;
    item.endBaseX = labelRect.left - timelineRect.left + 10;
    item.startOffset = 0;
    item.endOffset = 0;
    updateGeometry(item);
  });

  const endY = (item) => parseFloat(item.button.style.top) + item.labelHeight / 2;
  const pointAt = (item, t) => {
    const u = 1 - t;
    const y1 = item.startY;
    const y2 = endY(item);
    const c1x = item.startX + item.bend;
    const c2x = item.endX - item.bend;
    return [
      u * u * u * item.startX + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * item.endX,
      u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2,
    ];
  };
  const closestDistance = (a, b) => {
    let closest = Infinity;
    for (let i = 0; i <= 10; i += 1) {
      for (let j = 0; j <= 10; j += 1) {
        const p = pointAt(a, i / 10);
        const q = pointAt(b, j / 10);
        closest = Math.min(closest, Math.hypot(p[0] - q[0], p[1] - q[1]));
      }
    }
    return closest;
  };

  // Fan only the line endpoints; the callout boxes never move.
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let index = 0; index < items.length - 1; index += 1) {
      const later = items[index + 1];
      const distance = closestDistance(items[index], later);
      if (distance >= MIN_LINE_GAP) continue;
      const fan = MIN_LINE_GAP - distance + 1;
      later.endOffset += fan;
      later.startOffset += fan * 0.5;
      updateGeometry(later);
      moved = true;
    }
    if (!moved) break;
  }

  items.forEach((item) => {
    const y2 = endY(item);
    const path = [
      `M ${item.startX.toFixed(1)} ${item.startY.toFixed(1)}`,
      `C ${(item.startX + item.bend).toFixed(1)} ${item.startY.toFixed(1)},`,
      `${(item.endX - item.bend).toFixed(1)} ${y2.toFixed(1)},`,
      `${item.endX.toFixed(1)} ${y2.toFixed(1)}`,
    ].join(' ');

    const line = document.createElementNS(svgNS, 'path');
    line.setAttribute('class', 'callout-line');
    line.setAttribute('d', path);
    line.setAttribute('stroke', item.color);
    svg.appendChild(line);

    [[item.startX, item.startY], [item.endX, y2]].forEach(([x, y]) => {
      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'callout-dot');
      dot.setAttribute('cx', x.toFixed(1));
      dot.setAttribute('cy', y.toFixed(1));
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', item.color);
      svg.appendChild(dot);
    });
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
