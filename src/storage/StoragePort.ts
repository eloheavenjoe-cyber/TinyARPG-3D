import type { SaveSlot } from '@/shared';
import type { World } from '@/core';

/**
 * StoragePort — the persistence interface.
 * MVP: IndexedDB adapter. Phase 2: swappable to REST API.
 */
export interface StoragePort {
  listSaves(): Promise<SaveSlot[]>;
  save(id: string, world: World): Promise<void>;
  load(id: string): Promise<World>;
  deleteSave(id: string): Promise<void>;
}
