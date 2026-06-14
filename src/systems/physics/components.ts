import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// PhysicsBody — tag component
// ---------------------------------------------------------------------------

/**
 * Tag component: entity has a physics body attached.
 * Used by the physics system to track which entities need Havok impostors.
 */
export const PhysicsBody = defineComponent();

// ---------------------------------------------------------------------------
// KnockbackImpulse — transient impulse component
// ---------------------------------------------------------------------------

/**
 * Knockback impulse to apply this frame.
 *
 * **Transient** — added by the combat system, consumed by the physics system,
 * and removed each frame. Never persists across frames.
 *
 * - `x`, `y` — normalised direction vector (away from attacker).
 * - `magnitude` — total impulse strength (knockbackForce × damageMultiplier).
 */
export const KnockbackImpulse = defineComponent({
  x: Types.f32,
  y: Types.f32,
  magnitude: Types.f32,
});
