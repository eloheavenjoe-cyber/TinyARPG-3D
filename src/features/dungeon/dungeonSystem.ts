import { addEntity, addComponent } from 'bitecs';
import type { World } from '@/core';
import { Position } from '@/systems/movement';
import type { DungeonLayout } from '@/shared/types';
import { DungeonRoom, CurrentDungeon } from './components';
import { generateDungeon } from './dungeonGenerator';
import { DEFAULT_DUNGEON_CONFIG } from './types';
import type { DungeonConfig } from './types';

// ---------------------------------------------------------------------------
// World storage key
// ---------------------------------------------------------------------------

/** Symbol used to store the current DungeonLayout on the world object. */
export const DUNGEON_LAYOUT_KEY = '__dungeonLayout';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a dungeon and populate the ECS world with room entities.
 *
 * This is an **on-demand** function (not a per-frame system). It:
 *  1. Generates a DungeonLayout via the BSP generator
 *  2. Creates a single entity with CurrentDungeon component
 *  3. Creates an entity per room (with DungeonRoom + Position)
 *  4. Stores the layout on the world object for debug access
 *
 * @param world  - The ECS world
 * @param seed   - Deterministic seed
 * @param config - Optional dungeon config
 * @returns The generated DungeonLayout
 */
export function generateDungeonWorld(
  world: World,
  seed: number,
  config: DungeonConfig = DEFAULT_DUNGEON_CONFIG,
): DungeonLayout {
  // 1. Generate layout (pure function)
  const layout = generateDungeon(seed, config);

  // 2. Store layout on world for debug / other systems
  (world as Record<string, unknown>)[DUNGEON_LAYOUT_KEY] = layout;

  // 3. Create CurrentDungeon singleton entity
  const dungeonEid = addEntity(world);
  addComponent(world, CurrentDungeon, dungeonEid);
  CurrentDungeon.seed[dungeonEid] = seed >>> 0;
  CurrentDungeon.active[dungeonEid] = 1;

  // 4. Create a room entity for each room
  for (const room of layout.rooms) {
    const roomEid = addEntity(world);
    addComponent(world, DungeonRoom, roomEid);
    addComponent(world, Position, roomEid);

    // Derive room index from ID (e.g. "room_0" → 0)
    const roomIndex = parseInt(room.id.replace('room_', ''), 10);
    DungeonRoom.roomId[roomEid] = roomIndex;
    DungeonRoom.visited[roomEid] = room.visited ? 1 : 0;

    // Position at the center of the room
    Position.x[roomEid] = room.x + room.width / 2;
    Position.y[roomEid] = room.y + room.height / 2;
  }

  // 5. Log summary in dev mode
  if (import.meta.env.DEV) {
    const landmarkCounts: Record<string, number> = {};
    for (const room of layout.rooms) {
      const lt = room.landmarkType ?? 'Normal';
      landmarkCounts[lt] = (landmarkCounts[lt] || 0) + 1;
    }

    console.log(
      `[Dungeon] Generated seed=${seed} | ` +
      `${layout.rooms.length} rooms, ${layout.corridors.length} corridors | ` +
      `Start: ${layout.startRoomId}, Boss: ${layout.bossRoomId} | ` +
      `Types: ${JSON.stringify(landmarkCounts)}`,
    );
  }

  return layout;
}
