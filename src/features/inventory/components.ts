import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// InventoryItem component
// ---------------------------------------------------------------------------

/**
 * InventoryItem — one component per inventory item entity.
 *
 * Uses the "entity as relation" pattern (like BuffInstance): each inventory
 * item is a separate child entity owned by a character entity.
 *
 * Fields:
 *  - ownerEid:   the character entity that owns this item
 *  - specIdCode: numeric code (index into ITEM_BASE_KEYS) identifying the base type
 *  - rarityCode: 0=Normal, 1=Magic, 2=Rare
 *  - itemLevel:  level of the item (from the monster that dropped it)
 *  - equipped:   0=in bag, 1=Weapon, 2=Helmet, 3=ChestArmour, 4=Gloves, 5=Boots
 *  - gridIndex:  0-39 grid position (only meaningful when equipped === 0)
 */
export const InventoryItem = defineComponent({
  ownerEid: Types.eid,
  specIdCode: Types.ui8,
  rarityCode: Types.ui8,
  itemLevel: Types.ui8,
  equipped: Types.ui8,
  gridIndex: Types.ui8,
});
