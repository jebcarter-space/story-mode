<script lang="ts">
  import type { RepositoryContext } from '../../data/types';
  import { createWorkbooks } from '../../data/models/workbooks.svelte';
  import { createRepositoryResolver } from '../../lib/repository-resolver';
  import { createRepositories } from '../../data/models/repositories.svelte';

  let { 
    context = {},
    compact = false
  }: { 
    context?: RepositoryContext;
    compact?: boolean;
  } = $props();

  const repositories = createRepositories();
  const workbooks = createWorkbooks();
  
  // Create derived state for scope statistics
  let scopeStats = $derived(() => {
    const resolver = createRepositoryResolver(
      repositories.value,
      workbooks.getAllWorkbooks(),
      context
    );
    
    const itemsInScope = resolver.getItemsInScope();
    const stats = {
      total: itemsInScope.length,
      library: itemsInScope.filter(r => r.source === 'library').length,
      shelf: itemsInScope.filter(r => r.source === 'shelf').length,
      book: itemsInScope.filter(r => r.source === 'book').length,
      chapter: itemsInScope.filter(r => r.source === 'chapter').length,
      workbooks: workbooks.getAllTags().length
    };
    
    return stats;
  });

  function getScopeLevel(): string {
    if (context.chapterId) return 'Chapter';
    if (context.bookId) return 'Book';
    if (context.shelfId) return 'Shelf';
    return 'Library';
  }

  function getScopeIcon(): string {
    if (context.chapterId) return '📄';
    if (context.bookId) return '📖';
    if (context.shelfId) return '📚';
    return '🏛️';
  }
</script>

<div class="context-indicator {compact ? 'compact' : ''}" 
     style="background: var(--theme-background); border: 1px solid var(--theme-border); color: var(--theme-foreground);">
  
  {#if !compact}
    <div class="header">
      <span class="scope-icon">{getScopeIcon()}</span>
      <span class="scope-level">{getScopeLevel()} Context</span>
    </div>
  {/if}
  
  <div class="stats {compact ? 'stats-compact' : ''}">
    {#if compact}
      <span class="compact-text">
        {getScopeIcon()} {scopeStats.total} items in scope
      </span>
    {:else}
      <div class="stat-item">
        <span class="label">Total Items:</span>
        <span class="value">{scopeStats.total}</span>
      </div>
      
      {#if scopeStats.library > 0}
        <div class="stat-item library">
          <span class="label">🏛️ Library:</span>
          <span class="value">{scopeStats.library}</span>
        </div>
      {/if}
      
      {#if scopeStats.shelf > 0}
        <div class="stat-item shelf">
          <span class="label">📚 Shelf:</span>
          <span class="value">{scopeStats.shelf}</span>
        </div>
      {/if}
      
      {#if scopeStats.book > 0}
        <div class="stat-item book">
          <span class="label">📖 Book:</span>
          <span class="value">{scopeStats.book}</span>
        </div>
      {/if}
      
      {#if scopeStats.chapter > 0}
        <div class="stat-item chapter">
          <span class="label">📄 Chapter:</span>
          <span class="value">{scopeStats.chapter}</span>
        </div>
      {/if}
      
      {#if scopeStats.workbooks > 0}
        <div class="stat-item workbooks">
          <span class="label">📋 Workbooks:</span>
          <span class="value">{scopeStats.workbooks}</span>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .context-indicator {
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }
  
  .context-indicator.compact {
    padding: 4px 8px;
    font-size: 0.75rem;
  }
  
  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-weight: 600;
  }
  
  .scope-icon {
    font-size: 1.1em;
  }
  
  .scope-level {
    color: var(--theme-accent);
  }
  
  .stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .stats-compact {
    flex-direction: row;
    align-items: center;
  }
  
  .compact-text {
    font-weight: 500;
    color: var(--theme-accent);
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
  }
  
  .label {
    color: var(--theme-muted);
    font-weight: 500;
  }
  
  .value {
    font-weight: 600;
    color: var(--theme-accent);
  }
  
  .stat-item.library { border-left: 3px solid #8b5cf6; padding-left: 6px; }
  .stat-item.shelf { border-left: 3px solid #3b82f6; padding-left: 6px; }
  .stat-item.book { border-left: 3px solid #10b981; padding-left: 6px; }
  .stat-item.chapter { border-left: 3px solid #f59e0b; padding-left: 6px; }
  .stat-item.workbooks { border-left: 3px solid #ef4444; padding-left: 6px; }
</style>