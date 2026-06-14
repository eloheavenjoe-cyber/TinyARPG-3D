// ---------------------------------------------------------------------------
// Dungeon Config
// ---------------------------------------------------------------------------

/**
 * Configuration parameters for the procedural dungeon generator.
 */
export interface DungeonConfig {
  /** Minimum room size in tiles. */
  minRoomSize: number;
  /** Maximum room size in tiles. */
  maxRoomSize: number;
  /** Total dungeon area width in tiles. */
  mapWidth: number;
  /** Total dungeon area height in tiles. */
  mapHeight: number;
  /** Minimum number of rooms (excluding landmark rooms). */
  minRooms: number;
  /** Maximum number of rooms (excluding landmark rooms). */
  maxRooms: number;
  /** Number of Loot Rooms to place. */
  lootRoomCount: number;
  /** Number of Vendor Rooms to place. */
  vendorRoomCount: number;
  /** Corridor width in tiles. */
  corridorWidth: number;
}

export const DEFAULT_DUNGEON_CONFIG: DungeonConfig = {
  minRoomSize: 6,
  maxRoomSize: 12,
  mapWidth: 80,
  mapHeight: 60,
  minRooms: 8,
  maxRooms: 14,
  lootRoomCount: 2,
  vendorRoomCount: 1,
  corridorWidth: 2,
};
