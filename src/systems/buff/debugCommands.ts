import { addEntity, addComponent, removeEntity, hasComponent, getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { IsCharacter } from '@/systems/movement';
import { BaseStats, BuffInstance } from './components';
import { BUFF_REGISTRY, codeFromBuffId, buffIdFromCode } from './types';

export function registerBuffDebugCommands(): void {
  registerDebugCommands({
    /**
     * List all active buffs on the Character entity.
     * Usage: buff.list
     */
    'buff.list': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] buff.list: no Character entity found.');
        return;
      }

      let count = 0;
      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, BuffInstance, eid) && BuffInstance.ownerEid[eid] === charEid) {
          const buffIdStr = buffIdFromCode(BuffInstance.buffId[eid]);
          const remaining = BuffInstance.remainingTime[eid];
          console.log(
            `  buff eid=${eid} | ${buffIdStr} | remaining=${remaining === Infinity ? '∞' : remaining.toFixed(2)}s`,
          );
          count++;
        }
      }

      if (count === 0) {
        console.log('[debug] buff.list: no active buffs on Character.');
      } else {
        console.log(`[debug] buff.list: ${count} active buff(s) on Character.`);
      }
    },

    /**
     * Apply a buff to the Character.
     * Usage: buff.apply <buffId> [duration]
     *   buffId: string key into BUFF_REGISTRY (e.g. war_cry_buff, enraged_buff_damage)
     *   duration: optional override in seconds (default: use definition's duration)
     */
    'buff.apply': (buffId = '', durationStr = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] buff.apply: no Character entity found.');
        return;
      }

      const def = BUFF_REGISTRY[buffId];
      if (!def) {
        console.warn(
          `[debug] buff.apply: unknown buff "${buffId}". Available: ${Object.keys(BUFF_REGISTRY).join(', ')}`,
        );
        return;
      }

      const buffCode = codeFromBuffId(buffId);
      if (buffCode === 0) {
        console.warn(`[debug] buff.apply: no numeric code for buff "${buffId}".`);
        return;
      }

      const duration = durationStr ? parseFloat(durationStr) : def.durationSeconds;
      if (isNaN(duration) || duration <= 0) {
        console.warn(`[debug] buff.apply: invalid duration "${durationStr}".`);
        return;
      }

      const instEid = addEntity(world);
      addComponent(world, BuffInstance, instEid);
      BuffInstance.ownerEid[instEid] = charEid;
      BuffInstance.buffId[instEid] = buffCode;
      BuffInstance.remainingTime[instEid] = duration;

      console.log(
        `[debug] buff.apply: applied "${buffId}" to Character (eid=${charEid}), ` +
        `duration=${duration === Infinity ? '∞' : duration.toFixed(2)}s`,
      );
    },

    /**
     * Remove all active buffs from the Character.
     * Usage: buff.clear
     */
    'buff.clear': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] buff.clear: no Character entity found.');
        return;
      }

      let count = 0;
      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, BuffInstance, eid) && BuffInstance.ownerEid[eid] === charEid) {
          removeEntity(world, eid);
          count++;
        }
      }

      console.log(`[debug] buff.clear: removed ${count} buff(s) from Character.`);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Scan the world for the Character entity. */
function findCharacter(world: ReturnType<typeof getDebugWorld>): number | null {
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}
