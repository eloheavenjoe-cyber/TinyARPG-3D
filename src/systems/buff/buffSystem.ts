import {
  defineQuery,
  addEntity,
  addComponent,
  removeEntity,
  hasComponent,
} from 'bitecs';
import type { World } from '@/core';
import { getFrameIntents, getDeltaTime } from '@/core';
import { IntentType } from '@/shared';
import { IsCharacter } from '@/systems/movement';
import { Damage, Life, IsDead, skillIdFromCode } from '@/systems/combat';
import { MovementSpeed } from '@/systems/movement';
import { SkillSlot, CooldownTimer } from '@/systems/combat';
import { BaseStats, BuffInstance } from './components';
import {
  BUFF_REGISTRY,
  SKILL_BUFF_MAP,
  codeFromBuffId,
  buffIdFromCode,
  STAT_DAMAGE,
  STAT_MAX_LIFE,
  STAT_MOVEMENT_SPEED,
} from './types';
import type { BuffDefinition } from './types';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Entities that have BaseStats and can benefit from buff stat recomputation. */
const baseStatsQuery = defineQuery([BaseStats]);

/** All BuffInstance entities (one per active buff). */
const buffInstanceQuery = defineQuery([BuffInstance]);

/** The Character entity (used for skill-based buff application). */
const characterQuery = defineQuery([IsCharacter]);

/** Dead entities (IsDead tag). */
const deadQuery = defineQuery([IsDead]);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUM_SLOTS = 4;
const MAX_LIFE_CHANGE_EPSILON = 0.001;

// ---------------------------------------------------------------------------
// Buff system
// ---------------------------------------------------------------------------

/**
 * buffSystem — applies, ticks, and resolves active buff stat modifiers.
 *
 * **Pipeline position:** runs after combatSystem.
 *
 * **Phase 1 — Apply new buffs from skills:**
 * Reads USE_SKILL intents from the current frame. If the skill used
 * grants a buff (via SKILL_BUFF_MAP), creates a new BuffInstance entity
 * targeting the Character.
 *
 * **Phase 2 — Tick timers & remove expired buffs:**
 * Decrements remainingTime by dt. Removes the BuffInstance entity when
 * remainingTime ≤ 0.
 *
 * **Phase 3 — Clean up buffs on dead entities:**
 * Removes all BuffInstance entities whose owner carries IsDead.
 *
 * **Phase 4 — Recompute derived stats:**
 * For every entity that has BaseStats, sums all active buff modifiers
 * and writes the resulting values into Damage.value, MovementSpeed.value,
 * and Life.max (with proportional scaling of Life.current).
 */
export function buffSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // ms → seconds
  const intents = getFrameIntents(world);

  // -----------------------------------------------------------------------
  // Phase 1 — Apply new buffs from skills
  // -----------------------------------------------------------------------
  applyBuffsFromSkillIntents(world, intents);

  // -----------------------------------------------------------------------
  // Phase 2 — Tick down buff timers & remove expired
  // -----------------------------------------------------------------------
  tickBuffs(world, dt);

  // -----------------------------------------------------------------------
  // Phase 3 — Remove buffs from dead entities
  // -----------------------------------------------------------------------
  removeBuffsFromDead(world);

  // -----------------------------------------------------------------------
  // Phase 4 — Recompute derived stats from BaseStats + active buffs
  // -----------------------------------------------------------------------
  recomputeStats(world);
}

// =========================================================================
// Phase 1 helpers
// =========================================================================

function applyBuffsFromSkillIntents(world: World, intents: ReturnType<typeof getFrameIntents>): void {
  const chars = characterQuery(world);
  if (chars.length === 0) return;

  const charEid = chars[0];

  // Ensure the Character has SkillSlot
  if (!hasComponent(world, SkillSlot, charEid)) return;

  for (const intent of intents) {
    if (intent.type !== IntentType.UseSkill) continue;

    const slotIndex = intent.slotIndex;
    if (slotIndex < 0 || slotIndex >= NUM_SLOTS) continue;

    // Read the skill numeric code from the slot
    const skillIdCode = readSkillSlot(charEid, slotIndex);
    if (skillIdCode === 0) continue;

    const skillId = skillIdFromCode(skillIdCode);
    if (!skillId) continue;

    // Check if this skill grants a buff
    const buffId = SKILL_BUFF_MAP[skillId];
    if (!buffId) continue;

    const buffDef = BUFF_REGISTRY[buffId];
    if (!buffDef) continue;

    // Apply the buff to the Character
    applyBuffToEntity(world, charEid, buffId, buffDef);
  }
}

/**
 * Create a new BuffInstance entity for the given owner.
 * If the buff is already present and we want to "refresh" (re-stack),
 * we simply add another instance — the stacking logic is handled by
 * recomputeStats which sums magnitudes.
 */
function applyBuffToEntity(
  world: World,
  ownerEid: number,
  buffId: string,
  buffDef: BuffDefinition,
): void {
  const buffCode = codeFromBuffId(buffId);
  if (buffCode === 0) return;

  const instanceEid = addEntity(world);
  addComponent(world, BuffInstance, instanceEid);

  BuffInstance.ownerEid[instanceEid] = ownerEid;
  BuffInstance.buffId[instanceEid] = buffCode;
  BuffInstance.remainingTime[instanceEid] = buffDef.durationSeconds;
}

// =========================================================================
// Phase 2 helpers
// =========================================================================

function tickBuffs(world: World, dt: number): void {
  const instances = buffInstanceQuery(world);

  for (const eid of instances) {
    // Decrement timer (Infinity stays Infinity)
    const remaining = BuffInstance.remainingTime[eid];
    if (remaining !== Infinity && remaining !== Number.POSITIVE_INFINITY) {
      BuffInstance.remainingTime[eid] = remaining - dt;
    }

    // Remove if expired
    if (BuffInstance.remainingTime[eid] <= 0) {
      removeEntity(world, eid);
    }
  }
}

// =========================================================================
// Phase 3 helpers
// =========================================================================

function removeBuffsFromDead(world: World): void {
  const deadEntities = deadQuery(world);
  if (deadEntities.length === 0) return;

  const deadSet = new Set(deadEntities);

  const instances = buffInstanceQuery(world);
  for (const eid of instances) {
    const owner = BuffInstance.ownerEid[eid];
    if (deadSet.has(owner)) {
      removeEntity(world, eid);
    }
  }
}

// =========================================================================
// Phase 4 helpers
// =========================================================================

function recomputeStats(world: World): void {
  // Collect all active buff modifiers per owner
  const modifiers = collectBuffModifiers(world);
  const affected = baseStatsQuery(world);

  for (const eid of affected) {
    const baseDamage = BaseStats.damage[eid];
    const baseMaxLife = BaseStats.maxLife[eid];
    const baseSpeed = BaseStats.movementSpeed[eid];

    const entityMods = modifiers.get(eid) ?? {
      damagePercent: 0,
      damageFlat: 0,
      maxLifePercent: 0,
      maxLifeFlat: 0,
      movementSpeedPercent: 0,
      movementSpeedFlat: 0,
    };

    // --- Damage ---
    if (hasComponent(world, Damage, eid)) {
      const newDamage =
        baseDamage * (1 + entityMods.damagePercent) + entityMods.damageFlat;
      Damage.value[eid] = newDamage;
    }

    // --- MovementSpeed ---
    if (hasComponent(world, MovementSpeed, eid)) {
      const newSpeed =
        baseSpeed * (1 + entityMods.movementSpeedPercent) +
        entityMods.movementSpeedFlat;
      MovementSpeed.value[eid] = newSpeed;
    }

    // --- Life.max ---
    if (hasComponent(world, Life, eid)) {
      const newMax =
        baseMaxLife * (1 + entityMods.maxLifePercent) + entityMods.maxLifeFlat;

      const oldMax = Life.max[eid];

      // Only update if changed significantly
      if (Math.abs(newMax - oldMax) > MAX_LIFE_CHANGE_EPSILON) {
        // Scale Life.current proportionally
        if (oldMax > 0) {
          Life.current[eid] = Life.current[eid] * (newMax / oldMax);
        }
        Life.max[eid] = newMax;
      }
    }
  }
}

interface BuffModifiers {
  damagePercent: number;
  damageFlat: number;
  maxLifePercent: number;
  maxLifeFlat: number;
  movementSpeedPercent: number;
  movementSpeedFlat: number;
}

/**
 * Iterate all BuffInstance entities and aggregate modifiers by owner.
 */
function collectBuffModifiers(
  world: World,
): Map<number, BuffModifiers> {
  const map = new Map<number, BuffModifiers>();
  const instances = buffInstanceQuery(world);

  for (const instEid of instances) {
    const owner = BuffInstance.ownerEid[instEid];
    const buffCode = BuffInstance.buffId[instEid];
    const buffId = buffIdFromCode(buffCode);
    if (!buffId) continue;

    const def = BUFF_REGISTRY[buffId];
    if (!def) continue;

    let mods = map.get(owner);
    if (!mods) {
      mods = {
        damagePercent: 0,
        damageFlat: 0,
        maxLifePercent: 0,
        maxLifeFlat: 0,
        movementSpeedPercent: 0,
        movementSpeedFlat: 0,
      };
      map.set(owner, mods);
    }

    const value = def.magnitude;
    switch (def.stat) {
      case STAT_DAMAGE: {
        if (def.modifierType === 'percent') mods.damagePercent += value;
        else mods.damageFlat += value;
        break;
      }
      case STAT_MAX_LIFE: {
        if (def.modifierType === 'percent') mods.maxLifePercent += value;
        else mods.maxLifeFlat += value;
        break;
      }
      case STAT_MOVEMENT_SPEED: {
        if (def.modifierType === 'percent') mods.movementSpeedPercent += value;
        else mods.movementSpeedFlat += value;
        break;
      }
    }
  }

  return map;
}

// =========================================================================
// Slot read helper (mirrors the one in combat/combatSystem.ts)
// =========================================================================

function readSkillSlot(eid: number, slotIndex: number): number {
  switch (slotIndex) {
    case 0: return SkillSlot.skillId_0[eid];
    case 1: return SkillSlot.skillId_1[eid];
    case 2: return SkillSlot.skillId_2[eid];
    case 3: return SkillSlot.skillId_3[eid];
    default: return 0;
  }
}
