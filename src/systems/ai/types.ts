/** AI system configuration types. */

/** Configuration for the AI system. */
export interface AIConfig {
  /** Speed at which enemies chase the target (world units/sec). */
  chaseSpeed: number;
  /** Distance at which enemies aggro and begin chasing. */
  aggroRadius: number;
  /** Maximum distance enemies will chase before leashing back. */
  leashRadius: number;
  /** Attack range for melee-type enemies. */
  meleeRange: number;
  /** Attack range for ranged-type enemies. */
  rangedRange: number;
}

/** Sensible defaults — overridable per enemy via per-entity components. */
export const DEFAULT_AI_CONFIG: AIConfig = {
  chaseSpeed: 3,
  aggroRadius: 8,
  leashRadius: 12,
  meleeRange: 1.5,
  rangedRange: 5,
};
