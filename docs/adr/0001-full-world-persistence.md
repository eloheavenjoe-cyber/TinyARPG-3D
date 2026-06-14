# Full-World Persistence

The Save includes the complete ECS World — the Character and all Zone states (entities, components, layout Seeds). Cleared Zones persist exactly as left; re-entering Zone 1 returns you to the same state, not a regenerated instance.

**Status:** accepted

## Considered Options

- **Character-only saves with Zone regeneration on re-entry.** Lighter save size, simpler serialization. Rejected because user story #31 ("cleared zones persist their state") was prioritized, and seeded regeneration would not preserve exact entity state (dead enemy positions, opened chests, etc.).
- **Full-World saves.** Larger payload, more complex serialization, but faithfully captures game state with no loss.

## Consequences

- `StoragePort` interface must serialize/deserialize the entire bitecs World, including all entity-component mappings across all visited Zones.
- Save size grows with exploration. Mitigated by limiting MVP scope to 1 Act (3 Dungeons + Hub).
- Seeds alone are insufficient — component mutations (dead enemies, consumed chests) must be stored, not just re-derived from the Seed.
- Enables future features like "resume mid-Dungeon after browser close" without special handling.
