import type { LLMProfile, LLMProfileList } from "../types";

export function createLLMProfiles() {
  let value = $state(JSON.parse(localStorage.getItem('llm-profiles') || '{}'));

  function reset() {
    value = {};
    localStorage.setItem('llm-profiles', JSON.stringify(value));
  }

  function add(profile: LLMProfile) {
    const timestamp = Date.now();
    profile.created = profile.created || timestamp;
    profile.updated = timestamp;
    
    // Use name as key, converting to lowercase and replacing spaces with underscores
    const key = profile.name.toLowerCase().replace(/\s+/g, '_');
    value[key] = profile;
    localStorage.setItem('llm-profiles', JSON.stringify(value));
  }

  function remove(key: string) {
    delete value[key];
    localStorage.setItem('llm-profiles', JSON.stringify(value));
  }

  function update(key: string, profile: LLMProfile) {
    if (value[key]) {
      profile.created = value[key].created;
      profile.updated = Date.now();
      value[key] = profile;
      localStorage.setItem('llm-profiles', JSON.stringify(value));
    }
  }

  function importProfiles(profiles: LLMProfileList) {
    value = { ...value, ...profiles };
    localStorage.setItem('llm-profiles', JSON.stringify(value));
  }

  function exportProfiles(): LLMProfileList {
    return { ...value };
  }

  function getByProvider(provider: string): LLMProfileList {
    const filtered: LLMProfileList = {};
    for (const [key, profile] of Object.entries(value) as [string, LLMProfile][]) {
      if (profile.provider === provider) {
        filtered[key] = profile;
      }
    }
    return filtered;
  }

  function getProviders(): string[] {
    const providers = new Set<string>();
    for (const profile of Object.values(value) as LLMProfile[]) {
      providers.add(profile.provider);
    }
    return Array.from(providers).sort();
  }

  function reload() {
    value = JSON.parse(localStorage.getItem('llm-profiles') || '{}');
  }

  function duplicate(key: string, newName: string) {
    if (value[key]) {
      const original = value[key];
      const duplicated: LLMProfile = {
        ...original,
        name: newName,
        created: Date.now(),
        updated: Date.now()
      };
      add(duplicated);
    }
  }

  return {
    get value() {
      return value;
    },
    reset,
    add,
    remove,
    update,
    importProfiles,
    exportProfiles,
    getByProvider,
    getProviders,
    reload,
    duplicate,
  };
}