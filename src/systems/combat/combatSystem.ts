import { defineQuery, hasComponent, addComponent } from 'bitecs';
import type { World } from '@/core';
import { getFrameIntents, getDeltaTime } from '@/core';
import { IntentType } from '@/shared';
import { Position, FacingDirection, IsCharacter } from '@/systems/movement';
import { IsEnemy, AIState, AttackTimer, AttackCooldown } from '@/systems/ai';
import {
  Life,
  Damage,
  SkillSlot,
  CooldownTimer,
  CooldownDuration,
  IsDead,
} from './components';
import { DEFAULT_SKILLS, DEFAULT_COMBAT_CONFIG } from './types';
import type { CombatConfig } from './types';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * The Character entity — must have IsCharacter tag plus combat components.
 */
const characterQuery = defineQuery([
  Position,
  FacingDirection,
  Life,
  Damage,
  IsCharacter,
]);

/** All enemy entities that could be targeted or deal damage. */
const enemyQuery = defineQuery([
  IsEnemy,
  Position,
  Life,
  Damage,
]);

/** Enemies in Attack state (used for automatic damage to Character). */
const attackingEnemyQuery = defineQuery([
  IsEnemy,
  AIState,
  AttackTimer,
  AttackCooldown,
  Damage,
]);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUM_SLOTS = 4;
const config: CombatConfig = DEFAULT_COMBAT_CONFIG;
const skillRegistry = DEFAULT_SKILLS;

/**
 * Map from numeric skill code (stored in SkillSlot) to skill id string.
 *   1 → 'basic_attack'
 *   2 → 'cleave'
 *   3 → 'power_strike'
 *   4 → 'war_cry'
 */
const SKILL_CODE_MAP: Record<number, string> = {
  1: 'basic_attack',
  2: 'cleave',
  3: 'power_strike',
  4: 'war_cry',
};

function skillIdFromCode(code: number): string {
  return SKILL_CODE_MAP[code] ?? '';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the nearest living enemy within melee range that is in front of
 * the origin entity (based on its facing direction). Returns null if none.
 */
function findMeleeTarget(
  world: World,
  originEid: number,
  enemies: readonly number[],
): number | null {
  let bestEid: number | null = null;
  let bestDist = Infinity;

  const ox = Position.x[originEid];
  const oy = Position.y[originEid];
  const fx = FacingDirection.x[originEid];
  const fy = FacingDirection.y[originEid];

  for (const eid of enemies) {
    // Skip dead enemies
    if (hasComponent(world, IsDead, eid)) continue;

    const dx = Position.x[eid] - ox;
    const dy = Position.y[eid] - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Must be within melee range
    if (dist > config.meleeRange || dist === 0) continue;

    // Must be in front of the character (dot product with facing > 0.5)
    const dot = (dx / dist) * fx + (dy / dist) * fy;
    if (dot <= 0.5) continue;

    if (dist < bestDist) {
      bestDist = dist;
      bestEid = eid;
    }
  }

  return bestEid;
}

/**
 * Read a skill ID from SkillSlot by index using a switch for type safety.
 */
function readSkillId(eid: number, slotIndex: number): number {
  switch (slotIndex) {
    case 0: return SkillSlot.skillId_0[eid];
    case 1: return SkillSlot.skillId_1[eid];
    case 2: return SkillSlot.skillId_2[eid];
    case 3: return SkillSlot.skillId_3[eid];
    default: return 0;
  }
}

/**
 * Read cooldown remaining time by slot index.
 */
function readCooldownRemaining(eid: number, slotIndex: number): number {
  switch (slotIndex) {
    case 0: return CooldownTimer.remaining_0[eid];
    case 1: return CooldownTimer.remaining_1[eid];
    case 2: return CooldownTimer.remaining_2[eid];
    case 3: return CooldownTimer.remaining_3[eid];
    default: return 0;
  }
}

/**
 * Write cooldown remaining time by slot index.
 */
function writeCooldownRemaining(eid: number, slotIndex: number, value: number): void {
  switch (slotIndex) {
    case 0: CooldownTimer.remaining_0[eid] = value; break;
    case 1: CooldownTimer.remaining_1[eid] = value; break;
    case 2: CooldownTimer.remaining_2[eid] = value; break;
    case 3: CooldownTimer.remaining_3[eid] = value; break;
  }
}

/**
 * Read cooldown duration (max) by slot index.
 */
function readCooldownDuration(eid: number, slotIndex: number): number {
  switch (slotIndex) {
    case 0: return CooldownDuration.max_0[eid];
    case 1: return CooldownDuration.max_1[eid];
    case 2: return CooldownDuration.max_2[eid];
    case 3: return CooldownDuration.max_3[eid];
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Combat system
// ---------------------------------------------------------------------------

/**
 * combatSystem — handles all damage dealing and skill execution.
 *
 * Runs after the AI system. For each frame:
 *
 * **Character skill execution:**
 * 1. Reads `USE_SKILL(slotIndex)` intents from the input layer.
 * 2. Checks cooldown — if > 0 the skill can't fire.
 * 3. Checks that a skill is assigned to the slot.
 * 4. Resolves targeting (melee: nearest enemy in facing direction).
 * 5. Applies damage to the target.
 * 6. Resets the slot's cooldown timer.
 *
 * **Enemy auto-attack detection:**
 * The AI system (runs before combat) resets `AttackTimer` to
 * `AttackCooldown` when an attack fires (both on state entry and on
 * timer expiry). The combat system detects these "attack fire" frames
 * by checking whether `AttackTimer ≥ AttackCooldown - ε`.
 * When true, we apply the enemy's Damage to the Character.
 *
 * **Cooldown tick-down:**
 * Each frame, cooldown timers on the Character are decremented by dt
 * (clamped to 0).
 */
export function combatSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // Convert ms → seconds
  const intents = getFrameIntents(world);

  // -----------------------------------------------------------------------
  // 1. Cooldown tick-down (do this FIRST so skill execution sets cooldown
  //    fresh for the next frame — no double-decrement).
  // -----------------------------------------------------------------------
  const chars = characterQuery(world);

  for (const charEid of chars) {
    if (hasComponent(world, CooldownTimer, charEid)) {
      for (let s = 0; s < NUM_SLOTS; s++) {
        const current = readCooldownRemaining(charEid, s);
        if (current > 0) {
          writeCooldownRemaining(charEid, s, Math.max(0, current - dt));
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 2. Character skill execution
  // -----------------------------------------------------------------------
  for (const charEid of chars) {
    // --- a. Ensure the entity has skill components ---
    const hasSkillComponents =
      hasComponent(world, SkillSlot, charEid) &&
      hasComponent(world, CooldownTimer, charEid) &&
      hasComponent(world, CooldownDuration, charEid);

    // --- b. Process USE_SKILL intents ---
    if (hasSkillComponents) {
      for (const intent of intents) {
        if (intent.type !== IntentType.UseSkill) continue;

        const slotIndex = intent.slotIndex;
        if (slotIndex < 0 || slotIndex >= NUM_SLOTS) continue;

        // Cooldown check (already ticked down above)
        const cooldownRemaining = readCooldownRemaining(charEid, slotIndex);
        if (cooldownRemaining > 0) continue;

        // Skill assignment check
        const skillIdCode = readSkillId(charEid, slotIndex);
        if (skillIdCode === 0) continue;

        const skillId = skillIdFromCode(skillIdCode);
        const skill = skillRegistry[skillId];
        if (!skill) continue;

        // Targeting (melee skills only for MVP)
        const enemies = enemyQuery(world);
        const target = findMeleeTarget(world, charEid, enemies);
        if (target === null) continue;

        // Apply damage
        const rawDamage = Damage.value[charEid] * skill.damageMultiplier;
        Life.current[target] -= rawDamage;

        // Check for enemy death
        if (Life.current[target] <= 0) {
          if (!hasComponent(world, IsDead, target)) {
            addComponent(world, IsDead, target);
          }
        }

        // Start cooldown (will be ticked down next frame)
        const cdMax = readCooldownDuration(charEid, slotIndex);
        writeCooldownRemaining(charEid, slotIndex, cdMax);

        if (import.meta.env.DEV) {
          console.log(
            `[Combat] Character ${charEid} used ${skill.name} on enemy ${target} ` +
            `(damage: ${rawDamage.toFixed(1)}, slot: ${slotIndex})`,
          );
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Enemy auto-attack on Character
  // -----------------------------------------------------------------------
  const attackingEnemies = attackingEnemyQuery(world);

  for (const eid of attackingEnemies) {
    // Skip dead enemies
    if (hasComponent(world, IsDead, eid)) continue;

    // Detect "attack fired this frame":
    // The AI system (which runs before us) resets AttackTimer to AttackCooldown
    // when an attack fires. We check if the timer is at (or very near) its max.
    const timer = AttackTimer.value[eid];
    const cd = AttackCooldown.value[eid];
    const justReset = timer >= cd - 0.0001;

    if (!justReset) continue;

    // Apply damage to the Character entity
    for (const charEid of chars) {
      if (hasComponent(world, IsDead, charEid)) continue;

      const enemyDmg = Damage.value[eid];
      Life.current[charEid] -= enemyDmg;

      // Check for character death
      if (Life.current[charEid] <= 0) {
        if (!hasComponent(world, IsDead, charEid)) {
          addComponent(world, IsDead, charEid);
        }
      }

      if (import.meta.env.DEV) {
        console.log(
          `[Combat] Enemy ${eid} hits Character ${charEid} for ${enemyDmg.toFixed(1)} damage`,
        );
      }

      break; // Only one Character entity expected
    }
  }
}
