import { Types, defineComponent } from 'bitecs';

/**
 * BaseStats — the entity's unmodified base stat values (set at creation,
 * not modified by buffs).
 *
 * The buff system reads these each frame to recompute derived stats
 * (Damage.value, MovementSpeed.value, Life.max) from active buffs.
 * This prevents drift caused by incremental modifications.
 */
export const BaseStats = defineComponent({
  damage: Types.f32,
  maxLife: Types.f32,
  movementSpeed: Types.f32,
});

/**
 * BuffInstance — a component on a child entity that represents one active
 * buff instance.
 *
 * We use the "entity as relation" pattern: each active buff is a separate
 * entity that carries a BuffInstance component pointing at the owner.
 * An owner entity can have many BuffInstance children, one per active buff.
 *
 * Fields:
 *  - ownerEid: the entity that benefits from this buff
 *  - buffId:   numeric key into BUFF_REGISTRY (1 = war_cry_buff, 2 = enraged_buff, …)
 *  - remainingTime: seconds until expiry (≤ 0 means expired)
 */
export const BuffInstance = defineComponent({
  ownerEid: Types.eid,
  buffId: Types.ui8,
  remainingTime: Types.f32,
});
