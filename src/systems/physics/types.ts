/**
 * Physics system types.
 *
 * Defines configuration for knockback and gravity tuning.
 */

// ---------------------------------------------------------------------------
// PhysicsConfig
// ---------------------------------------------------------------------------

export interface PhysicsConfig {
  /** Base knockback force magnitude (applied as velocity impulse). */
  knockbackForce: number;
  /** Minimum damageMultiplier to trigger knockback. */
  knockbackThreshold: number;
  /** Gravity value (negative Y in Babylon.js 3D space). */
  gravity: number;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  knockbackForce: 8,
  knockbackThreshold: 1.5,
  gravity: -9.81,
};
