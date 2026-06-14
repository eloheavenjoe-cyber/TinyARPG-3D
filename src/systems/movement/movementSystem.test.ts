import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import type { World } from '@/core';
import { IntentType } from '@/shared';
import type { MoveDirectionIntent } from '@/shared';
import { movementSystem } from './movementSystem';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from './components';

function createCharacter(world: World, speed: number, startX = 0, startY = 0): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, MovementSpeed, eid);
  addComponent(world, FacingDirection, eid);
  addComponent(world, IsCharacter, eid);

  Position.x[eid] = startX;
  Position.y[eid] = startY;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  MovementSpeed.value[eid] = speed;
  FacingDirection.x[eid] = 1; // default face right
  FacingDirection.y[eid] = 0;

  return eid;
}

function setFrameInput(world: World, intents: MoveDirectionIntent[], deltaMs: number): void {
  (world as Record<string, unknown>)['__intents'] = intents;
  (world as Record<string, unknown>)['__deltaMs'] = deltaMs;
}

describe('movementSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('moves the Character right when MOVE_DIRECTION (1,0) is given', () => {
    const eid = createCharacter(world, 5);
    setFrameInput(world, [
      { type: IntentType.MoveDirection, direction: { x: 1, y: 0 } },
    ], 1000); // 1 second

    movementSystem(world);

    // Position should advance by speed * dt = 5 * 1 = 5 units
    expect(Position.x[eid]).toBeCloseTo(5);
    expect(Position.y[eid]).toBeCloseTo(0);

    // Velocity should be set to direction * speed
    expect(Velocity.x[eid]).toBeCloseTo(5);
    expect(Velocity.y[eid]).toBeCloseTo(0);

    // Facing should update to movement direction
    expect(FacingDirection.x[eid]).toBeCloseTo(1);
    expect(FacingDirection.y[eid]).toBeCloseTo(0);
  });

  it('moves the Character diagonally with fractional delta', () => {
    const eid = createCharacter(world, 3);
    const dir = 1 / Math.sqrt(2); // normalized diagonal
    setFrameInput(world, [
      { type: IntentType.MoveDirection, direction: { x: dir, y: dir } },
    ], 500); // 0.5 second

    movementSystem(world);

    const expectedDelta = 3 * dir * 0.5;
    expect(Position.x[eid]).toBeCloseTo(expectedDelta, 5);
    expect(Position.y[eid]).toBeCloseTo(expectedDelta, 5);
    expect(FacingDirection.x[eid]).toBeCloseTo(dir, 5);
    expect(FacingDirection.y[eid]).toBeCloseTo(dir, 5);
  });

  it('stops the Character when no MOVE_DIRECTION intent exists', () => {
    const eid = createCharacter(world, 5, 10, 10);
    // Give velocity from a previous frame
    Velocity.x[eid] = 5;
    Velocity.y[eid] = 0;

    setFrameInput(world, [], 1000);

    movementSystem(world);

    // Position should NOT change (velocity is zeroed first, then integrated)
    expect(Position.x[eid]).toBeCloseTo(10);
    expect(Position.y[eid]).toBeCloseTo(10);

    // Velocity should be zeroed
    expect(Velocity.x[eid]).toBeCloseTo(0);
    expect(Velocity.y[eid]).toBeCloseTo(0);
  });

  it('moves non-Character entities that have a pre-set velocity', () => {
    const charEid = createCharacter(world, 5, 0, 0);

    // Create a non-character entity with a non-zero velocity
    const npcEid = addEntity(world);
    addComponent(world, Position, npcEid);
    addComponent(world, Velocity, npcEid);
    addComponent(world, MovementSpeed, npcEid);
    addComponent(world, FacingDirection, npcEid);
    Position.x[npcEid] = 100;
    Position.y[npcEid] = 100;
    Velocity.x[npcEid] = 3;  // pre-set velocity (e.g. from AI system)
    Velocity.y[npcEid] = 0;
    MovementSpeed.value[npcEid] = 10;

    setFrameInput(world, [
      { type: IntentType.MoveDirection, direction: { x: 1, y: 0 } },
    ], 1000);

    movementSystem(world);

    // Character moved via input
    expect(Position.x[charEid]).toBeCloseTo(5);
    // Non-character moves because it has Position+Velocity (movableQuery)
    expect(Position.x[npcEid]).toBeCloseTo(103);
    expect(Position.y[npcEid]).toBeCloseTo(100);
  });

  it('does not move entities that have Position but no Velocity', () => {
    const eid = addEntity(world);
    addComponent(world, Position, eid);
    Position.x[eid] = 50;
    Position.y[eid] = 50;
    // No Velocity component → not in movableQuery

    setFrameInput(world, [
      { type: IntentType.MoveDirection, direction: { x: 1, y: 0 } },
    ], 1000);

    movementSystem(world);

    expect(Position.x[eid]).toBeCloseTo(50);
    expect(Position.y[eid]).toBeCloseTo(50);
  });

  it('updates facing direction only when moving', () => {
    const eid = createCharacter(world, 5, 0, 0);
    FacingDirection.x[eid] = 1;
    FacingDirection.y[eid] = 0;

    // No movement — facing should stay
    setFrameInput(world, [], 1000);
    movementSystem(world);

    expect(FacingDirection.x[eid]).toBeCloseTo(1);
    expect(FacingDirection.y[eid]).toBeCloseTo(0);
  });

  it('accumulates position across multiple frames', () => {
    const eid = createCharacter(world, 4);
    const intent: MoveDirectionIntent = {
      type: IntentType.MoveDirection,
      direction: { x: 1, y: 0 },
    };

    // Frame 1: 500ms
    setFrameInput(world, [intent], 500);
    movementSystem(world);
    expect(Position.x[eid]).toBeCloseTo(2); // 4 * 0.5 = 2

    // Frame 2: 300ms
    setFrameInput(world, [intent], 300);
    movementSystem(world);
    expect(Position.x[eid]).toBeCloseTo(2 + 4 * 0.3); // 2 + 1.2 = 3.2

    // Frame 3: 200ms, no input → stop
    setFrameInput(world, [], 200);
    movementSystem(world);
    expect(Position.x[eid]).toBeCloseTo(3.2); // no movement
  });
});
