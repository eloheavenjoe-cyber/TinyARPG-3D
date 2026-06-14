import { registerDebugCommands, getDebugWorld } from '@/debug';
import { getAllEntities, hasComponent } from 'bitecs';
import { IsCharacter } from '@/systems/movement';
import { SkillSlot } from '@/systems/combat';
import { toggleHUD, toggleMinimap, setHotbarSlot } from './hudSystem';

// ---------------------------------------------------------------------------
// UI debug commands
// ---------------------------------------------------------------------------

/**
 * Register debug commands for the UI/HUD system.
 * Invoke from the dev-only section of main.ts.
 */
export function registerUIDebugCommands(): void {
  registerDebugCommands({
    /**
     * Toggle the entire HUD overlay on/off.
     * Usage: ui.toggle_hud
     */
    'ui.toggle_hud': () => {
      toggleHUD();
    },

    /**
     * Toggle the minimap on/off.
     * Usage: ui.toggle_minimap
     */
    'ui.toggle_minimap': () => {
      toggleMinimap();
    },

    /**
     * Set a skill in a hotbar slot (0-3).
     * Usage: ui.hotbar <slot> <skill_code>
     */
    'ui.hotbar': (slotStr = '0', skillCodeStr = '0') => {
      const slot = parseInt(slotStr, 10);
      const skillCode = parseInt(skillCodeStr, 10);

      if (slot < 0 || slot > 3 || Number.isNaN(slot)) {
        console.warn('[debug] ui.hotbar: slot must be 0-3');
        return;
      }
      if (Number.isNaN(skillCode)) {
        console.warn('[debug] ui.hotbar: skill_code must be a number');
        return;
      }

      const world = getDebugWorld();
      let found = false;

      for (const eid of getAllEntities(world)) {
        if (hasComponent(world, IsCharacter, eid) && hasComponent(world, SkillSlot, eid)) {
          const key = `skillId_${slot}` as `skillId_${0 | 1 | 2 | 3}`;
          SkillSlot[key][eid] = skillCode;
          found = true;

          if (import.meta.env.DEV) {
            console.log(`[debug] ui.hotbar: slot ${slot} ← skill ${skillCode} (eid=${eid})`);
          }
          break;
        }
      }

      if (!found) {
        console.warn('[debug] ui.hotbar: no Character entity found with SkillSlot');
      }

      // Notify the HUD system
      setHotbarSlot(slot, skillCode);
    },
  });
}
