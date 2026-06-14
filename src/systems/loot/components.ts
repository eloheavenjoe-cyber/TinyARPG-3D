import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// Ground item components
// ---------------------------------------------------------------------------

/**
 * GroundItemComponent — data for loot items sitting on the ground.
 *
 * Fields:
 *  - itemId:      reference to item data (not a full item spec for ECS efficiency)
 *  - rarityCode:  0=Normal, 1=Magic, 2=Rare
 *  - itemLevel:   level of the item (derived from the monster that dropped it)
 *  - droppedByEid: the entity that dropped this item (0 = unknown)
 *  - despawnTimer: seconds until this item disappears
 */
export const GroundItemComponent = defineComponent({
  itemId: Types.ui32,
  rarityCode: Types.ui8,
  itemLevel: Types.ui8,
  droppedByEid: Types.ui32,
  despawnTimer: Types.f32,
});

/**
 * Tag component marking an entity as a lootable ground item.
 */
export const IsLootable = defineComponent();

// ---------------------------------------------------------------------------
// Inventory / pickup components
// ---------------------------------------------------------------------------

/**
 * InventorySlot — a simple inventory counter for the Character.
 * count tracks how many items the character is carrying.
 */
export const InventorySlot = defineComponent({
  count: Types.ui8,
});

/**
 * LootPickupRange — pickup range (world units) config on the Character.
 * When not present, the system falls back to the default in LootConfig.
 */
export const LootPickupRange = defineComponent({
  value: Types.f32,
});

// ---------------------------------------------------------------------------
// Drop-table component (optional — overrides default drop behaviour)
// ---------------------------------------------------------------------------

/**
 * LootDropTable — optional component on enemies to override their drop behaviour.
 * Fields:
 *  - dropChance: override drop chance (0-1). 0 = never drops.
 *  - minLevel / maxLevel: override the item level range.
 */
export const LootDropTable = defineComponent({
  dropChance: Types.f32,
  minLevel: Types.ui8,
  maxLevel: Types.ui8,
});
