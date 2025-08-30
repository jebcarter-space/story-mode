<script lang="ts">
  import { TemplateEngine } from '../../lib/template-engine';
  import { createTemplates } from '../../data/models/templates.svelte';
  import { createCustomTables } from '../../data/models/custom-tables.svelte';
  import type { ContentData, Template } from '../../data/types';
  import { content } from '../../App.svelte';
  import { tooltip } from '../../lib/tooltip.svelte';
  
  import TemplateIcon from '../../assets/table.svg';
  import DropdownIcon from '../../assets/ease.svg';

  const templates = createTemplates();
  const customTables = createCustomTables();
  
  let showDropdown = $state(false);
  let selectedTemplate: Template | null = $state(null);
  let templateEngine: TemplateEngine;

  // Initialize template engine with custom tables
  $effect(() => {
    templateEngine = new TemplateEngine({
      customTables: customTables.value,
      storyId: 'main',
      maxDepth: 10
    });
  });

  let templateList = $derived(Object.values(templates.value));
  let categories = $derived([...new Set(templateList.map(t => t.category))].sort());

  function executeTemplate(template: Template) {
    if (!templateEngine) return;
    
    try {
      const result = templateEngine.executeTemplate(template);
      
      const output: ContentData = {
        type: 'template',
        output: `<div class="template-result">
          <div class="template-header mb-2">
            <strong>${template.name}</strong>
            <span class="text-xs text-gray-500 ml-2">[${template.category}]</span>
          </div>
          <div class="template-content">${result.replace(/\n/g, '<br>')}</div>
        </div>`,
      };

      content.add([output]);
      showDropdown = false;
      selectedTemplate = null;
    } catch (error) {
      console.error('Template execution error:', error);
    }
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function getTemplatesByCategory(category: string): Template[] {
    return templateList.filter(t => t.category === category);
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.template-dropdown')) {
      showDropdown = false;
    }
  }

  $effect(() => {
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="relative template-dropdown">
  <button 
    onclick={toggleDropdown}
    use:tooltip={'Execute Template'}
    class="w-[48px] flex items-center justify-center relative"
    disabled={templateList.length === 0}
  >
    <img src={TemplateIcon} alt="Template" class="h-[24px]"/>
    {#if templateList.length > 0}
      <img src={DropdownIcon} alt="Dropdown" class="h-3 w-3 absolute top-0 right-0 bg-stone-50 rounded"/>
    {/if}
  </button>

  {#if showDropdown && templateList.length > 0}
    <div class="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-50 min-w-64 max-h-96 overflow-y-auto">
      {#each categories as category}
        <div class="border-b">
          <div class="px-3 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
            {category}
          </div>
          {#each getTemplatesByCategory(category) as template}
            <button 
              onclick={() => executeTemplate(template)}
              class="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
            >
              <div class="font-medium text-sm">{template.name}</div>
              <div class="text-xs text-gray-600 truncate">{template.description}</div>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  {#if templateList.length === 0}
    <div class="absolute top-full left-0 mt-1 bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 z-50 whitespace-nowrap">
      No templates available. Go to Settings → Templates to create some.
    </div>
  {/if}
</div>

<style>
  .template-dropdown {
    display: inline-block;
  }
  
  :global(.template-result) {
    margin: 1rem 0;
  }
  
  :global(.template-header) {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.5rem;
  }
  
  :global(.template-content) {
    padding-top: 0.5rem;
    line-height: 1.5;
  }
</style>