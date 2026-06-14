# Death Reloads Most Recent Save

When the Character dies (Life reaches 0), the game reloads the most recent Save. All progress — Experience, Items, and Zone state — since that Save is lost. Because auto-saves occur on Zone transitions, this means restarting the current Zone from its entrance state.

**Status:** accepted

## Considered Options

- **Hub respawn, Zone frozen (PoE-style).** No progress loss, walk back from Hub. Rejected because it removes tension — death becomes a minor inconvenience. The "One more run" pillar demands stakes.
- **Checkpoint respawn at last Vendor.** Intermediate between full restart and Hub respawn. Rejected because it creates an incentive to hug Vendor Rooms, undermining exploration flow.
- **Zone restart on death.** Punishing but respects the risk-reward loop. Chosen because it aligns with the roguelite pacing inherited from Hero Siege and gives Portal Scrolls (consumable escape) genuine value — using one before dying preserves your progress.

## Consequences

- Portal Scrolls gain strategic weight: they are the only way to exit a Dungeon with progress intact without killing the Boss.
- Death during a Boss encounter means replaying the full Zone, not just the Boss. The Boss Portal after victory is a meaningful reward, not just a convenience.
- Manual saving mid-Zone becomes a strategic option for Players who want to lock in partial progress (found a great Item, want to bank it).
- May frustrate casual Players. Mitigation: Portal Scrolls are findable Drops, and the 1-Act scope keeps Zone length manageable.
