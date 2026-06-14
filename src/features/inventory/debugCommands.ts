import { addEntity, addComponent, hasComponent, getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { IsCharacter } from '@/systems/movement';
import { BaseStats } from '@/systems/buff';
import { Life, Damage } from '@/systems/combat';
import { MovementSpeed } from '@/systems/movement';
import { InventoryItem } from './components';
import {
  ITEM_BASE_TYPES,
  ITEM_BASE_KEYS,
  specCodeFromId,
  specIdFromCode,
  baseTypeFromCode,
  RARITY_CODE,
  rarityFromCode,
  EQUIPPED_SLOT_CODE,
  equippedSlotFromCode,
  rollExplicitAffixes,
  RARITY_DISPLAY_COLORS,
  INVENTORY_SIZE,
} from './types';
import type { ItemBaseTypeDef } from './types';
import { Rarity, EquipmentSlot } from '@/shared';
import { getCharacterItems } from './inventorySystem';

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Valid rarity keywords for the inv.generate command. */
const VALID_RARITIES: Record<string, Rarity> = {
  normal: Rarity.Normal,
  magic: Rarity.Magic,
  rare: Rarity.Rare,
};

/** Valid slot keywords for the inv.generate command. */
const VALID_SLOTS: Record<string, EquipmentSlot> = {
  weapon: EquipmentSlot.Weapon,
  helmet: EquipmentSlot.Helmet,
  chest: EquipmentSlot.ChestArmour,
  chestarmour: EquipmentSlot.ChestArmour,
  gloves: EquipmentSlot.Gloves,
  boots: EquipmentSlot.Boots,
};

// ---------------------------------------------------------------------------
// Register commands
// ---------------------------------------------------------------------------

export function registerInventoryDebugCommands(): void {
  registerDebugCommands({
    /**
     * Generate a test inventory item directly in the character's bag.
     * Usage: inv.generate [rarity] [slot]
     *   rarity: "normal" (default), "magic", "rare"
     *   slot:   "weapon", "helmet", "chest", "gloves", "boots" (default: random)
     */
    'inv.generate': (rarityArg = '', slotArg = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] inv.generate: no Character entity found.');
        return;
      }

      // Resolve rarity
      let rarity = Rarity.Normal;
      if (rarityArg) {
        const key = rarityArg.toLowerCase();
        if (VALID_RARITIES[key]) {
          rarity = VALID_RARITIES[key];
        } else {
          console.warn(
            `[debug] inv.generate: unknown rarity "${rarityArg}". ` +
            `Use: normal, magic, or rare. Defaulting to normal.`,
          );
        }
      }

      // Resolve slot filter
      let slotFilter: EquipmentSlot | null = null;
      if (slotArg) {
        const key = slotArg.toLowerCase();
        slotFilter = VALID_SLOTS[key] ?? null;
        if (!slotFilter) {
          console.warn(
            `[debug] inv.generate: unknown slot "${slotArg}". ` +
            `Use: weapon, helmet, chest, gloves, or boots. Using random.`,
          );
        }
      }

      // Filter base types by slot, or use all
      const baseKeys = slotFilter
        ? ITEM_BASE_KEYS.filter((k) => ITEM_BASE_TYPES[k].slot === slotFilter)
        : ITEM_BASE_KEYS;

      if (baseKeys.length === 0) {
        console.warn(`[debug] inv.generate: no base types found for slot "${slotArg}".`);
        return;
      }

      // Pick a random base type from the filtered list
      const specId = baseKeys[Math.floor(Math.random() * baseKeys.length)];
      const baseType = ITEM_BASE_TYPES[specId];

      // Find first empty grid slot
      const gridIndex = findEmptyGridSlot(world, charEid);

      // Create the inventory item entity
      const itemEid = addEntity(world);
      addComponent(world, InventoryItem, itemEid);

      InventoryItem.ownerEid[itemEid] = charEid;
      InventoryItem.specIdCode[itemEid] = specCodeFromId(specId);
      InventoryItem.rarityCode[itemEid] = RARITY_CODE[rarity];
      InventoryItem.itemLevel[itemEid] = 1;
      InventoryItem.equipped[itemEid] = 0; // in bag
      InventoryItem.gridIndex[itemEid] = Math.min(gridIndex, 255);

      const color = RARITY_DISPLAY_COLORS[rarity];
      console.log(
        `[debug] inv.generate: created %c${baseType.name}%c ` +
        `(${rarity}) item eid=${itemEid} in grid slot ${gridIndex}`,
        `color:${color};font-weight:bold`,
        '',
      );
    },

    /**
     * Equip an inventory item onto the character.
     * Usage: inv.equip <item_eid>
     *   item_eid: entity ID of the InventoryItem to equip
     * Equips to the slot determined by the item's base type.
     */
    'inv.equip': (itemEidStr = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] inv.equip: no Character entity found.');
        return;
      }

      const itemEid = parseInt(itemEidStr, 10);
      if (isNaN(itemEid) || itemEid <= 0) {
        console.warn(`[debug] inv.equip: invalid item_eid "${itemEidStr}". Usage: inv.equip <item_eid>`);
        return;
      }

      if (!hasComponent(world, InventoryItem, itemEid)) {
        console.warn(`[debug] inv.equip: entity ${itemEid} is not an InventoryItem.`);
        return;
      }

      if (InventoryItem.ownerEid[itemEid] !== charEid) {
        console.warn(`[debug] inv.equip: entity ${itemEid} is not owned by the Character.`);
        return;
      }

      if (InventoryItem.equipped[itemEid] !== 0) {
        console.warn(`[debug] inv.equip: item ${itemEid} is already equipped.`);
        return;
      }

      // Determine the equipment slot from the item's base type
      const specCode = InventoryItem.specIdCode[itemEid];
      const baseType = baseTypeFromCode(specCode);
      const equipCode = EQUIPPED_SLOT_CODE[baseType.slot];

      // Unequip any existing item in that slot (return to bag)
      unequipSlot(world, charEid, equipCode);

      // Set the item as equipped
      InventoryItem.equipped[itemEid] = equipCode;
      InventoryItem.gridIndex[itemEid] = 0; // clear grid position

      console.log(
        `[debug] inv.equip: equipped item ${itemEid} ("${baseType.name}") ` +
        `to slot ${baseType.slot}`,
      );
    },

    /**
     * Unequip an item from a slot, returning it to the bag.
     * Usage: inv.unequip <slot_index>
     *   slot_index: 1=Weapon, 2=Helmet, 3=ChestArmour, 4=Gloves, 5=Boots
     */
    'inv.unequip': (slotIndexStr = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] inv.unequip: no Character entity found.');
        return;
      }

      const equipCode = parseInt(slotIndexStr, 10);
      if (isNaN(equipCode) || equipCode < 1 || equipCode > 5) {
        console.warn(
          `[debug] inv.unequip: invalid slot_index "${slotIndexStr}". ` +
          `Use 1=Weapon, 2=Helmet, 3=ChestArmour, 4=Gloves, 5=Boots.`,
        );
        return;
      }

      const itemEid = unequipSlot(world, charEid, equipCode);

      if (itemEid === null) {
        const slotLabel = equippedSlotFromCode(equipCode) ?? `slot ${equipCode}`;
        console.log(`[debug] inv.unequip: no item equipped in ${slotLabel}.`);
      } else {
        const baseType = baseTypeFromCode(InventoryItem.specIdCode[itemEid]);
        console.log(
          `[debug] inv.unequip: returned "${baseType.name}" from slot ${equipCode} to bag.`,
        );
      }
    },

    /**
     * List all inventory items for the Character.
     * Usage: inv.list
     */
    'inv.list': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] inv.list: no Character entity found.');
        return;
      }

      const items = getCharacterItems(world, charEid);
      if (items.length === 0) {
        console.log('[debug] inv.list: no inventory items.');
        return;
      }

      console.log(`[debug] inv.list: ${items.length} inventory item(s):`);

      for (const eid of items) {
        const specCode = InventoryItem.specIdCode[eid];
        const baseType = baseTypeFromCode(specCode);
        const rarity = rarityFromCode(InventoryItem.rarityCode[eid]);
        const equipped = InventoryItem.equipped[eid];
        const gridIndex = InventoryItem.gridIndex[eid];
        const color = RARITY_DISPLAY_COLORS[rarity];

        const location = equipped === 0
          ? `bag[${gridIndex}]`
          : `equipped[${equipped}] (${equippedSlotFromCode(equipped) ?? 'unknown'})`;

        console.log(
          `  eid=${eid} | %c${baseType.name}%c | ${rarity} | lvl=${InventoryItem.itemLevel[eid]} | ${location}`,
          `color:${color};font-weight:bold`,
          '',
        );
      }
    },

    /**
     * Show current derived stats from equipment.
     * Usage: inv.stats
     */
    'inv.stats': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] inv.stats: no Character entity found.');
        return;
      }

      // Sum affixes from equipped items
      let totalDamage = 0;
      let totalMaxLife = 0;
      let totalSpeed = 0;

      for (const eid of getAllEntities(world)) {
        if (!hasComponent(world, InventoryItem, eid)) continue;
        if (InventoryItem.ownerEid[eid] !== charEid) continue;
        if (InventoryItem.equipped[eid] === 0) continue;

        const specCode = InventoryItem.specIdCode[eid];
        const baseType = baseTypeFromCode(specCode);
        const rarity = rarityFromCode(InventoryItem.rarityCode[eid]);
        const itemLevel = InventoryItem.itemLevel[eid];

        // Implicit affix
        if (baseType.implicitAffix.target === 'damage') totalDamage += baseType.implicitAffix.value;
        else if (baseType.implicitAffix.target === 'maxLife') totalMaxLife += baseType.implicitAffix.value;
        else if (baseType.implicitAffix.target === 'movementSpeed') totalSpeed += baseType.implicitAffix.value;

        // Explicit affixes
        const explicits = rollExplicitAffixes(rarity, itemLevel);
        for (const affix of explicits) {
          if (affix.target === 'damage') totalDamage += affix.value;
          else if (affix.target === 'maxLife') totalMaxLife += affix.value;
          else if (affix.target === 'movementSpeed') totalSpeed += affix.value;
        }
      }

      const hasBase = hasComponent(world, BaseStats, charEid);
      const baseDamage = hasBase ? BaseStats.damage[charEid] : 0;
      const baseLife = hasBase ? BaseStats.maxLife[charEid] : 0;
      const baseSpeed = hasBase ? BaseStats.movementSpeed[charEid] : 0;

      const finalDamage = hasComponent(world, Damage, charEid) ? Damage.value[charEid] : 0;
      const finalLife = hasComponent(world, Life, charEid) ? Life.max[charEid] : 0;
      const finalSpeed = hasComponent(world, MovementSpeed, charEid) ? MovementSpeed.value[charEid] : 0;

      console.log('[debug] inv.stats: equipment stat breakdown');
      console.log(`  Raw base:          dmg=${baseDamage}  life=${baseLife}  speed=${baseSpeed}`);
      console.log(`  From equipment:    dmg=+${totalDamage}  life=+${totalMaxLife}  speed=+${totalSpeed}`);
      console.log(`  Final (equip):     dmg=${baseDamage + totalDamage}  life=${baseLife + totalMaxLife}  speed=${baseSpeed + totalSpeed}`);
      console.log(`  Final (derived):   dmg=${finalDamage}  life=${finalLife}  speed=${finalSpeed}`);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Scan the world for the Character entity. */
function findCharacter(world: ReturnType<typeof getDebugWorld>): number | null {
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}

/**
 * Unequip whatever item is in the given equipment slot code.
 * Returns the item's entity ID if something was unequipped, or null.
 * The item is set to "in bag" state with an auto-assigned grid index.
 */
function unequipSlot(
  world: ReturnType<typeof getDebugWorld>,
  charEid: number,
  equipCode: number,
): number | null {
  for (const eid of getAllEntities(world)) {
    if (
      hasComponent(world, InventoryItem, eid) &&
      InventoryItem.ownerEid[eid] === charEid &&
      InventoryItem.equipped[eid] === equipCode
    ) {
      InventoryItem.equipped[eid] = 0;
      InventoryItem.gridIndex[eid] = findEmptyGridSlot(world, charEid);
      return eid;
    }
  }
  return null;
}

/**
 * Find the first unoccupied grid index (0-39) for bag items.
 * Duplicated from inventorySystem.ts to avoid cross-dependency.
 */
function findEmptyGridSlot(
  world: ReturnType<typeof getDebugWorld>,
  charEid: number,
): number {
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

  return 0;
}
