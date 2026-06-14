import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// Render-specific ECS components
// ---------------------------------------------------------------------------

/**
 * Emits a floating damage number for one frame.
 * The render system consumes this component and produces a DamageNumber
 * in the RenderSnapshot. The component is meant to be added transiently
 * (e.g. by the combat system when damage is dealt) and cleaned up after
 * the snapshot is built.
 *
 * Fields:
 *  - value:    the raw damage amount to display
 *  - lifetime: how many seconds the number should remain visible
 */
export const DamageNumberEmitter = defineComponent({
  value: Types.f32,
  lifetime: Types.f32,
});

/**
 * Emits a telegraph / AoE preview decal on the ground.
 * Added by skill-targeting systems to show where an ability will land.
 *
 * Fields:
 *  - shape:    0 = circle, 1 = cone, 2 = line
 *  - radius:   radius (circle / cone) or length (line) in world units
 *  - angle:    orientation in radians
 *  - lifetime: seconds remaining (the decal fades as it approaches 0)
 */
export const TelegraphEmitter = defineComponent({
  shape: Types.ui8,
  radius: Types.f32,
  angle: Types.f32,
  lifetime: Types.f32,
});
