// ---------------------------------------------------------------------------
// BuffDefinition & registry
// ---------------------------------------------------------------------------

export type ModifierType = 'flat' | 'percent';

export interface BuffDefinition {
  /** Unique string id (key in BUFF_REGISTRY). */
  id: string;
  /** Human-readable name. */
  name: string;
  /**
   * Which stat this buff modifies.
   * One of: 'damage' | 'maxLife' | 'movementSpeed'
   */
  stat: string;
  /** 'flat' ⇒ add magnitude directly; 'percent' ⇒ multiply by (1 + magnitude). */
  modifierType: ModifierType;
  /** How strong the modifier is (e.g. 0.4 = +40% for percent, 10 for flat). */
  magnitude: number;
  /** Duration in seconds. Infinity = permanent (until removed). */
  durationSeconds: number;
  /** If this buff is granted by a skill, the skill's string id. */
  sourceSkillId?: string;
}

export interface BuffRegistry {
  [buffId: string]: BuffDefinition;
}

// ---------------------------------------------------------------------------
// Numeric ID assignments (stored in the ui8 BuffInstance.buffId)
// ---------------------------------------------------------------------------

export const BUFF_ID_MAP: Record<string, number> = {
  war_cry_buff: 1,
  enraged_buff_damage: 2,
  enraged_buff_speed: 3,
};

export function buffIdFromCode(code: number): string {
  for (const [key, val] of Object.entries(BUFF_ID_MAP)) {
    if (val === code) return key;
  }
  return '';
}

export function codeFromBuffId(id: string): number {
  return BUFF_ID_MAP[id] ?? 0;
}

// ---------------------------------------------------------------------------
// Registry of all known buffs
// ---------------------------------------------------------------------------

export const BUFF_REGISTRY: BuffRegistry = {
  war_cry_buff: {
    id: 'war_cry_buff',
    name: 'War Cry',
    stat: 'damage',
    modifierType: 'percent',
    magnitude: 0.4,
    durationSeconds: 5,
    sourceSkillId: 'war_cry',
  },
  enraged_buff_damage: {
    id: 'enraged_buff_damage',
    name: 'Enraged',
    stat: 'damage',
    modifierType: 'percent',
    magnitude: 0.5,
    durationSeconds: Infinity,
  },
  enraged_buff_speed: {
    id: 'enraged_buff_speed',
    name: 'Enraged (Speed)',
    stat: 'movementSpeed',
    modifierType: 'percent',
    magnitude: 0.3,
    durationSeconds: Infinity,
  },
};

/**
 * Mapping from skillId → buffId for skills that grant a buff on use.
 */
export const SKILL_BUFF_MAP: Record<string, string> = {
  war_cry: 'war_cry_buff',
};

// ---------------------------------------------------------------------------
// Stat name constants
// ---------------------------------------------------------------------------

export const STAT_DAMAGE = 'damage';
export const STAT_MAX_LIFE = 'maxLife';
export const STAT_MOVEMENT_SPEED = 'movementSpeed';

// ---------------------------------------------------------------------------
// Skill numeric code → string id (mirrors the map in combat/combatSystem.ts)
// ---------------------------------------------------------------------------

const SKILL_CODE_MAP: Record<number, string> = {
  1: 'basic_attack',
  2: 'cleave',
  3: 'power_strike',
  4: 'war_cry',
};

export function skillIdFromCode(code: number): string {
  return SKILL_CODE_MAP[code] ?? '';
}
