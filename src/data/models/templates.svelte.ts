import type { Template, TemplateList } from "../types";

export function createTemplates() {
  let value = $state(JSON.parse(localStorage.getItem('templates') || '{}'));

  function reset() {
    value = {};
    localStorage.setItem('templates', JSON.stringify(value));
  }

  function add(template: Template) {
    const timestamp = Date.now();
    template.created = template.created || timestamp;
    template.updated = timestamp;
    
    // Use name as key, converting to lowercase and replacing spaces with underscores
    const key = template.name.toLowerCase().replace(/\s+/g, '_');
    value[key] = template;
    localStorage.setItem('templates', JSON.stringify(value));
  }

  function remove(key: string) {
    delete value[key];
    localStorage.setItem('templates', JSON.stringify(value));
  }

  function update(key: string, template: Template) {
    if (value[key]) {
      template.created = value[key].created;
      template.updated = Date.now();
      value[key] = template;
      localStorage.setItem('templates', JSON.stringify(value));
    }
  }

  function importTemplates(templates: TemplateList) {
    value = { ...value, ...templates };
    localStorage.setItem('templates', JSON.stringify(value));
  }

  function exportTemplates(): TemplateList {
    return { ...value };
  }

  function getByCategory(category: string): TemplateList {
    const filtered: TemplateList = {};
    for (const [key, template] of Object.entries(value)) {
      if (template.category === category) {
        filtered[key] = template;
      }
    }
    return filtered;
  }

  function getCategories(): string[] {
    const categories = new Set<string>();
    for (const template of Object.values(value)) {
      categories.add(template.category);
    }
    return Array.from(categories).sort();
  }

  return {
    get value() {
      return value;
    },
    reset,
    add,
    remove,
    update,
    importTemplates,
    exportTemplates,
    getByCategory,
    getCategories,
  };
}