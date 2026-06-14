import { addEntity, addComponent, hasComponent } from 'bitecs';
import { getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, IsCharacter } from '@/systems/movement';
import { Portal, IsPortal, PortalScrollCount } from './components';
import { placePortalScroll, placeBossPortal, usePortalScroll } from './portalSystem';

// ---------------------------------------------------------------------------
// Debug commands
// ---------------------------------------------------------------------------

export function registerPortalDebugCommands(): void {
  registerDebugCommands({
    /**
     * Give the character a portal scroll.
     * Usage: portal.scroll [count]
     *   count: optional — number of scrolls to add (default 1)
     */
    'portal.scroll': (countArg = '1') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] portal.scroll: no Character entity found.');
        return;
      }

      const amount = Math.max(1, parseInt(countArg, 10) || 1);

      if (!hasComponent(world, PortalScrollCount, charEid)) {
        addComponent(world, PortalScrollCount, charEid);
        PortalScrollCount.count[charEid] = 0;
      }

      PortalScrollCount.count[charEid] += amount;

      console.log(
        `[debug] portal.scroll: added ${amount} portal scroll(s) ` +
        `(total: ${PortalScrollCount.count[charEid]})`,
      );
    },

    /**
     * Use a portal scroll — consume one scroll and create a portal at the
     * character's position.
     * Usage: portal.use
     */
    'portal.use': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] portal.use: no Character entity found.');
        return;
      }

      const success = usePortalScroll(world, charEid);
      if (!success) {
        console.warn('[debug] portal.use: no portal scrolls available.');
      }
    },

    /**
     * Spawn a boss portal at the character's position.
     * Usage: portal.boss
     */
    'portal.boss': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] portal.boss: no Character entity found.');
        return;
      }

      placeBossPortal(world, {
        x: Position.x[charEid],
        y: Position.y[charEid],
      });
    },

    /**
     * Spawn a hub-return portal at the character's position.
     * Usage: portal.hub
     */
    'portal.hub': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] portal.hub: no Character entity found.');
        return;
      }

      // Create an instantly active hub-return portal at the character position
      const eid = addEntity(world);
      addComponent(world, IsPortal, eid);
      addComponent(world, Portal, eid);
      addComponent(world, Position, eid);

      Portal.portalType[eid] = 2; // hub_return
      Portal.activationTimer[eid] = 0;
      Portal.isActive[eid] = 1; // Immediate activation
      Portal.targetZone[eid] = 0; // Hub
      Portal.targetX[eid] = 0;
      Portal.targetY[eid] = 0;

      Position.x[eid] = Position.x[charEid];
      Position.y[eid] = Position.y[charEid];

      console.log(
        `[debug] portal.hub: Hub Return portal spawned at ` +
        `(${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)})`,
      );
    },

    /**
     * List all portal entities in the world.
     * Usage: portal.info
     */
    'portal.info': () => {
      const world = getDebugWorld();
      let count = 0;

      for (const eid of getAllEntities(world)) {
        if (!hasComponent(world, IsPortal, eid)) continue;
        if (!hasComponent(world, Portal, eid)) continue;

        const typeCode = Portal.portalType[eid];
        const typeLabel = portalTypeLabel(typeCode);
        const active = Portal.isActive[eid] ? 'ACTIVE' : 'inactive';
        const timer = Portal.activationTimer[eid];
        const posX = hasComponent(world, Position, eid) ? Position.x[eid] : NaN;
        const posY = hasComponent(world, Position, eid) ? Position.y[eid] : NaN;

        console.log(
          `  eid=${eid} | ${typeLabel} | ${active} | ` +
          `timer=${timer.toFixed(2)}s | ` +
          `pos=(${posX.toFixed(2)}, ${posY.toFixed(2)})`,
        );
        count++;
      }

      if (count === 0) {
        console.log('[debug] portal.info: no portals in the world.');
      } else {
        console.log(`[debug] portal.info: ${count} portal(s) found.`);
      }
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

/** Map a numeric portal type code to a human-readable label. */
function portalTypeLabel(code: number): string {
  switch (code) {
    case 0:  return 'Portal Scroll';
    case 1:  return 'Boss Portal';
    case 2:  return 'Hub Return';
    default: return `Unknown(${code})`;
  }
}
