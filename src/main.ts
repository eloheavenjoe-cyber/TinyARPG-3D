import { createEngine, startLoop, runPipeline, registerSystem } from '@/core';
import { createWorld } from 'bitecs';
import { movementSystem, registerMovementDebugCommands } from '@/systems/movement';
import { inputSystem, initInputSystem, registerInputDebugCommands } from '@/systems/input';
import { aiSystem, registerAIDebugCommands } from '@/systems/ai';
import { combatSystem, registerCombatDebugCommands } from '@/systems/combat';
import { buffSystem, registerBuffDebugCommands } from '@/systems/buff';

async function main(): Promise<void> {
  const ctx = createEngine();
  const world = createWorld();

  // Initialise input listeners (keyboard)
  initInputSystem();

  // Register ECS systems in pipeline order
  registerSystem(inputSystem);    // Must run before movementSystem
  registerSystem(movementSystem);
  registerSystem(aiSystem);
  registerSystem(combatSystem);   // Must run after AI system
  registerSystem(buffSystem);     // Must run after combat system

  if (import.meta.env.DEV) {
    const { setDebugWorld } = await import('@/debug');
    setDebugWorld(world);
    registerMovementDebugCommands();
    registerInputDebugCommands();
    registerAIDebugCommands();
    registerCombatDebugCommands();
    registerBuffDebugCommands();
    console.log('[TinyARPG] Dev mode — engine started');
  }

  startLoop(ctx, (deltaMs) => {
    runPipeline(world, deltaMs);
  });
}

main().catch((err) => {
  console.error('[TinyARPG] Fatal startup error:', err);
  document.body.textContent = 'Failed to start the game. Check the console for details.';
});
