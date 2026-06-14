import type { World } from '@/core';

/**
 * DebugConsole — persistent dev console toggled with ` / ~.
 * Compiled out of production builds via import.meta.env.DEV.
 */

export interface DebugCommand {
  name: string;
  description: string;
  handler: (...args: string[]) => void;
}

const commands = new Map<string, DebugCommand>();
let currentWorld: World | null = null;

/** Store the current ECS world reference for debug commands to access. */
export function setDebugWorld(world: World): void {
  currentWorld = world;
}

/** Get the current ECS world. Throws if not yet set. */
export function getDebugWorld(): World {
  if (!currentWorld) {
    throw new Error('Debug world not set — call setDebugWorld(world) after world creation.');
  }
  return currentWorld;
}

export function registerDebugCommand(cmd: DebugCommand): void {
  commands.set(cmd.name, cmd);
  if (import.meta.env.DEV) {
    console.log(`[debug] Registered command: ${cmd.name}`);
  }
}

export function registerDebugCommands(cmds: Record<string, (...args: string[]) => void>): void {
  for (const [name, handler] of Object.entries(cmds)) {
    registerDebugCommand({ name, description: '', handler });
  }
}

export function getCommands(): ReadonlyMap<string, DebugCommand> {
  return commands;
}

export function executeCommand(input: string): string {
  const parts = input.trim().split(/\s+/);
  const name = parts[0];
  const args = parts.slice(1);

  const cmd = commands.get(name);
  if (!cmd) {
    return `Unknown command: ${name}`;
  }

  try {
    cmd.handler(...args);
    return `OK: ${name}`;
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
