import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import type { World } from '@/core';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from '@/systems/movement';
import { aiSystem } from './aiSystem';
import {
  IsEnemy,
  EnemyType,
  EnemyTypeEnum,
  AIState,
  AIStateEnum,
  TargetEntity,
  AttackRange,
  AttackTimer,
  AttackCooldown,
  IsElite,
} from './components';
import { DEFAULT_AI_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Character entity at the given position. */
function createCharacter(world: World, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, MovementSpeed, eid);
  addComponent(world, FacingDirection, eid);
  addComponent(world, IsCharacter, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  MovementSpeed.value[eid] = 5;
  FacingDirection.x[eid] = 1;
  FacingDirection.y[eid] = 0;

  return eid;
}

/** Create an enemy entity targeting the given character, at the given position. */
function createEnemy(
  world: World,
  targetEid: number,
  x: number,
  y: number,
  overrides?: {
    state?: number;
    attackRange?: number;
    attackCooldown?: number;
    attackTimer?: number;
    speed?: number;
    enemyType?: number;
  },
): number {
  const eid = addEntity(world);

  // Core movement components
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

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  MovementSpeed.value[eid] = overrides?.speed ?? DEFAULT_AI_CONFIG.chaseSpeed;
  FacingDirection.x[eid] = 0;
  FacingDirection.y[eid] = 1;

  EnemyType.value[eid] = overrides?.enemyType ?? EnemyTypeEnum.Melee;
  AIState.value[eid] = overrides?.state ?? AIStateEnum.Idle;
  TargetEntity.eid[eid] = targetEid;
  AttackRange.value[eid] = overrides?.attackRange ?? DEFAULT_AI_CONFIG.meleeRange;
  AttackTimer.value[eid] = overrides?.attackTimer ?? 0;
  AttackCooldown.value[eid] = overrides?.attackCooldown ?? 1.5;

  return eid;
}

/** Set the frame delta time on the world (the only input the AI system uses). */
function setFrameDelta(world: World, deltaMs: number): void {
  (world as Record<string, unknown>)['__deltaMs'] = deltaMs;
}

/** Distance between two entities (pythagorean). */
function distance(world: World, a: number, b: number): number {
  const dx = Position.x[b] - Position.x[a];
  const dy = Position.y[b] - Position.y[a];
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('aiSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('transitions from Idle to Chase when Character is within aggro radius', () => {
    const char = createCharacter(world, 0, 0);
    // Enemy at (5, 0) — within aggro radius (8) but outside melee range (1.5)
    const enemy = createEnemy(world, char, 5, 0);

    setFrameDelta(world, 100);
    aiSystem(world);

    expect(AIState.value[enemy]).toBe(AIStateEnum.Chase);
  });

  it('does NOT aggro when Character is outside aggro radius', () => {
    const char = createCharacter(world, 0, 0);
    // Enemy at (10, 0) — outside aggro radius (8)
    const enemy = createEnemy(world, char, 10, 0);

    setFrameDelta(world, 100);
    aiSystem(world);

    expect(AIState.value[enemy]).toBe(AIStateEnum.Idle);
  });

  it('transitions from Chase to Attack when within attack range', () => {
    const char = createCharacter(world, 0, 0);
    // Enemy at (5, 0) — within aggro radius, but not yet in attack range (1.5)
    const enemy = createEnemy(world, char, 5, 0, { state: AIStateEnum.Chase, attackRange: 1.5 });

    setFrameDelta(world, 100);
    aiSystem(world);

    // Outside attack range → stays in Chase
    expect(AIState.value[enemy]).toBe(AIStateEnum.Chase);

    // Move character closer so distance ≤ attack range (1.5)
    Position.x[char] = 3.6;
    Position.y[char] = 0; // distance now 1.4

    setFrameDelta(world, 100);
    aiSystem(world);

    expect(AIState.value[enemy]).toBe(AIStateEnum.Attack);
  });

  it('stays in Attack while target is in range', () => {
    const char = createCharacter(world, 1, 0);
    const enemy = createEnemy(world, char, 0, 0, {
      state: AIStateEnum.Attack,
      attackRange: 2,
      attackCooldown: 1.5,
      attackTimer: 1.0,
    });

    // Distance = 1, within range 2
    setFrameDelta(world, 100);
    aiSystem(world);

    expect(AIState.value[enemy]).toBe(AIStateEnum.Attack);
  });

  it('transitions back to Chase when target moves out of attack range', () => {
    const char = createCharacter(world, 5, 0);
    const enemy = createEnemy(world, char, 0, 0, {
      state: AIStateEnum.Attack,
      attackRange: 2,
    });

    // Distance = 5, outside attack range → back to Chase
    setFrameDelta(world, 100);
    aiSystem(world);

    expect(AIState.value[enemy]).toBe(AIStateEnum.Chase);
  });

  it('counts down AttackTimer each frame', () => {
    const char = createCharacter(world, 1, 0);
    const enemy = createEnemy(world, char, 0, 0, {
      state: AIStateEnum.Attack,
      attackRange: 2,
      attackCooldown: 1.5,
      attackTimer: 1.0,
    });

    // Frame 1: 200ms
    setFrameDelta(world, 200);
    aiSystem(world);
    expect(AttackTimer.value[enemy]).toBeCloseTo(0.8);

    // Frame 2: 500ms
    setFrameDelta(world, 500);
    aiSystem(world);
    expect(AttackTimer.value[enemy]).toBeCloseTo(0.3);
  });

  it('resets AttackTimer to AttackCooldown when it reaches 0', () => {
    const char = createCharacter(world, 1, 0);
    const enemy = createEnemy(world, char, 0, 0, {
      state: AIStateEnum.Attack,
      attackRange: 2,
      attackCooldown: 1.5,
      attackTimer: 0.3,
    });

    // Frame: 400ms → timer goes from 0.3 to -0.1 → should reset to cooldown (1.5)
    setFrameDelta(world, 400);
    aiSystem(world);

    expect(AttackTimer.value[enemy]).toBeCloseTo(1.5);
  });

  it('melee enemies have shorter attack range than ranged enemies', () => {
    // This test verifies the constants are different
    const char = createCharacter(world, 0, 0);

    // Melee at (2, 0) with default melee range (1.5)
    const meleeEnemy = createEnemy(world, char, 2, 0, {
      state: AIStateEnum.Chase,
      attackRange: DEFAULT_AI_CONFIG.meleeRange,
    });

    // Ranged at (2, 0) with default ranged range (5)
    const rangedEnemy = createEntity(world);
    addComponent(world, Position, rangedEnemy);
    addComponent(world, Velocity, rangedEnemy);
    addComponent(world, MovementSpeed, rangedEnemy);
    addComponent(world, FacingDirection, rangedEnemy);
    addComponent(world, IsEnemy, rangedEnemy);
    addComponent(world, EnemyType, rangedEnemy);
    addComponent(world, AIState, rangedEnemy);
    addComponent(world, TargetEntity, rangedEnemy);
    addComponent(world, AttackRange, rangedEnemy);
    addComponent(world, AttackTimer, rangedEnemy);
    addComponent(world, AttackCooldown, rangedEnemy);

    Position.x[rangedEnemy] = 2;
    Position.y[rangedEnemy] = 0;
    Velocity.x[rangedEnemy] = 0;
    Velocity.y[rangedEnemy] = 0;
    MovementSpeed.value[rangedEnemy] = DEFAULT_AI_CONFIG.chaseSpeed;
    FacingDirection.x[rangedEnemy] = 0;
    FacingDirection.y[rangedEnemy] = 1;
    EnemyType.value[rangedEnemy] = EnemyTypeEnum.Ranged;
    AIState.value[rangedEnemy] = AIStateEnum.Chase;
    TargetEntity.eid[rangedEnemy] = char;
    AttackRange.value[rangedEnemy] = DEFAULT_AI_CONFIG.rangedRange;
    AttackTimer.value[rangedEnemy] = 0;
    AttackCooldown.value[rangedEnemy] = 1.5;

    // Distance = 2
    // Melee range = 1.5 → distance > melee range → stays Chase
    // Ranged range = 5 → distance ≤ ranged range → transitions to Attack
    setFrameDelta(world, 100);
    aiSystem(world);

    expect(AIState.value[meleeEnemy]).toBe(AIStateEnum.Chase);
    expect(AIState.value[rangedEnemy]).toBe(AIStateEnum.Attack);
  });

  it('spawning multiple enemies — each independently tracks its target', () => {
    const char = createCharacter(world, 0, 0);

    // Enemy 1: at (3, 0) — distance 3, within aggro, outside melee range
    const e1 = createEnemy(world, char, 3, 0, { state: AIStateEnum.Idle, attackRange: 1.5 });
    // Enemy 2: at (20, 0) — distance 20, outside aggro radius (8)
    const e2 = createEnemy(world, char, 20, 0, { state: AIStateEnum.Idle, attackRange: 1.5 });
    // Enemy 3: at (1, 0) — distance 1, within aggro AND within attack range
    // Start in Chase so it transitions to Attack on the first frame
    const e3 = createEnemy(world, char, 1, 0, { state: AIStateEnum.Chase, attackRange: 1.5 });

    setFrameDelta(world, 100);
    aiSystem(world);

    // Enemy 1 should be in Chase (within aggro, outside attack range)
    expect(AIState.value[e1]).toBe(AIStateEnum.Chase);
    // Enemy 2 should still be Idle (outside aggro)
    expect(AIState.value[e2]).toBe(AIStateEnum.Idle);
    // Enemy 3 should be in Attack (started in Chase, within attack range)
    expect(AIState.value[e3]).toBe(AIStateEnum.Attack);

    // Move character away from e1, toward e2
    Position.x[char] = 15;
    Position.y[char] = 0;

    setFrameDelta(world, 100);
    aiSystem(world);

    // Enemy 1 distance = 12 → outside aggro, but stays in Chase (no leash transition yet)
    expect(AIState.value[e1]).toBe(AIStateEnum.Chase);
    // Enemy 2 distance = 5 → within aggro → should transition to Chase (it was Idle)
    expect(AIState.value[e2]).toBe(AIStateEnum.Chase);
    // Enemy 3 distance = 14 → outside attack range → should go to Chase (from Attack)
    expect(AIState.value[e3]).toBe(AIStateEnum.Chase);
  });

  it('non-enemy entities are ignored (no IsEnemy component)', () => {
    const char = createCharacter(world, 0, 0);

    // Create an entity that looks like an enemy but lacks IsEnemy
    const notEnemy = addEntity(world);
    addComponent(world, Position, notEnemy);
    addComponent(world, Velocity, notEnemy);
    addComponent(world, MovementSpeed, notEnemy);
    addComponent(world, FacingDirection, notEnemy);
    addComponent(world, AIState, notEnemy);
    addComponent(world, TargetEntity, notEnemy);
    addComponent(world, AttackRange, notEnemy);
    addComponent(world, AttackTimer, notEnemy);
    addComponent(world, AttackCooldown, notEnemy);

    Position.x[notEnemy] = 3;
    Position.y[notEnemy] = 0;
    Velocity.x[notEnemy] = 0;
    Velocity.y[notEnemy] = 0;
    MovementSpeed.value[notEnemy] = DEFAULT_AI_CONFIG.chaseSpeed;
    FacingDirection.x[notEnemy] = 0;
    FacingDirection.y[notEnemy] = 1;
    AIState.value[notEnemy] = AIStateEnum.Idle;
    TargetEntity.eid[notEnemy] = char;
    AttackRange.value[notEnemy] = DEFAULT_AI_CONFIG.meleeRange;
    AttackTimer.value[notEnemy] = 0;
    AttackCooldown.value[notEnemy] = 1.5;

    // Run AI system
    setFrameDelta(world, 100);
    aiSystem(world);

    // Entity without IsEnemy should remain Idle (not processed)
    expect(AIState.value[notEnemy]).toBe(AIStateEnum.Idle);
    // Velocity should remain 0 (AI didn't touch it)
    expect(Velocity.x[notEnemy]).toBe(0);
    expect(Velocity.y[notEnemy]).toBe(0);
  });
});

/** Helper to create an entity with minimal boilerplate. */
function createEntity(world: World): number {
  return addEntity(world);
}
