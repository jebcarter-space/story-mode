<script lang="ts">
  import type { SavedIdea } from '../../data/types';

  export let ideas: SavedIdea[] = [];
  export let onUpdateIdea: (ideaId: string, updates: Partial<SavedIdea>) => void = () => {};
  export let onRemoveIdea: (ideaId: string) => void = () => {};

  let selectedCategory = $state<'character' | 'plot' | 'world' | 'theme' | 'all'>('all');
  let searchTerm = $state('');

  let filteredIdeas = $derived(() => {
    let filtered = ideas;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(idea => idea.category === selectedCategory);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(idea => 
        idea.content.toLowerCase().includes(term) ||
        idea.relatedElements.some(element => element.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  });

  const categoryIcons = {
    character: '👤',
    plot: '📖',
    world: '🌍',
    theme: '💭'
  };

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    developing: 'bg-yellow-100 text-yellow-800',
    used: 'bg-green-100 text-green-800',
    discarded: 'bg-gray-100 text-gray-600'
  };

  function updateIdeaStatus(ideaId: string, status: 'new' | 'developing' | 'used' | 'discarded') {
    onUpdateIdea(ideaId, { status });
  }
</script>

<div class="idea-tracker p-4 bg-gray-100 dark:bg-gray-900">
  <!-- Header and Controls -->
  <div class="header mb-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Idea Tracker</h3>
    
    <div class="controls flex gap-2 mb-3">
      <select bind:value={selectedCategory} class="text-xs px-2 py-1 border rounded border-gray-300 dark:border-gray-600">
        <option value="all">All Categories</option>
        <option value="character">👤 Characters</option>
        <option value="plot">📖 Plot</option>
        <option value="world">🌍 World</option>
        <option value="theme">💭 Theme</option>
      </select>
      
      <input
        bind:value={searchTerm}
        type="text"
        placeholder="Search ideas..."
        class="flex-1 text-xs px-2 py-1 border rounded border-gray-300 dark:border-gray-600"
      />
    </div>
  </div>

  <!-- Ideas List -->
  <div class="ideas-list space-y-3">
    {#if filteredIdeas.length > 0}
      {#each filteredIdeas as idea}
        <div class="idea-card p-3 border rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
          <div class="idea-header flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">{categoryIcons[idea.category]}</span>
              <span class="text-xs px-2 py-1 rounded {statusColors[idea.status]}">
                {idea.status}
              </span>
            </div>
            
            <div class="actions flex gap-1">
              <select 
                value={idea.status}
                onchange={(e) => updateIdeaStatus(idea.id, e.target.value as any)}
                class="text-xs px-1 py-0.5 border rounded border-gray-300 dark:border-gray-600"
              >
                <option value="new">New</option>
                <option value="developing">Developing</option>
                <option value="used">Used</option>
                <option value="discarded">Discarded</option>
              </select>
              
              <button
                onclick={() => onRemoveIdea(idea.id)}
                class="text-xs px-2 py-0.5 text-red-600 hover:text-red-700"
                title="Remove idea"
              >
                ×
              </button>
            </div>
          </div>

          <div class="idea-content">
            <p class="text-sm text-gray-900 dark:text-gray-100 mb-2">{idea.content}</p>
            
            {#if idea.relatedElements.length > 0}
              <div class="related-elements">
                <div class="text-xs text-gray-600 dark:text-gray-300 mb-1">Related:</div>
                <div class="flex flex-wrap gap-1">
                  {#each idea.relatedElements as element}
                    <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                      {element}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state text-center py-8">
        <div class="text-4xl mb-2">💡</div>
        <div class="text-sm text-gray-600 dark:text-gray-300">
          {searchTerm || selectedCategory !== 'all' ? 'No ideas match your filters' : 'No ideas saved yet'}
        </div>
        {#if searchTerm || selectedCategory !== 'all'}
          <button
            onclick={() => { searchTerm = ''; selectedCategory = 'all'; }}
            class="mt-2 text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Clear Filters
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Quick Stats -->
  {#if ideas.length > 0}
    <div class="stats mt-4 p-3 border rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
      <div class="text-xs text-gray-600 dark:text-gray-300 mb-2">Quick Stats</div>
      <div class="grid grid-cols-4 gap-2 text-center">
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{ideas.filter(i => i.status === 'new').length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-300">New</div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{ideas.filter(i => i.status === 'developing').length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-300">Developing</div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{ideas.filter(i => i.status === 'used').length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-300">Used</div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{ideas.filter(i => i.status === 'discarded').length}</div>
          <div class="text-xs text-gray-600 dark:text-gray-300">Discarded</div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .idea-tracker {
    max-height: 500px;
    overflow-y: auto;
  }

  .idea-card {
    transition: all 0.2s ease;
  }

  .idea-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>