import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// Boss ECS components
// ---------------------------------------------------------------------------

/**
 * Tag component marking a boss entity.
 */
export const IsBoss = defineComponent();

/**
 * Boss-specific runtime state.
 *
 * Fields:
 *  - currentPhase:     active phase index (1, 2, or 3)
 *  - enrageTimer:      seconds remaining until the boss becomes enraged
 *  - isEnraged:        1 if enraged, 0 otherwise
 *  - attackTimer:      seconds until the next attack fires
 *  - currentAttack:    index into the current phase's attacks array
 *  - telegraphTimer:   seconds until the active telegraph expires (0 = none)
 *  - telegraphTargetX: world X where the telegraph was placed
 *  - telegraphTargetY: world Y where the telegraph was placed
 */
export const BossState = defineComponent({
  currentPhase: Types.ui8,
  enrageTimer: Types.f32,
  isEnraged: Types.ui8,
  attackTimer: Types.f32,
  currentAttack: Types.ui8,
  telegraphTimer: Types.f32,
  telegraphTargetX: Types.f32,
  telegraphTargetY: Types.f32,
});

/**
 * Boss arena boundary data — used for visual / camera framing.
 *
 * Fields:
 *  - centerX: arena centre X
 *  - centerY: arena centre Y
 *  - radius:  arena boundary radius
 */
export const BossArena = defineComponent({
  centerX: Types.f32,
  centerY: Types.f32,
  radius: Types.f32,
});
