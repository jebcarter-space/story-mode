<script lang="ts">
  import { TemplateEngine } from '../../lib/template-engine';
  import { createTemplates } from '../../data/models/templates.svelte';
  import { createCustomTables } from '../../data/models/custom-tables.svelte';
  import { createLLMProfiles } from '../../data/models/llm-profiles.svelte';
  import { createRepositories } from '../../data/models/repositories.svelte';
  import type { ContentData, Template, RepositoryItem, RepositoryCategory } from '../../data/types';
  import { content } from '../../App.svelte';
  import { tooltip } from '../../lib/tooltip.svelte';
  
  import TemplateIcon from '../../assets/table.svg';
  import DropdownIcon from '../../assets/ease.svg';

  const templates = createTemplates();
  const customTables = createCustomTables();
  const llmProfiles = createLLMProfiles();
  const repositories = createRepositories();
  
  let showDropdown = $state(false);
  let selectedTemplate: Template | null = $state(null);
  let templateEngine: TemplateEngine;
  let isProcessing = $state(false);

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

  async function executeTemplate(template: Template) {
    if (!templateEngine || isProcessing) return;
    
    try {
      isProcessing = true;
      
      // Get the LLM profile if LLM is enabled
      const profileEntries = Object.entries(llmProfiles.value);
      let selectedProfile: LLMProfile | null = null;
      
      // Try to use template-specific profile first
      if (template.llmProfile && llmProfiles.value[template.llmProfile]) {
        selectedProfile = llmProfiles.value[template.llmProfile];
      } 
      // Fallback to first available profile
      else if (profileEntries.length > 0) {
        selectedProfile = profileEntries[0][1];
      }
      
      // Repository save callback
      const saveToRepository = (content: string, category: RepositoryCategory) => {
        const item: RepositoryItem = {
          name: `${template.name} - ${new Date().toLocaleString()}`,
          description: `Generated from template: ${template.description}`,
          content: content,
          keywords: [template.name.toLowerCase(), template.category.toLowerCase()],
          forceInContext: false,
          category: category,
          created: Date.now(),
          updated: Date.now(),
          scope: 'library', // Default to library scope for template-generated items
          scopeContext: {},
          workbookTags: []
        };
        repositories.add(item);
      };

      let result: string;
      let processingNote = '';

      if (template.llmEnabled && selectedProfile) {
        // Execute template with LLM
        result = await templateEngine.executeTemplateWithLLM(template, selectedProfile, saveToRepository);
      } else {
        // Standard template execution
        result = templateEngine.executeTemplate(template);
      }
      
      const output: ContentData = {
        type: 'template',
        output: `<div class="template-result">
          <div class="template-header mb-2">
            <strong>${template.name}</strong>
            <span class="text-xs theme-text-muted ml-2">[${template.category}]</span>
            ${template.llmEnabled && selectedProfile ? `<span class="text-xs text-green-500 ml-2">✓ LLM: ${selectedProfile.name}</span>` : ''}
            ${template.repositoryTarget && template.repositoryTarget !== 'None' ? `<span class="text-xs text-purple-500 ml-2">→ ${template.repositoryTarget}</span>` : ''}
          </div>
          <div class="template-content">${result.replace(/\n/g, '<br>')}</div>
        </div>`,
      };

      content.add([output]);
      showDropdown = false;
      selectedTemplate = null;
    } catch (error) {
      console.error('Template execution error:', error);
      
      // Show error message
      const errorOutput: ContentData = {
        type: 'template',
        output: `<div class="template-result">
          <div class="template-header mb-2">
            <strong>${template.name}</strong>
            <span class="text-xs text-red-500 ml-2">Error</span>
          </div>
          <div class="template-content text-red-600">Failed to execute template: ${error.message}</div>
        </div>`,
      };
      content.add([errorOutput]);
    } finally {
      isProcessing = false;
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
    class="min-w-[48px] min-h-[44px] flex items-center justify-center p-2 relative"
    disabled={templateList.length === 0 || isProcessing}
    class:opacity-50={isProcessing}
  >
    <img src={TemplateIcon} alt="Template" class="h-[32px] w-[32px]"/>
    {#if isProcessing}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if templateList.length > 0}
      <img src={DropdownIcon} alt="Dropdown" class="h-3 w-3 absolute top-0 right-0 bg-stone-50 rounded"/>
    {/if}
  </button>

  {#if showDropdown && templateList.length > 0}
    <div class="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-50 min-w-64 max-h-96 overflow-y-auto">
      {#each categories as category}
        <div class="border-b">
          <div class="px-3 py-2 theme-bg-muted font-semibold text-sm theme-text-main">
            {category}
          </div>
          {#each getTemplatesByCategory(category) as template}
            <button 
              onclick={() => executeTemplate(template)}
              class="w-full text-left px-3 py-2 hover:opacity-80 border-b last:border-b-0 disabled:opacity-50"
              style="hover:background-color: var(--theme-muted);"
              disabled={isProcessing}
            >
              <div class="font-medium text-sm flex items-center justify-between">
                <span>{template.name}</span>
                <div class="flex items-center gap-1">
                  {#if template.llmEnabled}
                    <span class="text-xs text-green-600 bg-green-100 px-1 rounded">LLM</span>
                  {/if}
                  {#if template.repositoryTarget && template.repositoryTarget !== 'None'}
                    <span class="text-xs text-purple-600 bg-purple-100 px-1 rounded">→{template.repositoryTarget}</span>
                  {/if}
                </div>
              </div>
              <div class="text-xs theme-text-muted truncate">{template.description}</div>
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