<script lang="ts" module>
  import { createTemplates } from "../../../data/models/templates.svelte";
  export let templates = createTemplates();
</script>

<script lang="ts">
  import type { Template, TemplateViews } from "../../../data/types";
  import SettingPage from "../../ui/SettingPage.svelte";
  import { loadDefaultTemplates } from "../../../lib/template-engine";
  
  import TableIcon from '../../../assets/table.svg';
  import ImportIcon from '../../../assets/import.svg';
  import SaveIcon from '../../../assets/save.svg';
  import PlusIcon from '../../../assets/plus.svg';
  import ListIcon from '../../../assets/list.svg';
  import CloseIcon from '../../../assets/trash.svg';

  let open: TemplateViews = $state('');
  let template: Template = $state({
    name: '',
    description: '',
    content: '',
    category: 'Custom',
    created: 0,
    updated: 0
  });
  let selectedKey: string = $state('');
  let importData: string = $state('');
  let exportData: string = $state('');

  let templateList = $derived(templates.value);
  let categories = $derived(templates.getCategories());

  function createNew() {
    template = {
      name: '',
      description: '',
      content: '',
      category: 'Custom',
      created: 0,
      updated: 0
    };
    selectedKey = '';
    open = 'create';
  }

  function saveTemplate() {
    if (template.name && template.description && template.content) {
      if (selectedKey) {
        templates.update(selectedKey, template);
      } else {
        templates.add(template);
      }
      template = {
        name: '',
        description: '',
        content: '',
        category: 'Custom',
        created: 0,
        updated: 0
      };
      selectedKey = '';
      open = '';
    }
  }

  function openView(e: Event, key: string, data: Template) {
    e.preventDefault();
    open = 'view';
    template = { ...data };
    selectedKey = key;
  }

  function editTemplate() {
    open = 'create';
  }

  function removeTemplate(key: string) {
    templates.remove(key);
    if (selectedKey === key) {
      open = '';
      selectedKey = '';
    }
  }

  function openImport() {
    importData = '';
    open = 'import';
  }

  function importTemplates() {
    try {
      const parsed = JSON.parse(importData);
      templates.importTemplates(parsed);
      importData = '';
      open = '';
    } catch (error) {
      console.error('Invalid JSON format:', error);
    }
  }

  function openExport() {
    exportData = JSON.stringify(templates.exportTemplates(), null, 2);
    open = 'export';
  }

  function loadDefaults() {
    loadDefaultTemplates();
    // Force reactive update by reloading from localStorage
    templates.reload();
  }

  function getTemplatesByCategory(category: string) {
    const filtered: { [key: string]: Template } = {};
    for (const [key, tmpl] of Object.entries(templateList)) {
      if (tmpl.category === category) {
        filtered[key] = tmpl;
      }
    }
    return filtered;
  }
</script>

<SettingPage>
  <h3 class="text-3xl font-bold mb-3">Templates</h3>
  
  <div class="flex items-center justify-between border-b mb-3 pb-3">
    <div class="flex items-center gap-3">
      <button onclick={createNew} class="w-[48px] flex items-center justify-center">
        <img src={TableIcon} alt="Create" class="h-[24px]"/>
        <img src={PlusIcon} alt="Create" class="h-3 w-3 absolute ml-4 -mt-4 bg-stone-50 rounded"/>
      </button>
      <button onclick={openImport} class="w-[48px] flex items-center justify-center">
        <img src={ImportIcon} alt="Import" class="h-[24px]"/>
      </button>
      <button onclick={openExport} class="w-[48px] flex items-center justify-center">
        <img src={ListIcon} alt="Export" class="h-[24px]"/>
      </button>
      <button onclick={loadDefaults} class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
        Load Default Templates
      </button>
    </div>
  </div>

  <div class="flex flex-col">
    {#if open === 'create'}
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-xl mb-3">{selectedKey ? 'Edit Template' : 'Create Template'}</h4>
        <div class="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Template Name" 
            bind:value={template.name} 
            class="p-2 border rounded"
          />
          <input 
            type="text" 
            placeholder="Description" 
            bind:value={template.description} 
            class="p-2 border rounded"
          />
          <input 
            type="text" 
            placeholder="Category" 
            bind:value={template.category} 
            class="p-2 border rounded"
          />
          <textarea 
            placeholder="Template Content (use placeholders like: tableName, rand 10-60, roll 2d6, tableName.pick 3, etc.)" 
            bind:value={template.content} 
            class="p-2 border rounded h-32"
          ></textarea>
          <div class="flex gap-2">
            <button onclick={saveTemplate} class="px-4 py-2 bg-green-500 text-white rounded">
              <img src={SaveIcon} alt="Save" class="h-4 w-4 inline mr-1"/>
              Save
            </button>
            <button onclick={() => open = ''} class="px-4 py-2 bg-gray-500 text-white rounded">
              Cancel
            </button>
          </div>
        </div>
      </div>
    {:else if open === 'import'}
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-xl mb-3">Import Templates</h4>
        <textarea 
          placeholder="Paste JSON template data here..." 
          bind:value={importData} 
          class="w-full p-2 border rounded h-32"
        ></textarea>
        <div class="flex gap-2 mt-3">
          <button onclick={importTemplates} class="px-4 py-2 bg-blue-500 text-white rounded">
            Import
          </button>
          <button onclick={() => open = ''} class="px-4 py-2 bg-gray-500 text-white rounded">
            Cancel
          </button>
        </div>
      </div>
    {:else if open === 'export'}
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-xl mb-3">Export Templates</h4>
        <textarea 
          readonly 
          bind:value={exportData} 
          class="w-full p-2 border rounded h-32 bg-gray-50"
        ></textarea>
        <div class="flex gap-2 mt-3">
          <button onclick={() => navigator.clipboard.writeText(exportData)} class="px-4 py-2 bg-blue-500 text-white rounded">
            Copy to Clipboard
          </button>
          <button onclick={() => open = ''} class="px-4 py-2 bg-gray-500 text-white rounded">
            Close
          </button>
        </div>
      </div>
    {:else if open === 'view'}
      <div class="mb-6 p-4 border rounded">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xl">{template.name}</h4>
          <div class="flex gap-2">
            <button onclick={editTemplate} class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              Edit
            </button>
            <button onclick={() => removeTemplate(selectedKey)} class="px-3 py-1 bg-red-500 text-white rounded text-sm">
              Delete
            </button>
          </div>
        </div>
        <p class="mb-3 text-gray-600">{template.description}</p>
        <p class="mb-3"><strong>Category:</strong> {template.category}</p>
        <div class="bg-gray-50 p-3 rounded">
          <strong>Content:</strong>
          <pre class="whitespace-pre-wrap mt-2">{template.content}</pre>
        </div>
        <button onclick={() => open = ''} class="mt-3 px-4 py-2 bg-gray-500 text-white rounded">
          Close
        </button>
      </div>
    {:else}
      <div class="flex flex-col gap-4">
        {#if categories.length > 0}
          {#each categories as category}
            <div>
              <h4 class="text-lg font-semibold mb-2 text-gray-700">{category}</h4>
              <div class="flex flex-col gap-1 ml-4">
                {#each Object.entries(getTemplatesByCategory(category)) as [key, tmpl]}
                  <div class="w-full flex items-center justify-between border-b py-1">
                    <button onclick={(e) => openView(e, key, tmpl)} class="p-2 hover:bg-gray-50 flex-1 text-left">
                      <div class="font-medium">{tmpl.name}</div>
                      <div class="text-sm text-gray-600">{tmpl.description}</div>
                    </button>
                    <button onclick={() => removeTemplate(key)} class="w-[32px] flex items-center justify-center text-red-500 hover:bg-red-50">
                      <img src={CloseIcon} alt="Delete" class="h-[16px]"/>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <div class="text-center py-8 text-gray-500">
            <p>No templates found. Create your first template or load the default ones.</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</SettingPage>