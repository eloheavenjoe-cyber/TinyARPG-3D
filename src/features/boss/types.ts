import { BossPhase } from '@/shared';

// ---------------------------------------------------------------------------
// Boss feature types — attack patterns, phase configs, default config
// ---------------------------------------------------------------------------

export type BossAttackPattern =
  | 'melee_slam'
  | 'cleave_cone'
  | 'charge_line'
  | 'aoe_circle'
  | 'summon_adds';

export interface BossPhaseConfig {
  phase: BossPhase;
  /** Life threshold percentage to trigger this phase (e.g., 1.0 = full, 0.66 = 66%, 0.33 = 33%) */
  triggerThreshold: number;
  /** Available attack patterns in this phase */
  attacks: BossAttackPattern[];
  /** Seconds between attacks */
  attackInterval: number;
  /** Damage multiplier for this phase's attacks */
  damageMultiplier: number;
  /** Movement speed multiplier */
  speedMultiplier: number;
}

export interface BossConfig {
  /** Boss name */
  name: string;
  /** Base stats */
  baseLife: number;
  baseDamage: number;
  baseSpeed: number;
  /** Enrage timer in seconds */
  enrageTimer: number;
  /** Enrage multipliers */
  enrageDamageMultiplier: number;
  enrageSpeedMultiplier: number;
  /** Phase definitions (ordered by trigger threshold descending) */
  phases: BossPhaseConfig[];
  /** Telegraph durations in seconds */
  telegraphDuration: number;
}

export const DEFAULT_BOSS_CONFIG: BossConfig = {
  name: 'The Butcher',
  baseLife: 500,
  baseDamage: 25,
  baseSpeed: 3,
  enrageTimer: 120,
  enrageDamageMultiplier: 3.0,
  enrageSpeedMultiplier: 1.5,
  telegraphDuration: 1.0,
  phases: [
    {
      phase: BossPhase.One,
      triggerThreshold: 1.0,
      attacks: ['melee_slam', 'cleave_cone'],
      attackInterval: 2.5,
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
    },
    {
      phase: BossPhase.Two,
      triggerThreshold: 0.66,
      attacks: ['melee_slam', 'cleave_cone', 'charge_line'],
      attackInterval: 2.0,
      damageMultiplier: 1.3,
      speedMultiplier: 1.1,
    },
    {
      phase: BossPhase.Three,
      triggerThreshold: 0.33,
      attacks: ['melee_slam', 'cleave_cone', 'charge_line', 'aoe_circle'],
      attackInterval: 1.5,
      damageMultiplier: 1.6,
      speedMultiplier: 1.3,
    },
  ],
};

// Telegraph shape helpers
export const TELEGRAPH_SHAPES: Record<
  BossAttackPattern,
  { shape: number; radius: number; angle: number }
> = {
  melee_slam:  { shape: 0, radius: 3, angle: 0 },                 // circle
  cleave_cone: { shape: 1, radius: 4, angle: Math.PI / 3 },       // cone (60°)
  charge_line: { shape: 2, radius: 6, angle: 0 },                 // line
  aoe_circle:  { shape: 0, radius: 5, angle: 0 },                 // large circle
  summon_adds: { shape: 0, radius: 8, angle: 0 },                 // large circle
};
