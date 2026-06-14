import { defineQuery, hasComponent, addComponent, addEntity } from 'bitecs';
import type { World } from '@/core';
import { getDeltaTime } from '@/core';
import { BossPhase } from '@/shared';
import {
  Position,
  FacingDirection,
  MovementSpeed,
  IsCharacter,
} from '@/systems/movement';
import {
  IsEnemy,
  AIState,
  AIStateEnum,
  TargetEntity,
  AttackRange,
  AttackTimer,
  AttackCooldown,
} from '@/systems/ai';
import {
  Life,
  Damage,
  IsDead,
} from '@/systems/combat';
import {
  DamageNumberEmitter,
  TelegraphEmitter,
} from '@/systems/render';
import {
  IsBoss,
  BossState,
} from './components';
import {
  DEFAULT_BOSS_CONFIG,
  TELEGRAPH_SHAPES,
} from './types';
import type { BossConfig, BossAttackPattern, BossPhaseConfig } from './types';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All boss entities with their runtime state. */
const bossQuery = defineQuery([
  IsBoss,
  BossState,
  Position,
  FacingDirection,
  Life,
  Damage,
  TargetEntity,
  MovementSpeed,
]);

/** The player Character entity. */
const characterQuery = defineQuery([
  Position,
  Life,
  IsCharacter,
]);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const config: BossConfig = DEFAULT_BOSS_CONFIG;

// ---------------------------------------------------------------------------
// Helpers — shape-based damage area checks
// ---------------------------------------------------------------------------

/**
 * Check whether a point (px, py) is within a circle centred at (cx, cy)
 * with the given `radius`.
 */
function isInsideCircle(
  cx: number, cy: number,
  px: number, py: number,
  radius: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check whether a point (px, py) is within a cone emanating from (ox, oy)
 * in the direction (fx, fy), with the given `radius` and `coneAngle` (full
 * sweep in radians). The cone is centred on the facing direction.
 */
function isInsideCone(
  ox: number, oy: number,
  fx: number, fy: number,
  px: number, py: number,
  radius: number,
  coneAngle: number,
): boolean {
  const dx = px - ox;
  const dy = py - oy;
  const distSq = dx * dx + dy * dy;

  // Must be within range
  if (distSq > radius * radius || distSq === 0) return false;

  const dist = Math.sqrt(distSq);
  const dot = (dx / dist) * fx + (dy / dist) * fy;

  // The cone is centred on the facing direction; check the angle
  return dot >= Math.cos(coneAngle / 2);
}

/**
 * Check whether a point (px, py) is within a line / rectangle in front of
 * (ox, oy) along direction (fx, fy). The rectangle extends `length` units
 * forward and has a half-width of 1 unit.
 */
function isInsideLine(
  ox: number, oy: number,
  fx: number, fy: number,
  px: number, py: number,
  length: number,
): boolean {
  const dx = px - ox;
  const dy = py - oy;
  const distSq = dx * dx + dy * dy;

  // Must be within range
  if (distSq > length * length || distSq === 0) return false;

  const dist = Math.sqrt(distSq);
  const dot = (dx / dist) * fx + (dy / dist) * fy;

  // Must be in front of the origin
  if (dot <= 0) return false;

  // Must be within half-width (1 unit) of the direction line
  const perpDot = (dx / dist) * (-fy) + (dy / dist) * fx;
  return Math.abs(perpDot) <= 1.0;
}

/**
 * Return true if the character at (cx, cy) is within the damage area of the
 * given attack pattern originating from the boss.
 */
function isCharacterHitByAttack(
  attackPattern: BossAttackPattern,
  bossX: number, bossY: number,
  facingX: number, facingY: number,
  charX: number, charY: number,
): boolean {
  const shapeInfo = TELEGRAPH_SHAPES[attackPattern];

  switch (attackPattern) {
    case 'melee_slam':
      return isInsideCircle(bossX, bossY, charX, charY, shapeInfo.radius);
    case 'cleave_cone':
      return isInsideCone(
        bossX, bossY,
        facingX, facingY,
        charX, charY,
        shapeInfo.radius,
        shapeInfo.angle,
      );
    case 'charge_line':
      return isInsideLine(bossX, bossY, facingX, facingY, charX, charY, shapeInfo.radius);
    case 'aoe_circle':
      // aoe is centred on the character (telegraph placed at their feet)
      return isInsideCircle(charX, charY, charX, charY, shapeInfo.radius);
    case 'summon_adds':
      // summon_adds does not directly damage; handled elsewhere
      return false;
    default:
      return false;
  }
}

/**
 * Pick a random element from the given array.
 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Boss System
// ---------------------------------------------------------------------------

/**
 * bossSystem — manages boss phase transitions, attack patterns, telegraphs,
 * enrage timers, and damage resolution.
 *
 * Runs after the AI system, before the combat system.
 *
 * Per-frame for each living boss entity:
 *  1. Phase check — advances to the next phase when a life threshold is crossed.
 *  2. Enrage timer tick — when expired, multiplies damage & speed.
 *  3. Telegraph resolution — when the telegraph timer expires, applies damage
 *     to the Character if they are within the attack area.
 *  4. Attack timer tick — when ready, picks a random attack from the current
 *     phase and spawns a TelegraphEmitter at the target position.
 */
export function bossSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // Convert ms → seconds
  const bosses = bossQuery(world);
  const chars = characterQuery(world);

  // Bail early if no bosses or no character
  if (bosses.length === 0 || chars.length === 0) return;

  const charEid = chars[0];
  const charX = Position.x[charEid];
  const charY = Position.y[charEid];

  for (const eid of bosses) {
    // -----------------------------------------------------------------------
    // 0. Skip dead bosses
    // -----------------------------------------------------------------------
    if (hasComponent(world, IsDead, eid)) continue;

    const lifeRatio = Life.current[eid] / Life.max[eid];
    const bossX = Position.x[eid];
    const bossY = Position.y[eid];
    const facingX = FacingDirection.x[eid];
    const facingY = FacingDirection.y[eid];

    // -----------------------------------------------------------------------
    // 1. Phase check — advance if life threshold crossed
    // -----------------------------------------------------------------------
    const currentPhaseValue = BossState.currentPhase[eid];
    let newPhaseValue = currentPhaseValue;

    // Check phases in descending trigger-threshold order (highest first)
    for (const phaseCfg of config.phases) {
      if (lifeRatio <= phaseCfg.triggerThreshold) {
        const phaseNum = phaseCfg.phase as number;
        if (phaseNum > currentPhaseValue) {
          newPhaseValue = phaseNum;
        }
      }
    }

    if (newPhaseValue > currentPhaseValue) {
      BossState.currentPhase[eid] = newPhaseValue;

      if (import.meta.env.DEV) {
        console.log(
          `[Boss] ${config.name} eid=${eid} advanced to phase ${newPhaseValue} ` +
          `(life: ${Life.current[eid].toFixed(1)} / ${Life.max[eid].toFixed(1)})`,
        );
      }
    }

    // Resolve the active phase config
    const activePhaseCfg = config.phases.find(
      (p) => (p.phase as number) === BossState.currentPhase[eid],
    ) ?? config.phases[config.phases.length - 1];

    // -----------------------------------------------------------------------
    // 2. Enrage timer
    // -----------------------------------------------------------------------
    const enrageRemaining = BossState.enrageTimer[eid] - dt;
    BossState.enrageTimer[eid] = Math.max(0, enrageRemaining);

    if (BossState.enrageTimer[eid] <= 0 && BossState.isEnraged[eid] === 0) {
      BossState.isEnraged[eid] = 1;

      // Multiply base damage
      Damage.value[eid] *= config.enrageDamageMultiplier;

      // Multiply movement speed
      MovementSpeed.value[eid] *= config.enrageSpeedMultiplier;

      if (import.meta.env.DEV) {
        console.log(
          `[Boss] ${config.name} eid=${eid} is ENRAGED! ` +
          `Damage x${config.enrageDamageMultiplier}, Speed x${config.enrageSpeedMultiplier}`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // 3. Telegraph resolution — damage application when telegraph expires
    // -----------------------------------------------------------------------
    const prevTelegraphTimer = BossState.telegraphTimer[eid];
    const newTelegraphTimer = Math.max(0, BossState.telegraphTimer[eid] - dt);
    BossState.telegraphTimer[eid] = newTelegraphTimer;

    const telegraphJustExpired = prevTelegraphTimer > 0 && newTelegraphTimer <= 0;

    if (telegraphJustExpired) {
      const attackIdx = BossState.currentAttack[eid];
      const attackPattern = activePhaseCfg.attacks[attackIdx];

      if (attackPattern && attackPattern !== 'summon_adds') {
        const isHit = isCharacterHitByAttack(
          attackPattern,
          bossX, bossY,
          facingX, facingY,
          charX, charY,
        );

        if (isHit) {
          const rawDamage =
            Damage.value[eid] * activePhaseCfg.damageMultiplier;

          // Apply damage to the Character
          Life.current[charEid] = Math.max(0, Life.current[charEid] - rawDamage);

          // Spawn a DamageNumberEmitter on the Character
          if (!hasComponent(world, DamageNumberEmitter, charEid)) {
            addComponent(world, DamageNumberEmitter, charEid);
          }
          DamageNumberEmitter.value[charEid] = rawDamage;
          DamageNumberEmitter.lifetime[charEid] = 1.0;

          // Check for character death
          if (Life.current[charEid] <= 0) {
            if (!hasComponent(world, IsDead, charEid)) {
              addComponent(world, IsDead, charEid);
            }
          }

          if (import.meta.env.DEV) {
            console.log(
              `[Boss] ${config.name} eid=${eid} ${attackPattern} hits ` +
              `Character ${charEid} for ${rawDamage.toFixed(1)} damage`,
            );
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. Attack timer — pick and telegraph next attack
    // -----------------------------------------------------------------------
    const prevAttackTimer = BossState.attackTimer[eid];
    const newAttackTimer = Math.max(0, BossState.attackTimer[eid] - dt);
    BossState.attackTimer[eid] = newAttackTimer;

    // Only start a new attack if no telegraph is currently active
    const noActiveTelegraph = BossState.telegraphTimer[eid] <= 0;

    if (newAttackTimer <= 0 && prevAttackTimer > 0 && noActiveTelegraph) {
      // Pick a random attack from the current phase's pool
      const attackPool = activePhaseCfg.attacks;
      const chosenIdx = attackPool.indexOf(pickRandom(attackPool));
      BossState.currentAttack[eid] = chosenIdx;

      const attackPattern = attackPool[chosenIdx];
      const shapeInfo = TELEGRAPH_SHAPES[attackPattern];

      // Determine telegraph position
      let telegraphX = bossX;
      let telegraphY = bossY;

      // AOE circles target the character's current position
      if (attackPattern === 'aoe_circle' || attackPattern === 'summon_adds') {
        telegraphX = charX;
        telegraphY = charY;
      }

      // Spawn a TelegraphEmitter entity
      const telegraphEid = addEntity(world);
      addComponent(world, Position, telegraphEid);
      addComponent(world, TelegraphEmitter, telegraphEid);

      Position.x[telegraphEid] = telegraphX;
      Position.y[telegraphEid] = telegraphY;
      TelegraphEmitter.shape[telegraphEid] = shapeInfo.shape;
      TelegraphEmitter.radius[telegraphEid] = shapeInfo.radius;
      TelegraphEmitter.angle[telegraphEid] = shapeInfo.angle;
      TelegraphEmitter.lifetime[telegraphEid] = config.telegraphDuration;

      // Store telegraph target for damage resolution
      BossState.telegraphTargetX[eid] = telegraphX;
      BossState.telegraphTargetY[eid] = telegraphY;

      // Set telegraph timer — damage resolves when this expires
      BossState.telegraphTimer[eid] = config.telegraphDuration;

      // Reset attack timer
      BossState.attackTimer[eid] = activePhaseCfg.attackInterval;

      if (import.meta.env.DEV) {
        console.log(
          `[Boss] ${config.name} eid=${eid} telegraphs ${attackPattern} ` +
          `at (${telegraphX.toFixed(2)}, ${telegraphY.toFixed(2)}) ` +
          `— resolves in ${config.telegraphDuration}s`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // 5. Death detection — guaranteed drop
    // -----------------------------------------------------------------------
    if (hasComponent(world, IsDead, eid)) {
      if (import.meta.env.DEV) {
        console.log(
          `[Boss] ${config.name} eid=${eid} defeated! (guaranteed Rare loot)`,
        );
      }
    }
  }
}
