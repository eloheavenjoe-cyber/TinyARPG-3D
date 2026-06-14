import type { Vec2 } from '@/shared';

/**
 * Configuration for the InputSystem.
 * Maps physical keys to game actions.
 */
export interface InputConfig {
  /** Movement keys mapped to their direction vectors. */
  moveKeys: Record<string, Vec2>;
  /** Skill slot keys (key string → slot index). */
  skillKeys: Record<string, number>;
  /** Interact key (case-insensitive, both lower and upper are mapped). */
  interactKey: string;
}

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  moveKeys: {
    // WASD — both cases for CapsLock / Shift safety
    'w': { x: 0, y: -1 },
    'W': { x: 0, y: -1 },
    'ArrowUp': { x: 0, y: -1 },
    's': { x: 0, y: 1 },
    'S': { x: 0, y: 1 },
    'ArrowDown': { x: 0, y: 1 },
    'a': { x: -1, y: 0 },
    'A': { x: -1, y: 0 },
    'ArrowLeft': { x: -1, y: 0 },
    'd': { x: 1, y: 0 },
    'D': { x: 1, y: 0 },
    'ArrowRight': { x: 1, y: 0 },
  },
  skillKeys: {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
  },
  interactKey: 'e',
};
