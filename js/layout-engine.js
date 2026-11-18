/**
 * Layout engine — Phase 1 scope.
 *
 * Produces the visual model for one day on the shared timeline: which events are
 * visible, their vertical position, and their participant colours.
 *
 * Phase 1 draws one event per row (single lane). The interval-based lane
 * assignment and conflict detection described in SPEC.md §5/§7 are Phase 3 and
 * will replace `assignLanes` only; the block model below is already shaped for
 * it (lane / laneCount).
 */

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
 * Phase 1 lane assignment: one lane for every block.
 * Phase 3 replaces this with the interval cluster algorithm.
 */
function assignLanes(blocks) {
  return blocks.map((block) => ({ ...block, lane: 0, laneCount: 1 }));
}

export function buildDayLayout(data, dateKey) {
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

      return {
        id: event.id,
        event,
        title: event.title,
        note: event.note || '',
        timeLabel: formatEventRange(event),
        startMinutes,
        endMinutes,
        durationMinutes,
        topPercent: (startMinutes / DAY_MINUTES) * 100,
        heightPercent: (durationMinutes / DAY_MINUTES) * 100,
        participants,
        isShared: participants.length > 1,
        isNeutral: participants.length === 0,
        baseColor,
        stripe: stripeFor(accentColors),
        tint: baseColor ? hexToRgba(baseColor, 0.14) : null,
        border: baseColor ? hexToRgba(baseColor, 0.38) : null,
        lane: 0,
        laneCount: 1,
      };
    })
    .sort((a, b) => (
      a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes
    ));

  return {
    dateKey,
    blocks: assignLanes(blocks),
    totalCount: allEvents.length,
    visibleCount: visibleEvents.length,
    hiddenCount: allEvents.length - visibleEvents.length,
    participantCount: new Set(visibleEvents.flatMap((event) => event.profileIds)).size,
  };
}
