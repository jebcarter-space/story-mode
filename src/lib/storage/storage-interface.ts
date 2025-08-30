export interface StorageInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface StorageOptions {
  version?: number;
  onUpgrade?: (oldVersion: number, newVersion: number) => Promise<void>;
}