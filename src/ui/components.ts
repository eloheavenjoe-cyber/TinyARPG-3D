import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// HUD State — singleton component stored on a dedicated UI entity
// ---------------------------------------------------------------------------

/**
 * HUDState tracks the display fractions the HUD renders each frame.
 * Updated by the HUD system from the Character's ECS components.
 *
 * Fields:
 *  - lifeOrbFill:  0-1 fraction (current/max Life)
 *  - manaOrbFill:  0-1 fraction (current/max Mana)
 *  - xpFraction:   0-1 fraction (current XP / XP to level)
 */
export const HUDState = defineComponent({
  lifeOrbFill: Types.f32,
  manaOrbFill: Types.f32,
  xpFraction: Types.f32,
});
