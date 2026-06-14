import { defineQuery, hasComponent, addComponent, addEntity, removeEntity } from 'bitecs';
import type { World } from '@/core';
import { getFrameIntents, getDeltaTime } from '@/core';
import { IntentType } from '@/shared';
import { Position, IsCharacter } from '@/systems/movement';
import { IsDead } from '@/systems/combat';
import {
  GroundItemComponent,
  IsLootable,
  InventorySlot,
  LootPickupRange,
  LootDropTable,
} from './components';
import { DEFAULT_LOOT_CONFIG } from './types';
import type { LootConfig } from './types';
import { generateRandomItem } from './types';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All dead entities with a position (potential loot drops). */
const deadQuery = defineQuery([IsDead, Position]);

/** All ground loot items currently in the world. */
const lootQuery = defineQuery([IsLootable, GroundItemComponent, Position]);

/** The Character entity (must have IsCharacter + Position). */
const characterQuery = defineQuery([Position, IsCharacter]);

// ---------------------------------------------------------------------------
// Loot system
// ---------------------------------------------------------------------------

/**
 * lootSystem — handles loot dropping, pickup, despawn, and cleanup.
 *
 * Runs after the combat system (which adds IsDead). Each frame:
 *
 * **Drop phase:**
 * 1. Query all entities with `IsDead` + `Position` that do NOT already have
 *    `GroundItemComponent` (fresh deaths).
 * 2. Roll drop chance.
 * 3. If success, create a new ground item entity with position copied from
 *    the dead entity and random item properties.
 * 4. Add `GroundItemComponent` to the original dead entity as a processed
 *    marker so it is not processed again.
 *
 * **Pickup phase:**
 * 1. Read `Interact` intents from the frame.
 * 2. For each intent, find the closest `IsLootable` entity within
 *    `pickupRange` of the Character.
 * 3. Increment the Character's `InventorySlot.count`.
 * 4. Remove the ground item entity.
 *
 * **Despawn phase:**
 * 1. Tick down `despawnTimer` on all `IsLootable` entities.
 * 2. When `≤ 0`, remove the entity.
 *
 * **Cleanup:**
 * 1. If the number of ground items exceeds `maxGroundItems`, remove the
 *    oldest ones (first in query order).
 */
export function lootSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // Convert ms → seconds
  const intents = getFrameIntents(world);
  const config: LootConfig = DEFAULT_LOOT_CONFIG;

  // -----------------------------------------------------------------------
  // a. Drop phase — fresh deaths drop loot
  // -----------------------------------------------------------------------
  const deadEntities = deadQuery(world);

  for (const eid of deadEntities) {
    // Skip entities that have already been processed for loot
    if (hasComponent(world, GroundItemComponent, eid)) continue;
    if (hasComponent(world, IsLootable, eid)) continue;

    // Determine effective drop chance (check for LootDropTable override)
    let effectiveDropChance = config.dropChance;
    if (hasComponent(world, LootDropTable, eid)) {
      effectiveDropChance = LootDropTable.dropChance[eid];
    }

    // Roll for drop
    if (Math.random() >= effectiveDropChance) {
      // Mark as processed so we don't roll again next frame
      addComponent(world, GroundItemComponent, eid);
      continue;
    }

    // Determine monster level for item generation
    const hasDropTable = hasComponent(world, LootDropTable, eid);
    const minLevel = hasDropTable ? LootDropTable.minLevel[eid] : 1;
    const maxLevel = hasDropTable ? LootDropTable.maxLevel[eid] : 1;
    const monsterLevel = Math.max(1, minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1)));

    // Generate random item
    const item = generateRandomItem(monsterLevel);

    // Create a new ground item entity
    const itemEid = addEntity(world);
    addComponent(world, GroundItemComponent, itemEid);
    addComponent(world, IsLootable, itemEid);
    addComponent(world, Position, itemEid);

    // Copy position from the dead entity
    Position.x[itemEid] = Position.x[eid];
    Position.y[itemEid] = Position.y[eid];

    // Set ground item data
    GroundItemComponent.itemId[itemEid] = 0; // placeholder — no item registry yet
    GroundItemComponent.rarityCode[itemEid] = rarityToCode(item.rarity);
    GroundItemComponent.itemLevel[itemEid] = item.itemLevel;
    GroundItemComponent.droppedByEid[itemEid] = eid;
    GroundItemComponent.despawnTimer[itemEid] = config.despawnTime;

    // Mark the dead entity as processed so we don't re-drop
    addComponent(world, GroundItemComponent, eid);

    if (import.meta.env.DEV) {
      console.log(
        `[Loot] Dropped "${item.name}" (${item.rarity}) at ` +
        `(${Position.x[itemEid].toFixed(2)}, ${Position.y[itemEid].toFixed(2)}) ` +
        `from entity ${eid}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // b. Pickup phase — Interact intent picks up nearby loot
  // -----------------------------------------------------------------------
  const chars = characterQuery(world);

  // Process pickup intents for each character
  for (const charEid of chars) {
    // Determine effective pickup range
    const pickupRange = hasComponent(world, LootPickupRange, charEid)
      ? LootPickupRange.value[charEid]
      : config.pickupRange;

    for (const intent of intents) {
      if (intent.type !== IntentType.Interact) continue;

      // Find the closest lootable item within pickup range
      const lootItems = lootQuery(world);
      let closestEid = -1;
      let closestDist = pickupRange;

      for (const lootEid of lootItems) {
        const dx = Position.x[lootEid] - Position.x[charEid];
        const dy = Position.y[lootEid] - Position.y[charEid];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= closestDist) {
          closestDist = dist;
          closestEid = lootEid;
        }
      }

      if (closestEid === -1) continue;

      // Ensure the character has an inventory component
      if (!hasComponent(world, InventorySlot, charEid)) {
        addComponent(world, InventorySlot, charEid);
      }

      // Increment inventory count
      InventorySlot.count[charEid] += 1;

      const pickedUpId = GroundItemComponent.itemId[closestEid];
      const pickedUpRarity = GroundItemComponent.rarityCode[closestEid];

      if (import.meta.env.DEV) {
        // Decode the rarity code for a readable log
        const rarityLabel = rarityCodeToString(pickedUpRarity);
        console.log(
          `[Loot] Character ${charEid} picked up item (id=${pickedUpId}, ` +
          `rarity=${rarityLabel}) from entity ${closestEid}. ` +
          `Inventory count: ${InventorySlot.count[charEid]}`,
        );
      }

      // Remove the ground item entity
      removeEntity(world, closestEid);
      break; // Only one pickup per Interact intent
    }
  }

  // -----------------------------------------------------------------------
  // c. Despawn phase — tick down timers, remove expired items
  // -----------------------------------------------------------------------
  const lootItems = lootQuery(world);

  for (const lootEid of lootItems) {
    GroundItemComponent.despawnTimer[lootEid] -= dt;

    if (GroundItemComponent.despawnTimer[lootEid] <= 0) {
      if (import.meta.env.DEV) {
        const rx = GroundItemComponent.rarityCode[lootEid];
        console.log(
          `[Loot] Despawning ground item entity ${lootEid} ` +
          `(rarity=${rarityCodeToString(rx)})`,
        );
      }
      removeEntity(world, lootEid);
    }
  }

  // -----------------------------------------------------------------------
  // d. Cleanup — cap ground items by removing oldest ones
  // -----------------------------------------------------------------------
  const remaining = lootQuery(world);
  const overflow = remaining.length - config.maxGroundItems;

  if (overflow > 0) {
    // Remove the oldest items (first in query order)
    for (let i = 0; i < overflow; i++) {
      if (import.meta.env.DEV) {
        console.log(`[Loot] Cleanup: removing ground item entity ${remaining[i]}`);
      }
      removeEntity(world, remaining[i]);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Rarity enum value to a numeric code (0=Normal, 1=Magic, 2=Rare). */
function rarityToCode(rarity: string): number {
  switch (rarity) {
    case 'Normal': return 0;
    case 'Magic':  return 1;
    case 'Rare':   return 2;
    default:       return 0;
  }
}

/** Decode a numeric rarity code back to a human-readable label. */
function rarityCodeToString(code: number): string {
  switch (code) {
    case 0:  return 'Normal';
    case 1:  return 'Magic';
    case 2:  return 'Rare';
    default: return `Unknown(${code})`;
  }
}
