# TinyARPG 3D

Browser-native isometric action-RPG — Babylon.js + bitecs ECS + TypeScript + Vite.

## Project

- **Stack:** Babylon.js 7.x (WebGL), Havok physics, bitecs ECS, TypeScript 5.x, Vite 5.x, Vitest 1.x
- **Entry:** `src/main.ts` → `createEngine()` + `createWorld()` → `startLoop()` → `runPipeline(world)` every frame
- **Docs:** `PRD.md` (full spec), `CONTEXT.md` (glossary), `docs/adr/` (decisions)
- **Scope:** MVP Alpha — 1 Class (Marauder), 1 Act (Hub + 3 Dungeons + Boss), local IndexedDB saves

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | `tsc && vite build` — typecheck then bundle |
| `npm run preview` | Vite production preview |
| `npm run test` | `vitest run` — all tests once |
| `npm run test:watch` | `vitest` — watch mode |
| `npm run lint` | `eslint src/ --ext .ts` |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture

```
src/
  core/          ECS bootstrap, game loop, Intent queue, system pipeline
                 ECSWorld.ts — System type, pipeline[], runPipeline(), pushIntent()
                 GameLoop.ts  — createEngine(), startLoop()
  systems/       One ECS system per folder, each exports (world: World) => void
                 movement/ combat/ buff/ ai/ loot/ render/
  features/      Higher-level feature modules (own types, system, tests, debug hooks)
                 dungeon/ passive-tree/ boss/ inventory/ portal/
  shared/        Types, enums, pure math — NO game logic
  storage/       StoragePort interface (IndexedDB behind it, swappable to REST)
  debug/         DebugConsole, command registry, overlays — compiled out in prod
  ui/            HTML overlay panels + Babylon.js GUI HUD
```

**Module rules (enforced by eslint `import/no-cycle`):**
- Every module: `index.ts` (public API), `types.ts`, `*.test.ts` co-located
- `shared/` → zero game logic; only types, enums, pure functions
- `debug/` → imported by features to register commands; never imports from features (one-way)
- New feature = new folder under `features/` or `systems/`; never add feature logic to `core/` or `shared/`
- Path alias: `@/` maps to `src/`

## Conventions

- **ECS systems are pure:** `(world: World) => void` — mutate components, never hold state
- **Intent-based input:** raw keyboard → Intent commands (`MOVE_DIRECTION`, `USE_SKILL`, `INTERACT`) → systems consume Intents, not raw events
- **World type:** `World` is re-exported from `@/core` (alias for bitecs `IWorld`). Import from `@/core`, not from `bitecs` directly.
- **Error boundaries:** every ECS system in the pipeline is wrapped in try/catch — errors are logged, system skipped for that frame, loop continues
- **Debug-first:** every feature ships with debug commands registered in `src/debug/commands/`. A feature is incomplete without them. Use `import.meta.env.DEV` to guard dev-only code — tree-shaken in production.
- **Testing:** Vitest, co-located `*.test.ts`. Test external behaviour (component outputs), not internals. Deterministic via Seeds. No Babylon.js/WebGL/DOM in tests.
- **Domain terms:** use canonical glossary from `CONTEXT.md` — "Character" not "hero", "Affix" not "mod", "Ground Item" not "drop", etc.
- **Comments:** JSDoc on public exports. `//` for inline reasoning. Section dividers `// -----` for grouping.
- **Formatting:** no formatter configured yet — keep consistent with existing code (2-space indent, single quotes preferred, semicolons)

## Notes

- **Status:** ECS pipeline 5/7 complete (69 tests). Systems: input → movement → AI → combat → buff. Loot + render remaining.
- Greenfield project — scaffolded June 2026. See `PRD.md` §Implementation Status for full breakdown.
- Havok physics WASM loads async; don't block the game loop on it
- Save serialization must handle the full bitecs World (entities + components across all Zones)
- Boss enrage timer is per-encounter, not per-Phase
- Portal Scrolls are the only mid-Dungeon escape (besides Boss Portal after victory)
