import {
  defineQuery,
  hasComponent,
  removeComponent,
} from 'bitecs';
import type { World } from '@/core';
import { getDeltaTime } from '@/core';
import { Position, Velocity } from '@/systems/movement';
import { getRenderData } from '@/systems/render';
import { PhysicsBody, KnockbackImpulse } from './components';
import { DEFAULT_PHYSICS_CONFIG } from './types';
import type { PhysicsConfig } from './types';

// ---------------------------------------------------------------------------
// Module-level Havok singleton
// ---------------------------------------------------------------------------

let havokPlugin: any = null;
let physicsInitialized = false;
let physicsInitPromise: Promise<void> | null = null;
let havokInitTriggered = false;

/**
 * Asynchronously initialise the Havok Physics plugin on the given scene.
 *
 * This is fire-and-forget — call it early and don't await it.
 * The physics system will check `physicsInitialized` each frame
 * and only use Havok features once it's ready.
 *
 * @param scene  The Babylon.js Scene to enable physics on.
 */
export async function initHavokPhysics(scene: any): Promise<void> {
  if (physicsInitialized) return;
  if (physicsInitPromise) return physicsInitPromise;

  physicsInitPromise = (async () => {
    const { Vector3 } = await import('@babylonjs/core/Maths/math');
    const HavokPhysics = (await import('@babylonjs/havok')).default;
    const { HavokPlugin } = await import('@babylonjs/core/Physics/v2/Plugins/havokPlugin');

    const havokInstance = await HavokPhysics();
    havokPlugin = new HavokPlugin(true, havokInstance);
    scene.enablePhysics(new Vector3(0, DEFAULT_PHYSICS_CONFIG.gravity, 0), havokPlugin);
    physicsInitialized = true;

    if (import.meta.env.DEV) {
      console.log('[Physics] Havok physics initialised');
    }
  })();

  return physicsInitPromise;
}

/**
 * Returns whether Havok physics has finished initialising.
 */
export function isHavokReady(): boolean {
  return physicsInitialized;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Entities that have received a knockback impulse this frame. */
const impulseQuery = defineQuery([KnockbackImpulse, Position, Velocity]);

/** Entities marked with a physics body tag. */
const physicsBodyQuery = defineQuery([PhysicsBody, Position]);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG;

// ---------------------------------------------------------------------------
// Physics system
// ---------------------------------------------------------------------------

/**
 * physicsSystem — applies knockback impulses and manages Havok physics.
 *
 * **Pipeline position:** After combat system, before movement system.
 *
 * **Frame responsibilities:**
 *
 * 1. **Knockback application**
 *    Reads KnockbackImpulse components (added by combat system on heavy hits),
 *    converts them to velocity changes on the target's Velocity component,
 *    then removes the transient KnockbackImpulse component.
 *
 * 2. **Havok initialisation (once)**
 *    On first run, fires `initHavokPhysics()` in the background if the render
 *    scene is available. Does not block the game loop.
 *
 * 3. **Physics body sync (future use)**
 *    For entities with the PhysicsBody tag, ensures Babylon.js physics
 *    impostors are attached when meshes exist.
 */
export function physicsSystem(world: World): void {
  const dt = getDeltaTime(world) / 1000; // Convert ms → seconds

  // -------------------------------------------------------------------------
  // 1. Apply knockback impulses → Velocity changes
  // -------------------------------------------------------------------------
  const impulses = impulseQuery(world);

  for (const eid of impulses) {
    const dirX = KnockbackImpulse.x[eid];
    const dirY = KnockbackImpulse.y[eid];
    const magnitude = KnockbackImpulse.magnitude[eid];

    // Apply as an instantaneous velocity change (impulse)
    Velocity.x[eid] += dirX * magnitude * dt;
    Velocity.y[eid] += dirY * magnitude * dt;

    // Consume the impulse — remove the transient component
    removeComponent(world, KnockbackImpulse, eid);
  }

  // -------------------------------------------------------------------------
  // 2. Fire-and-forget Havok initialisation (first run only)
  // -------------------------------------------------------------------------
  if (!physicsInitialized && !havokInitTriggered) {
    const rd = getRenderData(world);
    if (rd?.scene) {
      havokInitTriggered = true;
      initHavokPhysics(rd.scene).catch((err) => {
        console.error('[Physics] Failed to initialise Havok:', err);
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. Physics body tracking (future Havok integration)
  // -------------------------------------------------------------------------
  // Once Havok is ready, entities with PhysicsBody + a mesh in the render
  // cache could have physics impostors attached here. For the MVP we rely
  // on the velocity-based knockback above, which works without Havok.
  //
  // Example pattern for future use:
  //   const rd = getRenderData(world);
  //   if (rd && physicsInitialized) {
  //     for (const eid of physicsBodyQuery(world)) {
  //       const mesh = rd.meshCache.get(eid);
  //       if (mesh && !mesh.physicsImpostor) {
  //         // mesh.physicsImpostor = new PhysicsAggressor(...);
  //       }
  //     }
  //   }

  // Debug counter (DEV only)
  if (import.meta.env.DEV && impulses.length > 0) {
    console.log(
      `[Physics] Applied ${impulses.length} knockback impulse(s) (dt=${dt.toFixed(4)}s)`,
    );
  }
}
