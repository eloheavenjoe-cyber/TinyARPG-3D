// ----- Core enums used across all modules -----

/** Rarity tier of an Item. Determines affix count and label colour. */
export enum Rarity {
  Normal = 'Normal',
  Magic = 'Magic',
  Rare = 'Rare',
}

/** Equipment slot positions on the Character. */
export enum EquipmentSlot {
  Weapon = 'Weapon',
  Helmet = 'Helmet',
  ChestArmour = 'ChestArmour',
  Gloves = 'Gloves',
  Boots = 'Boots',
}

/** Core Attributes that feed into derived Stats. */
export enum Attribute {
  Strength = 'Strength',
  Dexterity = 'Dexterity',
  Intelligence = 'Intelligence',
}

/** Intent commands — abstract input that ECS systems consume. */
export enum IntentType {
  MoveDirection = 'MOVE_DIRECTION',
  UseSkill = 'USE_SKILL',
  Interact = 'INTERACT',
}

/** Boss behaviour Phases triggered by Life thresholds. */
export enum BossPhase {
  One = 1,
  Two = 2,
  Three = 3,
}

/** Elite enemy modifier types. */
export enum EliteModifier {
  Enraged = 'Enraged',
  Spectral = 'Spectral',
  Shielded = 'Shielded',
  Bloodthirsty = 'Bloodthirsty',
}

/** Landmark Room types placed in Dungeons. */
export enum LandmarkType {
  BossRoom = 'BossRoom',
  VendorRoom = 'VendorRoom',
  LootRoom = 'LootRoom',
}
