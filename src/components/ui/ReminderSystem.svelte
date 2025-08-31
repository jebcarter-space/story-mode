<script lang="ts">
  import type { Reminder } from '../../data/types';

  export let reminders: Reminder[] = [];
  export let currentContext: string = '';
  export let onRemoveReminder: (reminderId: string) => void = () => {};

  let selectedImportance = $state<'low' | 'medium' | 'high' | 'all'>('all');
  let showOnlyDue = $state(false);

  let filteredReminders = $derived(() => {
    let filtered = reminders;
    
    if (selectedImportance !== 'all') {
      filtered = filtered.filter(reminder => reminder.importance === selectedImportance);
    }
    
    if (showOnlyDue) {
      filtered = filtered.filter(reminder => 
        !reminder.dueContext || reminder.dueContext === currentContext
      );
    }
    
    return filtered.sort((a, b) => {
      // Sort by importance first, then alphabetically
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      }
      return a.content.localeCompare(b.content);
    });
  });

  const importanceColors = {
    low: 'bg-gray-100 text-gray-700 border-gray-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200'
  };

  const importanceIcons = {
    low: '📌',
    medium: '⚠️',
    high: '🚨'
  };

  function isReminderDue(reminder: Reminder): boolean {
    return !reminder.dueContext || reminder.dueContext === currentContext;
  }
</script>

<div class="reminder-system p-4 bg-gray-100 dark:bg-gray-900">
  <!-- Header and Controls -->
  <div class="header mb-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Reminders</h3>
    
    <div class="controls flex gap-2 mb-3">
      <select bind:value={selectedImportance} class="text-xs px-2 py-1 border rounded border-gray-300 dark:border-gray-600">
        <option value="all">All Importance</option>
        <option value="high">🚨 High</option>
        <option value="medium">⚠️ Medium</option>
        <option value="low">📌 Low</option>
      </select>
      
      <label class="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          bind:checked={showOnlyDue}
          class="rounded"
        />
        Show only due reminders
      </label>
    </div>
  </div>

  <!-- Current Context Info -->
  {#if currentContext}
    <div class="context-info p-2 mb-3 border rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
      <div class="text-xs text-gray-600 dark:text-gray-300 mb-1">Current Context:</div>
      <div class="text-sm text-gray-900 dark:text-gray-100">{currentContext}</div>
    </div>
  {/if}

  <!-- Reminders List -->
  <div class="reminders-list space-y-3">
    {#if filteredReminders.length > 0}
      {#each filteredReminders as reminder}
        <div class="reminder-card p-3 border rounded {importanceColors[reminder.importance]}">
          <div class="reminder-header flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-sm">{importanceIcons[reminder.importance]}</span>
              <span class="text-xs px-2 py-1 rounded bg-white bg-opacity-50">
                {reminder.importance}
              </span>
              {#if isReminderDue(reminder)}
                <span class="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                  Due Now
                </span>
              {/if}
            </div>
            
            <button
              onclick={() => onRemoveReminder(reminder.id)}
              class="text-xs px-2 py-0.5 text-red-600 hover:text-red-700 bg-white bg-opacity-50 rounded"
              title="Remove reminder"
            >
              ×
            </button>
          </div>

          <div class="reminder-content mb-2">
            <p class="text-sm text-gray-800">{reminder.content}</p>
          </div>

          <div class="reminder-meta text-xs text-gray-600">
            <div>Context: {reminder.context}</div>
            {#if reminder.dueContext}
              <div>Due in: {reminder.dueContext}</div>
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state text-center py-8">
        <div class="text-4xl mb-2">🔔</div>
        <div class="text-sm text-gray-600 dark:text-gray-300">
          {selectedImportance !== 'all' || showOnlyDue ? 'No reminders match your filters' : 'No reminders set'}
        </div>
        {#if selectedImportance !== 'all' || showOnlyDue}
          <button
            onclick={() => { selectedImportance = 'all'; showOnlyDue = false; }}
            class="mt-2 text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Clear Filters
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Quick Stats and Due Count -->
  {#if reminders.length > 0}
    <div class="stats mt-4 p-3 border rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
      <div class="text-xs text-gray-600 dark:text-gray-300 mb-2">Reminder Stats</div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="flex justify-between text-xs">
            <span>High Priority:</span>
            <span class="font-medium">{reminders.filter(r => r.importance === 'high').length}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>Medium Priority:</span>
            <span class="font-medium">{reminders.filter(r => r.importance === 'medium').length}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>Low Priority:</span>
            <span class="font-medium">{reminders.filter(r => r.importance === 'low').length}</span>
          </div>
        </div>
        
        <div class="space-y-1">
          <div class="flex justify-between text-xs">
            <span>Due Now:</span>
            <span class="font-medium text-green-600">
              {reminders.filter(r => isReminderDue(r)).length}
            </span>
          </div>
          <div class="flex justify-between text-xs">
            <span>Total:</span>
            <span class="font-medium">{reminders.length}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .reminder-system {
    max-height: 500px;
    overflow-y: auto;
  }

  .reminder-card {
    transition: all 0.2s ease;
  }

  .reminder-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>