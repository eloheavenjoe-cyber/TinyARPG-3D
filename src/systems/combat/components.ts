import { Types, defineComponent } from 'bitecs';

// ---------------------------------------------------------------------------
// Core combat components
// ---------------------------------------------------------------------------

/**
 * Hit points. Death occurs when current ≤ 0.
 * Both the Character and enemies have Life.
 */
export const Life = defineComponent({
  current: Types.f32,
  max: Types.f32,
});

/**
 * Base damage dealt by this entity's attacks.
 * Used for both Character skills and enemy auto-attacks.
 */
export const Damage = defineComponent({
  value: Types.f32,
});

// ---------------------------------------------------------------------------
// Skill / hotbar components  (Character only, but can exist on any entity)
// ---------------------------------------------------------------------------

/**
 * Which skill ID (key into SkillRegistry) is assigned to each hotbar slot.
 * skillId_N === 0 means slot N is empty / unassigned.
 *
 * We use four separate fields because bitecs typed arrays (ListType) have
 * poor TypeScript inference. A single component with four named fields
 * is cleaner and type-safe.
 */
export const SkillSlot = defineComponent({
  skillId_0: Types.ui8,
  skillId_1: Types.ui8,
  skillId_2: Types.ui8,
  skillId_3: Types.ui8,
});

/**
 * Remaining cooldown (seconds) for each hotbar slot.
 * Counts down every frame. When > 0 the slot cannot be used.
 */
export const CooldownTimer = defineComponent({
  remaining_0: Types.f32,
  remaining_1: Types.f32,
  remaining_2: Types.f32,
  remaining_3: Types.f32,
});

/**
 * Maximum cooldown (seconds) for the skill assigned to each slot.
 * CooldownTimer is reset to this value when a skill is used.
 */
export const CooldownDuration = defineComponent({
  max_0: Types.f32,
  max_1: Types.f32,
  max_2: Types.f32,
  max_3: Types.f32,
});

// ---------------------------------------------------------------------------
// Death marker
// ---------------------------------------------------------------------------

/**
 * Tag component added when Life.current ≤ 0.
 * Signals other systems (Loot, Render) to handle cleanup.
 */
export const IsDead = defineComponent();
