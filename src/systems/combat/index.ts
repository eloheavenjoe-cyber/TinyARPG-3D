export { combatSystem } from './combatSystem';
export {
  Life,
  Damage,
  SkillSlot,
  CooldownTimer,
  CooldownDuration,
  IsDead,
} from './components';
export { DEFAULT_SKILLS, DEFAULT_COMBAT_CONFIG, SKILL_CODE_MAP, skillIdFromCode } from './types';
export type { ActiveSkill, SkillRegistry, SkillRangeType, CombatConfig } from './types';
export { registerCombatDebugCommands } from './debugCommands';
