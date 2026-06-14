import { Rarity, EquipmentSlot } from '@/shared';
import type { Affix } from '@/shared';

// ---------------------------------------------------------------------------
// Grid constants
// ---------------------------------------------------------------------------

export const INVENTORY_COLS = 8;
export const INVENTORY_ROWS = 5;
export const INVENTORY_SIZE = INVENTORY_COLS * INVENTORY_ROWS; // 40

// ---------------------------------------------------------------------------
// InventoryConfig
// ---------------------------------------------------------------------------

export interface InventoryConfig {
  cols: number;
  rows: number;
  equipmentSlots: EquipmentSlot[];
}

export const DEFAULT_INVENTORY_CONFIG: InventoryConfig = {
  cols: 8,
  rows: 5,
  equipmentSlots: [
    EquipmentSlot.Weapon,
    EquipmentSlot.Helmet,
    EquipmentSlot.ChestArmour,
    EquipmentSlot.Gloves,
    EquipmentSlot.Boots,
  ],
};

// ---------------------------------------------------------------------------
// ItemBaseType
// ---------------------------------------------------------------------------

/**
 * ItemBaseTypeDef — defines a base item type with its implicit affix.
 * The specId maps to items the loot system can drop.
 */
export interface ItemBaseTypeDef {
  specId: string;
  name: string;
  slot: EquipmentSlot;
  implicitAffix: Affix;
}

// ---------------------------------------------------------------------------
// Sample item base types for the MVP (Marauder)
// ---------------------------------------------------------------------------

export const ITEM_BASE_TYPES: Record<string, ItemBaseTypeDef> = {
  // Weapons
  'rusted_sword': {
    specId: 'rusted_sword',
    name: 'Rusted Sword',
    slot: EquipmentSlot.Weapon,
    implicitAffix: { id: 'phys_dmg', label: 'Adds # to Physical Damage', value: 3, target: 'damage' },
  },
  'iron_axe': {
    specId: 'iron_axe',
    name: 'Iron Axe',
    slot: EquipmentSlot.Weapon,
    implicitAffix: { id: 'phys_dmg', label: 'Adds # to Physical Damage', value: 5, target: 'damage' },
  },
  'war_hammer': {
    specId: 'war_hammer',
    name: 'War Hammer',
    slot: EquipmentSlot.Weapon,
    implicitAffix: { id: 'phys_dmg', label: 'Adds # to Physical Damage', value: 8, target: 'damage' },
  },
  // Helmets
  'leather_cap': {
    specId: 'leather_cap',
    name: 'Leather Cap',
    slot: EquipmentSlot.Helmet,
    implicitAffix: { id: 'max_life', label: '+# to Maximum Life', value: 10, target: 'maxLife' },
  },
  'iron_helm': {
    specId: 'iron_helm',
    name: 'Iron Helm',
    slot: EquipmentSlot.Helmet,
    implicitAffix: { id: 'max_life', label: '+# to Maximum Life', value: 20, target: 'maxLife' },
  },
  // Chest
  'cloth_tunic': {
    specId: 'cloth_tunic',
    name: 'Cloth Tunic',
    slot: EquipmentSlot.ChestArmour,
    implicitAffix: { id: 'max_life', label: '+# to Maximum Life', value: 15, target: 'maxLife' },
  },
  'chainmail': {
    specId: 'chainmail',
    name: 'Chainmail',
    slot: EquipmentSlot.ChestArmour,
    implicitAffix: { id: 'max_life', label: '+# to Maximum Life', value: 30, target: 'maxLife' },
  },
  // Gloves
  'cloth_wraps': {
    specId: 'cloth_wraps',
    name: 'Cloth Wraps',
    slot: EquipmentSlot.Gloves,
    implicitAffix: { id: 'phys_dmg', label: 'Adds # to Physical Damage', value: 2, target: 'damage' },
  },
  'iron_gauntlets': {
    specId: 'iron_gauntlets',
    name: 'Iron Gauntlets',
    slot: EquipmentSlot.Gloves,
    implicitAffix: { id: 'phys_dmg', label: 'Adds # to Physical Damage', value: 4, target: 'damage' },
  },
  // Boots
  'cloth_sandals': {
    specId: 'cloth_sandals',
    name: 'Cloth Sandals',
    slot: EquipmentSlot.Boots,
    implicitAffix: { id: 'move_speed', label: '#% increased Movement Speed', value: 5, target: 'movementSpeed' },
  },
  'leather_boots': {
    specId: 'leather_boots',
    name: 'Leather Boots',
    slot: EquipmentSlot.Boots,
    implicitAffix: { id: 'move_speed', label: '#% increased Movement Speed', value: 10, target: 'movementSpeed' },
  },
};

// ---------------------------------------------------------------------------
// Ordered base-type index for numeric encoding in ECS
// ---------------------------------------------------------------------------

export const ITEM_BASE_KEYS = Object.keys(ITEM_BASE_TYPES);

/** Convert a specId string to its numeric code (0-based index into ITEM_BASE_KEYS). */
export function specCodeFromId(specId: string): number {
  const idx = ITEM_BASE_KEYS.indexOf(specId);
  return idx >= 0 ? idx : 0;
}

/** Convert a numeric code back to a specId string. */
export function specIdFromCode(code: number): string {
  return ITEM_BASE_KEYS[code] ?? ITEM_BASE_KEYS[0];
}

/** Return the ItemBaseTypeDef for a given numeric spec code. */
export function baseTypeFromCode(code: number): ItemBaseTypeDef {
  const specId = specIdFromCode(code);
  return ITEM_BASE_TYPES[specId];
}

// ---------------------------------------------------------------------------
// Numeric codes for rarity (stored in InventoryItem.rarityCode)
// ---------------------------------------------------------------------------

export const RARITY_CODE: Record<Rarity, number> = {
  [Rarity.Normal]: 0,
  [Rarity.Magic]: 1,
  [Rarity.Rare]: 2,
};

export function rarityFromCode(code: number): Rarity {
  switch (code) {
    case 0: return Rarity.Normal;
    case 1: return Rarity.Magic;
    case 2: return Rarity.Rare;
    default: return Rarity.Normal;
  }
}

export function rarityToString(code: number): string {
  switch (code) {
    case 0: return 'Normal';
    case 1: return 'Magic';
    case 2: return 'Rare';
    default: return `Unknown(${code})`;
  }
}

// ---------------------------------------------------------------------------
// Numeric codes for equipment slot (stored in InventoryItem.equipped)
// 0 = in bag, 1 = Weapon, 2 = Helmet, 3 = ChestArmour, 4 = Gloves, 5 = Boots
// ---------------------------------------------------------------------------

export const EQUIPPED_SLOT_CODE: Record<EquipmentSlot, number> = {
  [EquipmentSlot.Weapon]: 1,
  [EquipmentSlot.Helmet]: 2,
  [EquipmentSlot.ChestArmour]: 3,
  [EquipmentSlot.Gloves]: 4,
  [EquipmentSlot.Boots]: 5,
};

/** Reverse mapping from numeric equipped code → EquipmentSlot. */
const EQUIPPED_CODE_TO_SLOT: Record<number, EquipmentSlot> = {
  1: EquipmentSlot.Weapon,
  2: EquipmentSlot.Helmet,
  3: EquipmentSlot.ChestArmour,
  4: EquipmentSlot.Gloves,
  5: EquipmentSlot.Boots,
};

export function equippedSlotFromCode(code: number): EquipmentSlot | null {
  return EQUIPPED_CODE_TO_SLOT[code] ?? null;
}

// ---------------------------------------------------------------------------
// Explicit affix pool (rolled on Magic / Rare items)
// ---------------------------------------------------------------------------

export const EXPLICIT_AFFIX_POOL: Affix[] = [
  { id: 'prefix_life', label: '+# to Maximum Life', value: 10, target: 'maxLife' },
  { id: 'prefix_dmg', label: 'Adds # to Physical Damage', value: 3, target: 'damage' },
  { id: 'prefix_speed', label: '#% increased Movement Speed', value: 3, target: 'movementSpeed' },
  { id: 'prefix_str', label: '+# to Strength', value: 5, target: 'strength' },
  { id: 'prefix_dex', label: '+# to Dexterity', value: 5, target: 'dexterity' },
  { id: 'prefix_int', label: '+# to Intelligence', value: 5, target: 'intelligence' },
];

// ---------------------------------------------------------------------------
// rollExplicitAffixes
// ---------------------------------------------------------------------------

/**
 * Roll explicit affixes based on rarity.
 *
 * - Normal: 0 affixes
 * - Magic:  1 affix (random from pool)
 * - Rare:   2 affixes (random from pool, no duplicates)
 *
 * Affix values are scaled by itemLevel / 10 (minimum 1×).
 */
export function rollExplicitAffixes(rarity: Rarity, itemLevel: number): Affix[] {
  const count = rarity === Rarity.Normal ? 0 : rarity === Rarity.Magic ? 1 : 2;
  if (count === 0) return [];

  const scale = Math.max(1, Math.floor(itemLevel / 10));
  const pool = [...EXPLICIT_AFFIX_POOL];
  const result: Affix[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const chosen = pool.splice(idx, 1)[0]; // remove to prevent duplicates
    result.push({
      ...chosen,
      value: chosen.value * scale,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tooltip helpers
// ---------------------------------------------------------------------------

/** Hex colour per rarity tier (mirrors the loot module's RARITY_COLORS). */
export const RARITY_DISPLAY_COLORS: Record<Rarity, string> = {
  [Rarity.Normal]: '#c0c0c0',
  [Rarity.Magic]: '#4169e1',
  [Rarity.Rare]: '#ffd700',
};
