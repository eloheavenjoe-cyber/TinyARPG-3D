// ---------------------------------------------------------------------------
// UI Configuration
// ---------------------------------------------------------------------------

/**
 * Tuneable parameters for the HUD overlay layout.
 * Positions are in Babylon.js GUI relative coordinates:
 *   0 = center, negative = left/bottom, positive = right/top.
 */
export interface UIConfig {
  /** Life orb position (fraction of screen, top-left) */
  lifeOrbX: number;
  lifeOrbY: number;
  lifeOrbSize: number;

  /** Mana orb position */
  manaOrbX: number;
  manaOrbY: number;
  manaOrbSize: number;

  /** Hotbar position */
  hotbarX: number;
  hotbarY: number;
  hotbarSlotSize: number;
  hotbarSlotGap: number;

  /** XP bar position */
  xpBarX: number;
  xpBarY: number;
  xpBarWidth: number;
  xpBarHeight: number;

  /** Minimap position */
  minimapX: number;
  minimapY: number;
  minimapSize: number;
}

export const DEFAULT_UI_CONFIG: UIConfig = {
  lifeOrbX: 60, lifeOrbY: -80, lifeOrbSize: 70,
  manaOrbX: -60, manaOrbY: -80, manaOrbSize: 70,
  hotbarX: 0, hotbarY: -80, hotbarSlotSize: 50, hotbarSlotGap: 8,
  xpBarX: 0, xpBarY: -130, xpBarWidth: 400, xpBarHeight: 10,
  minimapX: -110, minimapY: 110, minimapSize: 160,
};

/**
 * Display names for each skill code shown in the hotbar.
 * Key = skill code (matching SkillSlot.skillId_N).
 */
export const SKILL_DISPLAY_NAMES: Record<number, string> = {
  1: 'Basic Attack',
  2: 'Cleave',
  3: 'Power Strike',
  4: 'War Cry',
};
