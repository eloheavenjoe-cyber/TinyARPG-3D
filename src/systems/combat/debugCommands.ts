import { addEntity, addComponent, hasComponent } from 'bitecs';
import { getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from '@/systems/movement';
import { IsEnemy, EnemyType, EnemyTypeEnum, AIState, AIStateEnum, TargetEntity, AttackRange, AttackTimer, AttackCooldown } from '@/systems/ai';
import { Life, Damage, SkillSlot, CooldownTimer, CooldownDuration, IsDead } from './components';
import { DEFAULT_SKILLS, DEFAULT_COMBAT_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Module-level toggles
// ---------------------------------------------------------------------------

let _godMode = false;
let _cooldownOff = false;

export function registerCombatDebugCommands(): void {
  registerDebugCommands({
    /**
     * Kill all enemies — set their Life.current to 0 and add IsDead.
     * Usage: combat.kill_all
     */
    'combat.kill_all': () => {
      const world = getDebugWorld();
      let count = 0;

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsEnemy, eid) && hasComponent(world, Life, eid)) {
          Life.current[eid] = 0;
          if (!hasComponent(world, IsDead, eid)) {
            addComponent(world, IsDead, eid);
          }
          count++;
        }
      }

      console.log(`[debug] combat.kill_all: killed ${count} enemy/enemies`);
    },

    /**
     * Spawn enemies near the Character.
     * Usage: combat.spawn <melee|ranged> [count=1]
     */
    'combat.spawn': (type = 'melee', count = '1') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] combat.spawn: no Character entity exists. Use move.spawn first.');
        return;
      }

      const n = Math.max(1, parseInt(count, 10) || 1);
      const isRanged = type === 'ranged';
      const enemyTypeValue = isRanged ? EnemyTypeEnum.Ranged : EnemyTypeEnum.Melee;
      const attackRange = isRanged ? DEFAULT_COMBAT_CONFIG.meleeRange * 3 : DEFAULT_COMBAT_CONFIG.meleeRange;

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

        // Combat components
        addComponent(world, Life, eid);
        addComponent(world, Damage, eid);

        // Position near the character (random offset within 3-6 units)
        const angle = Math.random() * Math.PI * 2;
        const offset = 3 + Math.random() * 3;
        Position.x[eid] = Position.x[charEid] + Math.cos(angle) * offset;
        Position.y[eid] = Position.y[charEid] + Math.sin(angle) * offset;

        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
        MovementSpeed.value[eid] = 3;
        FacingDirection.x[eid] = 0;
        FacingDirection.y[eid] = 1;

        EnemyType.value[eid] = enemyTypeValue;
        AIState.value[eid] = AIStateEnum.Idle;
        TargetEntity.eid[eid] = charEid;
        AttackRange.value[eid] = attackRange;
        AttackTimer.value[eid] = 0;
        AttackCooldown.value[eid] = 1.5;

        // Combat stats
        Life.current[eid] = 50;
        Life.max[eid] = 50;
        Damage.value[eid] = 10;

        console.log(
          `[debug] combat.spawn: ${isRanged ? 'ranged' : 'melee'} enemy eid=${eid} ` +
          `at (${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)})`,
        );
      }

      console.log(`[debug] combat.spawn: spawned ${n} ${isRanged ? 'ranged' : 'melee'} enemy/enemies`);
    },

    /**
     * Toggle Character invincibility (skip damage taken).
     * Usage: combat.god
     */
    'combat.god': () => {
      _godMode = !_godMode;
      console.log(`[debug] combat.god: god mode ${_godMode ? 'ON' : 'OFF'}`);
    },

    /**
     * Toggle cooldown bypass (skills can fire every frame).
     * Usage: combat.cooldown_off
     */
    'combat.cooldown_off': () => {
      _cooldownOff = !_cooldownOff;
      console.log(`[debug] combat.cooldown_off: cooldowns ${_cooldownOff ? 'DISABLED' : 'ENABLED'}`);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Scan the world for the Character entity (manual iteration to avoid circular deps). */
function findCharacter(world: ReturnType<typeof getDebugWorld>): number | null {
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}
