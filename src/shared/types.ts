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

export interface RenderSnapshot {
  meshInstances: unknown[];
  damageNumbers: unknown[];
  groundItemLabels: unknown[];
  telegraphDecals: unknown[];
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
