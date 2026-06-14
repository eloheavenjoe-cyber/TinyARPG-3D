import { getAllEntities, hasComponent, addComponent } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, IsCharacter } from '@/systems/movement';
import type { DungeonLayout } from '@/shared/types';
import { DungeonRoom, CurrentDungeon } from './components';
import { generateDungeonWorld, DUNGEON_LAYOUT_KEY } from './dungeonSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the current DungeonLayout stored on the world object.
 * Returns null if no dungeon has been generated.
 */
function getCurrentLayout(): DungeonLayout | null {
  const world = getDebugWorld();
  return ((world as Record<string, unknown>)[DUNGEON_LAYOUT_KEY] as DungeonLayout) ?? null;
}

/**
 * Find the Character entity ID.
 */
function findCharacter(): number | null {
  const world = getDebugWorld();
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Debug command registration
// ---------------------------------------------------------------------------

export function registerDungeonDebugCommands(): void {
  registerDebugCommands({
    /**
     * Generate a new dungeon with an optional seed.
     * Usage: dungeon.generate [seed]
     */
    'dungeon.generate': (seedStr?: string) => {
      const world = getDebugWorld();
      let seed: number;

      if (seedStr !== undefined) {
        seed = parseInt(seedStr, 10);
        if (isNaN(seed)) {
          console.warn('[debug] dungeon.generate: invalid seed, using random');
          seed = (Math.random() * 2147483647) | 0;
        }
      } else {
        seed = (Math.random() * 2147483647) | 0;
      }

      const layout = generateDungeonWorld(world, seed);
      console.log(
        `[debug] dungeon.generate: seed=${seed}, ` +
        `${layout.rooms.length} rooms, ${layout.corridors.length} corridors`,
      );
    },

    /**
     * Print a summary of the current dungeon layout.
     * Usage: dungeon.info
     */
    'dungeon.info': () => {
      const layout = getCurrentLayout();
      if (!layout) {
        console.log('[debug] dungeon.info: No dungeon generated yet. Use dungeon.generate');
        return;
      }

      const landmarkCounts: Record<string, number> = {};
      for (const room of layout.rooms) {
        const lt = room.landmarkType ?? 'Normal';
        landmarkCounts[lt] = (landmarkCounts[lt] || 0) + 1;
      }

      console.log('--- Dungeon Info ---');
      console.log(`Seed:          ${layout.seed}`);
      console.log(`Rooms:         ${layout.rooms.length}`);
      console.log(`Corridors:     ${layout.corridors.length}`);
      console.log(`Start Room:    ${layout.startRoomId}`);
      console.log(`Boss Room:     ${layout.bossRoomId}`);
      console.log(`Landmark types: ${JSON.stringify(landmarkCounts)}`);
      console.log('-------------------');

      // List rooms
      for (const room of layout.rooms) {
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;
        const lt = room.landmarkType ?? '—';
        console.log(
          `  ${room.id} (${room.width}x${room.height}) @ (${room.x},${room.y}) ` +
          `center=(${centerX},${centerY}) landmark=${lt}`,
        );
      }
    },

    /**
     * Teleport the Character to the center of a named room.
     * Usage: dungeon.goto room_0
     */
    'dungeon.goto': (roomId?: string) => {
      const layout = getCurrentLayout();
      if (!layout) {
        console.warn('[debug] dungeon.goto: No dungeon generated yet. Use dungeon.generate');
        return;
      }

      if (!roomId) {
        console.warn('[debug] dungeon.goto: Usage: dungeon.goto <room_id>');
        return;
      }

      const room = layout.rooms.find((r) => r.id === roomId);
      if (!room) {
        console.warn(
          `[debug] dungeon.goto: Room "${roomId}" not found. ` +
          `Available: ${layout.rooms.map((r) => r.id).join(', ')}`,
        );
        return;
      }

      const charEid = findCharacter();
      if (charEid === null) {
        console.warn('[debug] dungeon.goto: No Character entity found.');
        return;
      }

      const cx = room.x + room.width / 2;
      const cy = room.y + room.height / 2;
      Position.x[charEid] = cx;
      Position.y[charEid] = cy;

      // Mark room as visited
      const world = getDebugWorld();
      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, DungeonRoom, eid)) {
          const roomIndex = parseInt(room.id.replace('room_', ''), 10);
          if (DungeonRoom.roomId[eid] === roomIndex) {
            DungeonRoom.visited[eid] = 1;
            // Also update the layout
            room.visited = true;
            break;
          }
        }
      }

      console.log(
        `[debug] dungeon.goto: Teleported Character to ${roomId} ` +
        `at (${cx.toFixed(2)}, ${cy.toFixed(2)})`,
      );
    },

    /**
     * Mark all rooms as visited (reveals the full minimap).
     * Usage: dungeon.reveal
     */
    'dungeon.reveal': () => {
      const layout = getCurrentLayout();
      if (!layout) {
        console.warn('[debug] dungeon.reveal: No dungeon generated yet. Use dungeon.generate');
        return;
      }

      const world = getDebugWorld();
      let count = 0;

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, DungeonRoom, eid)) {
          DungeonRoom.visited[eid] = 1;
          count++;
        }
      }

      // Also update layout objects
      for (const room of layout.rooms) {
        room.visited = true;
      }

      console.log(`[debug] dungeon.reveal: Marked ${count} room(s) as visited`);
    },

    /**
     * Regenerate the dungeon with a specific seed.
     * Usage: dungeon.seed 12345
     */
    'dungeon.seed': (seedStr?: string) => {
      if (!seedStr) {
        console.warn('[debug] dungeon.seed: Usage: dungeon.seed <number>');
        return;
      }

      const seed = parseInt(seedStr, 10);
      if (isNaN(seed)) {
        console.warn('[debug] dungeon.seed: Invalid seed — must be an integer');
        return;
      }

      const world = getDebugWorld();
      const layout = generateDungeonWorld(world, seed);

      console.log(
        `[debug] dungeon.seed: Regenerated with seed=${seed}, ` +
        `${layout.rooms.length} rooms, ${layout.corridors.length} corridors`,
      );
    },
  });
}
