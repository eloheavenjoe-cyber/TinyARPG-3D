// ---------------------------------------------------------------------------
// Render configuration and constants
// ---------------------------------------------------------------------------

/**
 * Tuneable parameters for the isometric render layer.
 */
export interface RenderConfig {
  /** Isometric projection angle (radians). Default: π/4 (45°). */
  isometricAngle: number;
  /** World units per tile. Default: 1. */
  tileSize: number;
  /** Camera orbit radius (distance from target). Default: 30. */
  cameraHeight: number;
  /** Camera pitch angle from horizontal (radians). Default: π/3 (60°). */
  cameraPitch: number;
  /** How long a damage number floats before disappearing (seconds). Default: 1.5. */
  damageNumberDuration: number;
  /** Vertical speed of floating damage numbers (world-units/sec). Default: 2.0. */
  damageNumberRiseSpeed: number;
  /** Height above the entity's base position for ground item labels. Default: 1.2. */
  groundItemLabelHeight: number;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  isometricAngle: Math.PI / 4,
  tileSize: 1,
  cameraHeight: 30,
  cameraPitch: Math.PI / 3,
  damageNumberDuration: 1.5,
  damageNumberRiseSpeed: 2.0,
  groundItemLabelHeight: 1.2,
};

/**
 * CSS colour strings for each item-rarity tier.
 * Keys are the numeric rarity codes stored on GroundItemComponent.
 *   0 (Normal) → silver, 1 (Magic) → blue, 2 (Rare) → gold
 */
export const RARITY_LABEL_COLORS: Record<number, string> = {
  0: '#c0c0c0',
  1: '#4169e1',
  2: '#ffd700',
};

/**
 * Scale multipliers applied when creating mesh instances.
 */
export const MESH_SCALES: Record<string, number> = {
  character: 1.0,
  enemy_melee: 0.9,
  enemy_ranged: 0.8,
  ground_item: 0.3,
};

// ---------------------------------------------------------------------------
// Internal render state (stored on world.__renderData)
// ---------------------------------------------------------------------------

import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import type { Scene } from '@babylonjs/core/scene';

/**
 * Mutable render state stored on `(world as any).__renderData`.
 * Initialized by `initRenderSystem()` and consumed by the render system
 * each frame.
 */
export interface RenderData {
  scene: Scene;
  initialized: boolean;
  camera: ArcRotateCamera | null;
  /** entityId → Babylon.js mesh for characters / enemies / items. */
  meshCache: Map<number, AbstractMesh>;
  /** EntityId → damage-number billboard data. */
  dmgNumberCache: Map<number, { mesh: AbstractMesh; lifetime: number; startY: number; value: number }>;
  /** EntityId → ground-item label mesh. */
  labelCache: Map<number, AbstractMesh>;
  /** Track previous frame's entity IDs for cache GC. */
  prevEntityIds: Set<number>;
  /** Hit-stop counter (frames remaining). */
  hitStopRemaining: number;
  config: RenderConfig;
}
