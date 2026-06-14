import { defineQuery, hasComponent, addComponent, addEntity, removeEntity } from 'bitecs';
import type { World } from '@/core';
import { getFrameIntents, getDeltaTime } from '@/core';
import { IntentType } from '@/shared';
import { Position, IsCharacter } from '@/systems/movement';
import { Portal, IsPortal, PortalScrollCount } from './components';
import { DEFAULT_PORTAL_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Interact range for portal activation (world units). */
const PORTAL_INTERACT_RANGE = 2;

/** Numeric codes matching PortalType order. */
const PORTAL_TYPE_SCROLL = 0;
const PORTAL_TYPE_BOSS   = 1;
const PORTAL_TYPE_HUB    = 2;

/** Hub spawn point. */
const HUB_POSITION = { x: 0, y: 0 };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All portal entities in the world. */
const portalQuery = defineQuery([IsPortal, Portal]);

/** The Character entity (must have IsCharacter + Position). */
const characterQuery = defineQuery([Position, IsCharacter]);

// ---------------------------------------------------------------------------
// Portal system
// ---------------------------------------------------------------------------

/**
 * portalSystem — handles portal activation timing, interaction, and scroll usage.
 *
 * Runs after movementSystem (character position is settled) and before lootSystem
 * (so portal teleport takes priority over loot pickup on Interact intent).
 *
 * Each frame:
 *
 * **Activation phase:**
 * 1. Tick down `activationTimer` on every portal entity.
 * 2. When ≤ 0, set `isActive = 1`.
 *
 * **Interaction phase:**
 * 1. Read `Interact` intents from the frame.
 * 2. Check if any active portal is within `PORTAL_INTERACT_RANGE` of the Character.
 * 3. If found, teleport the Character to Hub and remove the portal entity.
 *
 * **Scroll usage:**
 * - Helper functions (usePortalScroll, placePortalScroll, placeBossPortal) are
 *   exported for use by debug commands, boss system, or UI.
 */
export function portalSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // Convert ms → seconds
  const intents = getFrameIntents(world);
  const portals = portalQuery(world);
  const chars = characterQuery(world);

  // -----------------------------------------------------------------------
  // 1. Portal activation timer
  // -----------------------------------------------------------------------
  for (const eid of portals) {
    // Skip already-active portals
    if (Portal.isActive[eid]) continue;

    Portal.activationTimer[eid] -= dt;

    if (Portal.activationTimer[eid] <= 0) {
      Portal.isActive[eid] = 1;

      if (import.meta.env.DEV) {
        const typeLabel = portalTypeLabel(Portal.portalType[eid]);
        console.log(
          `[Portal] ${typeLabel} entity ${eid} activated at ` +
          `(${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)})`,
        );
      }
    }
  }

  // -----------------------------------------------------------------------
  // 2. Portal interaction — Interact intent near an active portal
  // -----------------------------------------------------------------------
  for (const charEid of chars) {
    for (const intent of intents) {
      if (intent.type !== IntentType.Interact) continue;

      // Find the closest active portal within interact range
      let closestPortalEid = -1;
      let closestDist = PORTAL_INTERACT_RANGE;

      for (const portalEid of portals) {
        if (!Portal.isActive[portalEid]) continue;

        const dx = Position.x[portalEid] - Position.x[charEid];
        const dy = Position.y[portalEid] - Position.y[charEid];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= closestDist) {
          closestDist = dist;
          closestPortalEid = portalEid;
        }
      }

      if (closestPortalEid === -1) continue;

      // Teleport character to Hub
      Position.x[charEid] = HUB_POSITION.x;
      Position.y[charEid] = HUB_POSITION.y;

      if (import.meta.env.DEV) {
        const typeLabel = portalTypeLabel(Portal.portalType[closestPortalEid]);
        console.log(
          `[Portal] Teleported character to Hub via ${typeLabel} ` +
          `(portal eid=${closestPortalEid})`,
        );
      }

      // Remove the portal entity after use (one-use portals)
      removeEntity(world, closestPortalEid);

      // Only handle one portal interaction per frame
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Create a portal scroll portal entity at the character's current position.
 * The character entity must have a Position component.
 */
export function placePortalScroll(world: World, charEid: number): void {
  const eid = addEntity(world);
  addComponent(world, IsPortal, eid);
  addComponent(world, Portal, eid);
  addComponent(world, Position, eid);

  Portal.portalType[eid] = PORTAL_TYPE_SCROLL;
  Portal.activationTimer[eid] = DEFAULT_PORTAL_CONFIG.activationDelay;
  Portal.isActive[eid] = 0;
  Portal.targetZone[eid] = 0; // Hub
  Portal.targetX[eid] = HUB_POSITION.x;
  Portal.targetY[eid] = HUB_POSITION.y;

  Position.x[eid] = Position.x[charEid];
  Position.y[eid] = Position.y[charEid];

  if (import.meta.env.DEV) {
    console.log(
      `[Portal] Portal Scroll placed at ` +
      `(${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)})`,
    );
  }
}

/**
 * Create a boss portal entity at the given world position.
 * Called by the boss system when a boss is defeated.
 */
export function placeBossPortal(
  world: World,
  position: { x: number; y: number },
): void {
  const eid = addEntity(world);
  addComponent(world, IsPortal, eid);
  addComponent(world, Portal, eid);
  addComponent(world, Position, eid);

  Portal.portalType[eid] = PORTAL_TYPE_BOSS;
  Portal.activationTimer[eid] = DEFAULT_PORTAL_CONFIG.activationDelay;
  Portal.isActive[eid] = 0;
  Portal.targetZone[eid] = 0; // Hub
  Portal.targetX[eid] = HUB_POSITION.x;
  Portal.targetY[eid] = HUB_POSITION.y;

  Position.x[eid] = position.x;
  Position.y[eid] = position.y;

  if (import.meta.env.DEV) {
    console.log(
      `[Portal] Boss Portal placed at ` +
      `(${position.x.toFixed(2)}, ${position.y.toFixed(2)})`,
    );
  }
}

/**
 * Consume one portal scroll from the character's inventory and create a
 * portal entity at their position.
 *
 * Returns `true` if the scroll was consumed, `false` if none available.
 */
export function usePortalScroll(world: World, charEid: number): boolean {
  if (!hasComponent(world, PortalScrollCount, charEid)) return false;
  if (PortalScrollCount.count[charEid] < 1) return false;

  PortalScrollCount.count[charEid] -= 1;
  placePortalScroll(world, charEid);

  if (import.meta.env.DEV) {
    console.log(
      `[Portal] Used portal scroll. Remaining: ${PortalScrollCount.count[charEid]}`,
    );
  }

  return true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map a numeric portal type code to a human-readable label. */
function portalTypeLabel(code: number): string {
  switch (code) {
    case 0:  return 'Portal Scroll';
    case 1:  return 'Boss Portal';
    case 2:  return 'Hub Return';
    default: return `Unknown(${code})`;
  }
}
