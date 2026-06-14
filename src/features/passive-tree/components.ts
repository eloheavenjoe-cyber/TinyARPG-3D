import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// PassiveTreeState
// ---------------------------------------------------------------------------

/**
 * Tracks the Character's passive tree allocation state.
 *
 * Fields:
 *  - skillPoints:    Unspent skill points the player may allocate.
 *  - respecPoints:   Remaining respec points (lifetime limit).
 *  - allocatedMask:  Bitmask of allocated node indices (max 32 nodes for MVP).
 *                    Bit N is set when the node at index N is allocated.
 */
export const PassiveTreeState = defineComponent({
  skillPoints: Types.ui8,
  respecPoints: Types.ui8,
  allocatedMask: Types.ui32,
});

// ---------------------------------------------------------------------------
// PassiveStats
// ---------------------------------------------------------------------------

/**
 * Stats derived from passive tree allocations, recomputed every frame.
 * These values are added to BaseStats so that buffSystem picks them up.
 */
export const PassiveStats = defineComponent({
  bonusDamage: Types.f32,
  bonusMaxLife: Types.f32,
  bonusMovementSpeed: Types.f32,
});
