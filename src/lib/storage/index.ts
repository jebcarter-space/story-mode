import type { StorageInterface } from './storage-interface';
import { IndexedDBStorage } from './indexeddb-storage';
import { LocalStorageAdapter } from './localstorage-adapter';

// Storage factory to provide the best available storage option
export function createStorage(name: string): StorageInterface {
  // For now, prefer localStorage for reliability in development
  return new LocalStorageAdapter(`story-mode-${name}`);
  
  // TODO: Re-enable IndexedDB when serialization issues are resolved
  /*
  // Check if IndexedDB is available
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      return new IndexedDBStorage(`story-mode-${name}`);
    } catch (error) {
      console.warn('IndexedDB not available, falling back to localStorage:', error);
    }
  }
  
  // Fall back to localStorage
  return new LocalStorageAdapter(`story-mode-${name}`);
  */
}

// Legacy migration helper
export async function migrateLegacyData(storage: StorageInterface, legacyKey: string, newKey: string): Promise<void> {
  try {
    const legacyData = localStorage.getItem(legacyKey);
    if (legacyData) {
      const parsedData = JSON.parse(legacyData);
      await storage.set(newKey, parsedData);
      localStorage.removeItem(legacyKey);
      console.log(`Migrated data from ${legacyKey} to new storage system`);
    }
  } catch (error) {
    console.error(`Error migrating legacy data from ${legacyKey}:`, error);
  }
}