import {
  defineQuery,
  hasComponent,
} from 'bitecs';
import type { World } from '@/core';
import type { PassiveTree, PassiveNode } from '@/shared';
import { BaseStats } from '@/systems/buff';
import { PassiveTreeState, PassiveStats } from './components';
import { getMarauderTree, nodeIndex, MARAUDER_NODE_IDS } from './types';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Entities that have both PassiveTreeState and BaseStats (the Character). */
const passiveTreeQuery = defineQuery([PassiveTreeState, BaseStats]);

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

/**
 * The tree's node list in index order. Populated once from the singleton tree.
 */
let _nodeById: Record<string, PassiveNode> | null = null;

function ensureNodes(): Record<string, PassiveNode> {
  if (!_nodeById) {
    _nodeById = getMarauderTree().nodes;
  }
  return _nodeById;
}

// ---------------------------------------------------------------------------
// Connectivity & allocation helpers
// ---------------------------------------------------------------------------

/**
 * Check whether `nodeId` can be allocated given the current bitmask.
 *
 * The root node is always allocatable.
 * Any other node is allocatable if at least one of its connected nodes
 * is already allocated (bit set in the mask).
 */
export function canAllocate(
  tree: PassiveTree,
  nodeId: string,
  allocatedMask: number,
): boolean {
  const node = tree.nodes[nodeId];
  if (!node) return false;

  // Root is always allocatable
  if (nodeId === tree.rootNodeId) return true;

  // Check if any connected node is already allocated
  for (const connectedId of node.connectedNodeIds) {
    const idx = nodeIndex(connectedId);
    if (idx >= 0 && (allocatedMask & (1 << idx)) !== 0) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether a node is already allocated in the given bitmask.
 */
export function isAllocated(nodeIndex_: number, allocatedMask: number): boolean {
  return (allocatedMask & (1 << nodeIndex_)) !== 0;
}

/**
 * Allocate a node for a character entity.
 *
 * Sets the bit for `nodeIndex_` in `allocatedMask` and decrements
 * `skillPoints`. Returns `true` on success, `false` if the allocation
 * is invalid (node already allocated, insufficient SP).
 *
 * Does NOT check connectivity — call `canAllocate` separately.
 */
export function allocateNode(
  world: World,
  characterEid: number,
  nodeIndex_: number,
): boolean {
  if (!hasComponent(world, PassiveTreeState, characterEid)) return false;

  const mask = PassiveTreeState.allocatedMask[characterEid];
  const bit = 1 << nodeIndex_;

  // Already allocated
  if ((mask & bit) !== 0) return false;

  // Not enough skill points
  if (PassiveTreeState.skillPoints[characterEid] < 1) return false;

  // Set the bit
  PassiveTreeState.allocatedMask[characterEid] = mask | bit;
  PassiveTreeState.skillPoints[characterEid]--;

  if (import.meta.env.DEV) {
    const nodeId = MARAUDER_NODE_IDS[nodeIndex_] ?? `index_${nodeIndex_}`;
    console.log(
      `[PassiveTree] Allocated node "${nodeId}" (eid=${characterEid}), ` +
      `${PassiveTreeState.skillPoints[characterEid]} SP remaining.`,
    );
  }

  return true;
}

/**
 * Respec (unallocate) a node for a character entity.
 *
 * Clears the bit for `nodeIndex_` in `allocatedMask`, refunds one skill
 * point, and consumes one respec point. Returns `true` on success.
 */
export function respecNode(
  world: World,
  characterEid: number,
  nodeIndex_: number,
): boolean {
  if (!hasComponent(world, PassiveTreeState, characterEid)) return false;

  const mask = PassiveTreeState.allocatedMask[characterEid];
  const bit = 1 << nodeIndex_;

  // Not allocated
  if ((mask & bit) === 0) return false;

  // No respec points remaining
  if (PassiveTreeState.respecPoints[characterEid] < 1) return false;

  // Clear the bit
  PassiveTreeState.allocatedMask[characterEid] = mask & ~bit;
  PassiveTreeState.skillPoints[characterEid]++;
  PassiveTreeState.respecPoints[characterEid]--;

  if (import.meta.env.DEV) {
    const nodeId = MARAUDER_NODE_IDS[nodeIndex_] ?? `index_${nodeIndex_}`;
    console.log(
      `[PassiveTree] Respec'd node "${nodeId}" (eid=${characterEid}), ` +
      `${PassiveTreeState.respecPoints[characterEid]} RP remaining.`,
    );
  }

  return true;
}

/**
 * Reset all allocations for a character, refunding all skill points.
 * Respec points are NOT restored (they are a lifetime resource).
 */
export function resetAllocations(world: World, characterEid: number): boolean {
  if (!hasComponent(world, PassiveTreeState, characterEid)) return false;

  const mask = PassiveTreeState.allocatedMask[characterEid];
  const allocatedCount = popcount(mask);

  PassiveTreeState.allocatedMask[characterEid] = 0;
  PassiveTreeState.skillPoints[characterEid] += allocatedCount;

  if (import.meta.env.DEV) {
    console.log(
      `[PassiveTree] Reset all allocations (eid=${characterEid}), ` +
      `refunded ${allocatedCount} SP.`,
    );
  }

  return true;
}

/** Count set bits in a 32-bit integer. */
function popcount(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >>> 24;
}

// ---------------------------------------------------------------------------
// Passive tree system
// ---------------------------------------------------------------------------

/**
 * passiveTreeSystem — manages passive tree stat derivation.
 *
 * **Pipeline position:** runs after inventorySystem, before buffSystem.
 *
 * **Phase 1 — Compute derived stats:**
 *   For every entity with PassiveTreeState + BaseStats, recomputes
 *   PassiveStats from the allocatedMask and writes bonuses to BaseStats
 *   so that buffSystem picks them up in its stat resolution phase.
 */
export function passiveTreeSystem(world: World): void {
  // -----------------------------------------------------------------------
  // Phase 1 — Derive passive stats from allocations
  // -----------------------------------------------------------------------
  const nodes = ensureNodes();
  const affected = passiveTreeQuery(world);

  for (const eid of affected) {
    const mask = PassiveTreeState.allocatedMask[eid];

    // Sum affix values from all allocated nodes
    let bonusDamage = 0;
    let bonusMaxLife = 0;
    let bonusMovementSpeed = 0;

    for (let idx = 0; idx < MARAUDER_NODE_IDS.length; idx++) {
      if ((mask & (1 << idx)) === 0) continue;

      const nodeId = MARAUDER_NODE_IDS[idx];
      const node = nodes[nodeId];
      if (!node) continue;

      for (const affix of node.stats) {
        switch (affix.target) {
          case 'damage':
            bonusDamage += affix.value;
            break;
          case 'maxLife':
            bonusMaxLife += affix.value;
            break;
          case 'movementSpeed':
            bonusMovementSpeed += affix.value;
            break;
          // Unknown targets are silently ignored
        }
      }
    }

    // Write PassiveStats for inspection / UI
    PassiveStats.bonusDamage[eid] = bonusDamage;
    PassiveStats.bonusMaxLife[eid] = bonusMaxLife;
    PassiveStats.bonusMovementSpeed[eid] = bonusMovementSpeed;

    // Apply bonuses to BaseStats so buffSystem picks them up
    // inventorySystem (runs before us) already set BaseStats to
    //   nakedBase + equipmentMods
    // We add passive bonuses on top of that.
    BaseStats.damage[eid] += bonusDamage;
    BaseStats.maxLife[eid] += bonusMaxLife;
    BaseStats.movementSpeed[eid] += bonusMovementSpeed;
  }
}
