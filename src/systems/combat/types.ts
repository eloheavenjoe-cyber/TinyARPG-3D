/**
 * Combat system types.
 *
 * Defines ActiveSkill configuration, the default skill registry,
 * and combat tuning parameters for the MVP.
 */

// ---------------------------------------------------------------------------
// ActiveSkill
// ---------------------------------------------------------------------------

export type SkillRangeType = 'melee' | 'ranged';

export interface ActiveSkill {
  /** Unique identifier (used as key in SkillRegistry). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Damage multiplier applied on top of the entity's Damage.value. */
  damageMultiplier: number;
  /** Base cooldown in seconds. */
  cooldownSeconds: number;
  /** Whether this skill requires the target to be in melee range or uses cursor targeting. */
  rangeType: SkillRangeType;
  /** Minimum character level required to unlock this skill. */
  unlockLevel: number;
}

// ---------------------------------------------------------------------------
// SkillRegistry
// ---------------------------------------------------------------------------

/** Map of skillId → ActiveSkill. */
export interface SkillRegistry {
  [skillId: string]: ActiveSkill;
}

// ---------------------------------------------------------------------------
// Default skills — Marauder MVP
// ---------------------------------------------------------------------------

export const DEFAULT_SKILLS: SkillRegistry = {
  basic_attack: {
    id: 'basic_attack',
    name: 'Basic Attack',
    damageMultiplier: 1.0,
    cooldownSeconds: 0.5,
    rangeType: 'melee',
    unlockLevel: 1,
  },
  cleave: {
    id: 'cleave',
    name: 'Cleave',
    damageMultiplier: 1.5,
    cooldownSeconds: 1.5,
    rangeType: 'melee',
    unlockLevel: 2,
  },
  power_strike: {
    id: 'power_strike',
    name: 'Power Strike',
    damageMultiplier: 2.0,
    cooldownSeconds: 3.0,
    rangeType: 'melee',
    unlockLevel: 4,
  },
  war_cry: {
    id: 'war_cry',
    name: 'War Cry',
    damageMultiplier: 0.5,
    cooldownSeconds: 8.0,
    rangeType: 'melee',
    unlockLevel: 6,
  },
};

// ---------------------------------------------------------------------------
// CombatConfig
// ---------------------------------------------------------------------------

export interface CombatConfig {
  /** Maximum distance for melee skill targeting (world units). */
  meleeRange: number;
  /** Number of frames to halt both entities on hit (reserved for RenderSystem). */
  hitStopFrames: number;
}

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  meleeRange: 2.0,
  hitStopFrames: 0,
};
