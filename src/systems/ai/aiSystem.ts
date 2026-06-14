import { defineQuery, hasComponent } from 'bitecs';
import type { World } from '@/core';
import { getDeltaTime } from '@/core';
import { Position, Velocity, MovementSpeed, FacingDirection } from '@/systems/movement';
import {
  IsEnemy,
  AIState,
  AIStateEnum,
  TargetEntity,
  AttackRange,
  AttackTimer,
  AttackCooldown,
} from './components';
import { DEFAULT_AI_CONFIG } from './types';

/**
 * Query for all enemy entities that the AI system manages.
 * An enemy must have all of these components to be controlled by the AI.
 */
const enemyQuery = defineQuery([
  IsEnemy,
  Position,
  Velocity,
  MovementSpeed,
  FacingDirection,
  AIState,
  TargetEntity,
  AttackRange,
  AttackTimer,
  AttackCooldown,
]);

/**
 * AI system — runs after the movement system.
 *
 * For each enemy entity:
 * - **Idle:** check aggro radius; transition to Chase if target is close enough.
 * - **Chase:** set velocity toward the target; update facing direction;
 *   transition to Attack when within attack range.
 * - **Attack:** zero velocity; count down attack timer; reset timer on expiry;
 *   transition back to Chase when target leaves attack range.
 *
 * The system only sets Velocity — it does NOT update Position directly.
 * The movement system (which runs first each frame) integrates Velocity into Position.
 */
export function aiSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // Convert ms to seconds
  const config = DEFAULT_AI_CONFIG;

  const enemies = enemyQuery(world);

  for (const eid of enemies) {
    const targetId = TargetEntity.eid[eid];

    // If the target doesn't have a Position component, skip (stay idle)
    if (!hasComponent(world, Position, targetId)) {
      setVelocity(eid, 0, 0);
      continue;
    }

    const dx = Position.x[targetId] - Position.x[eid];
    const dy = Position.y[targetId] - Position.y[eid];
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Unit direction toward target
    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;

    const state = AIState.value[eid];
    const attackRange = AttackRange.value[eid];

    switch (state) {
      case AIStateEnum.Idle: {
        if (dist <= config.aggroRadius) {
          AIState.value[eid] = AIStateEnum.Chase;
          if (import.meta.env.DEV) {
            console.log(`[AI] Enemy ${eid} Idle → Chase (target ${targetId}, dist ${dist.toFixed(2)})`);
          }
        } else {
          setVelocity(eid, 0, 0);
        }
        break;
      }

      case AIStateEnum.Chase: {
        const speed = MovementSpeed.value[eid];
        setVelocity(eid, dirX * speed, dirY * speed);
        FacingDirection.x[eid] = dirX;
        FacingDirection.y[eid] = dirY;

        if (dist <= attackRange) {
          AIState.value[eid] = AIStateEnum.Attack;
          AttackTimer.value[eid] = AttackCooldown.value[eid];
          if (import.meta.env.DEV) {
            console.log(`[AI] Enemy ${eid} Chase → Attack (target ${targetId}, dist ${dist.toFixed(2)})`);
          }
        }
        break;
      }

      case AIStateEnum.Attack: {
        // Stand still while attacking
        setVelocity(eid, 0, 0);

        // Count down and reset timer
        AttackTimer.value[eid] -= dt;
        if (AttackTimer.value[eid] <= 0) {
          AttackTimer.value[eid] = AttackCooldown.value[eid];
          // Combat system handles the actual hit registration
        }

        // Transition back to chase if target moved out of range
        if (dist > attackRange) {
          AIState.value[eid] = AIStateEnum.Chase;
          if (import.meta.env.DEV) {
            console.log(`[AI] Enemy ${eid} Attack → Chase (target ${targetId}, dist ${dist.toFixed(2)})`);
          }
        }
        break;
      }
    }
  }
}

/** Convenience to set an entity's velocity components. */
function setVelocity(eid: number, x: number, y: number): void {
  Velocity.x[eid] = x;
  Velocity.y[eid] = y;
}
