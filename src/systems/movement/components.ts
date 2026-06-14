import { Types, defineComponent } from 'bitecs';

/**
 * World position (2D, top-down isometric plane).
 * The render layer projects this to 3D for the isometric view.
 */
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

/**
 * Current velocity vector. Computed each frame by MovementSystem
 * from MOVE_DIRECTION intent and MovementSpeed. Reset to zero
 * when no movement input is present.
 */
export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

/**
 * Base movement speed in world units per second.
 * Can be modified by buffs, passives, and equipment.
 */
export const MovementSpeed = defineComponent({
  value: Types.f32,
});

/**
 * The direction the entity was last facing.
 * Used by melee targeting and attack animation direction.
 * (1, 0) = right, (-1, 0) = left, (0, 1) = down, (0, -1) = up.
 */
export const FacingDirection = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

/**
 * Tag component marking the player-controlled Character entity.
 * Only one entity should have this component at a time.
 */
export const IsCharacter = defineComponent();
