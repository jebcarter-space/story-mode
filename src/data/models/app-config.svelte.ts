export interface AppConfig {
  features: {
    enhancedTables: boolean;
    templates: boolean;
    llmIntegration: boolean;
  };
  version: string;
  lastUpdated: string;
}

const DEFAULT_CONFIG: AppConfig = {
  features: {
    enhancedTables: true,
    templates: true,
    llmIntegration: true,
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

export function createAppConfig() {
  let value: AppConfig = $state((() => {
    const stored = localStorage.getItem('appConfig');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle missing properties
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          features: {
            ...DEFAULT_CONFIG.features,
            ...parsed.features,
          },
        };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  })());

  function save() {
    value.lastUpdated = new Date().toISOString();
    localStorage.setItem('appConfig', JSON.stringify(value));
  }

  function toggleFeature(feature: keyof AppConfig['features']) {
    value.features[feature] = !value.features[feature];
    save();
  }

  function updateFeatures(features: Partial<AppConfig['features']>) {
    Object.assign(value.features, features);
    save();
  }

  function reset() {
    value = { ...DEFAULT_CONFIG, lastUpdated: new Date().toISOString() };
    save();
  }

  function exportConfig(): string {
    return JSON.stringify(value, null, 2);
  }

  function importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson) as AppConfig;
      // Validate the structure
      if (imported.features && typeof imported.features === 'object') {
        value = {
          ...DEFAULT_CONFIG,
          ...imported,
          features: {
            ...DEFAULT_CONFIG.features,
            ...imported.features,
          },
          lastUpdated: new Date().toISOString(),
        };
        save();
        return true;
      }
    } catch {
      // Invalid JSON or structure
    }
    return false;
  }

  return {
    get value() {
      return value;
    },
    get features() {
      return value.features;
    },
    toggleFeature,
    updateFeatures,
    reset,
    exportConfig,
    importConfig,
  };
}