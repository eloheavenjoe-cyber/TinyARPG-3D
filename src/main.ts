import { createEngine, startLoop, runPipeline, registerSystem } from '@/core';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { IndexedDBStorage } from '@/storage';
import { movementSystem, registerMovementDebugCommands, Position, Velocity, MovementSpeed, FacingDirection, IsCharacter } from '@/systems/movement';
import { inputSystem, initInputSystem, registerInputDebugCommands } from '@/systems/input';
import { aiSystem, registerAIDebugCommands } from '@/systems/ai';
import { combatSystem, registerCombatDebugCommands, Life, Damage, SkillSlot, CooldownTimer, CooldownDuration } from '@/systems/combat';
import { physicsSystem, initHavokPhysics, registerPhysicsDebugCommands } from '@/systems/physics';
import { lootSystem, registerLootDebugCommands, InventorySlot } from '@/systems/loot';
import { buffSystem, registerBuffDebugCommands, BaseStats } from '@/systems/buff';
import { inventorySystem, registerInventoryDebugCommands } from '@/features/inventory';
import { passiveTreeSystem, registerPassiveTreeDebugCommands, PassiveTreeState, PassiveStats } from '@/features/passive-tree';
import { renderSystem, initRenderSystem, registerRenderDebugCommands } from '@/systems/render';
import { registerDungeonDebugCommands } from '@/features/dungeon';
import { hudSystem, createHTMLOverlays, registerUIDebugCommands } from '@/ui';
import { bossSystem, registerBossDebugCommands } from '@/features/boss';
import { portalSystem, registerPortalDebugCommands } from '@/features/portal';

/**
 * Create the player Character entity with all required components.
 * Returns the entity ID.
 */
function spawnCharacter(world: ReturnType<typeof createWorld>): number {
  const eid = addEntity(world);

  // Movement
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, MovementSpeed, eid);
  addComponent(world, FacingDirection, eid);
  addComponent(world, IsCharacter, eid);

  Position.x[eid] = 0;
  Position.y[eid] = 0;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  MovementSpeed.value[eid] = 5;
  FacingDirection.x[eid] = 1;
  FacingDirection.y[eid] = 0;

  // Combat
  addComponent(world, Life, eid);
  addComponent(world, Damage, eid);
  addComponent(world, SkillSlot, eid);
  addComponent(world, CooldownTimer, eid);
  addComponent(world, CooldownDuration, eid);

  Life.current[eid] = 100;
  Life.max[eid] = 100;
  Damage.value[eid] = 20;

  // Hotbar: basic_attack(1), cleave(2), power_strike(3), war_cry(4)
  SkillSlot.skillId_0[eid] = 1;
  SkillSlot.skillId_1[eid] = 2;
  SkillSlot.skillId_2[eid] = 3;
  SkillSlot.skillId_3[eid] = 4;

  // Cooldowns start at zero; durations set from skill definitions
  CooldownTimer.remaining_0[eid] = 0;
  CooldownTimer.remaining_1[eid] = 0;
  CooldownTimer.remaining_2[eid] = 0;
  CooldownTimer.remaining_3[eid] = 0;
  CooldownDuration.max_0[eid] = 0.5;   // basic_attack
  CooldownDuration.max_1[eid] = 1.5;   // cleave
  CooldownDuration.max_2[eid] = 3.0;   // power_strike
  CooldownDuration.max_3[eid] = 8.0;   // war_cry

  // Buff / base stats
  addComponent(world, BaseStats, eid);
  BaseStats.damage[eid] = 20;
  BaseStats.maxLife[eid] = 100;
  BaseStats.movementSpeed[eid] = 5;

  // Inventory
  addComponent(world, InventorySlot, eid);
  InventorySlot.count[eid] = 0;

  // Passive tree
  addComponent(world, PassiveTreeState, eid);
  addComponent(world, PassiveStats, eid);
  PassiveTreeState.skillPoints[eid] = 0;
  PassiveTreeState.respecPoints[eid] = 5;
  PassiveTreeState.allocatedMask[eid] = 0;
  PassiveStats.bonusDamage[eid] = 0;
  PassiveStats.bonusMaxLife[eid] = 0;
  PassiveStats.bonusMovementSpeed[eid] = 0;

  if (import.meta.env.DEV) {
    console.log(`[TinyARPG] Character spawned (eid=${eid}) with 4 skills, 100 HP, 20 dmg`);
  }

  return eid;
}

async function main(): Promise<void> {
  const ctx = createEngine();
  const world = createWorld();

  // Create global storage adapter for save/load
  const storage = new IndexedDBStorage();

  // Expose storage for debug console access
  (window as any).storage = storage;

  if (import.meta.env.DEV) {
    console.log('[TinyARPG] IndexedDB storage adapter ready');
  }

  // Spawn the player Character before initialising systems
  spawnCharacter(world);

  // Create HTML overlay panels (inventory, passive tree, main menu stubs)
  createHTMLOverlays();

  // Initialise input listeners (keyboard)
  initInputSystem();

  // Register ECS systems in pipeline order
  registerSystem(inputSystem);    // Must run before movementSystem
  registerSystem(portalSystem);   // Before AI/combat — handles Interact priority
  registerSystem(aiSystem);
  registerSystem(bossSystem);         // Runs after AI system, before combat system
  registerSystem(combatSystem);       // Must run after AI system
  registerSystem(physicsSystem);      // After combat (KnockbackImpulse created), before movement (Velocity → Position)
  registerSystem(movementSystem);     // Integrates Velocity → Position (including knockback)
  registerSystem(lootSystem);      // Must run after combat system (reads IsDead)
  registerSystem(inventorySystem);  // Must run after lootSystem (reads InventorySlot), before buffSystem
  registerSystem(passiveTreeSystem); // Must run after inventorySystem (BaseStats), before buffSystem
  registerSystem(buffSystem);      // Must run after combat system
  registerSystem(renderSystem);     // Must run LAST — renders the scene
  registerSystem(hudSystem);        // HUD overlay — runs after render so scene is ready

  if (import.meta.env.DEV) {
    const { setDebugWorld } = await import('@/debug');
    setDebugWorld(world);
    registerMovementDebugCommands();
    registerInputDebugCommands();
    registerAIDebugCommands();
    registerBossDebugCommands();
    registerPortalDebugCommands();
    registerCombatDebugCommands();
    registerLootDebugCommands();
    registerInventoryDebugCommands();
    registerPassiveTreeDebugCommands();
    registerBuffDebugCommands();
    registerRenderDebugCommands();
    registerPhysicsDebugCommands();
    registerDungeonDebugCommands();
    registerUIDebugCommands();
    console.log('[TinyARPG] Dev mode — engine started');
  }

  // Initialise render system with the Babylon.js Scene
  initRenderSystem(world, ctx.scene);

  // Fire-and-forget Havok physics initialisation (async WASM load — don't block)
  initHavokPhysics(ctx.scene);

  startLoop(ctx, (deltaMs) => {
    runPipeline(world, deltaMs);
  });
}

main().catch((err) => {
  console.error('[TinyARPG] Fatal startup error:', err);
  document.body.textContent = 'Failed to start the game. Check the console for details.';
});
