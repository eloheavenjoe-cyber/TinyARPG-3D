import { defineQuery, hasComponent, removeComponent } from 'bitecs';
import type { World } from '@/core';
import { getDeltaTime } from '@/core';
import { Position, FacingDirection, IsCharacter } from '@/systems/movement';
import { IsEnemy, EnemyType, EnemyTypeEnum } from '@/systems/ai';
import { IsDead } from '@/systems/combat';
import { IsLootable, GroundItemComponent } from '@/systems/loot';
import { DamageNumberEmitter, TelegraphEmitter } from './components';
import { DEFAULT_RENDER_CONFIG, MESH_SCALES, RARITY_LABEL_COLORS } from './types';
import type { RenderConfig, RenderData } from './types';
import type {
  RenderSnapshot,
  MeshInstance,
  MeshType,
  DamageNumber,
  GroundItemLabel,
  TelegraphDecal,
  Vec3,
} from '@/shared';

// Babylon.js imports (tree-shakeable)
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Scene } from '@babylonjs/core/scene';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All entities that have a position and could be rendered. */
const positionedQuery = defineQuery([Position]);

/** Entities that have an active damage-number emitter. */
const dmgEmitterQuery = defineQuery([DamageNumberEmitter]);

/** Entities that have an active telegraph emitter. */
const telegraphQuery = defineQuery([TelegraphEmitter]);

// ---------------------------------------------------------------------------
const RENDER_DATA_KEY = '__renderData';

/** Retrieve the render data object stored on the world. */
export function getRenderData(world: unknown): RenderData | null {
  return (world as Record<string, unknown>)[RENDER_DATA_KEY] as RenderData | null;
}

// ---------------------------------------------------------------------------
// Phase A — Pure projection: 2D ECS world → RenderSnapshot
// ---------------------------------------------------------------------------

/**
 * Convert a 2D position to 3D isometric coordinates.
 *
 * The projection uses an isometric angle (default π/4) and tile size to
 * map the 2D grid into a 3D world where the x-z plane is the ground
 * and y is the up-axis.
 *
 * @param pos       2D world position (ECS coordinates)
 * @param isoAngle  Isometric projection angle in radians
 * @param tileSize  World units per tile
 * @param elevation Y-axis offset (upward). Default 0.
 */
export function projectTo3D(
  pos: { x: number; y: number },
  isoAngle: number,
  tileSize: number,
  elevation = 0,
): Vec3 {
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);
  return {
    x: (pos.x - pos.y) * cosA * tileSize,
    y: elevation,
    z: (pos.x + pos.y) * sinA * tileSize,
  };
}

/**
 * Determine the MeshType for an entity based on its components.
 * Returns null if the entity should not be rendered as a mesh.
 */
function resolveMeshType(world: World, eid: number): MeshType | null {
  // Dead enemies are not rendered
  if (hasComponent(world, IsEnemy, eid)) {
    if (hasComponent(world, IsDead, eid)) return null;
    // Check enemy type for ranged/melee distinction
    if (hasComponent(world, EnemyType, eid) && EnemyType.value[eid] === EnemyTypeEnum.Ranged) {
      return 'enemy_ranged';
    }
    return 'enemy_melee';
  }

  if (hasComponent(world, IsCharacter, eid)) {
    return 'character';
  }

  if (hasComponent(world, IsLootable, eid)) {
    return 'ground_item';
  }

  return null;
}

/**
 * Build a RenderSnapshot from the current ECS world state.
 *
 * This is a **pure projection** — no Babylon.js calls. It can be unit
 * tested independently and is the source of truth for the render layer.
 *
 * @param world  The ECS world to read state from.
 * @param config Render configuration (projection angle, scales, etc.).
 */
export function buildRenderSnapshot(world: World, config: RenderConfig): RenderSnapshot {
  const dt = getDeltaTime(world) / 1000; // Convert ms → seconds
  const meshInstances: MeshInstance[] = [];
  const damageNumbers: DamageNumber[] = [];
  const groundItemLabels: GroundItemLabel[] = [];
  const telegraphDecals: TelegraphDecal[] = [];

  // ---------------------------------------------------------------------------
  // 1. Mesh instances — all entities with Position
  // ---------------------------------------------------------------------------
  const allPos = positionedQuery(world);

  for (const eid of allPos) {
    const meshType = resolveMeshType(world, eid);
    if (!meshType) continue;

    const pos2d = { x: Position.x[eid], y: Position.y[eid] };
    const position = projectTo3D(pos2d, config.isometricAngle, config.tileSize);

    // Facing angle (Y-axis rotation in 3D)
    let facingAngle = 0;
    if (hasComponent(world, FacingDirection, eid)) {
      facingAngle = Math.atan2(FacingDirection.y[eid], FacingDirection.x[eid]);
    }

    const isDead = hasComponent(world, IsDead, eid);
    const scale = MESH_SCALES[meshType] ?? 1;

    meshInstances.push({
      entityId: eid,
      meshType,
      position,
      facingAngle,
      scale,
      isDead,
    });

    // -------------------------------------------------------------------------
    // 1a. Ground item labels
    // -------------------------------------------------------------------------
    if (meshType === 'ground_item' && hasComponent(world, GroundItemComponent, eid)) {
      const labelPosition: Vec3 = {
        ...position,
        y: position.y + config.groundItemLabelHeight,
      };
      const rarityCode = GroundItemComponent.rarityCode[eid];
      groundItemLabels.push({
        position: labelPosition,
        text: `Item Lv.${GroundItemComponent.itemLevel[eid]}`,
        rarityCode,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Damage numbers from emitters
  // ---------------------------------------------------------------------------
  const emitters = dmgEmitterQuery(world);

  for (const eid of emitters) {
    const pos2d = { x: Position.x[eid], y: Position.y[eid] };
    const position = projectTo3D(pos2d, config.isometricAngle, config.tileSize, 0.5);

    damageNumbers.push({
      position,
      value: DamageNumberEmitter.value[eid],
      lifetime: DamageNumberEmitter.lifetime[eid],
    });

    // Remove the emitter after reading it (one-shot)
    // We tick lifetime inside the render system, then GC stale ones
  }

  // Tick emitter lifetimes and remove expired ones
  for (const eid of emitters) {
    DamageNumberEmitter.lifetime[eid] -= dt;
    if (DamageNumberEmitter.lifetime[eid] <= 0) {
      removeComponent(world, DamageNumberEmitter, eid);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Telegraph decals from emitters
  // ---------------------------------------------------------------------------
  const telegraphed = telegraphQuery(world);

  for (const eid of telegraphed) {
    const pos2d = { x: Position.x[eid], y: Position.y[eid] };
    const position = projectTo3D(pos2d, config.isometricAngle, config.tileSize, 0.05);

    // Map shape code to string
    const shapeCode = TelegraphEmitter.shape[eid];
    const shape: 'circle' | 'cone' | 'line' =
      shapeCode === 0 ? 'circle' : shapeCode === 1 ? 'cone' : 'line';

    telegraphDecals.push({
      position,
      shape,
      radius: TelegraphEmitter.radius[eid],
      angle: TelegraphEmitter.angle[eid],
      lifetime: TelegraphEmitter.lifetime[eid],
      color: '#ff4444',
    });
  }

  // Tick telegraph lifetimes and remove expired ones
  for (const eid of telegraphed) {
    TelegraphEmitter.lifetime[eid] -= dt;
    if (TelegraphEmitter.lifetime[eid] <= 0) {
      removeComponent(world, TelegraphEmitter, eid);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Hit-stop (read from snapshot, defaults to 0)
  // ---------------------------------------------------------------------------
  // For now hit-stop is always 0 — a future combat system can write it.
  const hitStopFrames = 0;

  return {
    meshInstances,
    damageNumbers,
    groundItemLabels,
    telegraphDecals,
    hitStopFrames,
  };
}

// ---------------------------------------------------------------------------
// Phase B — Babylon.js scene application
// ---------------------------------------------------------------------------

/** Map a MeshType string to a Babylon.js colour. */
function meshTypeToColor(meshType: MeshType, rarityCode?: number): Color3 {
  switch (meshType) {
    case 'character':
      return new Color3(0.8, 0.2, 0.2);
    case 'enemy_melee':
      return new Color3(0.6, 0.1, 0.1);
    case 'enemy_ranged':
      return new Color3(0.1, 0.2, 0.6);
    case 'ground_item': {
      // Color based on rarity
      switch (rarityCode ?? 0) {
        case 1:  return new Color3(0.25, 0.41, 0.88); // Magic blue
        case 2:  return new Color3(1.0, 0.84, 0.0);   // Rare gold
        default: return new Color3(0.75, 0.75, 0.75); // Normal silver
      }
    }
    default:
      return new Color3(0.5, 0.5, 0.5);
  }
}

/** Get the box dimensions for a given mesh type. */
function meshTypeToSize(meshType: MeshType): { w: number; h: number; d: number } {
  switch (meshType) {
    case 'character':
      return { w: 1, h: 1.5, d: 1 };
    case 'enemy_melee':
      return { w: 0.9, h: 1.2, d: 0.9 };
    case 'enemy_ranged':
      return { w: 0.8, h: 1.1, d: 0.8 };
    case 'ground_item':
      return { w: 0.3, h: 0.3, d: 0.3 };
    default:
      return { w: 1, h: 1, d: 1 };
  }
}

/**
 * Initialize the Babylon.js scene once: camera, lights, ground plane.
 */
function initScene(rd: RenderData): void {
  const { scene } = rd;

  // -----------------------------------------------------------------------
  // Camera — ArcRotateCamera with user input disabled
  // -----------------------------------------------------------------------
  const camera = new ArcRotateCamera(
    'mainCamera',
    -Math.PI / 4,    // alpha (azimuth) — isometric 45°
    Math.PI / 3,     // beta  (pitch)   — 60° from horizontal
    rd.config.cameraHeight,
    Vector3.Zero(),
    scene,
  );
  camera.inputs.clear(); // Disable all user input — camera follows character
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 80;
  rd.camera = camera;

  // -----------------------------------------------------------------------
  // Lights
  // -----------------------------------------------------------------------
  const hemi = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;

  const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), scene);
  dirLight.intensity = 0.5;

  // -----------------------------------------------------------------------
  // Ground plane
  // -----------------------------------------------------------------------
  const ground = MeshBuilder.CreateGround('ground', { width: 200, height: 200 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;
  ground.receiveShadows = true;

  rd.initialized = true;

  if (import.meta.env.DEV) {
    console.log('[Render] Scene initialised (camera, lights, ground)');
  }
}

/**
 * Create or update a Babylon.js mesh for a single MeshInstance.
 */
function upsertMesh(rd: RenderData, instance: MeshInstance): void {
  const { meshCache, scene } = rd;
  const { entityId, meshType, position, facingAngle, scale, isDead } = instance;

  let mesh = meshCache.get(entityId);

  if (!mesh) {
    // ---- Create a new mesh ----
    const size = meshTypeToSize(meshType);
    const rarityCode = meshType === 'ground_item'
      ? 0 // Will be updated below if available
      : undefined;

    mesh = MeshBuilder.CreateBox(`mesh_${entityId}`, {
      width: size.w * scale,
      height: size.h * scale,
      depth: size.d * scale,
    }, scene);

    const mat = new StandardMaterial(`mat_${entityId}`, scene);
    mat.diffuseColor = meshTypeToColor(meshType, rarityCode);
    mesh.material = mat;

    meshCache.set(entityId, mesh);
  }

  // ---- Update transform ----
  mesh.position.set(position.x, position.y, position.z);
  mesh.rotation.y = facingAngle;

  // ---- Dead-state visual ----
  if (isDead) {
    const mat = mesh.material as StandardMaterial;
    if (mat) {
      mat.diffuseColor = new Color3(0.35, 0.35, 0.35); // Gray
      mat.alpha = 0.6;
    }
    mesh.scaling.set(0.6, 0.6, 0.6);
  } else {
    const mat = mesh.material as StandardMaterial;
    if (mat) {
      mat.alpha = 1.0;
    }
    mesh.scaling.set(1, 1, 1);
  }
}

/**
 * Create a billboard plane mesh with text rendered on a DynamicTexture.
 * Used for damage numbers and ground-item labels.
 */
function createTextBillboard(
  rd: RenderData,
  text: string,
  textColor: string,
  fontSize = 28,
): { mesh: AbstractMesh; texture: DynamicTexture } {
  const { scene } = rd;

  const mesh = MeshBuilder.CreatePlane('billboard', { width: 1.5, height: 0.6 }, scene);
  mesh.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;

  const texture = new DynamicTexture('dyn_' + Math.random().toString(36).slice(2), {
    width: 256,
    height: 96,
  }, scene, true);

  texture.drawText(
    text,
    null, null,
    `bold ${fontSize}px monospace`,
    textColor,
    null,
    true,
    true,
  );

  const mat = new StandardMaterial('billboardMat_' + Math.random().toString(36).slice(2), scene);
  mat.diffuseTexture = texture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.backFaceCulling = false;
  mesh.material = mat;

  return { mesh, texture };
}

/**
 * Apply the snapshot to the Babylon.js scene: create/update/dispose meshes,
 * handle damage numbers, move camera, etc.
 */
function applySnapshot(world: World, snapshot: RenderSnapshot): void {
  const rd = getRenderData(world);
  if (!rd) return;

  // Lazy init
  if (!rd.initialized) {
    initScene(rd);
  }

  const { meshCache, dmgNumberCache, labelCache, scene, camera, config } = rd;

  // -------------------------------------------------------------------------
  // 1. Track current entity IDs for cache GC
  // -------------------------------------------------------------------------
  const currentIds = new Set<number>();

  for (const instance of snapshot.meshInstances) {
    currentIds.add(instance.entityId);
    upsertMesh(rd, instance);
  }

  // -------------------------------------------------------------------------
  // 2. Dispose meshes for entities no longer in the snapshot
  // -------------------------------------------------------------------------
  for (const [eid, mesh] of meshCache) {
    if (!currentIds.has(eid)) {
      mesh.dispose();
      meshCache.delete(eid);
    }
  }
  rd.prevEntityIds = currentIds;

  // -------------------------------------------------------------------------
  // 3. Damage numbers
  // -------------------------------------------------------------------------
  // Dispose old damage numbers
  for (const [, dmgData] of dmgNumberCache) {
    dmgData.mesh.dispose();
  }
  dmgNumberCache.clear();

  for (const dn of snapshot.damageNumbers) {
    const color = '#ffffff';
    const { mesh } = createTextBillboard(rd, Math.round(dn.value).toString(), color, 32);
    mesh.position.set(dn.position.x, dn.position.y, dn.position.z);
    // Use a proxy key for damage numbers (they have no entityId)
    const key = dmgNumberCache.size;
    dmgNumberCache.set(key, {
      mesh,
      lifetime: dn.lifetime,
      startY: dn.position.y,
      value: dn.value,
    });
  }

  // -------------------------------------------------------------------------
  // 4. Ground item labels
  // -------------------------------------------------------------------------
  // Dispose old labels
  for (const [, mesh] of labelCache) {
    mesh.dispose();
  }
  labelCache.clear();

  for (const label of snapshot.groundItemLabels) {
    const color = RARITY_LABEL_COLORS[label.rarityCode] ?? '#c0c0c0';
    const { mesh } = createTextBillboard(rd, label.text, color, 20);
    mesh.position.set(label.position.x, label.position.y, label.position.z);
    labelCache.set(labelCache.size, mesh);
  }

  // -------------------------------------------------------------------------
  // 5. Camera follow — track the character mesh
  // -------------------------------------------------------------------------
  let characterPos: Vector3 | null = null;

  for (const instance of snapshot.meshInstances) {
    if (instance.meshType === 'character') {
      characterPos = new Vector3(instance.position.x, 0, instance.position.z);
      break;
    }
  }

  if (camera && characterPos) {
    camera.target = characterPos;
  }
}

// ---------------------------------------------------------------------------
// Render system entry point
// ---------------------------------------------------------------------------

/**
 * renderSystem — the LAST system in the ECS pipeline.
 *
 * **Phase A (pure projection):** Reads ECS state and produces a
 * `RenderSnapshot` containing 3D mesh instances, damage numbers,
 * ground-item labels, and telegraph decals.
 *
 * **Phase B (Babylon.js application):** Applies the snapshot to the
 * scene — creates / updates / disposes meshes, manages billboard
 * text for damage numbers and labels, and updates the camera to
 * follow the character.
 *
 * **Hit-stop:** When `hitStopFrames > 0`, the Babylon.js application
 * phase is skipped for that many frames, freezing the visual state
 * while the ECS pipeline continues to simulate.
 *
 * On first run the system lazily bootstraps the scene (camera,
 * lights, ground plane).
 */
export function renderSystem(world: World): void {
  const rd = getRenderData(world);
  if (!rd) {
    if (import.meta.env.DEV) {
      console.warn('[Render] No render data found on world. Did you forget to initialise?');
    }
    return;
  }

  const config = rd.config;

  // -------------------------------------------------------------------------
  // Phase A — Build snapshot from ECS state
  // -------------------------------------------------------------------------
  const snapshot = buildRenderSnapshot(world, config);

  // -------------------------------------------------------------------------
  // Hit-stop handling
  // -------------------------------------------------------------------------
  if (snapshot.hitStopFrames > 0) {
    rd.hitStopRemaining = snapshot.hitStopFrames;
  }

  if (rd.hitStopRemaining > 0) {
    rd.hitStopRemaining--;
    // Skip Phase B — ECS state updates but visuals freeze
    return;
  }

  // -------------------------------------------------------------------------
  // Phase B — Apply snapshot to Babylon.js scene
  // -------------------------------------------------------------------------
  applySnapshot(world, snapshot);
}

// ---------------------------------------------------------------------------
// Initialisation helper (called from main.ts)
// ---------------------------------------------------------------------------

/**
 * Initialise the render system by storing the Babylon.js scene reference
 * and default config on the world object.
 *
 * Must be called once before the game loop starts.
 *
 * @param world  The ECS world.
 * @param scene  The Babylon.js Scene instance from createEngine().
 * @param config Optional render config override.
 */
export function initRenderSystem(
  world: World,
  scene: Scene,
  config: Partial<RenderConfig> = {},
): void {
  const finalConfig: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...config };

  (world as Record<string, unknown>)[RENDER_DATA_KEY] = {
    scene,
    initialized: false,
    camera: null,
    meshCache: new Map<number, AbstractMesh>(),
    dmgNumberCache: new Map<number, { mesh: AbstractMesh; lifetime: number; startY: number; value: number }>(),
    labelCache: new Map<number, AbstractMesh>(),
    prevEntityIds: new Set<number>(),
    hitStopRemaining: 0,
    config: finalConfig,
  } satisfies RenderData;

  if (import.meta.env.DEV) {
    console.log('[Render] System initialised');
  }
}
