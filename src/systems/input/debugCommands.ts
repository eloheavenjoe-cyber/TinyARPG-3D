import { registerDebugCommands } from '@/debug';
import { getHeldKeys } from './inputSystem';

/**
 * Register debug commands for the Input system.
 * Invoke from the dev-only section of main.ts.
 */
export function registerInputDebugCommands(): void {
  registerDebugCommands({
    /** Log currently held keys to the console. */
    'input.keys': () => {
      const keys = getHeldKeys();
      console.log(`[debug] input.keys: held keys = ${keys.join(', ') || '(none)'}`);
    },
  });
}
