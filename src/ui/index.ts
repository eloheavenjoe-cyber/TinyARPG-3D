// ---------------------------------------------------------------------------
// UI module — HUD overlay, types, components, and debug commands
// ---------------------------------------------------------------------------

export * from './types';
export * from './components';
export { hudSystem, toggleHUD, toggleMinimap, setHotbarSlot } from './hudSystem';
export { registerUIDebugCommands } from './debugCommands';

/**
 * Create HTML overlay panels (inventory, passive tree, main menu).
 * These are empty stub divs — actual content will be filled later.
 * Call once during startup.
 */
export function createHTMLOverlays(): void {
  // Inventory panel
  const inventoryPanel = document.createElement('div');
  inventoryPanel.id = 'inventory-panel';
  inventoryPanel.style.cssText = `
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 400px;
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid #888;
    border-radius: 8px;
    color: #ccc;
    font-family: monospace;
    padding: 16px;
    z-index: 1000;
    overflow-y: auto;
  `;
  inventoryPanel.textContent = 'Inventory (not yet implemented)';
  document.body.appendChild(inventoryPanel);

  // Passive tree panel
  const passivePanel = document.createElement('div');
  passivePanel.id = 'passive-tree-panel';
  passivePanel.style.cssText = `
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 700px;
    height: 500px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #9966ff;
    border-radius: 8px;
    color: #ccc;
    font-family: monospace;
    padding: 16px;
    z-index: 1000;
    overflow-y: auto;
  `;
  passivePanel.textContent = 'Passive Tree (not yet implemented)';
  document.body.appendChild(passivePanel);

  // Main menu panel
  const menuPanel = document.createElement('div');
  menuPanel.id = 'main-menu-panel';
  menuPanel.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    color: #ccc;
    font-family: monospace;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `;
  menuPanel.innerHTML = `
    <h1 style="color: #fff; font-size: 48px; margin-bottom: 40px;">TinyARPG</h1>
    <button id="menu-resume" style="
      background: #444;
      color: #fff;
      border: 2px solid #888;
      border-radius: 4px;
      padding: 12px 40px;
      font-size: 18px;
      cursor: pointer;
      margin: 8px;
    ">Resume</button>
    <button id="menu-save" style="
      background: #444;
      color: #fff;
      border: 2px solid #888;
      border-radius: 4px;
      padding: 12px 40px;
      font-size: 18px;
      cursor: pointer;
      margin: 8px;
    ">Save &amp; Exit</button>
  `;
  document.body.appendChild(menuPanel);

  if (import.meta.env.DEV) {
    console.log('[UI] HTML overlay panels created (inventory, passive tree, main menu)');
  }
}
