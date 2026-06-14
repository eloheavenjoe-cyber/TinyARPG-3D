import { Types, defineComponent } from 'bitecs';

// ----- Constants -----

/** Enemy AI state values. */
export const AIStateEnum = {
  Idle: 0,
  Chase: 1,
  Attack: 2,
} as const;

/** Enemy type values. */
export const EnemyTypeEnum = {
  Melee: 0,
  Ranged: 1,
} as const;

/** Bitmask flags for elite modifiers. */
export const EliteModifierFlag = {
  None: 0,
  Enraged: 1 << 0,
  Spectral: 1 << 1,
  Shielded: 1 << 2,
  Bloodthirsty: 1 << 3,
} as const;

// ----- Components -----

/** Tag component marking enemy entities. */
export const IsEnemy = defineComponent();

/** 0 = Melee, 1 = Ranged. */
export const EnemyType = defineComponent({
  value: Types.ui8,
});

/** Current AI state: 0 = Idle, 1 = Chase, 2 = Attack. */
export const AIState = defineComponent({
  value: Types.ui8,
});

/** Distance at which this enemy can attack the target. */
export const AttackRange = defineComponent({
  value: Types.f32,
});

/** Time remaining until next attack (in seconds, counts down each frame). */
export const AttackTimer = defineComponent({
  value: Types.f32,
});

/** Base interval between attacks (in seconds). */
export const AttackCooldown = defineComponent({
  value: Types.f32,
});

/** The entity ID this enemy is currently targeting. */
export const TargetEntity = defineComponent({
  eid: Types.eid,
});

/** Tag component marking elite enemy entities. */
export const IsElite = defineComponent();

/** Bitmask of EliteModifier flags applied to this elite enemy. */
export const EliteModifiers = defineComponent({
  mask: Types.ui8,
});
