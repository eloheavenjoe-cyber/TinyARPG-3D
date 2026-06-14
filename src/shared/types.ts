import type { Rarity, EquipmentSlot, Attribute, BossPhase, EliteModifier, LandmarkType, IntentType } from './enums';

// ----- 2D / 3D math -----

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ----- Intent -----

export interface MoveDirectionIntent {
  type: IntentType.MoveDirection;
  direction: Vec2;
}

export interface UseSkillIntent {
  type: IntentType.UseSkill;
  slotIndex: number;
}

export interface InteractIntent {
  type: IntentType.Interact;
}

export type Intent = MoveDirectionIntent | UseSkillIntent | InteractIntent;

// ----- Items & Affixes -----

export interface Affix {
  id: string;
  label: string;
  value: number;
  /** Which Stat or Attribute this affix modifies. */
  target: string;
}

export interface ItemSpec {
  id: string;
  name: string;
  baseType: string;
  slot: EquipmentSlot;
  implicitAffix: Affix;
}

export interface Item {
  id: string;
  specId: string;
  rarity: Rarity;
  itemLevel: number;
  implicitAffix: Affix;
  explicitAffixes: Affix[];
}

export interface GroundItem {
  entityId: number;
  item: Item;
  position: Vec3;
}

// ----- Character -----

export interface CharacterStats {
  level: number;
  experience: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  maxLife: number;
  currentLife: number;
  maxMana: number;
  currentMana: number;
}

// ----- Dungeon -----

export interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  landmarkType: LandmarkType | null;
  visited: boolean;
}

export interface Corridor {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  tiles: Vec2[];
}

export interface DungeonLayout {
  seed: number;
  rooms: Room[];
  corridors: Corridor[];
  bossRoomId: string;
  startRoomId: string;
}

// ----- Save -----

export interface SaveSlot {
  id: string;
  characterName: string;
  className: string;
  level: number;
  zoneName: string;
  timestamp: number;
}

// ----- Render -----

/**
 * A single mesh instance to be rendered in the 3D scene.
 * The render system converts 2D ECS position → 3D isometric.
 */
export interface MeshInstance {
  entityId: number;
  meshType: MeshType;
  /** 3D world position (after isometric projection). */
  position: Vec3;
  /** Y-axis rotation in radians (derived from FacingDirection). */
  facingAngle: number;
  scale: number;
  isDead: boolean;
}

/** Kinds of renderable entities in the scene. */
export type MeshType =
  | 'character'
  | 'enemy_melee'
  | 'enemy_ranged'
  | 'ground_item';

/**
 * Floating damage number displayed above an entity.
 */
export interface DamageNumber {
  /** 3D position where the number appeared. */
  position: Vec3;
  /** Raw damage value to display. */
  value: number;
  /** Seconds remaining before this number fades/disappears. */
  lifetime: number;
}

/**
 * Label drawn above a ground loot item.
 */
export interface GroundItemLabel {
  position: Vec3;
  /** Display text (e.g. item name). */
  text: string;
  /** 0 = Normal, 1 = Magic, 2 = Rare. */
  rarityCode: number;
}

/**
 * Telegraph decal for skill AoE previews (projected onto the ground).
 */
export interface TelegraphDecal {
  position: Vec3;
  shape: 'circle' | 'cone' | 'line';
  /** Radius in world units (for circle), length (for line). */
  radius: number;
  /** Orientation angle in radians. */
  angle: number;
  /** Seconds remaining before this decal disappears. */
  lifetime: number;
  /** CSS colour string (e.g. '#ff4444'). */
  color: string;
}

/**
 * Immutable per-frame snapshot of everything the render layer needs.
 * Produced by the projection phase of renderSystem, consumed by the
 * Babylon.js application phase.
 */
export interface RenderSnapshot {
  meshInstances: MeshInstance[];
  damageNumbers: DamageNumber[];
  groundItemLabels: GroundItemLabel[];
  telegraphDecals: TelegraphDecal[];
  /** If > 0, the render phase freezes for this many frames (ECS still runs). */
  hitStopFrames: number;
}

// ----- Passive tree -----

export type PassiveNodeType = 'Passive' | 'Notable' | 'Keystone';

export interface PassiveNode {
  id: string;
  name: string;
  type: PassiveNodeType;
  stats: Affix[];
  connectedNodeIds: string[];
}

export interface PassiveTree {
  nodes: Record<string, PassiveNode>;
  rootNodeId: string;
}
