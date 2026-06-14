import { addComponent, hasComponent, getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, Velocity, IsCharacter } from '@/systems/movement';
import { IsEnemy } from '@/systems/ai';
import { KnockbackImpulse } from './components';
import { DEFAULT_PHYSICS_CONFIG } from './types';
import { isHavokReady, initHavokPhysics } from './physicsSystem';
import { getRenderData } from '@/systems/render';

// ---------------------------------------------------------------------------
// Physics debug commands
// ---------------------------------------------------------------------------

export function registerPhysicsDebugCommands(): void {
  registerDebugCommands({
    /**
     * Manually trigger Havok physics initialisation.
     * Usage: physics.init
     */
    'physics.init': () => {
      const world = getDebugWorld();
      const rd = getRenderData(world);
      if (!rd?.scene) {
        console.warn('[debug] physics.init: no scene available (render not initialised?)');
        return;
      }
      initHavokPhysics(rd.scene)
        .then(() => {
          console.log('[debug] physics.init: Havok initialised');
        })
        .catch((err: unknown) => {
          console.error('[debug] physics.init failed:', err);
        });
    },

    /**
     * Apply knockback to all enemies near the Character.
     * Usage: physics.knockback [force=8]
     */
    'physics.knockback': (force = String(DEFAULT_PHYSICS_CONFIG.knockbackForce)) => {
      const world = getDebugWorld();
      const forceVal = Math.max(0, parseFloat(force) || DEFAULT_PHYSICS_CONFIG.knockbackForce);

      let charEid: number | null = null;
      const enemies: number[] = [];

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsCharacter, eid)) {
          charEid = eid;
        }
        if (hasComponent(world, IsEnemy, eid)) {
          enemies.push(eid);
        }
      }

      if (charEid === null) {
        console.warn('[debug] physics.knockback: no Character entity found');
        return;
      }

      if (enemies.length === 0) {
        console.warn('[debug] physics.knockback: no enemies found');
        return;
      }

      let count = 0;
      for (const eid of enemies) {
        // Direction: away from character
        const dx = Position.x[eid] - Position.x[charEid];
        const dy = Position.y[eid] - Position.y[charEid];
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (!hasComponent(world, KnockbackImpulse, eid)) {
          addComponent(world, KnockbackImpulse, eid);
        }
        KnockbackImpulse.x[eid] = dx / dist;
        KnockbackImpulse.y[eid] = dy / dist;
        KnockbackImpulse.magnitude[eid] = forceVal;
        count++;
      }

      console.log(`[debug] physics.knockback: applied force=${forceVal} to ${count} enemy/enemies`);
    },

    /**
     * Show physics initialisation state.
     * Usage: physics.status
     */
    'physics.status': () => {
      const ready = isHavokReady();
      console.log(
        `[debug] physics.status: Havok ${ready ? 'ready' : 'not yet initialised'}` +
        ` (plugin: ${ready ? '✓' : '✗'})`,
      );
    },
  });
}
