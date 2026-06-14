/** Movement system types. */

/** Configuration for the MovementSystem. */
export interface MovementConfig {
  /** Default movement speed for new Characters (world units/sec). */
  defaultSpeed: number;
}

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  defaultSpeed: 5,
};
