import { addEntity, addComponent } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from './components';
import { DEFAULT_MOVEMENT_CONFIG } from './types';

export function registerMovementDebugCommands(): void {
  registerDebugCommands({
    /** Set the Character's movement speed. */
    'move.speed': (n = '5') => {
      const world = getDebugWorld();
      const eid = findCharacter(world);
      if (eid === null) {
        console.warn('[debug] move.speed: no Character entity exists. Use move.spawn first.');
        return;
      }
      MovementSpeed.value[eid] = parseFloat(n);
      console.log(`[debug] Movement speed set to ${n}`);
    },

    /** Teleport the Character to (x, y). */
    'move.pos': (x = '0', y = '0') => {
      const world = getDebugWorld();
      const eid = findCharacter(world);
      if (eid === null) {
        console.warn('[debug] move.pos: no Character entity exists. Use move.spawn first.');
        return;
      }
      Position.x[eid] = parseFloat(x);
      Position.y[eid] = parseFloat(y);
      console.log(`[debug] Character teleported to (${x}, ${y})`);
    },

    /** Print the Character's current position and velocity. */
    'move.where': () => {
      const world = getDebugWorld();
      const eid = findCharacter(world);
      if (eid === null) {
        console.log('[debug] move.where: no Character entity.');
        return;
      }
      console.log(
        `[debug] Character pos=(${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)}) ` +
        `vel=(${Velocity.x[eid].toFixed(2)}, ${Velocity.y[eid].toFixed(2)}) ` +
        `speed=${MovementSpeed.value[eid]}`,
      );
    },

    /** Spawn a Character entity for testing. */
    'move.spawn': () => {
      const world = getDebugWorld();
      const existing = findCharacter(world);
      if (existing !== null) {
        console.log(`[debug] move.spawn: Character already exists (eid=${existing}). Spawning additional one.`);
      }
      const eid = addEntity(world);
      addComponent(world, Position, eid);
      addComponent(world, Velocity, eid);
      addComponent(world, MovementSpeed, eid);
      addComponent(world, FacingDirection, eid);
      addComponent(world, IsCharacter, eid);

      Position.x[eid] = 0;
      Position.y[eid] = 0;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      MovementSpeed.value[eid] = DEFAULT_MOVEMENT_CONFIG.defaultSpeed;
      FacingDirection.x[eid] = 1;
      FacingDirection.y[eid] = 0;

      console.log(`[debug] Character spawned at origin (eid=${eid}, speed=${DEFAULT_MOVEMENT_CONFIG.defaultSpeed})`);
    },
  });
}

function findCharacter(world: ReturnType<typeof getDebugWorld>): number | null {
  // Manual scan since we can't import the query here (circular-ish)
  // bitecs getAllEntities + hasComponent
  const { getAllEntities, hasComponent } = require('bitecs') as typeof import('bitecs');
  for (const eid of getAllEntities(world)) {
    if (hasComponent(world, IsCharacter, eid)) {
      return eid;
    }
  }
  return null;
}
