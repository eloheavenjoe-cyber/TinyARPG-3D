// ---------------------------------------------------------------------------
// PRNG — mulberry32
// ---------------------------------------------------------------------------

/**
 * Creates a deterministic pseudo-random number generator using the mulberry32
 * algorithm. Given the same seed, always produces the same sequence.
 *
 * @param seed - 32-bit integer seed
 * @returns An object with a `next()` method that returns values in [0, 1).
 */
export function createRNG(seed: number): { next(): number } {
  let s = seed | 0;
  return {
    next(): number {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Shorthand type for the RNG object. */
export type RNG = ReturnType<typeof createRNG>;

// ---------------------------------------------------------------------------
// BSP Tree internals
// ---------------------------------------------------------------------------

/**
 * Internal node used during BSP partitioning.
 */
interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left: BSPNode | null;
  right: BSPNode | null;
  room: Room | null;
}

import type { DungeonLayout, Room, Corridor, Vec2 } from '@/shared/types';
import { LandmarkType } from '@/shared/enums';
import type { DungeonConfig } from './types';
import { DEFAULT_DUNGEON_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Margin (in tiles) between a leaf's edge and the room placed inside it. */
const ROOM_MARGIN = 1;

// ---------------------------------------------------------------------------
// BSP splitting
// ---------------------------------------------------------------------------

/**
 * Recursively split a BSP node into a binary tree, alternating split
 * direction per depth level. Stops when the node cannot produce two
 * children large enough to hold rooms.
 */
function splitNode(
  node: BSPNode,
  rng: RNG,
  depth: number,
  config: DungeonConfig,
): void {
  const { width, height } = node;
  const minLeafSize = Math.max(config.minRoomSize, 6) + ROOM_MARGIN * 2;

  // Alternate direction: even depth → vertical split, odd → horizontal split.
  // If the node is too narrow for the preferred direction, try the other.
  const tryVerticalFirst = depth % 2 === 0;
  const canSplitVertical = width >= minLeafSize * 2;
  const canSplitHorizontal = height >= minLeafSize * 2;

  if (!canSplitVertical && !canSplitHorizontal) {
    return; // Leaf too small — stop splitting
  }

  const splitVertical = tryVerticalFirst
    ? canSplitVertical
    : !canSplitHorizontal;

  if (splitVertical) {
    // Split vertically (left / right children)
    const minSplit = minLeafSize;
    const maxSplit = width - minLeafSize;
    const splitPos = Math.floor(
      minSplit + rng.next() * (maxSplit - minSplit),
    );

    node.left = {
      x: node.x,
      y: node.y,
      width: splitPos,
      height,
      left: null,
      right: null,
      room: null,
    };
    node.right = {
      x: node.x + splitPos,
      y: node.y,
      width: width - splitPos,
      height,
      left: null,
      right: null,
      room: null,
    };
  } else {
    // Split horizontally (top / bottom children)
    const minSplit = minLeafSize;
    const maxSplit = height - minLeafSize;
    const splitPos = Math.floor(
      minSplit + rng.next() * (maxSplit - minSplit),
    );

    node.left = {
      x: node.x,
      y: node.y,
      width,
      height: splitPos,
      left: null,
      right: null,
      room: null,
    };
    node.right = {
      x: node.x,
      y: node.y + splitPos,
      width,
      height: height - splitPos,
      left: null,
      right: null,
      room: null,
    };
  }

  // Recurse into children
  splitNode(node.left, rng, depth + 1, config);
  splitNode(node.right, rng, depth + 1, config);
}

// ---------------------------------------------------------------------------
// Room placement
// ---------------------------------------------------------------------------

/**
 * Place a room inside every leaf of the BSP tree.
 */
function placeRooms(node: BSPNode, rng: RNG, config: DungeonConfig): void {
  if (node.left && node.right) {
    placeRooms(node.left, rng, config);
    placeRooms(node.right, rng, config);
    return;
  }

  // Leaf node — place a room
  const margin = ROOM_MARGIN;
  const maxW = Math.min(node.width - margin * 2, config.maxRoomSize);
  const maxH = Math.min(node.height - margin * 2, config.maxRoomSize);
  const minW = Math.min(config.minRoomSize, maxW);
  const minH = Math.min(config.minRoomSize, maxH);

  const roomW = minW + Math.floor(rng.next() * (maxW - minW + 1));
  const roomH = minH + Math.floor(rng.next() * (maxH - minH + 1));

  const roomX = node.x + margin + Math.floor(rng.next() * (node.width - margin * 2 - roomW + 1));
  const roomY = node.y + margin + Math.floor(rng.next() * (node.height - margin * 2 - roomH + 1));

  node.room = {
    id: '',
    x: roomX,
    y: roomY,
    width: roomW,
    height: roomH,
    landmarkType: null,
    visited: false,
  };
}

// ---------------------------------------------------------------------------
// Room collection
// ---------------------------------------------------------------------------

/**
 * Collect all rooms from the BSP tree into a flat array and assign IDs.
 */
function collectRooms(node: BSPNode, out: Room[]): void {
  if (node.left && node.right) {
    collectRooms(node.left, out);
    collectRooms(node.right, out);
    return;
  }
  if (node.room) {
    node.room.id = `room_${out.length}`;
    out.push(node.room);
  }
}

// ---------------------------------------------------------------------------
// Corridor connection (BSP sibling linking)
// ---------------------------------------------------------------------------

/**
 * Walk the BSP tree bottom-up. For each internal node, connect one
 * room from the left subtree to one room from the right subtree.
 * Returns a list of room-id pairs to connect.
 */
function collectSiblingConnections(
  node: BSPNode,
  connections: Array<[string, string]>,
  rng: RNG,
): void {
  if (!node.left && !node.right) {
    return; // Leaf — nothing to connect
  }

  // Recurse first (post-order traversal)
  if (node.left) collectSiblingConnections(node.left, connections, rng);
  if (node.right) collectSiblingConnections(node.right, connections, rng);

  // Collect all rooms from left and right subtrees
  const leftRooms = collectAllRoomsInSubtree(node.left);
  const rightRooms = collectAllRoomsInSubtree(node.right);

  if (leftRooms.length === 0 || rightRooms.length === 0) return;

  // Pick a random room from each side
  const leftRoom = leftRooms[Math.floor(rng.next() * leftRooms.length)];
  const rightRoom = rightRooms[Math.floor(rng.next() * rightRooms.length)];

  connections.push([leftRoom.id, rightRoom.id]);
}

/**
 * Return every room in the given BSP subtree.
 */
function collectAllRoomsInSubtree(node: BSPNode | null): Room[] {
  const out: Room[] = [];
  if (!node) return out;
  if (node.left && node.right) {
    out.push(...collectAllRoomsInSubtree(node.left));
    out.push(...collectAllRoomsInSubtree(node.right));
  } else if (node.room) {
    out.push(node.room);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Extra corridors (loops)
// ---------------------------------------------------------------------------

/**
 * Add extra corridor connections between random room pairs to create loops.
 * Adds roughly 15% of the remaining possible connections.
 */
function addExtraConnections(
  rooms: Room[],
  existing: Set<string>,
  rng: RNG,
): Array<[string, string]> {
  const extra: Array<[string, string]> = [];
  const n = rooms.length;
  const totalPossible = (n * (n - 1)) / 2;
  const alreadyConnected = existing.size / 2; // each pair stored twice (a,b) and (b,a)
  const remaining = totalPossible - alreadyConnected;
  const desiredExtras = Math.max(1, Math.floor(remaining * 0.15));

  // Generate candidate pairs (shuffle approach)
  const candidates: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${i}-${j}`;
      if (!existing.has(key)) {
        candidates.push([i, j]);
      }
    }
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const count = Math.min(desiredExtras, candidates.length);
  for (let k = 0; k < count; k++) {
    const [i, j] = candidates[k];
    extra.push([rooms[i].id, rooms[j].id]);
  }

  return extra;
}

// ---------------------------------------------------------------------------
// L-shaped corridor generation
// ---------------------------------------------------------------------------

/**
 * Build an L-shaped corridor between the centers of two rooms.
 * Randomly picks horizontal-first or vertical-first routing.
 */
function buildCorridor(a: Room, b: Room, width: number, rng: RNG): Vec2[] {
  const ax = Math.floor(a.x + a.width / 2);
  const ay = Math.floor(a.y + a.height / 2);
  const bx = Math.floor(b.x + b.width / 2);
  const by = Math.floor(b.y + b.height / 2);

  const tiles: Vec2[] = [];
  const added = new Set<string>();

  /**
   * Add a tile at (x, y) if not already added.
   */
  function addTile(x: number, y: number): void {
    const key = `${x},${y}`;
    if (!added.has(key)) {
      added.add(key);
      tiles.push({ x, y });
    }
  }

  /**
   * Rasterize a horizontal line from x1 to x2 at y.
   */
  function addHorizontal(x1: number, x2: number, y: number): void {
    const from = Math.min(x1, x2);
    const to = Math.max(x1, x2);
    for (let x = from; x <= to; x++) {
      for (let w = 0; w < width; w++) {
        addTile(x, y + w);
      }
    }
  }

  /**
   * Rasterize a vertical line from y1 to y2 at x.
   */
  function addVertical(y1: number, y2: number, x: number): void {
    const from = Math.min(y1, y2);
    const to = Math.max(y1, y2);
    for (let y = from; y <= to; y++) {
      for (let w = 0; w < width; w++) {
        addTile(x + w, y);
      }
    }
  }

  const goHorizontalFirst = rng.next() < 0.5;

  if (goHorizontalFirst) {
    addHorizontal(ax, bx, ay);
    addVertical(ay, by, bx);
  } else {
    addVertical(ay, by, ax);
    addHorizontal(ax, bx, by);
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// Landmark assignment
// ---------------------------------------------------------------------------

/**
 * Compute Manhattan distance between room centers.
 */
function roomDistance(a: Room, b: Room): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * Assign landmark types to rooms:
 *  - Start Room: a room near the center of the map
 *  - Boss Room: the room farthest from the start room
 *  - Loot Rooms: random non-landmark rooms
 *  - Vendor Room: random non-landmark room
 */
function assignLandmarks(
  rooms: Room[],
  config: DungeonConfig,
  rng: RNG,
): { bossRoomId: string; startRoomId: string } {
  if (rooms.length === 0) {
    return { bossRoomId: '', startRoomId: '' };
  }

  // Find the room nearest to the map center
  const cx = config.mapWidth / 2;
  const cy = config.mapHeight / 2;
  let startRoom = rooms[0];
  let startDist = Infinity;

  for (const room of rooms) {
    const rx = room.x + room.width / 2;
    const ry = room.y + room.height / 2;
    const d = Math.abs(rx - cx) + Math.abs(ry - cy);
    if (d < startDist) {
      startDist = d;
      startRoom = room;
    }
  }

  startRoom.landmarkType = LandmarkType.BossRoom; // Placeholder; will reassign
  const startRoomId = startRoom.id;

  // Boss room: farthest from start room
  let bossRoom = rooms[0];
  let bossDist = -1;
  for (const room of rooms) {
    if (room.id === startRoomId) continue;
    const d = roomDistance(room, startRoom);
    if (d > bossDist) {
      bossDist = d;
      bossRoom = room;
    }
  }

  bossRoom.landmarkType = LandmarkType.BossRoom;
  const bossRoomId = bossRoom.id;

  // Reset start room type to BossRoom temporarily; assign it properly
  startRoom.landmarkType = null;

  // Now assign start room
  startRoom.landmarkType = null; // no landmark for start room (it's just the start)

  // Collect eligible rooms (non-landmark)
  const eligible = rooms.filter(
    (r) => r.id !== startRoomId && r.id !== bossRoomId,
  );

  // Shuffle eligible list
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  // Assign Loot Rooms
  const lootCount = Math.min(config.lootRoomCount, eligible.length);
  for (let i = 0; i < lootCount; i++) {
    eligible[i].landmarkType = LandmarkType.LootRoom;
  }

  // Assign Vendor Room (skip loot rooms)
  const vendorEligible = eligible.filter(
    (r) => r.landmarkType === null,
  );
  const vendorCount = Math.min(config.vendorRoomCount, vendorEligible.length);
  for (let i = 0; i < vendorCount; i++) {
    vendorEligible[i].landmarkType = LandmarkType.VendorRoom;
  }

  // Now assign start room landmark
  startRoom.landmarkType = null;

  return { bossRoomId, startRoomId };
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete dungeon layout using BSP partitioning.
 *
 * This is a **pure function** — calling it with the same seed and config
 * always produces the identical layout.
 *
 * @param seed  - 32-bit integer seed for deterministic generation.
 * @param config  - Optional configuration; falls back to DEFAULT_DUNGEON_CONFIG.
 * @returns A fully populated DungeonLayout with rooms, corridors, and landmark IDs.
 */
export function generateDungeon(
  seed: number,
  config: DungeonConfig = DEFAULT_DUNGEON_CONFIG,
): DungeonLayout {
  const rng = createRNG(seed);

  // -----------------------------------------------------------------------
  // 1. BSP partitioning
  // -----------------------------------------------------------------------
  const root: BSPNode = {
    x: 0,
    y: 0,
    width: config.mapWidth,
    height: config.mapHeight,
    left: null,
    right: null,
    room: null,
  };

  splitNode(root, rng, 0, config);
  placeRooms(root, rng, config);

  // -----------------------------------------------------------------------
  // 2. Collect rooms
  // -----------------------------------------------------------------------
  const rooms: Room[] = [];
  collectRooms(root, rooms);

  // Guard: if BSP produced fewer than expected rooms, the config is too tight
  if (rooms.length < 2) {
    // Fallback: at least place two rooms manually
    rooms.length = 0;
    rooms.push({
      id: 'room_0',
      x: 2,
      y: 2,
      width: 10,
      height: 10,
      landmarkType: null,
      visited: false,
    });
    rooms.push({
      id: 'room_1',
      x: config.mapWidth - 14,
      y: config.mapHeight - 14,
      width: 10,
      height: 10,
      landmarkType: null,
      visited: false,
    });
  }

  // -----------------------------------------------------------------------
  // 3. Build room connections (MST via BSP sibling links + extra loops)
  // -----------------------------------------------------------------------
  const connectionPairs: Array<[string, string]> = [];
  collectSiblingConnections(root, connectionPairs, rng);

  // Track existing connections (undirected)
  const connectedSet = new Set<string>();
  for (const [a, b] of connectionPairs) {
    const ai = rooms.findIndex((r) => r.id === a);
    const bi = rooms.findIndex((r) => r.id === b);
    if (ai !== -1 && bi !== -1) {
      const key = `${Math.min(ai, bi)}-${Math.max(ai, bi)}`;
      connectedSet.add(key);
    }
  }

  // Extra corridors for loops
  const extras = addExtraConnections(rooms, connectedSet, rng);
  connectionPairs.push(...extras);

  // -----------------------------------------------------------------------
  // 4. Generate corridor geometry
  // -----------------------------------------------------------------------
  const corridorWidth = config.corridorWidth;
  const roomMap = new Map<string, Room>();
  for (const room of rooms) {
    roomMap.set(room.id, room);
  }

  const corridors: Corridor[] = [];
  for (let i = 0; i < connectionPairs.length; i++) {
    const [aid, bid] = connectionPairs[i];
    const a = roomMap.get(aid);
    const b = roomMap.get(bid);
    if (!a || !b) continue;

    const tiles = buildCorridor(a, b, corridorWidth, rng);
    corridors.push({
      id: `corr_${i}`,
      fromRoomId: aid,
      toRoomId: bid,
      tiles,
    });
  }

  // -----------------------------------------------------------------------
  // 5. Assign landmark rooms
  // -----------------------------------------------------------------------
  const { bossRoomId, startRoomId } = assignLandmarks(rooms, config, rng);

  // Ensure start room has no landmark type
  const startRoom = roomMap.get(startRoomId);
  if (startRoom) {
    startRoom.landmarkType = null;
  }

  return {
    seed,
    rooms,
    corridors,
    bossRoomId,
    startRoomId,
  };
}
