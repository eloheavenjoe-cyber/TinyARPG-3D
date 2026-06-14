import { getAllEntities, hasComponent } from 'bitecs';
import { registerDebugCommands, getDebugWorld } from '@/debug';
import { IsCharacter } from '@/systems/movement';
import { IsEnemy } from '@/systems/ai';
import { IsLootable } from '@/systems/loot';
import { getRenderData } from './renderSystem';
import type { RenderData } from './types';

// ---------------------------------------------------------------------------
// Command state
// ---------------------------------------------------------------------------

let _showFps = false;
let _wireframe = false;

// ---------------------------------------------------------------------------
// Debug commands
// ---------------------------------------------------------------------------

export function registerRenderDebugCommands(): void {
  registerDebugCommands({

    /**
     * Toggle FPS display overlay.
     * Usage: render.fps
     */
    'render.fps': () => {
      _showFps = !_showFps;
      console.log(`[debug] render.fps: FPS display ${_showFps ? 'ON' : 'OFF'}`);
      // For MVP, FPS is shown via the browser DevTools or a simple console log
      if (_showFps) {
        console.log('[debug] render.fps: Enable browser DevTools performance tab for FPS.');
      }
    },

    /**
     * Toggle wireframe mode on all render meshes.
     * Usage: render.wireframe
     */
    'render.wireframe': () => {
      _wireframe = !_wireframe;
      console.log(`[debug] render.wireframe: wireframe ${_wireframe ? 'ON' : 'OFF'}`);

      const world = getDebugWorld();
      const rd = getRenderData(world);
      if (!rd) {
        console.warn('[debug] render.wireframe: no render data on world.');
        return;
      }

      for (const [, mesh] of rd.meshCache) {
        if (mesh.material && 'wireframe' in mesh.material) {
          (mesh.material as unknown as Record<string, unknown>).wireframe = _wireframe;
        }
      }
    },

    /**
     * Log current camera position and target to the console.
     * Usage: render.camera
     */
    'render.camera': () => {
      const world = getDebugWorld();
      const rd = getRenderData(world);
      if (!rd?.camera) {
        console.warn('[debug] render.camera: camera not initialised yet.');
        return;
      }

      const cam = rd.camera;
      console.log(
        `[debug] render.camera:\n` +
        `  alpha  = ${cam.alpha.toFixed(4)} rad (${(cam.alpha * 180 / Math.PI).toFixed(1)}°)\n` +
        `  beta   = ${cam.beta.toFixed(4)} rad (${(cam.beta * 180 / Math.PI).toFixed(1)}°)\n` +
        `  radius = ${cam.radius.toFixed(2)}\n` +
        `  target = (${cam.target.x.toFixed(2)}, ${cam.target.y.toFixed(2)}, ${cam.target.z.toFixed(2)})`,
      );
    },

    /**
     * Log the count of rendered entities by type.
     * Usage: render.entities
     */
    'render.entities': () => {
      const world = getDebugWorld();
      const rd = getRenderData(world);
      if (!rd) {
        console.warn('[debug] render.entities: no render data on world.');
        return;
      }

      let characters = 0;
      let enemies = 0;
      let lootItems = 0;
      let unknown = 0;

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsCharacter, eid)) {
          characters++;
        } else if (hasComponent(world, IsEnemy, eid)) {
          enemies++;
        } else if (hasComponent(world, IsLootable, eid)) {
          lootItems++;
        } else {
          unknown++;
        }
      }

      const cachedMeshes = rd.meshCache.size;
      const dmgNumbers = rd.dmgNumberCache.size;
      const labels = rd.labelCache.size;

      console.log(
        `[debug] render.entities:\n` +
        `  ECS entities : ${characters} character, ${enemies} enemies, ${lootItems} loot, ${unknown} other\n` +
        `  Cached meshes: ${cachedMeshes}\n` +
        `  Damage nums  : ${dmgNumbers}\n` +
        `  Labels       : ${labels}`,
      );
    },
  });
}
