import { defineQuery } from 'bitecs';
import type { World } from '@/core';
import { getFrameIntents, getDeltaTime } from '@/core';
import { IntentType } from '@/shared';
import type { MoveDirectionIntent } from '@/shared';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from './components';

/** Query for the player Character (receives input → velocity translation). */
const characterQuery = defineQuery([Position, Velocity, MovementSpeed, FacingDirection, IsCharacter]);

/** Query for any entity that has a position and velocity (movable by any system). */
const movableQuery = defineQuery([Position, Velocity]);

export function movementSystem(world: World): void {
  const intents = getFrameIntents(world);
  const dt = getDeltaTime(world) / 1000; // Convert ms to seconds

  // 1. Handle Character input — translate MOVE_DIRECTION intents to velocity
  let moveDir: MoveDirectionIntent | null = null;
  for (const intent of intents) {
    if (intent.type === IntentType.MoveDirection) {
      moveDir = intent;
      break;
    }
  }

  const chars = characterQuery(world);
  for (const eid of chars) {
    const speed = MovementSpeed.value[eid];

    if (moveDir) {
      // Apply movement from input
      Velocity.x[eid] = moveDir.direction.x * speed;
      Velocity.y[eid] = moveDir.direction.y * speed;

      // Update facing direction
      FacingDirection.x[eid] = moveDir.direction.x;
      FacingDirection.y[eid] = moveDir.direction.y;
    } else {
      // No input — stop
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    }
  }

  // 2. Integrate position for ALL movable entities (Character, enemies, NPCs, …)
  const movables = movableQuery(world);
  for (const eid of movables) {
    Position.x[eid] += Velocity.x[eid] * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }
}
