import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// DungeonRoom component
// ---------------------------------------------------------------------------

/**
 * Attached to each room entity in the dungeon.
 *
 * Fields:
 *  - roomId:  index into the DungeonLayout.rooms array (0-255)
 *  - visited: 0 = unvisited, 1 = visited (used for minimap reveal)
 */
export const DungeonRoom = defineComponent({
  roomId: Types.ui8,
  visited: Types.ui8,
});

// ---------------------------------------------------------------------------
// CurrentDungeon component
// ---------------------------------------------------------------------------

/**
 * A singleton component placed on a single entity that tracks which dungeon
 * is currently active.
 *
 * Fields:
 *  - seed:   the deterministic seed used to generate this dungeon
 *  - active: 0 = no dungeon active, 1 = dungeon is active
 */
export const CurrentDungeon = defineComponent({
  seed: Types.ui32,
  active: Types.ui8,
});
