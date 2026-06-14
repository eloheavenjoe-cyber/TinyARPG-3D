# TinyARPG 3D

A browser-native isometric action-RPG built with Babylon.js — deep loot, skill customization, and punchy combat in a browser tab.

## Language

**Player**:
The human user at the browser. Not persisted in the ECS world.
_Avoid_: User, gamer

**Character**:
The in-game avatar — a specific Class with Level, Stats, inventory, Equipment, and passive skill tree. The entity that is saved/loaded.
_Avoid_: Hero, avatar, toon

**Save**:
A serialized snapshot of the full game state — the Character and all Zone states (entities, components, layout seeds) — at a point in time. Persisted locally via IndexedDB. Multiple Saves supported; the Player can create, load, and delete individual Saves from the main menu. "Continue" loads the most recent Save. Cleared Zones persist exactly as left.
_Avoid_: Save file, save game, profile

**Class**:
A predefined character template (e.g. Marauder) that determines base stats, starting skills, and starting position on the passive skill tree. One Class per Character, chosen at creation and immutable.
_Avoid_: Archetype, hero type

**Rarity**:
The tier of an Item, determining how many affixes it can roll and its visual label colour. MVP values: Normal (none), Magic (1–2), Rare (3–6). Extensible to Unique and Corrupted in later phases.
_Avoid_: Tier, quality, grade

**Active Skill**:
A combat ability assigned to a Hotbar Slot (1/2/3/4), activated by the Player during combat. Has Cooldowns and produces gameplay effects (damage, movement, buffs). In MVP, unlocked automatically at specific Character Levels.
_Avoid_: Spell, ability, power, action

**Cooldown**:
A time lockout after activating an Active Skill, during which that Hotbar Slot cannot be used again. Measured in seconds, displayed as a radial fill on the Hotbar Slot. Each Active Skill has its own Cooldown duration.
_Avoid_: Recast time, skill lockout, cooldown timer

**Tooltip**:
A contextual popup that appears on hover. Item Tooltips show name, Rarity-coloured border, Implicit Affix, Explicit Affixes, and Level requirement. Passive Tooltips show node name, type (Passive / Notable / Keystone), and Stat bonuses.
_Avoid_: Info popup, hover card, item card

**Passive**:
A node on the passive skill tree that grants permanent Stat bonuses when allocated with Skill Points. The most common node type. Subtypes: Notable, Keystone.
_Avoid_: Talent, perk, trait

**Notable**:
A larger Passive node, one per tree cluster, with a meaningfully larger Stat bonus than a regular Passive. A destination node that shapes pathing decisions.
_Avoid_: Big node, major passive

**Keystone**:
A build-defining Passive with a powerful effect and an explicit trade-off (e.g. "deal 40% more damage but have no Mana regeneration"). Rare, high-impact, changes how the Character plays. Always at cluster edges.
_Avoid_: Capstone, ultimate passive, legendary node

**Skill Point**:
The currency earned when a Character gains a Level, spent to allocate Passives on the passive skill tree.
_Avoid_: Talent point, passive point, node point

**Respec Point**:
A limited resource granted to the Character (fixed pool, e.g. 5 per Character lifetime) used to unallocate a Passive and reclaim the Skill Point spent on it. No other cost in MVP.
_Avoid_: Refund point, regret point, respec token

**Affix**:
A stat modifier on an Item. The umbrella term covering both implicit and explicit varieties.
_Avoid_: Mod, modifier, stat, property

**Implicit Affix**:
An Affix inherent to an Item's base type (e.g. all plate armour grants "+X armour"). Always present, does not consume an explicit affix slot.
_Avoid_: Base mod, innate mod

**Explicit Affix**:
A randomly rolled Affix determined by Rarity and Item Level. Magic items get 1–2, Rare items get 3–6. Drawn from a weighted pool.
_Avoid_: Random mod, rolled mod, affix (when used to mean only explicit)

**Item Level**:
A numeric value assigned to an Item based on the Zone where it dropped. Determines which Explicit Affixes can roll and their magnitude ranges. Higher-Zone items have higher Item Levels and stronger potential Affixes. Not to be confused with the Character's Level.
_Avoid_: iLvl, item tier, drop level

**Act**:
A story chapter composed of multiple Zones, culminating in a Boss encounter. MVP has one Act.
_Avoid_: Chapter, campaign

**Zone**:
A single contiguous gameplay space the Character moves through, with a distinct biome and visual theme. May be hand-crafted or procedurally generated.
_Avoid_: Area, level, map, stage

**Hub**:
A hand-crafted safe Zone with no enemies. Contains vendors and serves as the Character's base between Dungeons. One per Act.
_Avoid_: Town, camp, safe zone

**Dungeon**:
A procedurally generated Zone containing enemies and loot. Generated via seeded BSP algorithm. Three per Act in MVP, each with a distinct visual theme.
_Avoid_: Map, instance, level

**Seed**:
A numeric value fed into a deterministic random number generator. The same Seed always produces the same Dungeon layout and Affix rolls. Stored in the Save to reproduce Zone state exactly on load.
_Avoid_: Random seed, generation seed, RNG seed

**Room**:
A discrete tile region within a Dungeon. Connected by Corridors. Enemies spawn in Rooms.
_Avoid_: Chamber, cell, section

**Corridor**:
The narrow connective tiles between Rooms in a Dungeon. Generated by the BSP algorithm. No enemies spawn in Corridors — used for traversal only.
_Avoid_: Hallway, passage, connector

**Minimap**:
A small top-right corner overlay showing the current Dungeon's discovered layout. Rooms and Corridors are revealed as the Character explores them. The current Room is highlighted. Landmark Room icons appear once discovered.
_Avoid_: Map overlay, dungeon map, radar

**Portal Scroll**:
A consumable Item that, when used, returns the Character from any Dungeon back to the Hub. Found as Drops. Stackable in the Inventory.
_Avoid_: Town portal, waypoint scroll, return scroll

**Boss Portal**:
A free portal that spawns in the Boss Room after the Boss is killed. Returns the Character to the Hub. Guaranteed exit — no Portal Scroll required.
_Avoid_: Victory portal, boss exit

**Landmark Room**:
A hand-crafted Room overlaid onto the procedural Dungeon layout at a guaranteed position. Types: Boss Room, Vendor Room, Loot Room.
_Avoid_: Special room, preset room, featured room

**Loot Room**:
A Landmark Room containing 2–4 treasure chests. Chests drop Items of the Dungeon's Item Level with higher Rarity chances than enemy Drops. No enemies. The exploration jackpot.
_Avoid_: Treasure room, chest room, vault

**Vendor**:
An interactive NPC found in the Hub and Vendor Rooms. When interacted with (E key), restores the Character's Life and Mana to full. No buy/sell functionality in MVP.
_Avoid_: Merchant, shopkeeper, NPC

**Death**:
When the Character's Life reaches 0. Triggers a reload of the most recent Save. All progress (Experience, Items, Zone state) since that Save is lost. In practice this means restarting the current Zone from its entrance state, since auto-saves occur on Zone transitions.
_Avoid_: Defeat, wipe, respawn

**Main Menu**:
The initial screen shown on game load. Options: Continue (loads most recent Save), Load Game (pick from all Saves), New Character (class selection then name entry), Delete Save (pick one to permanently remove). No settings in MVP.
_Avoid_: Title screen, start screen, lobby

**Elite Modifier**:
A behaviour-altering trait rolled on elite enemies at spawn time. Changes combat behaviour, visuals, and sometimes stats. MVP pool: Enraged, Spectral, Shielded, Bloodthirsty.
_Avoid_: Elite affix, enemy mod, champion mod, mutation

**Item**:
An object with Affixes and a Rarity (if equippable) or a consumable effect (if not). Exists in exactly one state: on the ground (Ground Item), in the Character's Inventory, or equipped (Equipment). Portal Scrolls are consumable Items that are used from Inventory, not equipped.
_Avoid_: Gear, loot (see Drop), pickup

**Equipment**:
An Item currently placed in a Character's Equipment Slot. Its Affixes contribute to the Character's combat Stats.
_Avoid_: Gear, worn item, equipped item

**Equipment Slot**:
A designated position on the Character where one Item can be equipped. MVP slots: Weapon, Helmet, Chest Armour, Gloves, Boots. Slots are extensible for Phase 2.
_Avoid_: Gear slot, inventory slot, equip slot

**Inventory**:
The Character's carried Item collection, displayed as an 8×5 grid panel (40 slots). An Item in the Inventory is not equipped and not on the ground. Operations: equip, unequip, discard (drop as Ground Item). Limited capacity forces return-to-Hub decisions.
_Avoid_: Bag, backpack, stash

**Ground Item**:
An Item lying on the Dungeon floor, rendered as a physics-enabled 3D mesh with a rarity-coloured label. Pick-up-able by the Character.
_Avoid_: Drop (that's the spawn event), loot pile, pickup

**Drop**:
The event of one or more Ground Items spawning, typically on enemy death. Not the item itself.
_Avoid_: Loot drop, item spawn

**Attribute**:
A core character dimension: Strength, Dexterity, Intelligence. Base value from Class, modified by allocated Passives and Equipment Affixes. Attributes feed into derived Stat calculations.
_Avoid_: Primary stat, core stat, ability score

**Stat**:
A derived combat number computed from Attributes, Equipment, and Passives. Examples: Maximum Life, Physical Damage, Fire Resistance, Critical Strike Chance. Displayed on the Character panel.
_Avoid_: Secondary stat, combat stat, property

**Resource**:
A spendable pool that fluctuates during combat. Life (damage taken, death at 0) and Mana (spent to cast Active Skills, regenerates over time).
_Avoid_: HP, MP, energy, pool

**Standard Enemy**:
A common mob with a fixed behaviour pattern (melee or ranged). No Elite Modifiers. The baseline combat unit.
_Avoid_: Mob, trash mob, normal enemy

**Elite**:
A Standard Enemy variant that spawns with 1–2 rolled Elite Modifiers, increased Stats, and a distinctive visual effect. Drops higher-Rarity loot.
_Avoid_: Champion, rare mob, special enemy

**Boss**:
A unique named enemy with a multi-Phase finite state machine, telegraphed attacks, and guaranteed Rare Drops. One per Act, encountered in the Boss Room of the final Dungeon.
_Avoid_: Act boss, end boss, big bad

**Phase**:
A discrete behaviour state within a Boss encounter, triggered by a Life threshold (e.g. 100%–66% = Phase 1, 66%–33% = Phase 2, 33%–0% = Phase 3). Each Phase has distinct attack patterns, arena modifications, and visuals. Transitions are automatic when Life crosses the threshold.
_Avoid_: Stage, boss stage, health gate

**Enrage Timer**:
A hidden countdown from the start of a Boss encounter. If it expires, the Boss gains massively increased damage and attack speed. Prevents indefinite kiting. Applicable across all Phases.
_Avoid_: Soft enrage, timeout, berserk timer

**Telegraph**:
A pre-attack visual indicator showing where a Boss attack will land and when it will hit. Appears as a ground decal (red circle, cone, or line) with a fixed warning duration before damage is dealt. Gives the Player time to dodge. MVP: Boss-only.
_Avoid_: Wind-up, attack indicator, ground marker

**Hotbar Slot**:
One of 4 assignable key positions (1/2/3/4) to which the Player assigns a known Active Skill. The Player knows more Active Skills than they have Hotbar Slots, forcing loadout choices. In MVP, WASD is reserved for movement.
_Avoid_: Action bar slot, skill slot, quickslot

**HUD**:
The persistent in-game overlay rendered via Babylon.js GUI. Shows combat state at a glance: Life orb (left), Mana orb (right), XP bar (bottom), Hotbar Slots with Cooldowns (bottom-center), Minimap (top-right). Distinct from panel UI (Inventory, Passive Tree) which are HTML overlays opened on demand.
_Avoid_: UI, overlay, game UI

**Hit-Stop**:
A global freeze of movement and animation for N frames when a heavy attack connects. Applied at the render layer only — the ECS simulation continues. Creates impact weight.
_Avoid_: Hit pause, frame freeze, impact frames

**Damage Number**:
A floating numeric label that rises from the hit point showing damage dealt. Billboarded sprite in the 3D scene, colour-coded by damage type.
_Avoid_: Floating text, combat number, damage popup

**Knockback**:
A physics impulse applied to the hit entity via Havok, pushing it away from the attacker on heavy strikes.
_Avoid_: Pushback, knock-away, force push

**Intent**:
An abstract command produced by the input layer and consumed by ECS systems. Decouples gameplay logic from specific input devices. MVP Intents: `MOVE_DIRECTION` (WASD vector), `USE_SKILL` (hotbar key 1/2/3/4), `INTERACT` (E key — pick up Ground Items, doors, vendors).
_Avoid_: Command, action, input event

**Experience**:
A cumulative value earned from killing enemies. Increases monotonically. Accumulating enough Experience triggers a Level-up. Shorthand: XP.
_Avoid_: EXP, experience points

**Level**:
The Character's current level, derived from Experience via a threshold table. Each Level-up grants one Skill Point, increases base Attributes, and may unlock new Active Skills. Gates Equipment requirements and Zone access.
_Avoid_: Character level, CLvl, power level
