/** Portal feature types — to be defined during implementation. */

/**
 * The type of portal entity in the world.
 * - portal_scroll: temporary portal created by using a Portal Scroll consumable
 * - boss_portal: guaranteed portal spawned after defeating a boss
 * - hub_return: a fixed portal at the hub
 */
export type PortalType = 'portal_scroll' | 'boss_portal' | 'hub_return';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface PortalConfig {
  /** Duration before portal activates (seconds). */
  activationDelay: number;
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  activationDelay: 0.5,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Portal Scroll item spec ID (used by the inventory / item system). */
export const PORTAL_SCROLL_SPEC_ID = 'portal_scroll';
