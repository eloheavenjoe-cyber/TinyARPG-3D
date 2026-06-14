import { addEntity, addComponent, removeEntity, hasComponent } from 'bitecs';
import { getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from '@/systems/movement';
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

export function registerAIDebugCommands(): void {
  registerDebugCommands({
    /**
     * Spawn one or more enemies near the Character.
     * Usage: ai.spawn <melee|ranged> [count=1]
     */
    'ai.spawn': (type = 'melee', count = '1') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] ai.spawn: no Character entity exists. Use move.spawn first.');
        return;
      }

      const n = Math.max(1, parseInt(count, 10) || 1);
      const isRanged = type === 'ranged';
      const enemyTypeValue = isRanged ? EnemyTypeEnum.Ranged : EnemyTypeEnum.Melee;
      const attackRange = isRanged ? DEFAULT_AI_CONFIG.rangedRange : DEFAULT_AI_CONFIG.meleeRange;

      for (let i = 0; i < n; i++) {
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

        // Position near the character (random offset within 3-6 units)
        const angle = Math.random() * Math.PI * 2;
        const offset = 3 + Math.random() * 3;
        Position.x[eid] = Position.x[charEid] + Math.cos(angle) * offset;
        Position.y[eid] = Position.y[charEid] + Math.sin(angle) * offset;

        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
        MovementSpeed.value[eid] = DEFAULT_AI_CONFIG.chaseSpeed;
        FacingDirection.x[eid] = 0;
        FacingDirection.y[eid] = 1; // default face down

        EnemyType.value[eid] = enemyTypeValue;
        AIState.value[eid] = AIStateEnum.Idle;
        TargetEntity.eid[eid] = charEid;
        AttackRange.value[eid] = attackRange;
        AttackTimer.value[eid] = 0;
        AttackCooldown.value[eid] = 1.5; // 1.5 seconds between attacks

        console.log(`[debug] ai.spawn: ${isRanged ? 'ranged' : 'melee'} enemy eid=${eid} at (${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)})`);
      }

      console.log(`[debug] ai.spawn: spawned ${n} ${isRanged ? 'ranged' : 'melee'} enemy/enemies`);
    },

    /**
     * Remove all enemy entities from the world.
     * Usage: ai.kill_all
     */
    'ai.kill_all': () => {
      const world = getDebugWorld();
      let count = 0;

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsEnemy, eid)) {
          removeEntity(world, eid);
          count++;
        }
      }

      console.log(`[debug] ai.kill_all: removed ${count} enemy/enemies`);
    },

    /**
     * Force all existing enemies into Chase state.
     * Usage: ai.aggro_all
     */
    'ai.aggro_all': () => {
      const world = getDebugWorld();

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsEnemy, eid) && hasComponent(world, AIState, eid)) {
          AIState.value[eid] = AIStateEnum.Chase;
        }
      }

      console.log('[debug] ai.aggro_all: all enemies set to Chase state');
    },
  });
}

/** Scan the world for the Character entity (manual iteration to avoid circular deps). */
function findCharacter(world: ReturnType<typeof getDebugWorld>): number | null {
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}
