/**
 * Conflict detection (SPEC.md §7, Phase 3).
 *
 * Two events conflict when
 * - their time intervals overlap,
 * - they share at least one participant profile,
 * - and they are not the same event.
 *
 * Different family members may do different things at the same time, so an
 * overlap alone is not a conflict. A shared event never conflicts with itself.
 * Input blocks are the visual models built by the layout engine.
 */

export function blocksOverlap(a, b) {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function blocksConflict(a, b) {
  if (a.id === b.id) return false;
  if (a.participantIds.length === 0 || b.participantIds.length === 0) return false;
  if (!blocksOverlap(a, b)) return false;
  const ids = new Set(a.participantIds);
  return b.participantIds.some((profileId) => ids.has(profileId));
}

/**
 * @returns {{ byEvent: Map<string, Array>, pairs: Array<{a:object,b:object,sharedProfileIds:string[]}> }}
 *   `byEvent` maps an event id to the events it conflicts with; `pairs` lists
 *   every conflicting pair exactly once.
 */
export function findConflicts(blocks) {
  const byEvent = new Map();
  const pairs = [];

  const add = (block, other, sharedProfileIds) => {
    if (!byEvent.has(block.id)) byEvent.set(block.id, []);
    byEvent.get(block.id).push({
      id: other.id,
      title: other.title,
      timeLabel: other.timeLabel,
      startMinutes: other.startMinutes,
      endMinutes: other.endMinutes,
      sharedProfileIds,
    });
  };

  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i];
      const b = blocks[j];
      if (!blocksConflict(a, b)) continue;
      const ids = new Set(a.participantIds);
      const sharedProfileIds = b.participantIds.filter((profileId) => ids.has(profileId));
      add(a, b, sharedProfileIds);
      add(b, a, sharedProfileIds);
      pairs.push({ a, b, sharedProfileIds });
    }
  }

  return { byEvent, pairs };
}
