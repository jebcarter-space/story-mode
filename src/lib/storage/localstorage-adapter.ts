import type { StorageInterface } from './storage-interface';

export class LocalStorageAdapter implements StorageInterface {
  private keyPrefix: string;

  constructor(keyPrefix: string = '') {
    this.keyPrefix = keyPrefix;
  }

  private getKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    if (this.keyPrefix) {
      // Only clear keys with our prefix
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.keyPrefix + ':')) {
          localStorage.removeItem(key);
        }
      });
    } else {
      localStorage.clear();
    }
  }

  async keys(): Promise<string[]> {
    const keys = Object.keys(localStorage);
    if (this.keyPrefix) {
      const prefix = this.keyPrefix + ':';
      return keys
        .filter(key => key.startsWith(prefix))
        .map(key => key.substring(prefix.length));
    }
    return keys;
  }
}