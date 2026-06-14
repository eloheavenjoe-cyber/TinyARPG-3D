import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

/**
 * Bootstrap the Babylon.js engine, create the default scene,
 * and return the core objects needed by the rest of the game.
 */
export interface EngineContext {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
}

export function createEngine(): EngineContext {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Fatal: #renderCanvas not found in DOM.');
  }

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
  });

  const scene = new Scene(engine);

  return { engine, scene, canvas };
}

/**
 * Start the render loop. Calls `onFrame` before rendering each frame.
 */
export function startLoop(
  ctx: EngineContext,
  onFrame: (deltaMs: number) => void,
): void {
  ctx.engine.runRenderLoop(() => {
    const deltaMs = ctx.engine.getDeltaTime();
    onFrame(deltaMs);
    ctx.scene.render();
  });

  window.addEventListener('resize', () => {
    ctx.engine.resize();
  });
}
