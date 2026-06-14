import { hasComponent, getAllEntities } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { IsCharacter } from '@/systems/movement';
import { BaseStats } from '@/systems/buff';
import { Life, Damage } from '@/systems/combat';
import { MovementSpeed } from '@/systems/movement';
import { PassiveTreeState, PassiveStats } from './components';
import {
  getMarauderTree,
  nodeIndex,
  MARAUDER_NODE_IDS,
} from './types';
import {
  allocateNode,
  respecNode,
  resetAllocations,
  isAllocated,
  canAllocate,
} from './passiveTreeSystem';

// ---------------------------------------------------------------------------
// Register debug commands
// ---------------------------------------------------------------------------

export function registerPassiveTreeDebugCommands(): void {
  registerDebugCommands({
    /**
     * Set unspent skill points on the Character.
     * Usage:  tree.points <n>
     *   n — number of skill points to set (0-255)
     */
    'tree.points': (amountStr = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] tree.points: no Character entity found.');
        return;
      }
      if (!hasComponent(world, PassiveTreeState, charEid)) {
        console.warn('[debug] tree.points: Character has no PassiveTreeState component.');
        return;
      }

      const amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount < 0 || amount > 255) {
        console.warn(
          `[debug] tree.points: invalid amount "${amountStr}". Use a number 0-255.`,
        );
        return;
      }

      PassiveTreeState.skillPoints[charEid] = amount;
      console.log(
        `[debug] tree.points: set skillPoints = ${amount} (eid=${charEid}).`,
      );
    },

    /**
     * Allocate a passive tree node by its id.
     * Usage:  tree.allocate <node_id>
     *   node_id — e.g. "notable_str", "life1", "keystone_life"
     */
    'tree.allocate': (nodeId = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] tree.allocate: no Character entity found.');
        return;
      }
      if (!hasComponent(world, PassiveTreeState, charEid)) {
        console.warn('[debug] tree.allocate: Character has no PassiveTreeState component.');
        return;
      }

      const idx = nodeIndex(nodeId);
      if (idx < 0) {
        console.warn(
          `[debug] tree.allocate: unknown node "${nodeId}". ` +
          `Valid: ${MARAUDER_NODE_IDS.join(', ')}`,
        );
        return;
      }

      const mask = PassiveTreeState.allocatedMask[charEid];
      if (isAllocated(idx, mask)) {
        console.warn(`[debug] tree.allocate: node "${nodeId}" is already allocated.`);
        return;
      }

      // Check connectivity
      const tree = getMarauderTree();
      if (!canAllocate(tree, nodeId, mask)) {
        console.warn(
          `[debug] tree.allocate: node "${nodeId}" is not connected to an allocated node. ` +
          `Allocate a neighbouring node first.`,
        );
        return;
      }

      const ok = allocateNode(world, charEid, idx);
      if (ok) {
        const sp = PassiveTreeState.skillPoints[charEid];
        console.log(
          `[debug] tree.allocate: allocated "${nodeId}" (eid=${charEid}), ` +
          `${sp} SP remaining.`,
        );
      }
    },

    /**
     * Respec (unallocate) a passive tree node by its id.
     * Usage:  tree.respec <node_id>
     *   node_id — e.g. "notable_str", "life1"
     */
    'tree.respec': (nodeId = '') => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] tree.respec: no Character entity found.');
        return;
      }
      if (!hasComponent(world, PassiveTreeState, charEid)) {
        console.warn('[debug] tree.respec: Character has no PassiveTreeState component.');
        return;
      }

      const idx = nodeIndex(nodeId);
      if (idx < 0) {
        console.warn(
          `[debug] tree.respec: unknown node "${nodeId}". ` +
          `Valid: ${MARAUDER_NODE_IDS.join(', ')}`,
        );
        return;
      }

      const mask = PassiveTreeState.allocatedMask[charEid];
      if (!isAllocated(idx, mask)) {
        console.warn(`[debug] tree.respec: node "${nodeId}" is not allocated.`);
        return;
      }

      // Check respec points
      const rp = PassiveTreeState.respecPoints[charEid];
      if (rp < 1) {
        console.warn('[debug] tree.respec: no respec points remaining.');
        return;
      }

      const ok = respecNode(world, charEid, idx);
      if (ok) {
        const sp = PassiveTreeState.skillPoints[charEid];
        console.log(
          `[debug] tree.respec: respec'd "${nodeId}" (eid=${charEid}), ` +
          `${sp} SP, ${rp - 1} RP remaining.`,
        );
      }
    },

    /**
     * Reset all passive tree allocations, refunding all spent skill points.
     * Respec points are NOT restored.
     * Usage:  tree.reset
     */
    'tree.reset': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] tree.reset: no Character entity found.');
        return;
      }
      if (!hasComponent(world, PassiveTreeState, charEid)) {
        console.warn('[debug] tree.reset: Character has no PassiveTreeState component.');
        return;
      }

      resetAllocations(world, charEid);
      console.log('[debug] tree.reset: all allocations cleared, SP refunded.');
    },

    /**
     * Show current passive tree state: allocated nodes, available points,
     * respec points, and derived stat bonuses.
     * Usage:  tree.info
     */
    'tree.info': () => {
      const world = getDebugWorld();
      const charEid = findCharacter(world);
      if (charEid === null) {
        console.warn('[debug] tree.info: no Character entity found.');
        return;
      }
      if (!hasComponent(world, PassiveTreeState, charEid)) {
        console.warn('[debug] tree.info: Character has no PassiveTreeState component.');
        return;
      }

      const mask = PassiveTreeState.allocatedMask[charEid];
      const sp = PassiveTreeState.skillPoints[charEid];
      const rp = PassiveTreeState.respecPoints[charEid];

      const allocated: string[] = [];
      for (let idx = 0; idx < MARAUDER_NODE_IDS.length; idx++) {
        if ((mask & (1 << idx)) !== 0) {
          allocated.push(MARAUDER_NODE_IDS[idx]);
        }
      }

      // Read stat bonuses
      const hasPs = hasComponent(world, PassiveStats, charEid);
      const bonusDmg = hasPs ? PassiveStats.bonusDamage[charEid] : 0;
      const bonusLife = hasPs ? PassiveStats.bonusMaxLife[charEid] : 0;
      const bonusSpeed = hasPs ? PassiveStats.bonusMovementSpeed[charEid] : 0;

      // Read derived stats
      const hasDamage = hasComponent(world, Damage, charEid);
      const hasLife = hasComponent(world, Life, charEid);
      const hasMove = hasComponent(world, MovementSpeed, charEid);
      const hasBase = hasComponent(world, BaseStats, charEid);

      console.log('[debug] tree.info: Passive Tree State');
      console.log(`  Skill points:    ${sp}`);
      console.log(`  Respec points:   ${rp}`);
      console.log(`  Allocated:       ${allocated.length === 0 ? '(none)' : allocated.join(', ')}`);
      console.log(`  Bonus damage:    ${bonusDmg > 0 ? `+${bonusDmg}` : bonusDmg}`);
      console.log(`  Bonus maxLife:   ${bonusLife > 0 ? `+${bonusLife}` : bonusLife}`);
      console.log(`  Bonus moveSpeed: ${bonusSpeed > 0 ? `+${bonusSpeed}` : bonusSpeed}`);

      if (hasBase) {
        console.log(`  BaseStats.damage:          ${BaseStats.damage[charEid]}`);
        console.log(`  BaseStats.maxLife:         ${BaseStats.maxLife[charEid]}`);
        console.log(`  BaseStats.movementSpeed:   ${BaseStats.movementSpeed[charEid]}`);
      }
      if (hasDamage) {
        console.log(`  Damage.value (final):      ${Damage.value[charEid]}`);
      }
      if (hasLife) {
        console.log(`  Life.max (final):          ${Life.max[charEid]}`);
      }
      if (hasMove) {
        console.log(`  MovementSpeed.value (final): ${MovementSpeed.value[charEid]}`);
      }
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
