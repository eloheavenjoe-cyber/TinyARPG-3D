import {
  defineQuery,
  addEntity,
  addComponent,
  hasComponent,
  getAllEntities,
} from 'bitecs';
import type { World } from '@/core';
import { Rarity, EquipmentSlot } from '@/shared';
import type { Affix } from '@/shared';
import { IsCharacter } from '@/systems/movement';
import { Life, Damage } from '@/systems/combat';
import { MovementSpeed } from '@/systems/movement';
import { BaseStats } from '@/systems/buff';
import { InventorySlot } from '@/systems/loot';
import { InventoryItem } from './components';
import {
  ITEM_BASE_TYPES,
  ITEM_BASE_KEYS,
  specCodeFromId,
  specIdFromCode,
  baseTypeFromCode,
  RARITY_CODE,
  rarityFromCode,
  EXPLICIT_AFFIX_POOL,
  rollExplicitAffixes,
  INVENTORY_SIZE,
  EQUIPPED_SLOT_CODE,
} from './types';
import type { ItemBaseTypeDef } from './types';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** The Character entity (must have IsCharacter). */
const characterQuery = defineQuery([IsCharacter]);

/** All InventoryItem entities (one per item). */
const inventoryItemQuery = defineQuery([InventoryItem]);

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/**
 * Tracks the last-known InventorySlot.count per character entity.
 * Used to detect new pickups each frame.
 */
const prevInventoryCount = new Map<number, number>();

// ---------------------------------------------------------------------------
// Inventory system
// ---------------------------------------------------------------------------

/**
 * inventorySystem — manages inventory items and equipment stat derivation.
 *
 * **Pipeline position:** runs after lootSystem, before buffSystem.
 *
 * **Phase 1 — Generate items from loot pickup:**
 *   Reads InventorySlot.count on the Character. When it increases,
 *   creates new InventoryItem entities with random base types and rarity
 *   matching the loot that was picked up.
 *
 * **Phase 2 — Derive stats from equipped items:**
 *   For each character with BaseStats, sums all affixes (implicit +
 *   explicit) from equipped InventoryItem entities and applies them to
 *   BaseStats so that buffSystem can then apply buff multipliers on top.
 */
export function inventorySystem(world: World): void {
  // -----------------------------------------------------------------------
  // Phase 1 — Generate items from loot pickup
  // -----------------------------------------------------------------------
  const chars = characterQuery(world);

  for (const charEid of chars) {
    if (!hasComponent(world, InventorySlot, charEid)) continue;

    const currentCount = InventorySlot.count[charEid];
    const previousCount = prevInventoryCount.get(charEid) ?? 0;

    if (currentCount > previousCount) {
      const newItems = currentCount - previousCount;

      for (let i = 0; i < newItems; i++) {
        generateInventoryItemForCharacter(world, charEid);
      }

      if (import.meta.env.DEV) {
        console.log(
          `[Inventory] Generated ${newItems} inventory item(s) for character ${charEid}`,
        );
      }
    }

    prevInventoryCount.set(charEid, currentCount);
  }

  // -----------------------------------------------------------------------
  // Phase 2 — Derive stats from equipped items
  // -----------------------------------------------------------------------
  deriveStatsFromEquipment(world);
}

// =========================================================================
// Phase 1 helpers
// =========================================================================

/**
 * Generate a random InventoryItem entity for the given character.
 * Picks a random base type, rarity, and finds the first empty grid slot.
 */
function generateInventoryItemForCharacter(world: World, charEid: number): void {
  // Pick a random base type
  const baseKeys = ITEM_BASE_KEYS;
  const specId = baseKeys[Math.floor(Math.random() * baseKeys.length)];
  const baseType = ITEM_BASE_TYPES[specId];

  // Roll rarity with weighted probability (matches loot system)
  const rarity = rollRarity();
  const itemLevel = 1;

  // Find first empty grid slot
  const gridIndex = findEmptyGridSlot(world, charEid);

  // Create the inventory item entity
  const itemEid = addEntity(world);
  addComponent(world, InventoryItem, itemEid);

  InventoryItem.ownerEid[itemEid] = charEid;
  InventoryItem.specIdCode[itemEid] = specCodeFromId(specId);
  InventoryItem.rarityCode[itemEid] = RARITY_CODE[rarity];
  InventoryItem.itemLevel[itemEid] = itemLevel;
  InventoryItem.equipped[itemEid] = 0; // in bag
  InventoryItem.gridIndex[itemEid] = Math.min(gridIndex, 255);
}

/**
 * Roll rarity with the same weights as the loot system.
 */
function rollRarity(): Rarity {
  const roll = Math.random();
  if (roll < 0.7) return Rarity.Normal;
  if (roll < 0.95) return Rarity.Magic;
  return Rarity.Rare;
}

/**
 * Find the first occupied grid index (0-39) for a character's bag items.
 */
function findEmptyGridSlot(world: World, charEid: number): number {
  const occupied = new Set<number>();

  for (const eid of getAllEntities(world)) {
    if (
      hasComponent(world, InventoryItem, eid) &&
      InventoryItem.ownerEid[eid] === charEid &&
      InventoryItem.equipped[eid] === 0
    ) {
      occupied.add(InventoryItem.gridIndex[eid]);
    }
  }

  for (let i = 0; i < INVENTORY_SIZE; i++) {
    if (!occupied.has(i)) return i;
  }

  // Bag full — still return a valid index (slot 0, caller will need to handle)
  return 0;
}

// =========================================================================
// Explicit affix cache (computed once per item entity, cached forever)
// =========================================================================

/**
 * Caches the rolled explicit affixes for each inventory item entity.
 * Populated on first access, never mutated after that.
 * Keyed by item entity ID.
 */
const explicitAffixCache = new Map<number, Affix[]>();

/**
 * Get (or compute and cache) the explicit affixes for a given item entity.
 */
function getExplicitAffixes(eid: number): Affix[] {
  let cached = explicitAffixCache.get(eid);
  if (cached !== undefined) return cached;

  const rarity = rarityFromCode(InventoryItem.rarityCode[eid]);
  const itemLevel = InventoryItem.itemLevel[eid];
  cached = rollExplicitAffixes(rarity, itemLevel);
  explicitAffixCache.set(eid, cached);
  return cached;
}

/**
 * Clear the explicit affix cache (used when items are removed / for testing).
 */
export function clearExplicitAffixCache(): void {
  explicitAffixCache.clear();
}

// =========================================================================
// Phase 2 helpers
// =========================================================================

/**
 * Recompute derived stats from all equipped items.
 *
 * Scans every InventoryItem entity whose owner has BaseStats. Sums all
 * affixes (implicit + explicit) by stat target and writes the combined
 * values into BaseStats.
 *
 * This runs BEFORE buffSystem, which then applies buff modifiers on top.
 */
function deriveStatsFromEquipment(world: World): void {
  // Collect equipment stat modifiers per owner entity
  const modsByOwner = new Map<number, EquipmentStatMods>();

  for (const eid of getAllEntities(world)) {
    if (!hasComponent(world, InventoryItem, eid)) continue;
    if (InventoryItem.equipped[eid] === 0) continue; // only equipped items

    const ownerEid = InventoryItem.ownerEid[eid];
    if (!hasComponent(world, BaseStats, ownerEid)) continue;

    let mods = modsByOwner.get(ownerEid);
    if (!mods) {
      mods = { damage: 0, maxLife: 0, movementSpeed: 0 };
      modsByOwner.set(ownerEid, mods);
    }

    // Get base type's implicit affix
    const specCode = InventoryItem.specIdCode[eid];
    const baseType = baseTypeFromCode(specCode);
    addAffixToMods(mods, baseType.implicitAffix);

    // Get explicit affixes (cached — rolled once at item creation)
    const explicitAffixes = getExplicitAffixes(eid);
    for (const affix of explicitAffixes) {
      addAffixToMods(mods, affix);
    }
  }

  // Apply accumulated modifiers to each affected entity's BaseStats
  for (const [eid, mods] of modsByOwner) {
    if (!hasComponent(world, BaseStats, eid)) continue;

    // BaseStats holds base values — we add equipment bonuses on top.
    // The buff system will read these modified BaseStats and apply
    // buff multipliers, so equipment bonuses are included in the
    // final derived stats.
    const baseDamage = BaseStats.damage[eid];
    const baseMaxLife = BaseStats.maxLife[eid];
    const baseSpeed = BaseStats.movementSpeed[eid];

    // We need to know the "naked" base values (without equipment).
    // Store original base values the first time we see an entity.
    if (!nakedBaseStats.has(eid)) {
      nakedBaseStats.set(eid, {
        damage: baseDamage,
        maxLife: baseMaxLife,
        movementSpeed: baseSpeed,
      });
    }

    const naked = nakedBaseStats.get(eid)!;

    // Set BaseStats to: naked base + equipment mods
    const newDamage = naked.damage + mods.damage;
    const newMaxLife = naked.maxLife + mods.maxLife;
    const newSpeed = naked.movementSpeed + mods.movementSpeed;

    BaseStats.damage[eid] = newDamage;
    BaseStats.maxLife[eid] = newMaxLife;
    BaseStats.movementSpeed[eid] = newSpeed;

    // Also directly update derived components for immediate effect
    // (buffSystem will overwrite these with its own computation,
    //  but setting them here ensures a correct initial state)
    if (hasComponent(world, Damage, eid)) {
      Damage.value[eid] = newDamage;
    }
    if (hasComponent(world, Life, eid)) {
      const oldMax = Life.max[eid];
      if (Math.abs(newMaxLife - oldMax) > 0.001) {
        if (oldMax > 0) {
          Life.current[eid] = Life.current[eid] * (newMaxLife / oldMax);
        }
        Life.max[eid] = newMaxLife;
      }
    }
    if (hasComponent(world, MovementSpeed, eid)) {
      MovementSpeed.value[eid] = newSpeed;
    }
  }
}

/**
 * Accumulated equipment stat modifiers for one entity.
 */
interface EquipmentStatMods {
  damage: number;
  maxLife: number;
  movementSpeed: number;
}

/**
 * Add an affix's value to the appropriate stat bucket in EquipmentStatMods.
 * Unknown targets are silently ignored.
 */
function addAffixToMods(mods: EquipmentStatMods, affix: Affix): void {
  switch (affix.target) {
    case 'damage':
      mods.damage += affix.value;
      break;
    case 'maxLife':
      mods.maxLife += affix.value;
      break;
    case 'movementSpeed':
      mods.movementSpeed += affix.value;
      break;
    // 'strength', 'dexterity', 'intelligence' — not in BaseStats, ignored for now
  }
}

// =========================================================================
// Naked base stats cache
// =========================================================================

/**
 * Stores the original "naked" BaseStats for each character (without
 * equipment). This is populated on first access and never mutated,
 * so equipment stat derivation is always relative to the original base.
 *
 * Cleared when a character entity is removed (lazy — entries persist
 * until the entity is garbage collected, but since we key by eid and
 * eids are unique per session this is fine).
 */
const nakedBaseStats = new Map<number, { damage: number; maxLife: number; movementSpeed: number }>();

/**
 * Reset the naked base stats cache for a given entity.
 * Call this when a character's base stats are intentionally changed
 * (e.g., on level-up).
 */
export function resetNakedBaseStats(eid: number): void {
  nakedBaseStats.delete(eid);
}

/**
 * Clear the entire naked base stats cache (used for testing / debug).
 */
export function clearNakedBaseStatsCache(): void {
  nakedBaseStats.clear();
}

/**
 * Get the collection of all InventoryItem entities owned by a character.
 * Used by debug commands and the (future) UI layer.
 */
export function getCharacterItems(
  world: World,
  charEid: number,
): number[] {
  const items: number[] = [];
  for (const eid of getAllEntities(world)) {
    if (
      hasComponent(world, InventoryItem, eid) &&
      InventoryItem.ownerEid[eid] === charEid
    ) {
      items.push(eid);
    }
  }
  return items;
}
