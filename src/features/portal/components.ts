import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// Portal components
// ---------------------------------------------------------------------------

/**
 * Portal — data for a portal entity in the world.
 *
 * Fields:
 *  - portalType:      0=portal_scroll, 1=boss_portal, 2=hub_return
 *  - activationTimer: seconds remaining until portal becomes active
 *  - isActive:        0 (inactive) or 1 (active — can be interacted with)
 *  - targetZone:      zone ID to teleport to (0 = Hub)
 *  - targetX:         destination world X
 *  - targetY:         destination world Y
 */
export const Portal = defineComponent({
  portalType: Types.ui8,
  activationTimer: Types.f32,
  isActive: Types.ui8,
  targetZone: Types.ui8,
  targetX: Types.f32,
  targetY: Types.f32,
});

/**
 * Tag component marking an entity as a portal.
 */
export const IsPortal = defineComponent();

// ---------------------------------------------------------------------------
// Inventory / carry components
// ---------------------------------------------------------------------------

/**
 * PortalScrollCount — how many portal scrolls the character is carrying.
 * Added to the Character entity when they acquire a scroll.
 */
export const PortalScrollCount = defineComponent({
  count: Types.ui8,
});
