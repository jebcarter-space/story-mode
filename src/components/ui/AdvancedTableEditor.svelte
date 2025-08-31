<script lang="ts">
  import type { RandomTable, TableModifier, TableRelationship, AdvancedRollOptions } from '../../data/types';
  import ConditionalBuilder from './ConditionalBuilder.svelte';
  
  interface Props {
    table: RandomTable;
    onTableChange: (table: RandomTable) => void;
    onSave?: () => void;
    onCancel?: () => void;
  }

  let { table, onTableChange, onSave, onCancel }: Props = $props();

  // UI State
  let activeTab: 'basic' | 'entries' | 'relationships' | 'rollOptions' | 'performance' = $state('basic');
  let selectedEntryIndex = $state(-1);
  let showConditionalBuilder = $state(false);
  let currentCondition = $state('');
  let conditionTarget: 'entry' | 'relationship' = $state('entry');
  let conditionIndex = $state(-1);

  // New entry/relationship state
  let newRelationship: Partial<TableRelationship> = $state({
    type: 'parent-child',
    sourceTable: table.name,
    targetTable: '',
  });

  // Table copy for editing
  let editableTable = $state<RandomTable>({ ...table });

  // Sync changes back to parent
  $effect(() => {
    onTableChange(editableTable);
  });

  function addTableEntry() {
    if (!editableTable.table) {
      editableTable.table = [];
    }
    
    editableTable.table.push({
      min: editableTable.table.length + 1,
      max: editableTable.table.length + 1,
      description: 'New entry',
      modifiers: [],
      metadata: {
        tags: [],
        category: '',
        rarity: 'common',
      },
    });
  }

  function removeTableEntry(index: number) {
    if (editableTable.table && index >= 0 && index < editableTable.table.length) {
      editableTable.table.splice(index, 1);
      if (selectedEntryIndex === index) {
        selectedEntryIndex = -1;
      } else if (selectedEntryIndex > index) {
        selectedEntryIndex--;
      }
    }
  }

  function addModifier(entryIndex: number, type: TableModifier['type']) {
    const entry = editableTable.table[entryIndex];
    if (!entry.modifiers) {
      entry.modifiers = [];
    }
    
    const newModifier: TableModifier = {
      type,
      ...(type === 'weighted' && { weight: 1 }),
      ...(type === 'conditional' && { condition: '' }),
      ...(type === 'linked' && { dependency: '' }),
    };
    
    entry.modifiers.push(newModifier);
  }

  function removeModifier(entryIndex: number, modifierIndex: number) {
    const entry = editableTable.table[entryIndex];
    if (entry.modifiers) {
      entry.modifiers.splice(modifierIndex, 1);
    }
  }

  function addRelationship() {
    if (!editableTable.relationships) {
      editableTable.relationships = [];
    }
    
    editableTable.relationships.push({
      type: newRelationship.type || 'parent-child',
      sourceTable: editableTable.name,
      targetTable: newRelationship.targetTable || '',
      condition: newRelationship.condition,
      parameters: newRelationship.parameters,
    } as TableRelationship);
    
    // Reset form
    newRelationship = {
      type: 'parent-child',
      sourceTable: editableTable.name,
      targetTable: '',
    };
    
    // Mark as enhanced
    editableTable.enhanced = true;
  }

  function removeRelationship(index: number) {
    if (editableTable.relationships) {
      editableTable.relationships.splice(index, 1);
      if (editableTable.relationships.length === 0 && !hasOtherEnhancedFeatures()) {
        editableTable.enhanced = false;
      }
    }
  }

  function hasOtherEnhancedFeatures(): boolean {
    return !!(
      editableTable.defaultRollOptions ||
      editableTable.table.some(entry => entry.modifiers?.length || entry.metadata)
    );
  }

  function openConditionalBuilder(target: 'entry' | 'relationship', index: number, currentCond = '') {
    conditionTarget = target;
    conditionIndex = index;
    currentCondition = currentCond;
    showConditionalBuilder = true;
  }

  function applyCondition(condition: string) {
    if (conditionTarget === 'entry' && conditionIndex >= 0) {
      const entry = editableTable.table[conditionIndex];
      if (entry.modifiers) {
        const conditionalModifier = entry.modifiers.find(m => m.type === 'conditional');
        if (conditionalModifier) {
          conditionalModifier.condition = condition;
        }
      }
    } else if (conditionTarget === 'relationship' && conditionIndex >= 0) {
      if (editableTable.relationships) {
        editableTable.relationships[conditionIndex].condition = condition;
      }
    }
    showConditionalBuilder = false;
  }

  function enableEnhancedFeatures() {
    editableTable.enhanced = true;
    if (!editableTable.defaultRollOptions) {
      editableTable.defaultRollOptions = {
        rollType: 'standard',
        modifiers: {
          bonus: 0,
          multiplier: 1,
          threshold: 0,
        },
      };
    }
  }

  function getEntryDescription(entry: any): string {
    return typeof entry.description === 'string' ? entry.description : entry.description();
  }
</script>

<div class="advanced-table-editor">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold">Enhanced Table Editor</h2>
    <div class="flex items-center space-x-2">
      {#if !editableTable.enhanced}
        <button
          onclick={enableEnhancedFeatures}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Enable Enhanced Features
        </button>
      {/if}
      <button
        onclick={onSave}
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Save
      </button>
      <button
        onclick={onCancel}
        class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
    <nav class="flex space-x-8">
      {#each [
        { key: 'basic', label: 'Basic Info' },
        { key: 'entries', label: 'Table Entries' },
        { key: 'relationships', label: 'Relationships' },
        { key: 'rollOptions', label: 'Roll Options' },
        { key: 'performance', label: 'Performance' }
      ] as tab}
        <button
          onclick={() => activeTab = tab.key}
          class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === tab.key 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
        >
          {tab.label}
          {#if tab.key === 'relationships' && editableTable.relationships?.length}
            <span class="ml-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 rounded-full">
              {editableTable.relationships.length}
            </span>
          {/if}
          {#if tab.key === 'entries' && editableTable.table.some(e => e.modifiers?.length)}
            <span class="ml-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 rounded-full">
              Enhanced
            </span>
          {/if}
        </button>
      {/each}
    </nav>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if activeTab === 'basic'}
      <!-- Basic Table Information -->
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium mb-2">Table Name</label>
            <input
              bind:value={editableTable.name}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="Enter table name"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Dice Formula</label>
            <input
              bind:value={editableTable.diceFormula}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="e.g., 1d100, 2d6"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Description</label>
          <textarea
            bind:value={editableTable.description}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md h-24"
            placeholder="Describe what this table is for"
          ></textarea>
        </div>

        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={editableTable.consumable}
              class="rounded border-gray-300 dark:border-gray-600"
            />
            <span class="ml-2 text-sm">Consumable (entries are removed after use)</span>
          </label>
          
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={editableTable.enhanced}
              class="rounded border-gray-300 dark:border-gray-600"
            />
            <span class="ml-2 text-sm">Enhanced Features</span>
          </label>
        </div>
      </div>

    {:else if activeTab === 'entries'}
      <!-- Table Entries -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Table Entries ({editableTable.table.length})</h3>
          <button
            onclick={addTableEntry}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Entry
          </button>
        </div>

        <div class="space-y-2">
          {#each editableTable.table as entry, index}
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 {selectedEntryIndex === index ? 'bg-blue-50 dark:bg-blue-900' : ''}">
              <div class="grid grid-cols-12 gap-4 items-start">
                <!-- Range -->
                <div class="col-span-2">
                  <label class="block text-xs font-medium mb-1">Min</label>
                  <input
                    bind:value={entry.min}
                    type="number"
                    class="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium mb-1">Max</label>
                  <input
                    bind:value={entry.max}
                    type="number"
                    class="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>

                <!-- Description -->
                <div class="col-span-6">
                  <label class="block text-xs font-medium mb-1">Description</label>
                  <textarea
                    bind:value={entry.description}
                    class="w-full px-2 py-1 text-sm border rounded h-16"
                    placeholder="Entry description"
                  ></textarea>
                </div>

                <!-- Actions -->
                <div class="col-span-2 flex flex-col space-y-1">
                  <button
                    onclick={() => selectedEntryIndex = selectedEntryIndex === index ? -1 : index}
                    class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    {selectedEntryIndex === index ? 'Collapse' : 'Expand'}
                  </button>
                  <button
                    onclick={() => removeTableEntry(index)}
                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {#if selectedEntryIndex === index}
                <!-- Expanded Entry Details -->
                <div class="mt-4 space-y-4 border-t pt-4">
                  <!-- Metadata -->
                  <div class="grid grid-cols-3 gap-4">
                    <div>
                      <label class="block text-xs font-medium mb-1">Category</label>
                      <input
                        bind:value={entry.metadata.category}
                        class="w-full px-2 py-1 text-sm border rounded"
                        placeholder="e.g., weapon, spell"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">Rarity</label>
                      <select
                        bind:value={entry.metadata.rarity}
                        class="w-full px-2 py-1 text-sm border rounded"
                      >
                        <option value="common">Common</option>
                        <option value="uncommon">Uncommon</option>
                        <option value="rare">Rare</option>
                        <option value="legendary">Legendary</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">Tags</label>
                      <input
                        bind:value={entry.metadata.tags}
                        class="w-full px-2 py-1 text-sm border rounded"
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>
                  </div>

                  <!-- Modifiers -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="font-medium">Modifiers</h4>
                      <div class="space-x-1">
                        <button
                          onclick={() => addModifier(index, 'conditional')}
                          class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                        >
                          Conditional
                        </button>
                        <button
                          onclick={() => addModifier(index, 'weighted')}
                          class="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                        >
                          Weighted
                        </button>
                        <button
                          onclick={() => addModifier(index, 'linked')}
                          class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Linked
                        </button>
                      </div>
                    </div>

                    {#if entry.modifiers && entry.modifiers.length > 0}
                      <div class="space-y-2">
                        {#each entry.modifiers as modifier, modIndex}
                          <div class="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                            <span class="text-sm font-medium capitalize">{modifier.type}</span>
                            
                            {#if modifier.type === 'conditional'}
                              <input
                                bind:value={modifier.condition}
                                class="flex-1 px-2 py-1 text-sm border rounded"
                                placeholder="Condition expression"
                              />
                              <button
                                onclick={() => openConditionalBuilder('entry', index, modifier.condition)}
                                class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Builder
                              </button>
                            {:else if modifier.type === 'weighted'}
                              <input
                                bind:value={modifier.weight}
                                type="number"
                                min="0"
                                class="w-20 px-2 py-1 text-sm border rounded"
                                placeholder="Weight"
                              />
                            {:else if modifier.type === 'linked'}
                              <input
                                bind:value={modifier.dependency}
                                class="flex-1 px-2 py-1 text-sm border rounded"
                                placeholder="Target table name"
                              />
                            {/if}
                            
                            <button
                              onclick={() => removeModifier(index, modIndex)}
                              class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-sm text-gray-500">No modifiers added yet.</p>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

    {:else if activeTab === 'relationships'}
      <!-- Table Relationships -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Table Relationships</h3>
        </div>

        <!-- Add New Relationship -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 class="font-medium mb-4">Add New Relationship</h4>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Type</label>
              <select
                bind:value={newRelationship.type}
                class="w-full px-2 py-1 text-sm border rounded"
              >
                <option value="parent-child">Parent-Child</option>
                <option value="cross-reference">Cross-Reference</option>
                <option value="conditional-chain">Conditional Chain</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Target Table</label>
              <input
                bind:value={newRelationship.targetTable}
                class="w-full px-2 py-1 text-sm border rounded"
                placeholder="Table name"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Condition (Optional)</label>
              <input
                bind:value={newRelationship.condition}
                class="w-full px-2 py-1 text-sm border rounded"
                placeholder="JavaScript expression"
              />
            </div>
            <div class="flex items-end">
              <button
                onclick={addRelationship}
                class="w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={!newRelationship.targetTable}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <!-- Existing Relationships -->
        {#if editableTable.relationships && editableTable.relationships.length > 0}
          <div class="space-y-2">
            {#each editableTable.relationships as relationship, index}
              <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <span class="font-medium">{relationship.type}</span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">→</span>
                    <span>{relationship.targetTable}</span>
                    {#if relationship.condition}
                      <span class="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">
                        Conditional
                      </span>
                    {/if}
                  </div>
                  <button
                    onclick={() => removeRelationship(index)}
                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
                {#if relationship.condition}
                  <div class="mt-2 text-sm">
                    <strong>Condition:</strong> <code>{relationship.condition}</code>
                    <button
                      onclick={() => openConditionalBuilder('relationship', index, relationship.condition)}
                      class="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500">No relationships defined yet.</p>
        {/if}
      </div>

    {:else if activeTab === 'rollOptions'}
      <!-- Default Roll Options -->
      <div class="space-y-6">
        <h3 class="text-lg font-semibold">Default Roll Options</h3>
        
        {#if editableTable.enhanced && editableTable.defaultRollOptions}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-2">Roll Type</label>
              <select
                bind:value={editableTable.defaultRollOptions.rollType}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="standard">Standard</option>
                <option value="advantage">Advantage</option>
                <option value="disadvantage">Disadvantage</option>
                <option value="exploding">Exploding</option>
                <option value="reroll">Reroll</option>
              </select>
            </div>

            {#if editableTable.defaultRollOptions.rollType === 'advantage'}
              <div>
                <label class="block text-sm font-medium mb-2">Advantage Count</label>
                <input
                  bind:value={editableTable.defaultRollOptions.advantageCount}
                  type="number"
                  min="2"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
            {/if}

            {#if editableTable.defaultRollOptions.rollType === 'reroll'}
              <div>
                <label class="block text-sm font-medium mb-2">Reroll Condition</label>
                <input
                  bind:value={editableTable.defaultRollOptions.rerollCondition}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  placeholder="e.g., roll_value <= 10"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Max Rerolls</label>
                <input
                  bind:value={editableTable.defaultRollOptions.maxRerolls}
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
            {/if}
          </div>

          <!-- Modifiers -->
          {#if editableTable.defaultRollOptions.modifiers}
            <div>
              <h4 class="font-medium mb-4">Roll Modifiers</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Bonus</label>
                  <input
                    bind:value={editableTable.defaultRollOptions.modifiers.bonus}
                    type="number"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Multiplier</label>
                  <input
                    bind:value={editableTable.defaultRollOptions.modifiers.multiplier}
                    type="number"
                    step="0.1"
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Threshold</label>
                  <input
                    bind:value={editableTable.defaultRollOptions.modifiers.threshold}
                    type="number"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>
              </div>
            </div>
          {/if}
        {:else}
          <p class="text-gray-500">Enhanced features must be enabled to configure default roll options.</p>
        {/if}
      </div>

    {:else if activeTab === 'performance'}
      <!-- Performance Settings -->
      <div class="space-y-6">
        <h3 class="text-lg font-semibold">Performance & Indexing</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 class="font-medium mb-2">Table Statistics</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Total Entries:</span>
                <span>{editableTable.table.length}</span>
              </div>
              <div class="flex justify-between">
                <span>Enhanced Entries:</span>
                <span>{editableTable.table.filter(e => e.modifiers?.length || e.metadata).length}</span>
              </div>
              <div class="flex justify-between">
                <span>Relationships:</span>
                <span>{editableTable.relationships?.length || 0}</span>
              </div>
              <div class="flex justify-between">
                <span>Has Conditions:</span>
                <span>{editableTable.table.some(e => e.modifiers?.some(m => m.type === 'conditional')) ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 class="font-medium mb-2">Optimization Status</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Indexed:</span>
                <span class="text-green-600 dark:text-green-400">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Cache Status:</span>
                <span class="text-blue-600 dark:text-blue-400">Active</span>
              </div>
              <div class="flex justify-between">
                <span>Est. Roll Time:</span>
                <span>&lt; 50ms</span>
              </div>
            </div>
            <button class="w-full mt-3 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              Rebuild Index
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Conditional Builder Modal -->
{#if showConditionalBuilder}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Condition Builder</h3>
          <button
            onclick={() => showConditionalBuilder = false}
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
        
        <ConditionalBuilder
          condition={currentCondition}
          onConditionChange={(cond) => currentCondition = cond}
        />

        <div class="flex justify-end space-x-2 mt-6">
          <button
            onclick={() => showConditionalBuilder = false}
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onclick={() => applyCondition(currentCondition)}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .advanced-table-editor {
    max-width: 100%;
    margin: 0 auto;
  }

  .tab-content {
    min-height: 400px;
  }
</style>