/**
 * Layout engine — Phase 1 + Phase 3.
 *
 * Produces the visual model for one day on the shared timeline: which events are
 * visible, their vertical position, their participant colours, the horizontal
 * lane that keeps overlaps readable, and the participant conflicts on top of it.
 *
 * Lanes are a visual arrangement only, never profile columns (SPEC.md §5).
 * Hidden profiles remove their events from both the layout and the conflict
 * calculation, so showing/hiding a profile recalculates everything.
 */

import { findConflicts } from './conflicts.js';
import {
  eventEndMinutes,
  eventStartMinutes,
  eventDateKey,
  formatEventRange,
  hexToRgba,
} from './utils.js';

const DAY_MINUTES = 1440;

/**
 * Events that belong on the given day and are visible for the current
 * profile visibility state.
 *
 * Rules (SPEC.md §22.5):
 * - an event with participants is drawn while at least one participant is visible
 * - an event without participants stays visible as a neutral block
 */
function getDayEvents(data, dateKey) {
  return data.events.filter((event) => eventDateKey(event) === dateKey);
}

function getVisibleDayEvents(data, dateKey) {
  const visibleProfileIds = new Set(
    data.profiles.filter((profile) => profile.visible).map((profile) => profile.id),
  );
  return getDayEvents(data, dateKey).filter((event) => (
    event.profileIds.length === 0
    || event.profileIds.some((profileId) => visibleProfileIds.has(profileId))
  ));
}

function stripeFor(colors) {
  if (colors.length === 0) return 'var(--border-strong)';
  if (colors.length === 1) return colors[0];
  const stops = colors.map((color, index) => {
    const from = (index / colors.length) * 100;
    const to = ((index + 1) / colors.length) * 100;
    return `${color} ${from}% ${to}%`;
  });
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

/**
 * Interval lane assignment (SPEC.md §5, §20.1).
 *
 * 1. Events already sorted by start time are grouped into clusters: a new
 *    cluster begins when an event starts at or after the latest end so far, so
 *    clusters never overlap each other.
 * 2. Inside a cluster every event takes the first lane whose last event has
 *    already ended. This first-fit-by-start-time pass uses the minimum number of
 *    lanes for an interval graph.
 * 3. All members of a cluster share the same lane count, so the visual columns
 *    stay aligned; each block gets its left offset and width as percentages of
 *    the canvas. Lane maths never assumes a profile column.
 */
function assignLanes(blocks) {
  const sorted = [...blocks].sort((a, b) => (
    a.startMinutes - b.startMinutes
    || b.endMinutes - a.endMinutes
    || a.id.localeCompare(b.id)
  ));

  const placed = [];
  let cluster = [];
  let clusterEnd = 0;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds = [];

    const assignments = cluster.map((block) => {
      let lane = laneEnds.findIndex((end) => end <= block.startMinutes);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(block.endMinutes);
      } else {
        laneEnds[lane] = block.endMinutes;
      }
      return { block, lane };
    });

    const laneCount = Math.max(1, laneEnds.length);
    assignments.forEach(({ block, lane }) => {
      placed.push({
        ...block,
        lane,
        laneCount,
        leftPercent: (lane / laneCount) * 100,
        widthPercent: 100 / laneCount,
      });
    });

    cluster = [];
    clusterEnd = 0;
  };

  sorted.forEach((block) => {
    if (cluster.length > 0 && block.startMinutes >= clusterEnd) flushCluster();
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, block.endMinutes);
  });
  flushCluster();

  return placed;
}

export function buildDayLayout(data, dateKey, window = null) {
  const winStart = window?.startMin ?? 0;
  const winEnd = window?.endMin ?? DAY_MINUTES;
  const winMinutes = Math.max(1, winEnd - winStart);

  const profileMap = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const allEvents = getDayEvents(data, dateKey);
  const visibleEvents = getVisibleDayEvents(data, dateKey);

  const blocks = visibleEvents
    .map((event) => {
      const startMinutes = eventStartMinutes(event);
      const endMinutes = Math.min(DAY_MINUTES, Math.max(startMinutes + 1, eventEndMinutes(event)));
      const durationMinutes = Math.max(1, endMinutes - startMinutes);
      const participants = event.profileIds
        .map((profileId) => profileMap.get(profileId))
        .filter(Boolean);
      const accentColors = participants.map((profile) => profile.color);
      const baseColor = accentColors[0] || null;

      // Clip to the visible window; events entirely outside are not drawn.
      const clippedStart = Math.max(startMinutes, winStart);
      const clippedEnd = Math.min(endMinutes, winEnd);

      return {
        id: event.id,
        event,
        title: event.title,
        note: event.note || '',
        timeLabel: formatEventRange(event),
        startMinutes,
        endMinutes,
        durationMinutes,
        clippedStart,
        clippedEnd,
        isClippedStart: startMinutes < winStart,
        isClippedEnd: endMinutes > winEnd,
        topPercent: ((clippedStart - winStart) / winMinutes) * 100,
        heightPercent: (Math.max(0, clippedEnd - clippedStart) / winMinutes) * 100,
        participantIds: participants.map((profile) => profile.id),
        participants,
        isShared: participants.length > 1,
        isNeutral: participants.length === 0,
        baseColor,
        stripe: stripeFor(accentColors),
        tint: baseColor ? hexToRgba(baseColor, 0.14) : null,
        border: baseColor ? hexToRgba(baseColor, 0.38) : null,
        lane: 0,
        laneCount: 1,
        leftPercent: 0,
        widthPercent: 100,
        conflicts: [],
      };
    })
    .filter((block) => block.clippedEnd > block.clippedStart)
    .sort((a, b) => (
      a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes
    ));

  const laneBlocks = assignLanes(blocks);
  const { byEvent, pairs } = findConflicts(laneBlocks);

  const conflictPairs = pairs.map(({ a, b, sharedProfileIds }) => ({
    aId: a.id,
    aTitle: a.title,
    aTime: a.timeLabel,
    bId: b.id,
    bTitle: b.title,
    bTime: b.timeLabel,
    profileNames: sharedProfileIds
      .map((profileId) => profileMap.get(profileId)?.name)
      .filter(Boolean),
  }));

  const blocksWithConflicts = laneBlocks.map((block) => {
    const conflicts = byEvent.get(block.id) || [];
    return {
      ...block,
      conflicts,
      conflictProfiles: [...new Set(conflicts.flatMap((entry) => entry.sharedProfileIds))]
        .map((profileId) => profileMap.get(profileId)?.name)
        .filter(Boolean),
    };
  });

  return {
    dateKey,
    window: { startMin: winStart, endMin: winEnd, minutes: winMinutes },
    blocks: blocksWithConflicts,
    conflictCount: conflictPairs.length,
    conflictPairs,
    totalCount: allEvents.length,
    visibleCount: visibleEvents.length,
    inWindowCount: blocksWithConflicts.length,
    outsideWindowCount: visibleEvents.length - blocksWithConflicts.length,
    hiddenCount: allEvents.length - visibleEvents.length,
    participantCount: new Set(visibleEvents.flatMap((event) => event.profileIds)).size,
  };
}
