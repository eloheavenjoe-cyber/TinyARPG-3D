import type { Intent } from '@/shared';
import type { IWorld } from 'bitecs';

// Re-export the ECS World type used throughout
export type World = IWorld;

// Key used to store frame intents on the world object
const INTENTS_KEY = '__intents';

// Key used to store delta time (ms) on the world object
const DELTA_KEY = '__deltaMs';

/** Ordered ECS system pipeline. Each system is a pure function: (world: World) => void */
export type System = (world: World) => void;

/** Ordered list of systems executed every frame. */
export const pipeline: System[] = [];

/** Queue of Intents produced by the input layer, consumed by systems each frame. */
export const intentQueue: Intent[] = [];

/** Register a system in the pipeline. */
export function registerSystem(system: System, order?: number): void {
  if (order !== undefined) {
    pipeline.splice(order, 0, system);
  } else {
    pipeline.push(system);
  }
}

/** Get the Intents for the current frame. Systems call this to read input. */
export function getFrameIntents(world: World): Intent[] {
  return (world as Record<string, unknown>)[INTENTS_KEY] as Intent[] ?? [];
}

/** Get the delta time in milliseconds for the current frame. */
export function getDeltaTime(world: World): number {
  return (world as Record<string, unknown>)[DELTA_KEY] as number ?? 0;
}

/** Run the full system pipeline for one frame. */
export function runPipeline(world: World, deltaMs: number): void {
  // Drain and snapshot intents for this frame, expose to systems via world
  (world as Record<string, unknown>)[INTENTS_KEY] = intentQueue.splice(0, intentQueue.length);
  (world as Record<string, unknown>)[DELTA_KEY] = deltaMs;

  for (const system of pipeline) {
    try {
      system(world);
    } catch (err) {
      console.error(`[ECS] System error:`, err);
      // Skip this system for this frame — never crash the loop
    }
  }
}

/** Push an Intent into the queue. Called by the input layer. */
export function pushIntent(intent: Intent): void {
  intentQueue.push(intent);
}
