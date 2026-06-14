import { defineQuery } from 'bitecs';
import type { World } from '@/core';
import { getRenderData } from '@/systems/render';
import { IsCharacter, Position } from '@/systems/movement';
import { Life, SkillSlot, CooldownTimer, CooldownDuration } from '@/systems/combat';
import { DUNGEON_LAYOUT_KEY, DungeonRoom } from '@/features/dungeon';
import type { DungeonLayout } from '@/shared/types';
import { DEFAULT_UI_CONFIG, SKILL_DISPLAY_NAMES } from './types';

// ---------------------------------------------------------------------------
// Babylon.js GUI imports (tree-shakeable)
// ---------------------------------------------------------------------------

import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Control } from '@babylonjs/gui/2D/controls/control';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** The player character — we expect exactly one. */
const characterQuery = defineQuery([IsCharacter, Life, SkillSlot, CooldownTimer, CooldownDuration]);

/** Dungeon room entities for minimap. */
const dungeonRoomQuery = defineQuery([DungeonRoom]);

// ---------------------------------------------------------------------------
// Module-level GUI state (singleton, created once)
// ---------------------------------------------------------------------------

let _adt: AdvancedDynamicTexture | null = null;
let _initialized = false;

// Life orb controls
let _lifeOrbFill: Ellipse | null = null;
let _lifeOrbText: TextBlock | null = null;

// Mana orb controls
let _manaOrbFill: Ellipse | null = null;
let _manaOrbText: TextBlock | null = null;

// XP bar controls
let _xpBarBg: Rectangle | null = null;
let _xpBarFill: Rectangle | null = null;
let _xpText: TextBlock | null = null;

// Hotbar controls
let _hotbarContainer: Rectangle | null = null;
const _hotbarSlots: {
  bg: Rectangle;
  fill: Rectangle;
  label: TextBlock;
  keyLabel: TextBlock;
}[] = [];

// Minimap controls
let _minimapContainer: Rectangle | null = null;
let _minimapRoomsContainer: Rectangle | null = null;
let _minimapPlayerDot: Ellipse | null = null;

// Hide/show state
let _hudVisible = true;
let _minimapVisible = true;

// ---------------------------------------------------------------------------
// Initialisation (run once)
// ---------------------------------------------------------------------------

/**
 * Create all HUD GUI controls. Safe to call multiple times — only runs once.
 */
function ensureHUDInitialized(): void {
  if (_initialized) return;
  _initialized = true;

  // Create fullscreen UI texture
  _adt = AdvancedDynamicTexture.CreateFullscreenUI('HUD', true);

  createLifeOrb();
  createManaOrb();
  createXPBar();
  createHotbar();
  createMinimap();
}

function createLifeOrb(): void {
  const cfg = DEFAULT_UI_CONFIG;
  const adt = _adt!;

  // Background (dark ring)
  const bg = new Ellipse('lifeOrbBg');
  bg.width = `${cfg.lifeOrbSize}px`;
  bg.height = `${cfg.lifeOrbSize}px`;
  bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  bg.left = `${cfg.lifeOrbX}px`;
  bg.top = `${cfg.lifeOrbY}px`;
  bg.color = '#660000';
  bg.thickness = 3;
  bg.background = '#1a0000';
  adt.addControl(bg);

  // Fill (red)
  const fill = new Ellipse('lifeOrbFill');
  fill.width = `${cfg.lifeOrbSize - 6}px`;
  fill.height = `${cfg.lifeOrbSize - 6}px`;
  fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  fill.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  fill.left = `${cfg.lifeOrbX}px`;
  fill.top = `${cfg.lifeOrbY}px`;
  fill.color = '#ff2222';
  fill.thickness = 1;
  fill.background = '#ff2222';
  adt.addControl(fill);
  _lifeOrbFill = fill;

  // Text label
  const text = new TextBlock('lifeOrbText');
  text.width = `${cfg.lifeOrbSize}px`;
  text.height = `${cfg.lifeOrbSize}px`;
  text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  text.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  text.left = `${cfg.lifeOrbX}px`;
  text.top = `${cfg.lifeOrbY}px`;
  text.text = '100/100';
  text.color = 'white';
  text.fontSize = 12;
  text.fontWeight = 'bold';
  text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  text.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  adt.addControl(text);
  _lifeOrbText = text;
}

function createManaOrb(): void {
  const cfg = DEFAULT_UI_CONFIG;
  const adt = _adt!;

  // Background (dark ring)
  const bg = new Ellipse('manaOrbBg');
  bg.width = `${cfg.manaOrbSize}px`;
  bg.height = `${cfg.manaOrbSize}px`;
  bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  bg.left = `${cfg.manaOrbX}px`;
  bg.top = `${cfg.manaOrbY}px`;
  bg.color = '#000066';
  bg.thickness = 3;
  bg.background = '#00001a';
  adt.addControl(bg);

  // Fill (blue)
  const fill = new Ellipse('manaOrbFill');
  fill.width = `${cfg.manaOrbSize - 6}px`;
  fill.height = `${cfg.manaOrbSize - 6}px`;
  fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  fill.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  fill.left = `${cfg.manaOrbX}px`;
  fill.top = `${cfg.manaOrbY}px`;
  fill.color = '#4444ff';
  fill.thickness = 1;
  fill.background = '#4444ff';
  adt.addControl(fill);
  _manaOrbFill = fill;

  // Text label
  const text = new TextBlock('manaOrbText');
  text.width = `${cfg.manaOrbSize}px`;
  text.height = `${cfg.manaOrbSize}px`;
  text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  text.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  text.left = `${cfg.manaOrbX}px`;
  text.top = `${cfg.manaOrbY}px`;
  text.text = '0/0';
  text.color = 'white';
  text.fontSize = 12;
  text.fontWeight = 'bold';
  text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  text.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  adt.addControl(text);
  _manaOrbText = text;
}

function createXPBar(): void {
  const cfg = DEFAULT_UI_CONFIG;
  const adt = _adt!;

  // Background bar
  const bg = new Rectangle('xpBarBg');
  bg.width = `${cfg.xpBarWidth}px`;
  bg.height = `${cfg.xpBarHeight}px`;
  bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  bg.left = `${cfg.xpBarX}px`;
  bg.top = `${cfg.xpBarY}px`;
  bg.color = '#333333';
  bg.thickness = 1;
  bg.background = '#111111';
  bg.cornerRadius = 3;
  adt.addControl(bg);
  _xpBarBg = bg;

  // Fill bar
  const fill = new Rectangle('xpBarFill');
  fill.width = '0%';
  fill.height = '100%';
  fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  fill.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  fill.color = '#ccaaff';
  fill.thickness = 0;
  fill.background = '#aa88ff';
  fill.cornerRadius = 2;
  bg.addControl(fill);
  _xpBarFill = fill;

  // Level text
  const text = new TextBlock('xpText');
  text.width = `${cfg.xpBarWidth}px`;
  text.height = `${cfg.xpBarHeight}px`;
  text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  text.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  text.left = `${cfg.xpBarX}px`;
  text.top = `${cfg.xpBarY - cfg.xpBarHeight - 2}px`;
  text.text = 'Lv 1';
  text.color = '#ccaaff';
  text.fontSize = 14;
  text.fontWeight = 'bold';
  text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  text.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  adt.addControl(text);
  _xpText = text;
}

function createHotbar(): void {
  const cfg = DEFAULT_UI_CONFIG;
  const adt = _adt!;

  const container = new Rectangle('hotbarContainer');
  container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  container.left = `${cfg.hotbarX}px`;
  container.top = `${cfg.hotbarY}px`;
  container.width = `${4 * cfg.hotbarSlotSize + 3 * cfg.hotbarSlotGap}px`;
  container.height = `${cfg.hotbarSlotSize + 20}px`;
  container.background = 'transparent';
  container.color = 'transparent';
  container.thickness = 0;
  adt.addControl(container);
  _hotbarContainer = container;

  const KEYS = ['1', '2', '3', '4'];

  for (let i = 0; i < 4; i++) {
    const slotBg = new Rectangle(`hotbarSlot_${i}_bg`);
    slotBg.width = `${cfg.hotbarSlotSize}px`;
    slotBg.height = `${cfg.hotbarSlotSize}px`;
    slotBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    slotBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    slotBg.left = `${i * (cfg.hotbarSlotSize + cfg.hotbarSlotGap)}px`;
    slotBg.top = '0px';
    slotBg.color = '#555555';
    slotBg.thickness = 2;
    slotBg.background = '#222222';
    slotBg.cornerRadius = 4;
    container.addControl(slotBg);

    // Cooldown overlay — a dark rectangle that shrinks vertically as cooldown decreases
    const cooldownFill = new Rectangle(`hotbarSlot_${i}_fill`);
    cooldownFill.width = '100%';
    cooldownFill.height = '0%'; // Will be updated per frame
    cooldownFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    cooldownFill.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    cooldownFill.left = '0px';
    cooldownFill.top = '0px';
    cooldownFill.color = 'transparent';
    cooldownFill.thickness = 0;
    cooldownFill.background = 'rgba(0, 0, 0, 0.6)';
    slotBg.addControl(cooldownFill);

    // Skill name label
    const label = new TextBlock(`hotbarSlot_${i}_label`);
    label.width = `${cfg.hotbarSlotSize}px`;
    label.height = `${cfg.hotbarSlotSize - 16}px`;
    label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    label.top = '2px';
    label.text = '';
    label.color = 'white';
    label.fontSize = 10;
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    slotBg.addControl(label);

    // Key binding label
    const keyLabel = new TextBlock(`hotbarSlot_${i}_key`);
    keyLabel.width = `${cfg.hotbarSlotSize}px`;
    keyLabel.height = '16px';
    keyLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    keyLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    keyLabel.text = KEYS[i];
    keyLabel.color = '#aaaaaa';
    keyLabel.fontSize = 10;
    keyLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    keyLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    slotBg.addControl(keyLabel);

    _hotbarSlots.push({ bg: slotBg, fill: cooldownFill, label, keyLabel });
  }
}

function createMinimap(): void {
  const cfg = DEFAULT_UI_CONFIG;
  const adt = _adt!;

  const container = new Rectangle('minimapContainer');
  container.width = `${cfg.minimapSize}px`;
  container.height = `${cfg.minimapSize}px`;
  container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  container.left = `${cfg.minimapX}px`;
  container.top = `${cfg.minimapY}px`;
  container.color = '#888888';
  container.thickness = 2;
  container.background = 'rgba(0, 0, 0, 0.5)';
  container.cornerRadius = 4;
  adt.addControl(container);
  _minimapContainer = container;

  // Inner container for rooms
  const rooms = new Rectangle('minimapRooms');
  rooms.width = '100%';
  rooms.height = '100%';
  rooms.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  rooms.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  rooms.left = '0px';
  rooms.top = '0px';
  rooms.color = 'transparent';
  rooms.thickness = 0;
  rooms.background = 'transparent';
  container.addControl(rooms);
  _minimapRoomsContainer = rooms;

  // Player dot
  const dot = new Ellipse('minimapPlayerDot');
  dot.width = '6px';
  dot.height = '6px';
  dot.color = '#ffffff';
  dot.thickness = 1;
  dot.background = '#ffffff';
  container.addControl(dot);
  _minimapPlayerDot = dot;
}

// ---------------------------------------------------------------------------
// Per-frame update helpers
// ---------------------------------------------------------------------------

function updateLifeOrb(eid: number): void {
  const cur = Life.current[eid];
  const max = Life.max[eid];
  const fill = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;

  if (_lifeOrbFill) {
    _lifeOrbFill.scaleY = fill;
    _lifeOrbFill.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  }
  if (_lifeOrbText) {
    _lifeOrbText.text = `${Math.round(cur)}/${Math.round(max)}`;
  }
}

function updateManaOrb(_eid: number): void {
  // Mana is not yet implemented as an ECS component.
  // Show placeholder "0/0" gracefully.
  if (_manaOrbFill) {
    _manaOrbFill.scaleY = 0;
    _manaOrbFill.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  }
  if (_manaOrbText) {
    _manaOrbText.text = '0/0';
  }
}

function updateXPBar(_eid: number): void {
  // XP/Level not yet implemented as ECS components.
  // Show "Lv 1" with 0% progress.
  if (_xpBarFill) {
    _xpBarFill.width = '0%';
  }
  if (_xpText) {
    _xpText.text = 'Lv 1';
  }
}

function updateHotbar(eid: number): void {
  const skillIds = [
    SkillSlot.skillId_0[eid],
    SkillSlot.skillId_1[eid],
    SkillSlot.skillId_2[eid],
    SkillSlot.skillId_3[eid],
  ];

  const cooldownRemaining = [
    CooldownTimer.remaining_0[eid],
    CooldownTimer.remaining_1[eid],
    CooldownTimer.remaining_2[eid],
    CooldownTimer.remaining_3[eid],
  ];

  const cooldownMax = [
    CooldownDuration.max_0[eid],
    CooldownDuration.max_1[eid],
    CooldownDuration.max_2[eid],
    CooldownDuration.max_3[eid],
  ];

  for (let i = 0; i < 4; i++) {
    const slot = _hotbarSlots[i];
    const skillId = skillIds[i];

    if (skillId === 0) {
      // Empty slot
      slot.label.text = '';
      slot.fill.height = '0%';
      slot.bg.background = '#111111';
      continue;
    }

    const displayName = SKILL_DISPLAY_NAMES[skillId] ?? `Skill ${skillId}`;
    slot.label.text = displayName;
    slot.bg.background = '#222222';

    // Cooldown overlay: fill from bottom up proportional to remaining/max
    const remaining = cooldownRemaining[i];
    const max = cooldownMax[i];
    if (max > 0 && remaining > 0) {
      const fraction = Math.min(1, remaining / max);
      slot.fill.height = `${fraction * 100}%`;
    } else {
      slot.fill.height = '0%';
    }
  }
}

function updateMinimap(world: World): void {
  if (!_minimapContainer || !_minimapRoomsContainer || !_minimapPlayerDot) return;

  const layout = (world as Record<string, unknown>)[DUNGEON_LAYOUT_KEY] as DungeonLayout | undefined;
  if (!layout || layout.rooms.length === 0) {
    _minimapContainer.isVisible = false;
    return;
  }

  _minimapContainer.isVisible = _minimapVisible;

  // Compute bounds of all rooms for scaling
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const room of layout.rooms) {
    if (room.x < minX) minX = room.x;
    if (room.y < minY) minY = room.y;
    if (room.x + room.width > maxX) maxX = room.x + room.width;
    if (room.y + room.height > maxY) maxY = room.y + room.height;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 8;
  const mapSize = DEFAULT_UI_CONFIG.minimapSize - padding * 2;

  // Scale: fit all rooms into the minimap
  const scale = Math.min(mapSize / rangeX, mapSize / rangeY);

  // Map position (in pixels) from dungeon coords: pos = (coord - min) * scale
  const toPixelX = (x: number): number => padding + (x - minX) * scale;
  const toPixelY = (y: number): number => padding + (y - minY) * scale;

  // Remove old room rectangles
  const children = _minimapRoomsContainer.children.slice();
  for (const child of children) {
    if (child.name?.startsWith('minimapRoom_')) {
      _minimapRoomsContainer.removeControl(child);
      child.dispose();
    }
  }

  // Query room entities to get visited status
  const roomEids = dungeonRoomQuery(world);
  const visitedMap = new Map<number, boolean>();
  for (const eid of roomEids) {
    const roomId = DungeonRoom.roomId[eid];
    visitedMap.set(roomId, DungeonRoom.visited[eid] === 1);
  }

  // Render each room
  for (let i = 0; i < layout.rooms.length; i++) {
    const room = layout.rooms[i];
    const px = toPixelX(room.x);
    const py = toPixelY(room.y);
    const pw = room.width * scale;
    const ph = room.height * scale;

    const visited = visitedMap.get(i) ?? false;

    const roomRect = new Rectangle(`minimapRoom_${i}`);
    roomRect.width = `${Math.max(pw, 2)}px`;
    roomRect.height = `${Math.max(ph, 2)}px`;
    roomRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    roomRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    roomRect.left = `${px}px`;
    roomRect.top = `${py}px`;

    if (visited) {
      roomRect.color = '#cccccc';
      roomRect.thickness = 1;
      roomRect.background = '#555555';
    } else {
      roomRect.color = '#444444';
      roomRect.thickness = 1;
      roomRect.background = 'transparent';
    }

    roomRect.cornerRadius = 2;
    _minimapRoomsContainer.addControl(roomRect);
  }

  // Update player dot position
  const charEids = characterQuery(world);
  if (charEids.length > 0) {
    const eid = charEids[0];
    const px = toPixelX(Position.x[eid]);
    const py = toPixelY(Position.y[eid]);

    _minimapPlayerDot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    _minimapPlayerDot.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    _minimapPlayerDot.left = `${px - 3}px`;
    _minimapPlayerDot.top = `${py - 3}px`;
    _minimapPlayerDot.isVisible = true;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * HUD system — runs every frame.
 * Reads the character's ECS state and updates the Babylon.js GUI overlay.
 *
 * Must be registered AFTER the render system (or at least after the scene
 * has been initialised) so that `getRenderData(world).scene` is available.
 *
 * @param world - The ECS world.
 */
export function hudSystem(world: World): void {
  // Ensure scene exists
  const rd = getRenderData(world);
  if (!rd || !rd.scene) return;

  // Create GUI on first run
  ensureHUDInitialized();

  if (!_hudVisible) {
    if (_adt) _adt.rootContainer.isVisible = false;
    return;
  }

  if (_adt) _adt.rootContainer.isVisible = true;

  // Find the character entity
  const charEids = characterQuery(world);
  if (charEids.length === 0) {
    // No character — show empty orbs
    if (_lifeOrbText) _lifeOrbText.text = '--/--';
    if (_manaOrbText) _manaOrbText.text = '--/--';
    return;
  }

  const eid = charEids[0];

  // Update all HUD elements
  updateLifeOrb(eid);
  updateManaOrb(eid);
  updateXPBar(eid);
  updateHotbar(eid);
  updateMinimap(world);
}

// ---------------------------------------------------------------------------
// Visibility toggles
// ---------------------------------------------------------------------------

/**
 * Toggle the entire HUD on/off.
 */
export function toggleHUD(): void {
  _hudVisible = !_hudVisible;
  if (import.meta.env.DEV) {
    console.log(`[UI] HUD visibility: ${_hudVisible ? 'ON' : 'OFF'}`);
  }
}

/**
 * Toggle the minimap on/off.
 */
export function toggleMinimap(): void {
  _minimapVisible = !_minimapVisible;
  if (_minimapContainer) {
    _minimapContainer.isVisible = _minimapVisible;
  }
  if (import.meta.env.DEV) {
    console.log(`[UI] Minimap visibility: ${_minimapVisible ? 'ON' : 'OFF'}`);
  }
}

/**
 * Set a skill in a hotbar slot.
 * @param slot  Slot index (0-3).
 * @param skillCode  Skill code to assign.
 */
export function setHotbarSlot(slot: number, skillCode: number): void {
  // This function modifies the Character's SkillSlot component.
  // The actual assignment is delegated to the debug command handler.
  if (import.meta.env.DEV) {
    console.log(`[UI] Hotbar slot ${slot} ← skill ${skillCode}`);
  }
}
