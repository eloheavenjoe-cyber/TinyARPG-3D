import type { SaveSlot } from '@/shared';
import type { World } from '@/core';
import type { StoragePort } from './StoragePort';

import { createWorld, getAllEntities, hasComponent, addEntity, addComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// Movement components
// ---------------------------------------------------------------------------
import {
  Position,
  Velocity,
  MovementSpeed,
  FacingDirection,
  IsCharacter,
} from '@/systems/movement';

// ---------------------------------------------------------------------------
// AI components
// ---------------------------------------------------------------------------
import {
  IsEnemy,
  EnemyType,
  AIState,
  TargetEntity,
  AttackRange,
  AttackTimer,
  AttackCooldown,
  IsElite,
  EliteModifiers,
} from '@/systems/ai';

// ---------------------------------------------------------------------------
// Combat components
// ---------------------------------------------------------------------------
import {
  Life,
  Damage,
  SkillSlot,
  CooldownTimer,
  CooldownDuration,
  IsDead,
} from '@/systems/combat';

// ---------------------------------------------------------------------------
// Buff components
// ---------------------------------------------------------------------------
import {
  BaseStats,
  BuffInstance,
} from '@/systems/buff';

// ---------------------------------------------------------------------------
// Loot components
// ---------------------------------------------------------------------------
import {
  GroundItemComponent,
  IsLootable,
  InventorySlot,
  LootPickupRange,
  LootDropTable,
} from '@/systems/loot';

// ---------------------------------------------------------------------------
// Render components
// ---------------------------------------------------------------------------
import {
  DamageNumberEmitter,
  TelegraphEmitter,
} from '@/systems/render';

// ---------------------------------------------------------------------------
// Inventory components
// ---------------------------------------------------------------------------
import {
  InventoryItem,
} from '@/features/inventory';

// ---------------------------------------------------------------------------
// Passive Tree components
// ---------------------------------------------------------------------------
import {
  PassiveTreeState,
  PassiveStats,
} from '@/features/passive-tree';

// ---------------------------------------------------------------------------
// Boss components
// ---------------------------------------------------------------------------
import {
  IsBoss,
  BossState,
  BossArena,
} from '@/features/boss';

// ---------------------------------------------------------------------------
// Portal components
// ---------------------------------------------------------------------------
import {
  Portal,
  IsPortal,
  PortalScrollCount,
} from '@/features/portal';

// ---------------------------------------------------------------------------
// Dungeon components
// ---------------------------------------------------------------------------
import {
  DungeonRoom,
  CurrentDungeon,
} from '@/features/dungeon';

// ===========================================================================
// Serialization types
// ===========================================================================

interface SerializedComponent {
  /** Component name used as key into COMPONENT_SCHEMA for reconstruction. */
  name: string;
  /** Field name → array of values (one per entity, stored as plain arrays). */
  fields: Record<string, number[]>;
}

interface SerializedEntity {
  /** Original entity ID assigned by bitecs. Used for remapping references. */
  eid: number;
  /** Components present on this entity, with their field values. */
  components: SerializedComponent[];
}

interface SerializedWorld {
  /** All entities in the world, in original ID order. */
  entities: SerializedEntity[];
  /** The next entity ID counter (informational). */
  nextEntityId: number;
}

// ===========================================================================
// Component schema — maps component name → component object + field list
// ===========================================================================

/**
 * Describes a known component for serialization.
 * Tag components have an empty fields array — only presence is recorded.
 */
interface ComponentSchemaEntry {
  component: Record<string, any>;
  fields: string[];
  /** Fields of type `eid` that must be remapped during deserialization. */
  eidFields?: string[];
}

/** Any ECS component object used in hasComponent/addComponent. */
type ComponentLike = Record<string, any>;

const COMPONENT_SCHEMA: Record<string, ComponentSchemaEntry> = {
  // -- Movement --
  Position:           { component: Position, fields: ['x', 'y'] },
  Velocity:           { component: Velocity, fields: ['x', 'y'] },
  MovementSpeed:      { component: MovementSpeed, fields: ['value'] },
  FacingDirection:    { component: FacingDirection, fields: ['x', 'y'] },
  IsCharacter:        { component: IsCharacter, fields: [] },

  // -- AI --
  IsEnemy:            { component: IsEnemy, fields: [] },
  EnemyType:          { component: EnemyType, fields: ['value'] },
  AIState:            { component: AIState, fields: ['value'] },
  AttackRange:        { component: AttackRange, fields: ['value'] },
  AttackTimer:        { component: AttackTimer, fields: ['value'] },
  AttackCooldown:     { component: AttackCooldown, fields: ['value'] },
  TargetEntity:       { component: TargetEntity, fields: ['eid'], eidFields: ['eid'] },
  IsElite:            { component: IsElite, fields: [] },
  EliteModifiers:     { component: EliteModifiers, fields: ['mask'] },

  // -- Combat --
  Life:               { component: Life, fields: ['current', 'max'] },
  Damage:             { component: Damage, fields: ['value'] },
  SkillSlot:          { component: SkillSlot, fields: ['skillId_0', 'skillId_1', 'skillId_2', 'skillId_3'] },
  CooldownTimer:      { component: CooldownTimer, fields: ['remaining_0', 'remaining_1', 'remaining_2', 'remaining_3'] },
  CooldownDuration:   { component: CooldownDuration, fields: ['max_0', 'max_1', 'max_2', 'max_3'] },
  IsDead:             { component: IsDead, fields: [] },

  // -- Buff --
  BaseStats:          { component: BaseStats, fields: ['damage', 'maxLife', 'movementSpeed'] },
  BuffInstance:       { component: BuffInstance, fields: ['ownerEid', 'buffId', 'remainingTime'], eidFields: ['ownerEid'] },

  // -- Loot --
  GroundItemComponent: { component: GroundItemComponent, fields: ['itemId', 'rarityCode', 'itemLevel', 'droppedByEid', 'despawnTimer'] },
  IsLootable:         { component: IsLootable, fields: [] },
  InventorySlot:      { component: InventorySlot, fields: ['count'] },
  LootPickupRange:    { component: LootPickupRange, fields: ['value'] },
  LootDropTable:      { component: LootDropTable, fields: ['dropChance', 'minLevel', 'maxLevel'] },

  // -- Render --
  DamageNumberEmitter: { component: DamageNumberEmitter, fields: ['value', 'lifetime'] },
  TelegraphEmitter:   { component: TelegraphEmitter, fields: ['shape', 'radius', 'angle', 'lifetime'] },

  // -- Inventory --
  InventoryItem:      { component: InventoryItem, fields: ['ownerEid', 'specIdCode', 'rarityCode', 'itemLevel', 'equipped', 'gridIndex'], eidFields: ['ownerEid'] },

  // -- Passive Tree --
  PassiveTreeState:   { component: PassiveTreeState, fields: ['skillPoints', 'respecPoints', 'allocatedMask'] },
  PassiveStats:       { component: PassiveStats, fields: ['bonusDamage', 'bonusMaxLife', 'bonusMovementSpeed'] },

  // -- Boss --
  IsBoss:             { component: IsBoss, fields: [] },
  BossState:          { component: BossState, fields: ['currentPhase', 'enrageTimer', 'isEnraged', 'attackTimer', 'currentAttack', 'telegraphTimer', 'telegraphTargetX', 'telegraphTargetY'] },
  BossArena:          { component: BossArena, fields: ['centerX', 'centerY', 'radius'] },

  // -- Portal --
  Portal:             { component: Portal, fields: ['portalType', 'activationTimer', 'isActive', 'targetZone', 'targetX', 'targetY'] },
  IsPortal:           { component: IsPortal, fields: [] },
  PortalScrollCount:  { component: PortalScrollCount, fields: ['count'] },

  // -- Dungeon --
  DungeonRoom:        { component: DungeonRoom, fields: ['roomId', 'visited'] },
  CurrentDungeon:     { component: CurrentDungeon, fields: ['seed', 'active'] },
};

// ===========================================================================
// IndexedDBStorage
// ===========================================================================

const DEFAULT_DB_NAME = 'tinyarpg-saves';
const STORE_NAME = 'saves';

/** Default metadata used when none is available. */
const DEFAULT_METADATA: Omit<SaveSlot, 'id' | 'timestamp'> = {
  characterName: 'Marauder',
  className: 'Marauder',
  level: 1,
  zoneName: 'Hub',
};

/**
 * Storage adapter that persists the full ECS world into IndexedDB.
 *
 * ## IndexedDB structure
 * - Database: `tinyarpg-saves`
 * - Object store: `saves` (keyPath: `id`)
 * - Record shape: `{ id, metadata: SaveSlot, worldData: SerializedWorld }`
 */
export class IndexedDBStorage implements StoragePort {
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName?: string) {
    this.dbName = dbName ?? DEFAULT_DB_NAME;
  }

  // -----------------------------------------------------------------------
  // Public API — StoragePort implementation
  // -----------------------------------------------------------------------

  /**
   * List all save slots, ordered by most-recent-first.
   */
  async listSaves(): Promise<SaveSlot[]> {
    const db = await this.getDB();
    return new Promise<SaveSlot[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (): void => {
        const records = request.result as Array<{ id: string; metadata: SaveSlot }>;
        const slots: SaveSlot[] = records
          .map((r) => r.metadata)
          .sort((a, b) => b.timestamp - a.timestamp);
        resolve(slots);
      };

      request.onerror = (): void => {
        reject(new Error(`IndexedDB listSaves failed: ${request.error?.message ?? 'unknown'}`));
      };
    });
  }

  /**
   * Serialize the full ECS world and persist it under `id`.
   * If a save with this id already exists it is overwritten.
   */
  async save(id: string, world: World): Promise<void> {
    const start = performance.now();

    const worldData = this.serializeWorld(world);
    const metadata = this.buildMetadata(id, world);

    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, metadata, worldData });

      tx.oncomplete = (): void => resolve();
      tx.onerror = (): void => {
        reject(new Error(`IndexedDB save failed: ${tx.error?.message ?? 'unknown'}`));
      };
    });

    if (import.meta.env.DEV) {
      const elapsed = (performance.now() - start).toFixed(1);
      console.log(`[IndexedDBStorage] Saved "${id}" (${worldData.entities.length} entities) in ${elapsed}ms`);
    }
  }

  /**
   * Load a previously saved world from IndexedDB and reconstruct the full
   * ECS state. Returns a brand new World instance with all entities and
   * component values restored.
   */
  async load(id: string): Promise<World> {
    const start = performance.now();

    const db = await this.getDB();
    const record = await new Promise<{ id: string; metadata: SaveSlot; worldData: SerializedWorld } | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = (): void => {
          resolve(request.result ?? null);
        };
        request.onerror = (): void => {
          reject(new Error(`IndexedDB load failed: ${request.error?.message ?? 'unknown'}`));
        };
      },
    );

    if (!record) {
      throw new Error(`Save slot "${id}" not found`);
    }

    const world = this.deserializeWorld(record.worldData);

    if (import.meta.env.DEV) {
      const elapsed = (performance.now() - start).toFixed(1);
      console.log(`[IndexedDBStorage] Loaded "${id}" (${record.worldData.entities.length} entities) in ${elapsed}ms`);
    }

    return world;
  }

  /**
   * Delete a save slot by id.
   */
  async deleteSave(id: string): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      tx.oncomplete = (): void => resolve();
      tx.onerror = (): void => {
        reject(new Error(`IndexedDB deleteSave failed: ${tx.error?.message ?? 'unknown'}`));
      };
    });

    if (import.meta.env.DEV) {
      console.log(`[IndexedDBStorage] Deleted save "${id}"`);
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Lazily initialise (or return) the IndexedDB connection.
   *
   * Opens the database and ensures the object store exists.
   * If IndexedDB is unavailable (private browsing, unsupported browser)
   * a descriptive error is thrown.
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (typeof indexedDB === 'undefined') {
      throw new Error(
        'IndexedDB is not available in this browser. ' +
        'Please use a modern browser or disable private browsing mode.',
      );
    }

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (): void => {
        resolve(request.result);
      };

      request.onerror = (): void => {
        reject(
          new Error(
            `Failed to open IndexedDB database "${this.dbName}": ` +
            `${request.error?.message ?? 'unknown error'}`,
          ),
        );
      };
    });

    return this.db;
  }

  /**
   * Serialize a live ECS World into a portable SerializedWorld structure.
   *
   * Iterates every entity, checks every known component via `hasComponent`,
   * and records the field values as plain number arrays so they survive JSON.
   */
  private serializeWorld(world: World): SerializedWorld {
    const entities = getAllEntities(world);

    // Sort by eid for deterministic output
    const sorted = [...entities].sort((a, b) => a - b);

    const serializedEntities: SerializedEntity[] = sorted.map((eid) => {
      const components: SerializedComponent[] = [];

      for (const [name, entry] of Object.entries(COMPONENT_SCHEMA)) {
        if (!hasComponent(world, entry.component as ComponentLike, eid)) {
          continue;
        }

        const fields: Record<string, number[]> = {};

        for (const fieldName of entry.fields) {
          const typedArray = entry.component[fieldName];
          if (typedArray !== undefined) {
            fields[fieldName] = [typedArray[eid]];
          }
        }

        components.push({ name, fields });
      }

      return { eid, components };
    });

    return {
      entities: serializedEntities,
      nextEntityId: sorted.length > 0 ? sorted[sorted.length - 1] + 1 : 1,
    };
  }

  /**
   * Reconstruct a live ECS World from a SerializedWorld structure.
   *
   * Creates a fresh world, creates entities (preserving original IDs via
   * entity ID remapping where possible), adds all components, and restores
   * every field value.
   */
  private deserializeWorld(data: SerializedWorld): World {
    const world = createWorld() as unknown as World;

    // Map original entity IDs → new entity IDs
    // We need to carefully preserve IDs because components reference each
    // other via eid fields (TargetEntity, BuffInstance.ownerEid, etc.).
    const eidMap = new Map<number, number>();

    // Sort entities by original eid so recreate order is deterministic
    const sorted = [...data.entities].sort((a, b) => a.eid - b.eid);

    // Phase 1: create all entities, build ID map
    for (const serialized of sorted) {
      const newEid = addEntity(world);
      eidMap.set(serialized.eid, newEid);
    }

    // Phase 2: add components and restore field values
    for (const serialized of sorted) {
      const newEid = eidMap.get(serialized.eid)!;

      for (const comp of serialized.components) {
        const entry = COMPONENT_SCHEMA[comp.name];
        if (!entry) {
          if (import.meta.env.DEV) {
            console.warn(`[IndexedDBStorage] Unknown component "${comp.name}" — skipping`);
          }
          continue;
        }

        addComponent(world, entry.component as ComponentLike, newEid);

        // Restore each field value
        for (const fieldName of entry.fields) {
          const values = comp.fields[fieldName];
          if (values === undefined || values.length === 0) {
            continue;
          }

          let value = values[0];

          // Remap entity references
          if (entry.eidFields?.includes(fieldName)) {
            const mapped = eidMap.get(value);
            if (mapped !== undefined) {
              value = mapped;
            }
          }

          entry.component[fieldName][newEid] = value;
        }
      }
    }

    return world;
  }

  /**
   * Build a SaveSlot metadata object for the given save id.
   * Attempts to read the character's Life component for level hints,
   * but falls back to sensible defaults.
   */
  private buildMetadata(id: string, world: World): SaveSlot {
    const isCharacterEids = getAllEntities(world).filter(
      (eid) => hasComponent(world, IsCharacter as ComponentLike, eid),
    );

    let characterName = DEFAULT_METADATA.characterName;
    let className = DEFAULT_METADATA.className;
    let level = DEFAULT_METADATA.level;
    let zoneName = DEFAULT_METADATA.zoneName;

    if (isCharacterEids.length > 0) {
      const charEid = isCharacterEids[0];
      // Attempt to derive level from Life.max — crude heuristic
      if (hasComponent(world, Life as ComponentLike, charEid)) {
        const maxLife = Life.max[charEid];
        // Rough mapping: 100 HP = level 1, 200 HP = level 10, etc.
        level = Math.max(1, Math.floor(maxLife / 10) - 9);
      }
    }

    return {
      id,
      characterName,
      className,
      level,
      zoneName,
      timestamp: Date.now(),
    };
  }
}
