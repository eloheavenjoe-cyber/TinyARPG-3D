# PRD: TinyARPG 3D — MVP Alpha

**Status:** In Progress — ECS pipeline (5/7 systems complete, 69 tests)  
**Version:** 2.1  
**Date:** June 2026  
**Triage Label:** `ready-for-agent`

---

## Problem Statement

Lapsed ARPG fans (ages 22–40) who crave the depth of Path of Exile and the atmosphere of Diablo are locked out by 50GB+ client downloads, steep hardware requirements, and sessions that demand an hour+ commitment. Casual browser gamers who discover ARPGs via Twitch/YouTube have no entry point that offers both meaningful depth and a zero-install, sub-30-minute session. Existing browser ARPGs either sacrifice depth (simple clicker/idle games) or deliver poor performance and clunky controls. Players need a browser-native isometric ARPG that combines deep loot, skill customization, and punchy combat with instant loading and short, rewarding play sessions.

---

## Solution

A browser-native isometric action-RPG built with Babylon.js (WebGL) that delivers the satisfying depth of Path of Exile's loot and progression, the fast-paced arcade energy of Hero Siege, and the gothic atmosphere of Diablo — all inside a browser tab with zero install friction. The MVP Alpha targets a single playable Class (Marauder), one Act (Hub + 3 Dungeons), core combat loop, basic loot with 3 Rarity tiers, one Boss, a partial passive skill tree, and a basic HUD/Inventory. The game saves to IndexedDB locally with a swappable StoragePort interface for future server-side persistence.

**Core differentiators:**
- Zero install — playable in any modern browser within seconds
- Deep but accessible — complex systems revealed gradually
- Sessions playable in under 10 minutes
- Full Havok physics for punchy, responsive combat
- Procedurally generated Dungeons with hand-crafted Landmark Rooms
- ECS architecture for composable, testable game logic
- WASD movement with 1/2/3/4 hotbar and E for interact — precise, keyboard-native control
- Multiple Save slots with full-World persistence — cleared Zones stay cleared
- Death restarts the Zone from the last Save — stakes matter, Portal Scrolls have value

---

## Implementation Status (June 2026)

### Completed

| Layer | Module | Tests | Components | Debug Commands |
|---|---|---|---|---|
| **Core** | `src/core/` | — | ECSWorld (System pipeline, Intent queue, deltaTime), GameLoop (Babylon.js bootstrap) | — |
| **Shared** | `src/shared/` | — | Enums (Rarity, EquipmentSlot, IntentType, BossPhase, EliteModifier, LandmarkType), Types (Intent, Affix, Item, DungeonLayout, RenderSnapshot, PassiveNode, etc.) | — |
| **Storage** | `src/storage/` | — | `StoragePort` interface (listSaves, save, load, deleteSave) | — |
| **Debug** | `src/debug/` | — | DebugConsole, command registry, `setDebugWorld`/`getDebugWorld` | — |
| **Input** | `src/systems/input/` | 22 | Keyboard → Intents (WASD = continuous `MOVE_DIRECTION`, 1234/E = edge-triggered `USE_SKILL`/`INTERACT`) | `input.keys` |
| **Movement** | `src/systems/movement/` | 7 | `Position`, `Velocity`, `MovementSpeed`, `FacingDirection`, `IsCharacter` — Character input→velocity + universal position integration | `move.speed`, `move.pos`, `move.where`, `move.spawn` |
| **AI** | `src/systems/ai/` | 10 | `IsEnemy`, `EnemyType`, `AIState`, `AttackRange`, `AttackTimer`, `AttackCooldown`, `TargetEntity`, `IsElite`, `EliteModifiers` — FSM: Idle→Chase→Attack | `ai.spawn`, `ai.kill_all`, `ai.aggro_all` |
| **Combat** | `src/systems/combat/` | 18 | `Life`, `Damage`, `SkillSlot`, `CooldownTimer`, `CooldownDuration`, `IsDead` — skill targeting (dot-product facing cone), damage, cooldowns, death | `combat.kill_all`, `combat.spawn`, `combat.god`, `combat.cooldown_off` |
| **Buff** | `src/systems/buff/` | 12 | `BaseStats`, `BuffInstance` — entity-as-relation buff instances, full stat recompute each frame, Life.max proportional scaling | `buff.list`, `buff.apply`, `buff.clear` |

**Pipeline order (verified):** `inputSystem → movementSystem → aiSystem → combatSystem → buffSystem` (registered in `src/main.ts`)

**Tech stack wired:** Babylon.js 7.54, Havok 1.3, bitecs 0.3.40, TypeScript 5.9, Vite 5.4, Vitest 1.6.1

**Build/CI:** `tsc --noEmit` clean, `vite build` succeeds (199 modules, ~503KB bundle mostly Babylon.js), 69 tests pass across 5 test files.

### Remaining (Pipeline Order)

- [ ] **Loot system** (`src/systems/loot/`) — enemy death drops, Ground Items, rarity-coloured labels, pickup via INTERACT
- [ ] **Render system** (`src/systems/render/`) — RenderSnapshot projection, mesh transforms, damage numbers, telegraph decals
- [ ] **Dungeon feature** (`src/features/dungeon/`) — BSP generator, Room/Corridor types, Landmark placement, Minimap
- [ ] **Passive tree** (`src/features/passive-tree/`) — Tree graph, allocation logic, Stat propagation, Respec
- [ ] **Boss feature** (`src/features/boss/`) — FSM, Phase triggers, Telegraph emitters, Enrage timer
- [ ] **Inventory feature** (`src/features/inventory/`) — Grid logic (8×5), Equipment slots, Stat derivation
- [ ] **Portal feature** (`src/features/portal/`) — Portal Scroll consumable, Boss Portal spawn
- [ ] **UI** (`src/ui/`) — HUD (Life/Mana orbs, XP bar, Hotbar with cooldowns, Minimap), HTML panels (Inventory, Passive Tree, Main Menu)
- [ ] **Storage adapter** — IndexedDB implementation of StoragePort
- [ ] **Character creation** — Class selection, name entry, Main Menu flow

---

## User Stories

### Character & Progression

1. As a Player, I want to create a new Character by selecting a Class and entering a name, so that I can start my adventure.
2. As a Player, I want my Character to gain Experience from killing enemies, so that I feel rewarded for combat.
3. As a Player, I want to Level up and earn a Skill Point, so that I can customize my build through the passive skill tree.
4. As a Player, I want to see my Character's Level, Life, Mana, and XP on the HUD, so that I know my current state at a glance.
5. As a Player, I want my Character's Level to unlock new Active Skills automatically, so that I gain new combat options as I progress.
6. As a Player, I want Active Skill unlocks to be previewable (at which Level each skill unlocks), so that I can plan my build.

### Movement & Controls

7. As a Player, I want to use WASD keys to move my Character, so that I have precise, responsive keyboard movement.
8. As a Player, I want the camera to follow my Character automatically from a fixed isometric angle, so that I always have a clear view of the action.
9. As a Player, I want the E key to interact with nearby objects (Ground Items, Vendors, chests), so that I have a single consistent interact button.

### Combat

10. As a Player, I want to assign Active Skills to hotbar slots (1/2/3/4), so that I can activate them during combat.
11. As a Player, I want my basic attack to be an Active Skill in slot 1 (auto-granted at Level 1), so that combat has no separate "basic attack" action — it's just my first skill.
12. As a Player, I want skills to target the nearest enemy in my facing direction (melee) or the cursor position (ranged), so that targeting feels natural with WASD movement.
13. As a Player, I want to see Cooldowns displayed as radial fills on the hotbar, so that I know when I can use each Active Skill again.
14. As a Player, I want enemies to die when their Life reaches zero, so that combat feels decisive.
15. As a Player, I want to see floating Damage Numbers when I hit enemies, so that I can gauge my damage output.
16. As a Player, I want Hit-Stop (brief frame pause) on heavy attacks, so that combat feels impactful and punchy.
17. As a Player, I want enemies to Drop loot on death, so that I am rewarded for defeating them.
18. As a Player, I want Knockback on heavy strikes via Havok physics, so that combat feels physically responsive.
19. As a Player, I want Standard Enemies with distinct behaviours (melee, ranged), so that combat encounters are varied.
20. As a Player, I want Elites with rolled Elite Modifiers (Enraged, Spectral, Shielded, Bloodthirsty), so that I face challenging and unpredictable fights.

### Loot & Inventory

21. As a Player, I want Ground Items to appear with Rarity-coloured labels (white, blue, yellow), so that I can easily identify valuable Drops.
22. As a Player, I want to press E near Ground Items to pick them up, so that I can collect Items.
23. As a Player, I want to open an Inventory panel (8×5 grid, 40 slots), so that I can manage my Items.
24. As a Player, I want to equip Items from my Inventory into Equipment Slots (Weapon, Helmet, Chest Armour, Gloves, Boots), so that I can improve my Character's Stats.
25. As a Player, I want Equipment to visually change my Character's look (at minimum: Weapon, Chest Armour, Helmet), so that my gear feels tangible.
26. As a Player, I want Item Tooltips to show name, Rarity, Implicit Affix, Explicit Affixes, and Level requirement, so that I can compare Items and make informed choices.
27. As a Player, I want Items to drop at different Rarities (Normal: no affixes, Magic: 1–2 affixes, Rare: 3–6 affixes), so that loot feels exciting.
28. As a Player, I want Rare Items to have multiple random Explicit Affixes gated by Item Level, so that no two Drops feel identical.
29. As a Player, I want higher-Zone Items to have higher Item Levels and stronger potential Affixes, so that deeper Dungeons yield better loot.
30. As a Player, I want Portal Scrolls to drop as consumable Items, so that I can return to the Hub mid-Dungeon and preserve my progress.

### Dungeons & World

31. As a Player, I want to start in the Hub, so that I have a safe base with a Vendor to prepare for adventures.
32. As a Player, I want to enter procedurally generated Dungeons from the Hub, so that each playthrough feels different.
33. As a Player, I want Dungeons to have distinct Zones with different visual themes, so that the world feels varied.
34. As a Player, I want to discover Landmark Rooms within Dungeons (Boss Room, Vendor Room, Loot Room), so that exploration has memorable moments.
35. As a Player, I want Loot Rooms to contain 2–4 treasure chests with higher-Rarity Drops, so that exploration is rewarded.
36. As a Player, I want Vendor Rooms to contain a Vendor who restores my Life and Mana when I press E, so that I have mid-Dungeon recovery points.
37. As a Player, I want Zone transitions to feel seamless through door triggers, so that I stay immersed.
38. As a Player, I want to see a Minimap (top-right) of the Dungeon layout, so that I can navigate without getting lost.
39. As a Player, I want the Minimap to reveal only visited Rooms and Corridors, so that exploration matters.
40. As a Player, I want cleared Zones to persist their exact state (dead enemies stay dead, opened chests stay opened), so that backtracking feels consistent.
41. As a Player, I want a Boss Portal to spawn after defeating the Boss, so that I have a guaranteed return to the Hub.

### Passive Skill Tree

42. As a Player, I want to open a passive skill tree panel, so that I can plan my Character's long-term progression.
43. As a Player, I want to allocate Skill Points to Passive nodes, so that I can customize my Stats.
44. As a Player, I want to allocate Notables (larger bonuses, one per cluster), so that I have meaningful pathing destinations.
45. As a Player, I want to allocate Keystones (powerful effects with trade-offs), so that I can make build-defining choices.
46. As a Player, I want Passive Tooltips to show node name, type, and exact Stat bonuses, so that I can make informed allocation decisions.
47. As a Player, I want allocated Passives to be visually highlighted, so that I can see my progression path at a glance.
48. As a Player, I want to spend Respec Points (5 per Character lifetime) to unallocate Passives and reclaim the Skill Point, so that I can experiment with different builds.

### Boss Encounter

49. As a Player, I want a multi-Phase Boss at the end of the Act, so that I have a climactic challenge.
50. As a Player, I want each Phase to have distinct attack patterns and arena visuals, so that the fight evolves as it progresses.
51. As a Player, I want the Boss to Telegraph its attacks with ground decals (red circles, cones, lines), so that I can react and dodge.
52. As a Player, I want the Boss to have an Enrage Timer, so that I can't kite indefinitely and must stay aggressive.
53. As a Player, I want the Boss to drop guaranteed Rare loot on defeat, so that the victory feels rewarding.
54. As a Player, I want to retry the Boss after dying (via Zone restart), so that I can learn and succeed.

### Save & Session

55. As a Player, I want the game to auto-save on Zone transitions, so that I don't lose progress between Zones.
56. As a Player, I want multiple Save slots, so that I can maintain different Characters or playthroughs.
57. As a Player, I want a "Continue" option on the Main Menu that loads my most recent Save, so that I can resume instantly.
58. As a Player, I want a "Load Game" option to pick from all my Saves, so that I can switch between Characters.
59. As a Player, I want to delete individual Saves from the Main Menu, so that I can remove unwanted playthroughs.
60. As a Player, I want the game to load quickly from the browser, so that I can start playing within seconds.

### Death

61. As a Player, I want my Character to die when Life reaches 0, so that combat has stakes.
62. As a Player, I want Death to reload my most recent Save, so that I lose unsaved progress and must retry the Zone.
63. As a Player, I want Portal Scrolls to let me escape a Dungeon with my progress intact before dying, so that I can make strategic retreat decisions.

---

## Implementation Decisions

### Technology Stack

- **Renderer:** Babylon.js (WebGL) — chosen over Three.js for its batteries-included tooling (built-in scene picker, GUI system, Havok physics plugin). TypeScript-first API.
- **Language:** TypeScript — type safety is critical for the complexity of ECS, loot generation, and skill tree calculations.
- **Bundler:** Vite — native ESM dev server with instant HMR, fast production builds. De facto standard for web game development.
- **Physics:** Babylon.js Havok plugin (`@babylonjs/havok`) — full rigidbody simulation for Knockback, explosion force, projectile collision. The "punchy combat" pillar demands physics-driven feedback.
- **ECS Library:** bitecs — the most mature TypeScript ECS library. Archetypal (fast queries), pure data (no classes), well-documented. Entities are numbers, components are typed arrays or sparse sets, systems are pure functions. Aligns with the composable modifier-stacking nature of ARPGs.

### Architecture

- **Game Loop:** Babylon.js-driven — the engine's render loop fires ECS system pipeline then Babylon scene render in sequence. Fixed-timestep decoupling deferred to Phase 2 (multiplayer sync).
- **ECS System Pipeline (ordered):** Input → Physics → AI → Combat → Buff → Loot → Render. Each system queries bitecs for entities matching component signatures and mutates their components.
- **Input Abstraction:** Raw input (keyboard) is mapped to abstract Intent commands (`MOVE_DIRECTION` for WASD vectors, `USE_SKILL(slotIndex)` for 1/2/3/4, `INTERACT` for E). Systems consume Intents, not raw events. This decouples gameplay from input devices and enables deterministic testing.
- **WASD Movement:** `MOVE_DIRECTION` carries a normalized 2D vector produced every frame from the WASD key state. MovementSystem applies velocity to the Character entity based on this vector and movement speed Stat.
- **Skill Targeting:** `USE_SKILL(slotIndex)` resolves targeting automatically — nearest enemy in facing direction for melee skills, cursor world-position for any future ranged skills.
- **Render-Data Projection:** ECS world state is projected into a plain-data `RenderSnapshot` (mesh transforms, particle emitters, Damage Numbers, Ground Item labels, Telegraph decals, Hit-Stop freeze flags). The Babylon.js rendering layer consumes this snapshot — no direct ECS coupling in render code.
- **Persistence:** Local-first via IndexedDB behind a `StoragePort` interface. Multiple Save slots: `listSaves()`, `save(id, world)`, `load(id)`, `deleteSave(id)`. The interface contract is swappable to a REST API in Phase 2. MVP uses auto-save on Zone transitions; manual save also available from the menu.

### Modular File Structure

Every feature lives in its own module folder with a clear, narrow public API. No module may import from a sibling module except through defined interfaces. This is a hard architectural constraint — not a preference — and applies to every feature added by human or AI agent.

```
src/
  core/             # ECS world bootstrap, game loop, event bus, Intent queue
  systems/          # One folder per ECS system — each exports a single run(world) function
    movement/
    combat/
    buff/
    ai/
    loot/
    render/
  features/         # Higher-level feature modules (own types, system, tests, debug hooks)
    dungeon/        # BSP generator, Room/Corridor types, Landmark placement
    passive-tree/   # Tree graph, allocation logic, Stat propagation
    boss/           # FSM, Phase triggers, Telegraph emitters, Enrage timer
    inventory/      # Grid logic, Equipment slots, Stat derivation
    portal/         # Portal Scroll consumable, Boss Portal spawn
  ui/               # HTML overlay panels (Inventory, Skill Tree, Main Menu) + Babylon GUI HUD
  storage/          # StoragePort interface + IndexedDB adapter
  debug/            # DebugConsole, command registry, overlay renderers — see Debug section
  shared/           # Shared types, constants, enums, math utilities (no game logic)
```

**Module rules enforced by convention and linting:**

- Each module folder contains: `index.ts` (public API), `types.ts`, `*.test.ts` co-located with the module.
- A module exports only what other modules need. Internal helpers are not exported.
- The `shared/` folder contains zero game logic — types, enums, and pure math only.
- `debug/` is imported by every feature module for debug hook registration, but `debug/` never imports from feature modules (one-way dependency).
- Adding a new feature = creating a new folder under `features/` or `systems/`. No feature logic lives in `core/`.
- Circular imports between modules are a build error (enforced via `eslint-plugin-import` cycles rule).

---

### Domain Model (see CONTEXT.md for full glossary)

Key domain terms with MVP constraints:

- **Character:** Single Class (Marauder), chosen at creation, immutable.
- **Save:** Full ECS World serialization — Character + all Zone states (entities, components, Seeds). Multiple slots.
- **Rarity:** Normal (0 affixes), Magic (1–2), Rare (3–6). Data model extensible to Unique and Corrupted.
- **Active Skill:** 4 Hotbar Slots (keys 1/2/3/4). Unlocked at specific Levels. No skill gems in MVP.
- **Passive Tree:** Nodes: Passive, Notable, Keystone. Allocated with Skill Points (1 per Level). Respec via Respec Points (5 per Character lifetime).
- **Equipment Slots:** Weapon, Helmet, Chest Armour, Gloves, Boots. Extensible.
- **Inventory:** 40 slots (8×5 grid). Limited capacity.
- **Elite Modifiers:** Enraged, Spectral, Shielded, Bloodthirsty. Rolled 1–2 per Elite.
- **Boss:** Multi-Phase (Life thresholds), Telegraphs (ground decals), Enrage Timer, guaranteed Rare Drops.
- **Death:** Life → 0 reloads most recent Save. Zone restarts from entrance state.
- **Portal Scroll:** Consumable Item, returns Character to Hub. Stackable. Drops from enemies.
- **Boss Portal:** Free portal spawns in Boss Room after kill.

### Game Systems

- **Dungeon Generation:** Tile-based BSP (Binary Space Partition) algorithm that produces a 2D Room-Corridor layout. Hand-crafted Landmark Rooms (Boss Room, Vendor Room, Loot Room) override specific tiles in the layout. Generation is deterministic given a Seed, enabling reproducible layouts for testing. Each Dungeon has a fixed Item Level that gates Affix rolling.
- **Loot Affix System:** Items have an Implicit Affix (per item type, always present) and Explicit Affixes rolled from a weighted pool per Item Level and Rarity. Affix rolling is a pure function `rollAffixes(itemSpec, itemLevel, seed) → Affix[]`. Magic: 1–2 affixes. Rare: 3–6 affixes. No duplicate affixes on the same Item.
- **Passive Skill Tree:** Serializable JSON data model defining nodes, connections, Stats, Notables, and Keystones. The tree is a directed graph — allocation validates path connectivity. Stat modifiers propagate to the Character entity via a modifier pipeline. Respec Points allow unallocation (5 per Character lifetime, no other cost).
- **Boss AI:** Finite state machine per Boss with Phase triggers (Life thresholds at 66% and 33%). Each Phase has distinct attack patterns, Telegraphs, and arena visuals. Enrage Timer starts at encounter begin; on expiry the Boss gains massively increased damage and attack speed.
- **Elite Modifiers:** Enemies can spawn as Elites with 1–2 rolled Modifiers from the pool. Modifiers are components that modify behaviour and visuals — compositional by design. Standard Enemies have no Modifiers.
- **Portal Scrolls:** Consumable Items used from Inventory. Using one returns the Character to the Hub immediately, preserving all progress since the last Save. Drops from enemies at a low rate.

### Debug & Developer Tooling

**Debugging is a first-class requirement, not an afterthought.** Every feature shipped — by a human developer or an AI agent — must include corresponding debug hooks at the time of implementation. A feature is not considered complete until its debug interface exists. This applies to the MVP and every subsequent phase.

#### Debug Console

A persistent in-game developer console is always present in the codebase (toggled with `` ` `` / `~`). It is compiled out of production builds via `import.meta.env.DEV`.

The console provides:
- A text input for running debug commands
- A scrollable log of output, warnings, and errors
- An always-visible FPS counter and entity count overlay (top-left corner in dev mode)

The console is implemented in `src/debug/DebugConsole.ts` and is initialised once in `core/` at startup. It is never conditionally initialised — it is always present in dev builds.

#### Debug Command Registry

All debug commands are registered in `src/debug/commands/`. Each feature module registers its own commands on init:

```ts
// Example from src/features/inventory/index.ts
import { registerDebugCommands } from '@/debug';
registerDebugCommands({
  'inv.fill':    () => fillInventoryWithTestItems(world),
  'inv.clear':   () => clearInventory(world),
  'inv.rare':    (n = '1') => spawnGroundItem(world, { rarity: 'Rare', count: +n }),
});
```

**Required commands shipped with each feature:**

| Feature | Required debug commands |
|---|---|
| Character / Progression | `char.level <n>`, `char.xp <n>`, `char.god` (toggle invincibility) |
| Combat | `combat.kill_all`, `combat.spawn <enemy_type> <count>` |
| Loot | `loot.spawn <rarity> <item_type>`, `loot.fill_room` |
| Dungeon | `dungeon.reveal`, `dungeon.seed <seed>`, `dungeon.goto <room_id>` |
| Boss | `boss.spawn`, `boss.phase <1|2|3>`, `boss.enrage` |
| Passive Tree | `tree.points <n>`, `tree.reset`, `tree.allocate_all` |
| Inventory | `inv.fill`, `inv.clear`, `inv.equip <slot> <item_type>` |
| Save / Storage | `save.dump`, `save.corrupt` (forces reload to test Death), `save.list` |
| Skills | `skill.cooldown_off`, `skill.unlock_all` |

New features added in Phase 2+ must register their own commands following the same pattern before the feature is considered mergeable.

#### Debug Overlays

Visual overlays are toggled independently via console commands or hotkeys. Each lives in `src/debug/overlays/`:

- **`debug.hitboxes`** — renders Havok collision shapes as wireframes
- **`debug.entity_ids`** — billboards entity ECS IDs above every entity in-scene
- **`debug.components <entity_id>`** — prints all component values for a given entity to the console log
- **`debug.ai`** — renders AI state machine current state and target vector for each enemy
- **`debug.render_snapshot`** — prints the current `RenderSnapshot` to console on demand
- **`debug.perf`** — per-system timing breakdown (time spent in each ECS system per frame, in ms)
- **`debug.dungeon`** — prints the full `DungeonLayout` JSON and highlights Room boundaries in-scene

#### Build Separation

All debug code is isolated behind `import.meta.env.DEV`:

```ts
if (import.meta.env.DEV) {
  import('@/debug').then(({ DebugConsole }) => DebugConsole.init(world));
}
```

`vite build` tree-shakes the entire `src/debug/` module — zero debug code ships to production. No manual `#ifdef` or feature flags required.

#### Error Boundaries & Console Logging

- All ECS systems wrap their execution in `try/catch`. Errors are caught, logged to the DebugConsole (in dev) and `console.error` (always), and the system is skipped for that frame rather than crashing the loop.
- The `StoragePort` adapter logs every `save()` and `load()` call with entity counts and timing in dev mode.
- The dungeon generator logs seed, room count, and layout hash on every generation.
- Loot roller logs item type, item level, rolled affixes, and total affix weight on every roll in dev mode.

---

### UI

- Babylon.js GUI overlay for HUD elements: Life orb (left), Mana orb (right), XP bar (bottom), Hotbar Slots with Cooldown radials (bottom-center), Minimap (top-right).
- HTML overlay panels for Inventory (8×5 grid), passive skill tree, and Main Menu — cleaner styling and interaction patterns than in-engine GUI for complex panels.
- In-3D-scene billboarded sprites for: Damage Numbers (colour-coded by damage type), Ground Item labels (Rarity-coloured), Telegraph decals (red circles/cones/lines), Boss life bar.
- Hit-Stop is applied at the render layer — freezes all mesh animation and movement for N frames on heavy attack connection. ECS simulation continues.

---

## Testing Decisions

### Testing Philosophy

Tests should verify **external behaviour**, not implementation details. A system's output (component mutations, spawned entities) is the contract — how it arrives at that output is irrelevant. Tests that assert on intermediate state or internal helper functions should be avoided in favour of end-to-end system behaviour tests.

### What Makes a Good Test

- Injects known input (component states, Intents, Seeds) into the system under test
- Asserts only on the output (mutated components, spawned entities, return values)
- Is deterministic — given the same Seed and input, always produces the same output
- Does not depend on Babylon.js, WebGL, DOM, or any rendering infrastructure
- Runs in a Node.js test runner (Vitest) without browser APIs

### Testing Seams

**Seam A — ECS System boundaries (highest seam)**
Each system (MovementSystem, CombatSystem, LootSystem, BuffSystem, etc.) is tested as a pure function that takes a bitecs world with pre-seeded entities and returns a mutated world. Tests create entities, attach known components, run the system via the pipeline, and assert on output component values. No Babylon.js, no DOM, no rendering. This is the primary seam for all gameplay logic.

**Seam B — StoragePort interface**
Persistence is behind an abstract interface supporting multiple Saves: `listSaves()`, `save(id, world)`, `load(id)`, `deleteSave(id)`. Tests inject a mock storage adapter (in-memory Map) and verify: full-World serialization round-trips (create a World with entities across multiple Zones → serialize → deserialize → assert all component values match), that multiple Saves can coexist, and that Death reload produces the exact pre-death World state.

**Seam C — Dungeon generator**
`generateDungeon(seed, zoneConfig) → DungeonLayout` is a pure function. Tests verify: Room count within expected range, all Rooms connected by Corridors, Landmark Rooms (Boss Room, Vendor Room, Loot Room) exist at correct positions with correct quantities, no overlapping geometry. Deterministic given the Seed.

**Seam D — Loot affix roller**
`rollAffixes(itemSpec, itemLevel, seed) → Affix[]` is a pure function. Tests verify: Rarity distribution over many rolls (statistical), affix pool gating by Item Level, affix count matches Rarity (Magic: 1–2, Rare: 3–6), no duplicate affixes on the same Item, Implicit Affix is always present and not counted against the explicit slot limit.

**Seam E — Input intent abstraction**
Tests inject sequences of Intent commands (`MOVE_DIRECTION`, `USE_SKILL(slotIndex)`, `INTERACT`) directly into the input queue and verify:
- `MOVE_DIRECTION` → MovementSystem produces correct position deltas from WASD vectors
- `USE_SKILL(1)` → CombatSystem triggers correct Active Skill, respects Cooldown lockout, targets nearest enemy in facing direction
- `USE_SKILL` during Cooldown → no effect produced
- `INTERACT` → picks up nearest Ground Item / triggers Vendor Resource restore / opens Loot Room chest

**Seam F — Render-data projection**
Given an ECS world state, the projection function produces a `RenderSnapshot`. Tests assert the snapshot contains the correct mesh instances, transforms, Damage Number emitters, Ground Item labels with Rarity colours, Hit-Stop freeze flags, and Telegraph decals for the given entity state. No WebGL context required.

**Seam G — Equipment & Stat derivation**
Equip an Item with known Affixes into an Equipment Slot, assert the Character's derived Stats reflect the Affix contributions. Unequip, assert Stats revert. Test all five slots (Weapon, Helmet, Chest Armour, Gloves, Boots) independently and cumulatively. Verify Implicit Affixes from item base types are applied.

**Seam H — Passive tree & Respec**
Allocate Skill Points to Passives (regular, Notable, Keystone), assert derived Stats update. Allocate a Keystone, assert the trade-off is correctly applied. Spend a Respec Point to unallocate, assert Skill Point is reclaimed and Stat bonuses are removed. Assert Notable is only allocatable when connected to an allocated path. Assert Keystone cannot be unallocated without sufficient Respec Points.

### Test Runner & Tooling

- Vitest for test execution (native Vite integration, fast, watch mode)
- Tests live in `src/**/*.test.ts` co-located with the module under test
- CI step: `vitest run` before every build

---

## Out of Scope

The following are explicitly **not** part of MVP Alpha and will be deferred to Phase 2 or later:

- Multiplayer / co-op (WebSocket networking)
- Full crafting system (Alteration Orbs, Regal Shards, Corruption Orbs, Cursed Urns)
- Additional Classes beyond Marauder
- Acts 2–3 (only Act 1)
- Endgame map system
- Full 5-act campaign
- Player trading
- Seasonal content / leagues
- Leaderboards
- Monetisation (cosmetics, stash tabs)
- Server-side persistence (cloud saves)
- Full skill gem system (Active Skills gained from gems socketed into Equipment — MVP uses Level-up skill unlocks instead)
- Character creation screen with cosmetic options (MVP uses Class selection and name entry only)
- Sound effects and music (deferred to Beta)
- Mobile / touch controls
- Accessibility features (colourblind modes, remappable keys — deferred)
- Gold or any currency economy (no buy/sell at Vendors)
- Rare named lieutenants (enemy tier between Elite and Boss)
- Unique and Corrupted Rarity tiers
- Screen shake and other advanced combat juice beyond Hit-Stop, Damage Numbers, and Knockback

---

## Further Notes

### Future-Proofing

Several architectural decisions are explicitly designed to support future phases without rewrites:

- **Modular file structure** ensures each Phase 2+ feature (new classes, crafting, multiplayer) is dropped into `src/features/<name>/` without touching existing modules. The one-way `debug/` dependency means debug hooks cost nothing to add to new features.
- **StoragePort interface** enables swapping IndexedDB for a REST API without changing game logic. Multiple Save support from day one means account-based cloud saves slot in naturally.
- **Intent-based input** maps naturally to networked input (send Intents over WebSocket rather than raw keystrokes).
- **Fixed-timestep decoupling** can be introduced alongside the Babylon.js-driven loop by adding an accumulator — the system pipeline stays the same.
- **ECS composition** means new Elite Modifiers, buffs, Active Skill types, and enemy behaviours are just new component + system pairs.
- **Rarity enum** is extensible to Unique and Corrupted without migrating existing Items.
- **Equipment Slots** are extensible to rings, amulet, and off-hand in Phase 2.
- **Hotbar Slots** at 1/2/3/4 scale naturally to 1–5+ when more slots are needed.

### MVP Class

The Marauder (strength-based melee) is the single MVP Class — melee combat is the simplest to prototype, the most visually satisfying for Hit-Stop feedback, and the most forgiving for first-time Players. Its Active Skill progression is level-gated with a basic attack auto-granted at Level 1 in Hotbar Slot 1.

### Domain Glossary

All canonical terms are defined in `CONTEXT.md`. The PRD uses these terms consistently. Key distinctions:
- **Player** (the human) vs **Character** (the avatar)
- **Affix** (item stat modifier) vs **Elite Modifier** (enemy behaviour trait)
- **Attribute** (Str/Dex/Int) vs **Stat** (derived combat numbers) vs **Resource** (Life/Mana pools)
- **Drop** (the spawn event) vs **Ground Item** (the object on the floor) vs **Item** (the abstract object)
- **Phase** (Boss behaviour state) vs **Telegraph** (pre-attack visual warning)

### Note on AI-Assisted Development

This project is developed with AI agent assistance. The PRD, implementation plans, and testing seams are designed to be consumed both by human developers and AI coding agents. The `ready-for-agent` triage label signals that the work is structured for AI execution.

**Agent implementation requirements — non-negotiable:**

1. **Modular structure is mandatory.** Every new feature must be created as its own module under `src/features/` or `src/systems/`. No feature logic is added to `core/`, `shared/`, or an existing unrelated module. The module must include `index.ts` (public API), `types.ts`, and at least one `*.test.ts` file.

2. **Debug commands ship with the feature.** Every feature implementation must register its debug commands in `src/debug/commands/` before the task is considered complete. Refer to the Debug & Developer Tooling section for the required command set per feature. An implementation without debug hooks is an incomplete implementation.

3. **Use agents to break down and execute this task.** Sub-tasks (module scaffold, system logic, tests, debug hooks) should be executed as discrete agent steps, not as one monolithic output.

4. **Logging is always on in dev.** Any system, generator, or adapter added must emit meaningful `console.log` output in `import.meta.env.DEV` for key operations (saves, loads, generation, loot rolls). Silent systems are prohibited in dev builds.
