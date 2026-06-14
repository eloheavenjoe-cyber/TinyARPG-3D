import { addEntity, addComponent, removeEntity, hasComponent } from 'bitecs';
import { getAllEntities } from 'bitecs';
import { Rarity, EquipmentSlot } from '@/shared';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, IsCharacter } from '@/systems/movement';
import { GroundItemComponent, IsLootable, InventorySlot } from './components';
import { generateRandomItem, RARITY_COLORS } from './types';

/**
 * Valid rarity values accepted by the `loot.spawn_item` command.
 */
const VALID_RARITIES: Record<string, Rarity> = {
  normal: Rarity.Normal,
  magic: Rarity.Magic,
  rare: Rarity.Rare,
};

export function registerLootDebugCommands(): void {
  registerDebugCommands({
    /**
     * Spawn a ground item near the Character.
     * Usage: loot.spawn_item [rarity]
     *   rarity: optional — "normal" (default), "magic", or "rare"
     */
    'loot.spawn_item': (rarityArg = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] loot.spawn_item: no Character entity found.');
        return;
      }

      // Resolve rarity
      let rarity: Rarity | null = null;
      if (rarityArg) {
        const key = rarityArg.toLowerCase();
        rarity = VALID_RARITIES[key] ?? null;
        if (!rarity) {
          console.warn(
            `[debug] loot.spawn_item: unknown rarity "${rarityArg}". ` +
            `Use: normal, magic, or rare.`,
          );
          return;
        }
      }

      // Generate the item
      const item = generateRandomItem(1);

      // Override rarity if specified
      if (rarity) {
        (item as { rarity: Rarity }).rarity = rarity;
      }

      // Create ground item entity near the character (random offset within 1-2 units)
      const eid = addEntity(world);
      addComponent(world, GroundItemComponent, eid);
      addComponent(world, IsLootable, eid);
      addComponent(world, Position, eid);

      const angle = Math.random() * Math.PI * 2;
      const offset = 1 + Math.random() * 1; // 1-2 units away
      Position.x[eid] = Position.x[charEid] + Math.cos(angle) * offset;
      Position.y[eid] = Position.y[charEid] + Math.sin(angle) * offset;

      GroundItemComponent.itemId[eid] = 0;
      GroundItemComponent.rarityCode[eid] = rarityToCode(item.rarity);
      GroundItemComponent.itemLevel[eid] = item.itemLevel;
      GroundItemComponent.droppedByEid[eid] = 0;
      GroundItemComponent.despawnTimer[eid] = 60; // Longer despawn for debug

      const color = RARITY_COLORS[item.rarity];
      console.log(
        `[debug] loot.spawn_item: spawned "${item.name}" ` +
        `(%c${item.rarity}%c) at (${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)})`,
        `color:${color};font-weight:bold`,
        '',
      );
    },

    /**
     * Remove all ground items from the world.
     * Usage: loot.clear_all
     */
    'loot.clear_all': () => {
      const world = getDebugWorld();
      let count = 0;

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsLootable, eid)) {
          removeEntity(world, eid);
          count++;
        }
      }

      console.log(`[debug] loot.clear_all: removed ${count} ground item(s)`);
    },

    /**
     * List all ground items with their position, rarity, and despawn timer.
     * Usage: loot.list
     */
    'loot.list': () => {
      const world = getDebugWorld();
      let count = 0;

      for (const eid of getAllEntities(world)) {
        if (!hasComponent(world, IsLootable, eid)) continue;
        if (!hasComponent(world, GroundItemComponent, eid)) continue;

        const rx = GroundItemComponent.rarityCode[eid];
        const lvl = GroundItemComponent.itemLevel[eid];
        const timer = GroundItemComponent.despawnTimer[eid];
        const posX = hasComponent(world, Position, eid) ? Position.x[eid] : NaN;
        const posY = hasComponent(world, Position, eid) ? Position.y[eid] : NaN;

        const rarityLabel = rarityCodeToString(rx);
        const color = RARITY_COLORS[rarityLabel as Rarity] || '#ffffff';

        console.log(
          `  eid=${eid} | %c${rarityLabel}%c | lvl=${lvl} | ` +
          `pos=(${posX.toFixed(2)}, ${posY.toFixed(2)}) | despawn=${timer.toFixed(1)}s`,
          `color:${color};font-weight:bold`,
          '',
        );
        count++;
      }

      if (count === 0) {
        console.log('[debug] loot.list: no ground items in the world.');
      } else {
        console.log(`[debug] loot.list: ${count} ground item(s) found.`);
      }
    },

    /**
     * Show inventory info for the Character.
     * Usage: loot.info
     */
    'loot.info': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] loot.info: no Character entity found.');
        return;
      }

      const hasInv = hasComponent(world, InventorySlot, charEid);
      const count = hasInv ? InventorySlot.count[charEid] : 0;

      console.log(
        `[debug] loot.info: Character ${charEid} ` +
        `inventory count = ${count}`,
      );
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

/** Map a Rarity string to a numeric code (0=Normal, 1=Magic, 2=Rare). */
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
