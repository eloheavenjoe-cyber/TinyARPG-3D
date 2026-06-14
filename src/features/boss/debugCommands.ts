import { getAllEntities, hasComponent, addComponent, addEntity } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, FacingDirection, MovementSpeed, IsCharacter } from '@/systems/movement';
import {
  IsEnemy,
  AIState,
  AIStateEnum,
  TargetEntity,
  AttackRange,
  AttackTimer,
  AttackCooldown,
} from '@/systems/ai';
import { Life, Damage, IsDead } from '@/systems/combat';
import { BossPhase } from '@/shared';
import {
  IsBoss,
  BossState,
  BossArena,
} from './components';
import { DEFAULT_BOSS_CONFIG } from './types';
import type { BossConfig } from './types';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let _config: BossConfig = DEFAULT_BOSS_CONFIG;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the Character entity ID (manual iteration to avoid circular deps).
 */
function findCharacter(): number | null {
  const world = getDebugWorld();
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}

/**
 * Find the first boss entity in the world.
 */
function findFirstBoss(): number | null {
  const world = getDebugWorld();
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsBoss, eid)) {
      return eid;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Debug command registration
// ---------------------------------------------------------------------------

export function registerBossDebugCommands(): void {
  registerDebugCommands({
    /**
     * Spawn a boss entity near the Character.
     * Usage: boss.spawn [name]
     */
    'boss.spawn': () => {
      const world = getDebugWorld();
      const charEid = findCharacter();
      if (charEid === null) {
        console.warn('[debug] boss.spawn: no Character entity exists. Use move.spawn first.');
        return;
      }

      // If a boss already exists, warn and bail
      const existing = findFirstBoss();
      if (existing !== null) {
        console.warn('[debug] boss.spawn: a boss entity (eid=' + existing + ') already exists.');
        return;
      }

      const eid = addEntity(world);

      // --- Movement components ---
      addComponent(world, Position, eid);
      addComponent(world, FacingDirection, eid);
      addComponent(world, MovementSpeed, eid);

      // --- AI components (treated as an enemy) ---
      addComponent(world, IsEnemy, eid);
      addComponent(world, AIState, eid);
      addComponent(world, AIStateEnum, eid);
      addComponent(world, TargetEntity, eid);
      addComponent(world, AttackRange, eid);
      addComponent(world, AttackTimer, eid);
      addComponent(world, AttackCooldown, eid);

      // --- Combat components ---
      addComponent(world, Life, eid);
      addComponent(world, Damage, eid);

      // --- Boss components ---
      addComponent(world, IsBoss, eid);
      addComponent(world, BossState, eid);
      addComponent(world, BossArena, eid);

      // Position the boss a short distance from the Character
      const angle = Math.random() * Math.PI * 2;
      const offset = 5 + Math.random() * 2;
      Position.x[eid] = Position.x[charEid] + Math.cos(angle) * offset;
      Position.y[eid] = Position.y[charEid] + Math.sin(angle) * offset;

      FacingDirection.x[eid] = 0;
      FacingDirection.y[eid] = 1;
      MovementSpeed.value[eid] = _config.baseSpeed;

      // AI: start chasing the Character
      AIState.value[eid] = AIStateEnum.Chase;
      TargetEntity.eid[eid] = charEid;
      AttackRange.value[eid] = 2; // melee range
      AttackTimer.value[eid] = 0;
      AttackCooldown.value[eid] = _config.phases[0].attackInterval;

      // Combat stats
      Life.current[eid] = _config.baseLife;
      Life.max[eid] = _config.baseLife;
      Damage.value[eid] = _config.baseDamage;

      // Boss state — starts in phase one
      BossState.currentPhase[eid] = BossPhase.One as number;
      BossState.enrageTimer[eid] = _config.enrageTimer;
      BossState.isEnraged[eid] = 0;
      BossState.attackTimer[eid] = _config.phases[0].attackInterval;
      BossState.currentAttack[eid] = 0;
      BossState.telegraphTimer[eid] = 0;
      BossState.telegraphTargetX[eid] = 0;
      BossState.telegraphTargetY[eid] = 0;

      // Arena
      BossArena.centerX[eid] = Position.x[eid];
      BossArena.centerY[eid] = Position.y[eid];
      BossArena.radius[eid] = 12;

      console.log(
        `[debug] boss.spawn: "${_config.name}" eid=${eid} ` +
        `at (${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)}) ` +
        `— ${_config.baseLife} HP, phase 1, enrage in ${_config.enrageTimer}s`,
      );
    },

    /**
     * Force the boss into a specific phase.
     * Usage: boss.phase <1|2|3>
     */
    'boss.phase': (phaseStr?: string) => {
      const world = getDebugWorld();
      const eid = findFirstBoss();
      if (eid === null) {
        console.warn('[debug] boss.phase: no boss entity exists. Use boss.spawn first.');
        return;
      }

      const phaseNum = parseInt(phaseStr ?? '', 10);
      if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > 3) {
        console.warn('[debug] boss.phase: invalid phase. Use boss.phase <1|2|3>.');
        return;
      }

      const oldPhase = BossState.currentPhase[eid];
      BossState.currentPhase[eid] = phaseNum;

      // Reduce life to match the phase threshold
      const phaseCfg = _config.phases.find((p) => (p.phase as number) === phaseNum);
      if (phaseCfg) {
        const maxLife = Life.max[eid];
        Life.current[eid] = maxLife * phaseCfg.triggerThreshold + 1; // +1 to stay above threshold
      }

      console.log(
        `[debug] boss.phase: forced phase ${phaseNum} (was ${oldPhase}), ` +
        `life set to ${Life.current[eid].toFixed(1)} / ${Life.max[eid].toFixed(1)}`,
      );
    },

    /**
     * Immediately trigger the boss enrage.
     * Usage: boss.enrage
     */
    'boss.enrage': () => {
      const world = getDebugWorld();
      const eid = findFirstBoss();
      if (eid === null) {
        console.warn('[debug] boss.enrage: no boss entity exists. Use boss.spawn first.');
        return;
      }

      BossState.enrageTimer[eid] = 0;
      BossState.isEnraged[eid] = 1;

      // Apply enrage multipliers immediately
      Damage.value[eid] *= _config.enrageDamageMultiplier;
      MovementSpeed.value[eid] *= _config.enrageSpeedMultiplier;

      console.log(
        `[debug] boss.enrage: ${_config.name} is ENRAGED! ` +
        `Damage x${_config.enrageDamageMultiplier}, Speed x${_config.enrageSpeedMultiplier}`,
      );
    },

    /**
     * Print the current boss state.
     * Usage: boss.info
     */
    'boss.info': () => {
      const world = getDebugWorld();
      const eid = findFirstBoss();
      if (eid === null) {
        console.log('[debug] boss.info: no boss entity exists.');
        return;
      }

      const phase = BossState.currentPhase[eid];
      const life = Life.current[eid];
      const maxLife = Life.max[eid];
      const pct = ((life / maxLife) * 100).toFixed(1);
      const enrageTimer = BossState.enrageTimer[eid];
      const isEnraged = BossState.isEnraged[eid] === 1;
      const attackTimer = BossState.attackTimer[eid];
      const dmg = Damage.value[eid];
      const speed = MovementSpeed.value[eid];

      const phaseCfg = _config.phases.find((p) => (p.phase as number) === phase);
      const attacks = phaseCfg?.attacks.join(', ') ?? 'none';

      console.log(
        `[debug] boss.info: ${_config.name} eid=${eid}\n` +
        `  Life:     ${life.toFixed(1)} / ${maxLife.toFixed(1)} (${pct}%)\n` +
        `  Phase:    ${phase} — attacks: [${attacks}]\n` +
        `  Damage:   ${dmg.toFixed(1)}\n` +
        `  Speed:    ${speed.toFixed(1)}\n` +
        `  Enrage:   ${isEnraged ? 'YES' : `${enrageTimer.toFixed(1)}s remaining`}\n` +
        `  Attack:   ${attackTimer.toFixed(2)}s until next`,
      );
    },
  });
}
