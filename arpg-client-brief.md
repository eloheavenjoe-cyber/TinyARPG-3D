# Browser ARPG — Client Brief
**Version 1.0 | June 2026**

---

## Overview

A browser-native isometric action-RPG with deep loot, skill systems, and dark fantasy world-building. Zero install friction — playable in any browser tab within seconds.

**Genre:** ARPG / Dungeon Crawler  
**Platform:** Web Browser (WebGL)  
**Perspective:** Isometric / 3D  
**Players:** Solo (Co-op planned)  
**Stage:** Solo indie / AI-assisted dev  

---

## Vision Statement

To deliver the satisfying depth of Path of Exile's loot and progression, the fast-paced arcade energy of Hero Siege, and the gothic atmosphere of Diablo — all inside a browser tab, with zero install friction and sessions playable in under 10 minutes.

---

## Design Pillars

1. **One more run** — Every session ends with a carrot on a stick. A new drop, a skill node away, a boss floor down.
2. **Deep, not obtuse** — Complex systems revealed gradually. Easy to start, endlessly masterable.
3. **Instant gratification** — Combat feels punchy and responsive. Enemies explode. Loot rains. Numbers fly.
4. **Browser-first** — No client. No install. Loads fast, saves to cloud. Playable anywhere.
5. **Build identity** — No two characters feel the same. Skill trees and gear create unique playstyles.
6. **Dark world** — Grim aesthetic. Corrupted lands, cursed items, and unknowable evil lurking beneath.

---

## Inspirations

| Game | What we borrow |
|---|---|
| Diablo II / IV | Atmosphere, item rarities, dungeon tone, boss design |
| Path of Exile | Passive skill tree depth, currency crafting, item affixes, endgame loops |
| Hero Siege | Arcade energy, class variety, roguelite pacing, screen-filling chaos |
| Torchlight II | Colour palette, item feel, approachable-yet-deep systems |

---

## Core Systems

### Combat
Real-time click/WASD movement, skill hotbar (Q/W/E/R), cooldown management, hit-stop feedback, AoE and projectile archetypes. Combat should feel snappy at 60fps with generous hitstop frames on heavy attacks.

### Loot
Procedurally generated gear with rarity tiers: Normal → Magic → Rare → Unique → Corrupted. Items have implicit and explicit mods. Affixes are rolled from a weighted pool per item level and type. Set pieces provide bonus effects when multiple pieces are equipped.

### Skill Tree
Large passive node tree inspired by PoE. Stats, notables, and keystones. Active skills learned from gems socketed into gear, or via level-up points. Specialisation paths per class archetype.

### Crafting
Currency-based crafting system:
- **Alteration Orbs** — reroll magic item affixes
- **Regal Shards** — upgrade magic to rare
- **Corruption Orbs** — apply a corrupted affix (unpredictable outcome)
- **Cursed Urns** — apply a curse modifier with scaling penalty/reward
- Additional currencies for quality, socket linking, etc.

### World Map
Overworld zone selection screen. Procedurally generated dungeon layouts per zone with hand-crafted landmark rooms. Hub town is hand-crafted per act. Zone difficulty scales with act progression and optional modifiers.

### Enemies
Standard mobs, elite packs with rolled affixes (Enraged, Spectral, Bloodthirsty, Shielded, etc.), rare named lieutenants, and multi-phase act bosses. Enemy density and affixes scale with zone level.

### Classes
3–5 archetypes at launch, each with unique base stats and starting skill loadout. Suggested archetypes:
- **Marauder** — melee tank, strength-based
- **Ranger** — ranged DPS, dexterity-based
- **Witch** — elemental/summoner, intelligence-based
- **Templar** — hybrid melee/spell
- **Shadow** — critical strike/poison, dex+int hybrid

---

## Technical Direction

| Area | Approach |
|---|---|
| Renderer | Three.js or Babylon.js (WebGL) |
| Camera | Locked isometric (~45° tilt, ~60° pitch) |
| Asset pipeline | GLTF/GLB models, texture atlases, sprite sheets |
| Persistence | Server-side character/account saves |
| Multiplayer | WebSocket-based (Phase 2) |
| Dev workflow | AI agent-assisted (Claude Code) |

---

## Art Direction

Dark fantasy palette — deep purples, sickly greens, ember orange, and charcoal stone. Environments shift from blighted villages to corrupted hellscapes as difficulty increases.

Enemies and loot items should pop visually against dark backgrounds. UI is minimal, gothic-styled, and HUD-light — inventory and skills accessed via clean panels that slide in. Particle effects are generous: critical hits, skill detonations, and item drops all have strong visual read at isometric range.

Lighting is dynamic per zone type — blue-tinted underground caves, warm flickering torchlight in towns, green bilelight in corrupted zones.

---

## Scope & Phasing

### MVP — Alpha
- 1 playable class
- 1 act, 3 zones + hub town
- Core combat loop (basic skills, melee + ranged)
- Basic loot with 3 rarity tiers
- 1 act boss
- Partial passive skill tree
- Basic HUD / inventory

### Phase 2 — Beta
- 2–3 additional classes
- Acts 2 & 3
- Full crafting system (all currency types)
- World map system
- Multiplayer co-op (2-player)
- Endgame map system (randomised high-tier zones)
- Full skill gem system

### Phase 3 — 1.0 Launch
- Full 5-act campaign
- Seasonal content / leagues
- Leaderboards
- Player trading
- Corruption & endgame atlas
- Monetisation layer (cosmetics, stash tabs)

---

## Target Audience

**Primary:** Lapsed PoE/Diablo fans, ages 22–40, who want depth without a 50GB client commitment.

**Secondary:** Casual ARPG players seeking short (10–30 min), rewarding sessions on any device.

**Tertiary:** Browser gamers who discover via YouTube, Twitch, or content creator coverage.

---

## Success Metrics

- Average session length: 15–25 minutes
- D7 retention: >25%
- Loot interaction rate (items picked up / items dropped): >60%
- Boss kill rate per attempt: <40% (challenge matters)
- Craft currency use rate per session: rising over first 10 sessions

---

*This brief is a living document. Systems, scope, and priorities should be reviewed at each phase milestone and updated accordingly.*
