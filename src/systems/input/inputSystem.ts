import type { World } from '@/core';
import { pushIntent } from '@/core';
import { IntentType } from '@/shared';
import type { Vec2 } from '@/shared';
import type { InputConfig } from './types';
import { DEFAULT_INPUT_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Keyboard state (module-level singleton)
// ---------------------------------------------------------------------------

const _heldKeys = new Set<string>();
const _justPressedKeys = new Set<string>();
let _mouseClicked = false;
let _initialized = false;

// Look-up tables built from the active config
let _moveMap: Map<string, Vec2> = new Map();
let _skillMap: Map<string, number> = new Map();
let _interactSet: Set<string> = new Set();

function _buildMaps(config: InputConfig): void {
  _moveMap = new Map(Object.entries(config.moveKeys));
  _skillMap = new Map(Object.entries(config.skillKeys));
  _interactSet = new Set([
    config.interactKey,
    config.interactKey.toUpperCase(),
  ]);
}

// Build maps eagerly with defaults so the system works without
// explicit init() (handy for tests that bypass DOM listeners).
_buildMaps(DEFAULT_INPUT_CONFIG);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise DOM keyboard listeners.
 * Call once at startup after the DOM is ready.
 */
export function initInputSystem(config: InputConfig = DEFAULT_INPUT_CONFIG): void {
  if (_initialized) return;
  _initialized = true;

  _buildMaps(config);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!_heldKeys.has(e.key)) {
      _justPressedKeys.add(e.key);
    }
    _heldKeys.add(e.key);

    // Prevent default for game keys (avoids scrolling etc.)
    if (_moveMap.has(e.key) || _skillMap.has(e.key) || _interactSet.has(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    _heldKeys.delete(e.key);
  });

  // Release all keys on blur so nothing gets stuck
  window.addEventListener('blur', () => {
    _heldKeys.clear();
    _justPressedKeys.clear();
  });

  // Mouse click → INTERACT intent
  if (config.mouseInteract) {
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) { // left button only
        _mouseClicked = true;
      }
    });
  }

  if (import.meta.env.DEV) {
    console.log('[Input] Keyboard listeners initialised');
  }
}

/** Return the set of currently held key strings (for debugging). */
export function getHeldKeys(): string[] {
  return Array.from(_heldKeys);
}

// ---------------------------------------------------------------------------
// ECS system
// ---------------------------------------------------------------------------

function _consumeJustPressed(): string[] {
  const keys = Array.from(_justPressedKeys);
  _justPressedKeys.clear();
  return keys;
}

function _normalize(x: number, y: number): Vec2 | null {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return null;
  return { x: x / len, y: y / len };
}

/**
 * ECS System: reads raw keyboard state each frame and produces abstract
 * Intent commands via pushIntent().
 *
 * Register this system BEFORE movementSystem so movement intents are
 * queued before the movement system reads them.
 */
export function inputSystem(_world: World): void {
  const held = Array.from(_heldKeys);
  const justPressed = _consumeJustPressed();

  // ---- Movement (continuous every frame while held) ----
  let moveX = 0;
  let moveY = 0;
  for (const key of held) {
    const dir = _moveMap.get(key);
    if (dir) {
      moveX += dir.x;
      moveY += dir.y;
    }
  }

  const normalized = _normalize(moveX, moveY);
  if (normalized) {
    pushIntent({
      type: IntentType.MoveDirection,
      direction: normalized,
    });
  }

  // ---- Skill & Interact (edge-triggered, fire once on press) ----
  for (const key of justPressed) {
    const slotIndex = _skillMap.get(key);
    if (slotIndex !== undefined) {
      pushIntent({
        type: IntentType.UseSkill,
        slotIndex,
      });
    }
    if (_interactSet.has(key)) {
      pushIntent({
        type: IntentType.Interact,
      });
    }
  }

  // ---- Mouse click → INTERACT intent ----
  if (_mouseClicked) {
    _mouseClicked = false;
    pushIntent({
      type: IntentType.Interact,
    });
  }
}

// ---------------------------------------------------------------------------
// Test helpers (underscore-prefixed — not part of the public API)
// ---------------------------------------------------------------------------

/** Reset all internal state to defaults (for test isolation). */
export function _resetInputSystem(): void {
  _heldKeys.clear();
  _justPressedKeys.clear();
  _mouseClicked = false;
  _initialized = false;
  _buildMaps(DEFAULT_INPUT_CONFIG);
}

/** Inject mock key state directly, bypassing DOM listeners. */
export function _setMockKeys(held: string[], justPressed: string[]): void {
  _heldKeys.clear();
  _justPressedKeys.clear();
  for (const k of held) _heldKeys.add(k);
  for (const k of justPressed) _justPressedKeys.add(k);
}
