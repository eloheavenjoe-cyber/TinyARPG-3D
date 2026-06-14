import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from 'bitecs';
import type { World } from '@/core';
import { intentQueue } from '@/core';
import { IntentType } from '@/shared';
import type { MoveDirectionIntent, UseSkillIntent } from '@/shared';
import { inputSystem, _resetInputSystem, _setMockKeys } from './inputSystem';

describe('inputSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
    _resetInputSystem();
    // Clear any intents left over from previous tests
    intentQueue.splice(0, intentQueue.length);
  });

  // -----------------------------------------------------------------------
  // Movement — continuous (every frame while held)
  // -----------------------------------------------------------------------

  it('produces MOVE_DIRECTION intent up for W key', () => {
    _setMockKeys(['w'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as MoveDirectionIntent;
    expect(intent.type).toBe(IntentType.MoveDirection);
    expect(intent.direction.x).toBeCloseTo(0);
    expect(intent.direction.y).toBeCloseTo(-1);
  });

  it('produces MOVE_DIRECTION intent down for S key', () => {
    _setMockKeys(['s'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as MoveDirectionIntent;
    expect(intent.direction.x).toBeCloseTo(0);
    expect(intent.direction.y).toBeCloseTo(1);
  });

  it('produces MOVE_DIRECTION intent left for A key', () => {
    _setMockKeys(['a'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as MoveDirectionIntent;
    expect(intent.direction.x).toBeCloseTo(-1);
    expect(intent.direction.y).toBeCloseTo(0);
  });

  it('produces MOVE_DIRECTION intent right for D key', () => {
    _setMockKeys(['d'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as MoveDirectionIntent;
    expect(intent.direction.x).toBeCloseTo(1);
    expect(intent.direction.y).toBeCloseTo(0);
  });

  it('supports Arrow keys for movement', () => {
    _setMockKeys(['ArrowUp'], []);
    inputSystem(world);

    expect((intentQueue[0] as MoveDirectionIntent).direction.y).toBeCloseTo(-1);
  });

  it('supports uppercase WASD for movement', () => {
    _setMockKeys(['W'], []);
    inputSystem(world);

    expect((intentQueue[0] as MoveDirectionIntent).direction.y).toBeCloseTo(-1);
  });

  // -----------------------------------------------------------------------
  // Diagonal movement — normalisation
  // -----------------------------------------------------------------------

  it('normalizes diagonal movement (W+D → up-right)', () => {
    _setMockKeys(['w', 'd'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as MoveDirectionIntent;
    const expected = 1 / Math.sqrt(2);
    expect(intent.direction.x).toBeCloseTo(expected);
    expect(intent.direction.y).toBeCloseTo(-expected);
  });

  it('normalizes diagonal movement (S+A → down-left)', () => {
    _setMockKeys(['s', 'a'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as MoveDirectionIntent;
    const expected = 1 / Math.sqrt(2);
    expect(intent.direction.x).toBeCloseTo(-expected);
    expect(intent.direction.y).toBeCloseTo(expected);
  });

  it('opposing directions cancel out → no movement intent', () => {
    _setMockKeys(['w', 's'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(0);
  });

  it('all four directions cancel out → no movement intent', () => {
    _setMockKeys(['w', 'a', 's', 'd'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Skill keys — edge-triggered (press only, not hold)
  // -----------------------------------------------------------------------

  it('produces USE_SKILL intent for key 1 (slot 0) on press', () => {
    _setMockKeys([], ['1']);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0] as UseSkillIntent;
    expect(intent.type).toBe(IntentType.UseSkill);
    expect(intent.slotIndex).toBe(0);
  });

  it('maps key 2 to slot 1', () => {
    _setMockKeys([], ['2']);
    inputSystem(world);
    expect((intentQueue[0] as UseSkillIntent).slotIndex).toBe(1);
  });

  it('maps key 3 to slot 2', () => {
    _setMockKeys([], ['3']);
    inputSystem(world);
    expect((intentQueue[0] as UseSkillIntent).slotIndex).toBe(2);
  });

  it('maps key 4 to slot 3', () => {
    _setMockKeys([], ['4']);
    inputSystem(world);
    expect((intentQueue[0] as UseSkillIntent).slotIndex).toBe(3);
  });

  it('does NOT fire USE_SKILL for held skill keys (edge-triggered)', () => {
    // First frame: press 1
    _setMockKeys([], ['1']);
    inputSystem(world);
    expect(intentQueue).toHaveLength(1);

    // Second frame: key is held but not newly pressed
    _resetInputSystem();
    intentQueue.splice(0, intentQueue.length);
    _setMockKeys(['1'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Interact key — edge-triggered
  // -----------------------------------------------------------------------

  it('produces INTERACT intent for E key on press', () => {
    _setMockKeys([], ['e']);
    inputSystem(world);

    expect(intentQueue).toHaveLength(1);
    const intent = intentQueue[0];
    expect(intent.type).toBe(IntentType.Interact);
  });

  it('does NOT fire INTERACT for held E key (edge-triggered)', () => {
    _setMockKeys([], ['e']);
    inputSystem(world);
    expect(intentQueue).toHaveLength(1);

    _resetInputSystem();
    intentQueue.splice(0, intentQueue.length);
    _setMockKeys(['e'], []);
    inputSystem(world);

    expect(intentQueue).toHaveLength(0);
  });

  it('supports uppercase E for interact', () => {
    _setMockKeys([], ['E']);
    inputSystem(world);
    expect(intentQueue[0].type).toBe(IntentType.Interact);
  });

  // -----------------------------------------------------------------------
  // Combined input
  // -----------------------------------------------------------------------

  it('handles simultaneous movement and skill press', () => {
    _setMockKeys(['w'], ['1']);
    inputSystem(world);

    expect(intentQueue).toHaveLength(2);
    const types = intentQueue.map(i => i.type);
    expect(types).toContain(IntentType.MoveDirection);
    expect(types).toContain(IntentType.UseSkill);
  });

  it('handles simultaneous movement, skill, and interact', () => {
    _setMockKeys(['w', 'd'], ['1', 'e']);
    inputSystem(world);

    expect(intentQueue).toHaveLength(3);
    const types = intentQueue.map(i => i.type);
    expect(types).toContain(IntentType.MoveDirection);
    expect(types).toContain(IntentType.UseSkill);
    expect(types).toContain(IntentType.Interact);
  });

  // -----------------------------------------------------------------------
  // Boundary cases
  // -----------------------------------------------------------------------

  it('produces no intents when no keys are pressed', () => {
    _setMockKeys([], []);
    inputSystem(world);
    expect(intentQueue).toHaveLength(0);
  });

  it('ignores unknown keys', () => {
    _setMockKeys(['F'], ['Enter']);
    inputSystem(world);
    expect(intentQueue).toHaveLength(0);
  });
});
