import { Rarity, EquipmentSlot } from '@/shared';

// ---------------------------------------------------------------------------
// LootConfig
// ---------------------------------------------------------------------------

export interface LootConfig {
  /** Default pickup range in world units. */
  pickupRange: number;
  /** Seconds before a ground item despawns. */
  despawnTime: number;
  /** Maximum number of ground items allowed at once. */
  maxGroundItems: number;
  /** Base probability (0-1) that a killed monster drops loot. */
  dropChance: number;
}

export const DEFAULT_LOOT_CONFIG: LootConfig = {
  pickupRange: 1.5,
  despawnTime: 30,
  maxGroundItems: 100,
  dropChance: 0.4,
};

// ---------------------------------------------------------------------------
// Rarity helpers
// ---------------------------------------------------------------------------

/**
 * Weighted probability for each rarity tier.
 * Used by generateRandomItem to roll rarity.
 */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  [Rarity.Normal]: 0.7,
  [Rarity.Magic]: 0.25,
  [Rarity.Rare]: 0.05,
};

/**
 * Display colours for each rarity tier (hex strings).
 */
export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.Normal]: '#c0c0c0',
  [Rarity.Magic]: '#4169e1',
  [Rarity.Rare]: '#ffd700',
};

// ---------------------------------------------------------------------------
// GeneratedItem
// ---------------------------------------------------------------------------

export interface GeneratedItem {
  /** Identifier into an item registry (or placeholder). */
  specId: string;
  /** Human-readable item name. */
  name: string;
  /** Rarity tier. */
  rarity: Rarity;
  /** Item level (from the monster that dropped it). */
  itemLevel: number;
  /** Which equipment slot this item occupies. */
  slot: EquipmentSlot;
}

// ---------------------------------------------------------------------------
// Item name tables
// ---------------------------------------------------------------------------

const SLOT_NAMES: Record<EquipmentSlot, string[]> = {
  [EquipmentSlot.Weapon]: [
    'Iron Sword', 'Battle Axe', 'War Hammer', 'Short Sword', 'Longsword',
  ],
  [EquipmentSlot.Helmet]: [
    'Iron Helm', 'Steel Cap', 'War Helm', 'Leather Hood', 'Great Helm',
  ],
  [EquipmentSlot.ChestArmour]: [
    'Chain Mail', 'Plate Armour', 'Leather Vest', 'Scale Mail', 'Battle Plate',
  ],
  [EquipmentSlot.Gloves]: [
    'Leather Gloves', 'Iron Gauntlets', 'Steel Gloves', 'Battle Mitts', 'Scale Gauntlets',
  ],
  [EquipmentSlot.Boots]: [
    'Leather Boots', 'Iron Greaves', 'Steel Boots', 'War Boots', 'Chain Boots',
  ],
};

const RARITY_PREFIXES: Record<Rarity, string> = {
  [Rarity.Normal]: '',
  [Rarity.Magic]: 'Imbued ',
  [Rarity.Rare]: 'Legendary ',
};

const ALL_SLOTS: EquipmentSlot[] = Object.values(EquipmentSlot);

// ---------------------------------------------------------------------------
// generateRandomItem
// ---------------------------------------------------------------------------

/**
 * Generate a random loot item based on the monster's level.
 *
 * Rarity is rolled using RARITY_WEIGHTS, the equipment slot is chosen
 * uniformly at random, and a name is assembled from the slot name table
 * with an optional rarity prefix.
 */
export function generateRandomItem(monsterLevel: number): GeneratedItem {
  // --- Roll rarity ---
  const roll = Math.random();
  const normalWeight = RARITY_WEIGHTS[Rarity.Normal];
  const magicWeight = RARITY_WEIGHTS[Rarity.Magic];

  let rarity: Rarity;
  if (roll < normalWeight) {
    rarity = Rarity.Normal;
  } else if (roll < normalWeight + magicWeight) {
    rarity = Rarity.Magic;
  } else {
    rarity = Rarity.Rare;
  }

  // --- Pick a random slot ---
  const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];

  // --- Pick a random base name for that slot ---
  const names = SLOT_NAMES[slot];
  const baseName = names[Math.floor(Math.random() * names.length)];

  // --- Assemble final name ---
  const prefix = RARITY_PREFIXES[rarity];
  const name = prefix + baseName;

  // --- Build specId ---
  const specId = `${slot.toLowerCase()}_${baseName.toLowerCase().replace(/\s+/g, '_')}`;

  return {
    specId,
    name,
    rarity,
    itemLevel: monsterLevel,
    slot,
  };
}
