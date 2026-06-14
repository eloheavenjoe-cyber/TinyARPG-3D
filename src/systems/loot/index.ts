export { lootSystem } from './lootSystem';
export {
  GroundItemComponent,
  IsLootable,
  InventorySlot,
  LootPickupRange,
  LootDropTable,
} from './components';
export { DEFAULT_LOOT_CONFIG, RARITY_WEIGHTS, RARITY_COLORS, generateRandomItem } from './types';
export type { LootConfig, GeneratedItem } from './types';
export { registerLootDebugCommands } from './debugCommands';
