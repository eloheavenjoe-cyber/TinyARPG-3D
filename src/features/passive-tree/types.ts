import type { PassiveTree, PassiveNode, Affix } from '@/shared';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface PassiveTreeConfig {
  /** Skill points granted per level-up */
  skillPointsPerLevel: number;
  /** Total respec points per character lifetime */
  respecPointsPerCharacter: number;
}

export const DEFAULT_PASSIVE_TREE_CONFIG: PassiveTreeConfig = {
  skillPointsPerLevel: 1,
  respecPointsPerCharacter: 5,
};

// ---------------------------------------------------------------------------
// Tree node index helpers
// ---------------------------------------------------------------------------

/**
 * Ordered list of node IDs matching the bitmask indices.
 * Generated once from createMarauderTree() and cached.
 */
export const MARAUDER_NODE_IDS = [
  'root',
  'str1',
  'notable_str',
  'life1',
  'life2',
  'keystone_life',
  'dmg1',
  'dmg2',
  'notable_dmg',
  'speed1',
  'speed2',
  'keystone_speed',
] as const;

export type MarauderNodeId = (typeof MARAUDER_NODE_IDS)[number];

/** Map from node id → bitmask index (0‑based). */
export const NODE_ID_TO_INDEX: Record<string, number> = {};
for (let i = 0; i < MARAUDER_NODE_IDS.length; i++) {
  NODE_ID_TO_INDEX[MARAUDER_NODE_IDS[i]] = i;
}

/** Return the bitmask index for a node id, or -1 if unknown. */
export function nodeIndex(id: string): number {
  return NODE_ID_TO_INDEX[id] ?? -1;
}

// ---------------------------------------------------------------------------
// Affix helpers
// ---------------------------------------------------------------------------

/** Create an Affix for a flat stat bonus. */
export function statAffix(
  target: string,
  value: number,
  label?: string,
): Affix {
  return {
    id: `${target}_${value > 0 ? 'plus' : 'minus'}${Math.abs(value)}`,
    label: label ?? `${value > 0 ? '+' : ''}${value} ${target}`,
    value,
    target,
  };
}

// ---------------------------------------------------------------------------
// Marauder starting tree
// ---------------------------------------------------------------------------

/**
 * Build the MVP Marauder passive tree (~12 nodes).
 *
 * Structure:
 *   Root (+5 str) ─┬─ str1 (+5 str) ── notable_str (+15 str, Notable)
 *                   ├─ life1 (+10 life) ── life2 (+10 life) ── keystone_life (+50 life, -10 dmg, Keystone)
 *                   ├─ dmg1 (+3 dmg) ── dmg2 (+3 dmg) ── notable_dmg (+10 dmg, Notable)
 *                   └─ speed1 (+5% speed) ── speed2 (+5% speed) ── keystone_speed (+20% speed, -20 life, Keystone)
 */
export function createMarauderTree(): PassiveTree {
  const nodes: Record<string, PassiveNode> = {};

  // -- Passives ---------------------------------------------------------------

  nodes.root = {
    id: 'root',
    name: 'Root',
    type: 'Passive',
    stats: [statAffix('maxLife', 5, '+5 max Life')],
    connectedNodeIds: ['str1', 'life1', 'dmg1', 'speed1'],
  };

  nodes.str1 = {
    id: 'str1',
    name: 'Strength I',
    type: 'Passive',
    stats: [statAffix('maxLife', 5, '+5 max Life')],
    connectedNodeIds: ['root', 'notable_str'],
  };

  nodes.life1 = {
    id: 'life1',
    name: 'Life I',
    type: 'Passive',
    stats: [statAffix('maxLife', 10, '+10 max Life')],
    connectedNodeIds: ['root', 'notable_str', 'life2'],
  };

  nodes.life2 = {
    id: 'life2',
    name: 'Life II',
    type: 'Passive',
    stats: [statAffix('maxLife', 10, '+10 max Life')],
    connectedNodeIds: ['life1', 'keystone_life'],
  };

  nodes.dmg1 = {
    id: 'dmg1',
    name: 'Damage I',
    type: 'Passive',
    stats: [statAffix('damage', 3, '+3 Damage')],
    connectedNodeIds: ['root', 'dmg2'],
  };

  nodes.dmg2 = {
    id: 'dmg2',
    name: 'Damage II',
    type: 'Passive',
    stats: [statAffix('damage', 3, '+3 Damage')],
    connectedNodeIds: ['dmg1', 'notable_dmg'],
  };

  nodes.speed1 = {
    id: 'speed1',
    name: 'Speed I',
    type: 'Passive',
    stats: [statAffix('movementSpeed', 5, '+5% Movement Speed')],
    connectedNodeIds: ['root', 'speed2'],
  };

  nodes.speed2 = {
    id: 'speed2',
    name: 'Speed II',
    type: 'Passive',
    stats: [statAffix('movementSpeed', 5, '+5% Movement Speed')],
    connectedNodeIds: ['speed1', 'keystone_speed'],
  };

  // -- Notables ---------------------------------------------------------------

  nodes.notable_str = {
    id: 'notable_str',
    name: 'Bravery',
    type: 'Notable',
    stats: [statAffix('maxLife', 15, '+15 max Life')],
    connectedNodeIds: ['str1', 'life1'],
  };

  nodes.notable_dmg = {
    id: 'notable_dmg',
    name: 'Might',
    type: 'Notable',
    stats: [statAffix('damage', 10, '+10 Damage')],
    connectedNodeIds: ['dmg2'],
  };

  // -- Keystones --------------------------------------------------------------

  nodes.keystone_life = {
    id: 'keystone_life',
    name: 'Blood Magic',
    type: 'Keystone',
    stats: [
      statAffix('maxLife', 50, '+50 max Life'),
      statAffix('damage', -10, '-10 Damage'),
    ],
    connectedNodeIds: ['life2'],
  };

  nodes.keystone_speed = {
    id: 'keystone_speed',
    name: 'Unstoppable',
    type: 'Keystone',
    stats: [
      statAffix('movementSpeed', 20, '+20% Movement Speed'),
      statAffix('maxLife', -20, '-20 max Life'),
    ],
    connectedNodeIds: ['speed2'],
  };

  return { nodes, rootNodeId: 'root' };
}

// ---------------------------------------------------------------------------
// Singleton tree instance (built once, cached)
// ---------------------------------------------------------------------------

let _marauderTree: PassiveTree | null = null;

/** Get the singleton Marauder passive tree. */
export function getMarauderTree(): PassiveTree {
  if (!_marauderTree) {
    _marauderTree = createMarauderTree();
  }
  return _marauderTree;
}
