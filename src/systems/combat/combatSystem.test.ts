import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, hasComponent } from 'bitecs';
import type { World } from '@/core';
import { IntentType } from '@/shared';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from '@/systems/movement';
import { IsEnemy, EnemyType, EnemyTypeEnum, AIState, AIStateEnum, TargetEntity, AttackRange, AttackTimer, AttackCooldown } from '@/systems/ai';
import { combatSystem } from './combatSystem';
import {
  Life,
  Damage,
  SkillSlot,
  CooldownTimer,
  CooldownDuration,
  IsDead,
} from './components';
import { DEFAULT_SKILLS, DEFAULT_COMBAT_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Helpers — same pattern as AI system tests
// ---------------------------------------------------------------------------

/** Create a Character entity at the given position with combat components. */
function createCharacter(
  world: World,
  x: number,
  y: number,
  facingX = 1,
  facingY = 0,
  damageValue = 10,
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, MovementSpeed, eid);
  addComponent(world, FacingDirection, eid);
  addComponent(world, IsCharacter, eid);
  addComponent(world, Life, eid);
  addComponent(world, Damage, eid);
  addComponent(world, SkillSlot, eid);
  addComponent(world, CooldownTimer, eid);
  addComponent(world, CooldownDuration, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  MovementSpeed.value[eid] = 5;
  FacingDirection.x[eid] = facingX;
  FacingDirection.y[eid] = facingY;

  Life.current[eid] = 100;
  Life.max[eid] = 100;
  Damage.value[eid] = damageValue;

  // Assign basic_attack (code 1) to slot 0, rest empty
  SkillSlot.skillId_0[eid] = 1;   // basic_attack
  SkillSlot.skillId_1[eid] = 0;
  SkillSlot.skillId_2[eid] = 0;
  SkillSlot.skillId_3[eid] = 0;

  CooldownTimer.remaining_0[eid] = 0;
  CooldownTimer.remaining_1[eid] = 0;
  CooldownTimer.remaining_2[eid] = 0;
  CooldownTimer.remaining_3[eid] = 0;

  CooldownDuration.max_0[eid] = DEFAULT_SKILLS.basic_attack.cooldownSeconds;
  CooldownDuration.max_1[eid] = 0;
  CooldownDuration.max_2[eid] = 0;
  CooldownDuration.max_3[eid] = 0;

  return eid;
}

/** Create an enemy entity at the given position with full combat components. */
function createEnemy(
  world: World,
  targetEid: number,
  x: number,
  y: number,
  overrides?: {
    life?: number;
    damage?: number;
    state?: number;
    attackRange?: number;
    attackCooldown?: number;
    attackTimer?: number;
  },
): number {
  const eid = addEntity(world);

  // Movement components
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, MovementSpeed, eid);
  addComponent(world, FacingDirection, eid);

  // AI components
  addComponent(world, IsEnemy, eid);
  addComponent(world, EnemyType, eid);
  addComponent(world, AIState, eid);
  addComponent(world, TargetEntity, eid);
  addComponent(world, AttackRange, eid);
  addComponent(world, AttackTimer, eid);
  addComponent(world, AttackCooldown, eid);

  // Combat components
  addComponent(world, Life, eid);
  addComponent(world, Damage, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  MovementSpeed.value[eid] = 3;
  FacingDirection.x[eid] = 0;
  FacingDirection.y[eid] = 1;

  EnemyType.value[eid] = EnemyTypeEnum.Melee;
  AIState.value[eid] = overrides?.state ?? AIStateEnum.Idle;
  TargetEntity.eid[eid] = targetEid;
  AttackRange.value[eid] = overrides?.attackRange ?? DEFAULT_COMBAT_CONFIG.meleeRange;
  AttackTimer.value[eid] = overrides?.attackTimer ?? 0;
  AttackCooldown.value[eid] = overrides?.attackCooldown ?? 1.5;

  Life.current[eid] = overrides?.life ?? 50;
  Life.max[eid] = overrides?.life ?? 50;
  Damage.value[eid] = overrides?.damage ?? 10;

  return eid;
}

/** Set frame intents and delta time on the world for the system to read. */
function setFrameState(
  world: World,
  intents: Array<{ type: string; slotIndex?: number; direction?: { x: number; y: number } }>,
  deltaMs: number,
): void {
  (world as Record<string, unknown>)['__intents'] = intents;
  (world as Record<string, unknown>)['__deltaMs'] = deltaMs;
}

/** Convenience — create a USE_SKILL intent. */
function useSkillIntent(slotIndex: number): { type: string; slotIndex: number } {
  return { type: IntentType.UseSkill, slotIndex };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('combatSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  // =======================================================================
  // Character skill execution
  // =======================================================================

  it('Character uses basic_attack on nearest enemy in facing direction', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10); // facing right
    const enemy = createEnemy(world, char, 1.5, 0, { life: 50 }); // in front, within range

    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    // Damage = Damage.value * skill.damageMultiplier = 10 * 1.0 = 10
    expect(Life.current[enemy]).toBeCloseTo(40);
    // Cooldown should be started
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0.5);
  });

  it('Skill does nothing when on cooldown', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy = createEnemy(world, char, 1.5, 0, { life: 50 });

    // Set cooldown active
    CooldownTimer.remaining_0[char] = 0.3;

    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    // No damage should be dealt (cooldown blocked)
    expect(Life.current[enemy]).toBeCloseTo(50);
  });

  it('Cooldown counts down each frame', () => {
    const char = createCharacter(world, 0, 0, 1, 0);

    // Set cooldown active
    CooldownTimer.remaining_0[char] = 1.0;

    // Frame 1: 300ms
    setFrameState(world, [], 300);
    combatSystem(world);
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0.7);

    // Frame 2: 500ms
    setFrameState(world, [], 500);
    combatSystem(world);
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0.2);

    // Frame 3: 300ms → should clamp to 0
    setFrameState(world, [], 300);
    combatSystem(world);
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0);
  });

  it('Enemy in facing direction is targeted, enemy behind is NOT', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10); // facing right

    // Enemy in front (to the right)
    const enemyFront = createEnemy(world, char, 1.5, 0, { life: 50 });
    // Enemy behind (to the left)
    const enemyBehind = createEnemy(world, char, -1.5, 0, { life: 50 });

    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    // Enemy in front should take damage
    expect(Life.current[enemyFront]).toBeCloseTo(40);
    // Enemy behind should NOT take damage
    expect(Life.current[enemyBehind]).toBeCloseTo(50);
  });

  it('Multiple enemies: nearest one in facing direction is hit', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10); // facing right

    // Near enemy (closer)
    const enemyNear = createEnemy(world, char, 1.0, 0.1, { life: 30 });
    // Far enemy (further)
    const enemyFar = createEnemy(world, char, 2.0, 0.2, { life: 50 });

    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    // Near enemy takes damage (nearest in facing direction)
    expect(Life.current[enemyNear]).toBeCloseTo(20); // 30 - 10 = 20
    // Far enemy should NOT take damage
    expect(Life.current[enemyFar]).toBeCloseTo(50);
  });

  it('Enemy dies when life reaches 0 (IsDead added)', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 100); // high damage
    const enemy = createEnemy(world, char, 1.5, 0, { life: 50 });

    // Damage.value = 100, skill multiplier = 1.0 → 100 damage
    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    expect(Life.current[enemy]).toBeCloseTo(-50);
    expect(hasComponent(world, IsDead, enemy)).toBe(true);
  });

  it('Skill with no assignment (empty slot) does nothing', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy = createEnemy(world, char, 1.5, 0, { life: 50 });

    // Slot 1 is empty (skillId_1 = 0)
    setFrameState(world, [useSkillIntent(1)], 100);
    combatSystem(world);

    expect(Life.current[enemy]).toBeCloseTo(50);
  });

  it('Cooldown timer resets to CooldownDuration after use', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy = createEnemy(world, char, 1.5, 0, { life: 50 });

    // basic_attack has 0.5s cooldown
    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0.5);
  });

  it('Skill does nothing if no enemy is within melee range', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    // Enemy far away (outside melee range of 2.0)
    const enemy = createEnemy(world, char, 10, 0, { life: 50 });

    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    expect(Life.current[enemy]).toBeCloseTo(50);
    // Cooldown should NOT start (skill didn't fire)
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0);
  });

  // =======================================================================
  // Enemy auto-attack on Character
  // =======================================================================

  it('Character takes damage from enemy attacks', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    // Enemy in Attack state with timer just reset (simulating AI just set it)
    const enemy = createEnemy(world, char, 1.5, 0, {
      state: AIStateEnum.Attack,
      attackTimer: 1.5,  // equals AttackCooldown (just reset)
      attackCooldown: 1.5,
      damage: 8,
    });

    setFrameState(world, [], 100);
    combatSystem(world);

    // Character should take 8 damage
    expect(Life.current[char]).toBeCloseTo(92);
  });

  it('Character dies when Life reaches 0 (IsDead added)', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    // Set character life to 5 so a single hit kills
    Life.current[char] = 5;

    const enemy = createEnemy(world, char, 1.5, 0, {
      state: AIStateEnum.Attack,
      attackTimer: 1.5,
      attackCooldown: 1.5,
      damage: 10,
    });

    setFrameState(world, [], 100);
    combatSystem(world);

    expect(Life.current[char]).toBeCloseTo(-5);
    expect(hasComponent(world, IsDead, char)).toBe(true);
  });

  it('Enemy attack does NOT fire when AttackTimer is NOT at max', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy = createEnemy(world, char, 1.5, 0, {
      state: AIStateEnum.Attack,
      attackTimer: 1.0,  // not at max (1.5), so no attack this frame
      attackCooldown: 1.5,
      damage: 8,
    });

    setFrameState(world, [], 100);
    combatSystem(world);

    // Character should NOT take damage
    expect(Life.current[char]).toBeCloseTo(100);
  });

  it('Dead enemy does not attack', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy = createEnemy(world, char, 1.5, 0, {
      state: AIStateEnum.Attack,
      attackTimer: 1.5,
      attackCooldown: 1.5,
      damage: 8,
    });
    // Mark enemy as dead
    addComponent(world, IsDead, enemy);

    setFrameState(world, [], 100);
    combatSystem(world);

    // Character should NOT take damage from dead enemy
    expect(Life.current[char]).toBeCloseTo(100);
  });

  // =======================================================================
  // Edge cases
  // =======================================================================

  it('Character without skill components gracefully skips', () => {
    // Character without SkillSlot etc.
    const char = addEntity(world);
    addComponent(world, Position, char);
    addComponent(world, FacingDirection, char);
    addComponent(world, IsCharacter, char);
    addComponent(world, Life, char);
    addComponent(world, Damage, char);
    Position.x[char] = 0;
    Position.y[char] = 0;
    FacingDirection.x[char] = 1;
    FacingDirection.y[char] = 0;
    Life.current[char] = 100;
    Damage.value[char] = 10;

    const enemy = createEnemy(world, char, 1.5, 0, { life: 50 });

    // Should not crash — just a no-op
    setFrameState(world, [useSkillIntent(0)], 100);
    expect(() => combatSystem(world)).not.toThrow();
    expect(Life.current[enemy]).toBeCloseTo(50);
  });

  it('Enemy outside facing cone does not get hit even if in range', () => {
    const char = createCharacter(world, 0, 0, 0, 1, 10); // facing DOWN

    // Enemy to the right (facing direction dot product with (1,0) = 0 ≤ 0.5)
    const enemyRight = createEnemy(world, char, 1.5, 0, { life: 50 });
    // Enemy below (facing direction dot product with (0,1) = 1 > 0.5)
    const enemyDown = createEnemy(world, char, 0, 1.5, { life: 50 });

    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);

    // Enemy to the right should NOT be hit (outside facing cone)
    expect(Life.current[enemyRight]).toBeCloseTo(50);
    // Enemy below should be hit
    expect(Life.current[enemyDown]).toBeCloseTo(40);
  });

  it('Character can damage multiple enemies across separate frames', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy1 = createEnemy(world, char, 1.5, 0, { life: 30 });
    const enemy2 = createEnemy(world, char, 1.8, 0, { life: 30 });

    // Frame 1: hit enemy1 (closest)
    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);
    expect(Life.current[enemy1]).toBeCloseTo(20);
    expect(Life.current[enemy2]).toBeCloseTo(30);

    // Move enemy1 away so enemy2 becomes the closest
    Position.x[enemy1] = 10;
    // Reset cooldown manually (we're testing targeting, not timing)
    CooldownTimer.remaining_0[char] = 0;

    // Frame 2: hit enemy2
    setFrameState(world, [useSkillIntent(0)], 100);
    combatSystem(world);
    expect(Life.current[enemy1]).toBeCloseTo(20); // unchanged
    expect(Life.current[enemy2]).toBeCloseTo(20); // now hit
  });

  it('Multiple frame intents with different slots are handled correctly', () => {
    const char = createCharacter(world, 0, 0, 1, 0, 10);
    const enemy = createEnemy(world, char, 1.5, 0, { life: 100 });

    // Assign cleave to slot 1
    SkillSlot.skillId_1[char] = 2; // cleave
    CooldownDuration.max_1[char] = DEFAULT_SKILLS.cleave.cooldownSeconds;

    // Process both intents in the same frame
    setFrameState(world, [useSkillIntent(0), useSkillIntent(1)], 100);
    combatSystem(world);

    // basic_attack (slot 0): 10 * 1.0 = 10
    // cleave (slot 1): 10 * 1.5 = 15
    // Total: 25 damage
    expect(Life.current[enemy]).toBeCloseTo(75);
    // Both cooldowns should be active
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0.5);  // basic_attack: 0.5s
    expect(CooldownTimer.remaining_1[char]).toBeCloseTo(1.5);  // cleave: 1.5s
  });

  it('Keeps cooldown at 0 when no skill is used', () => {
    const char = createCharacter(world, 0, 0, 1, 0);

    // No intents at all
    setFrameState(world, [], 100);
    combatSystem(world);
    expect(CooldownTimer.remaining_0[char]).toBeCloseTo(0);
    expect(CooldownTimer.remaining_1[char]).toBeCloseTo(0);
    expect(CooldownTimer.remaining_2[char]).toBeCloseTo(0);
    expect(CooldownTimer.remaining_3[char]).toBeCloseTo(0);
  });
});
