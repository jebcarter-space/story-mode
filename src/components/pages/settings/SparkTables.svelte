<script lang="ts">
  import { createSparkTables } from "../../../data/models/spark-tables.svelte";
  import type { SparkTable, SparkTableSettings } from "../../../data/types";
  import SettingPage from "../../ui/SettingPage.svelte";
  
  const sparkTables = createSparkTables();
  
  let view: 'list' | 'create' | 'edit' | 'import' | 'settings' = 'list';
  let selectedTable: SparkTable | null = null;
  let editingTable: SparkTable | null = null;
  
  // Create/Edit state
  let tableName = '';
  let tableEntries = '';
  let tableWeight = 1;
  let enabledForOracle = true;
  let enabledForSparks = true;
  let tableCategories = '';
  
  // Import state  
  let importFile: File | null = null;
  let importResult: any = null;
  let importError = '';
  
  // Settings state
  let settings: SparkTableSettings = {
    enabledTables: [],
    oracleTables: [],
    sparkTables: [],
    defaultTableEnabled: true,
    defaultTableCount: 2,
    keywordCount: 3,
    includeTableNames: false,
    allowCrossover: true
  };
  
  // Load settings on component mount
  $effect(() => {
    const config = sparkTables.getSettings();
    if (config) {
      settings = { ...config };
    }
  });
  
  let allTables = $derived(sparkTables.getTables());
  let tableList = $derived(Object.values(allTables));

  function openCreate() {
    tableName = '';
    tableEntries = '';
    tableWeight = 1;
    enabledForOracle = true;
    enabledForSparks = true;
    tableCategories = '';
    editingTable = null;
    view = 'create';
  }
  
  function openEdit(table: SparkTable) {
    tableName = table.name;
    tableEntries = table.entries.join('\n');
    tableWeight = table.weight;
    enabledForOracle = table.oracleEnabled;
    enabledForSparks = table.sparksEnabled;
    tableCategories = table.categories.join(', ');
    editingTable = table;
    view = 'edit';
  }
  
  function openImport() {
    importFile = null;
    importResult = null;
    importError = '';
    view = 'import';
  }
  
  function openSettings() {
    view = 'settings';
  }
  
  function saveTable() {
    if (!tableName.trim()) {
      alert('Table name is required');
      return;
    }
    
    const entries = tableEntries.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    if (entries.length === 0) {
      alert('At least one keyword entry is required');
      return;
    }
    
    const table: SparkTable = {
      name: tableName,
      source: editingTable ? editingTable.source : 'user-created',
      entries,
      lastModified: Date.now(),
      enabled: true,
      weight: Math.max(1, tableWeight),
      oracleEnabled: enabledForOracle,
      sparksEnabled: enabledForSparks,
      categories: tableCategories.split(',').map(c => c.trim()).filter(c => c.length > 0),
      isDefault: false
    };
    
    if (editingTable) {
      sparkTables.updateTable(editingTable.name, table);
    } else {
      sparkTables.addTable(table);
    }
    
    view = 'list';
  }
  
  function deleteTable(tableName: string) {
    if (confirm(`Delete table "${tableName}"? This cannot be undone.`)) {
      sparkTables.removeTable(tableName);
    }
  }
  
  function toggleTableEnabled(tableName: string) {
    const table = allTables[tableName];
    if (table && !table.isDefault) {
      sparkTables.updateTable(tableName, { enabled: !table.enabled });
    }
  }
  
  function updateTableWeight(tableName: string, weight: number) {
    sparkTables.updateTable(tableName, { weight: Math.max(1, Math.min(10, weight)) });
  }
  
  async function handleFileImport() {
    if (!importFile) return;
    
    importError = '';
    importResult = null;
    
    try {
      const result = await sparkTables.importFromFile(importFile);
      importResult = result;
    } catch (error) {
      importError = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  function confirmImport() {
    if (importResult?.success && importResult.tables) {
      importResult.tables.forEach((table: SparkTable) => {
        sparkTables.addTable(table);
      });
      view = 'list';
      importResult = null;
      importFile = null;
    }
  }
  
  function saveSettings() {
    sparkTables.updateSettings(settings);
    view = 'list';
  }
  
  function resetToDefaults() {
    if (confirm('Reset all spark table settings to defaults?')) {
      sparkTables.resetSettings();
      const config = sparkTables.getSettings();
      if (config) {
        settings = { ...config };
      }
    }
  }
  
  function exportTables() {
    const data = sparkTables.exportTables();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spark-tables-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<SettingPage title="Spark Tables" subtitle="Manage keyword tables for Sparks and Oracle">
  <div class="space-y-6">
    
    {#if view === 'list'}
      <!-- Main list view -->
      <div class="flex gap-4 mb-6">
        <button onclick={openCreate} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Create New Table
        </button>
        <button onclick={openImport} class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Import Tables
        </button>
        <button onclick={openSettings} class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
          Table Settings
        </button>
        <button onclick={exportTables} class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Export All
        </button>
      </div>
      
      {#if tableList.length === 0}
        <div class="text-center py-8 text-gray-600">
          <p class="mb-4">No spark tables configured yet.</p>
          <button onclick={openCreate} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Create Your First Table
          </button>
        </div>
      {:else}
        <div class="grid gap-4">
          {#each tableList as table (table.name)}
            <div class="border rounded-lg p-4 {table.enabled ? 'bg-white' : 'bg-gray-50'}">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={table.enabled}
                    disabled={table.isDefault}
                    onchange={() => toggleTableEnabled(table.name)}
                    class="rounded"
                  />
                  <h3 class="font-semibold text-lg {table.enabled ? 'text-gray-900' : 'text-gray-500'}">
                    {table.name}
                    {#if table.isDefault}
                      <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">Default</span>
                    {/if}
                  </h3>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-600">{table.entries.length} keywords</span>
                  {#if !table.isDefault}
                    <button onclick={() => openEdit(table)} class="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600">
                      Edit
                    </button>
                    <button onclick={() => deleteTable(table.name)} class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                      Delete
                    </button>
                  {/if}
                </div>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                <div>
                  <strong>Weight:</strong> 
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    bind:value={table.weight}
                    onchange={(e) => updateTableWeight(table.name, parseInt(e.target.value))}
                    class="w-16 ml-2"
                  />
                  {table.weight}
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full {table.oracleEnabled ? 'bg-green-400' : 'bg-gray-300'}"></span>
                  Oracle
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full {table.sparksEnabled ? 'bg-blue-400' : 'bg-gray-300'}"></span>
                  Sparks
                </div>
                <div>
                  <strong>Source:</strong> {table.isDefault ? 'Built-in' : 'Custom'}
                </div>
              </div>
              
              {#if table.categories.length > 0}
                <div class="flex gap-2 flex-wrap">
                  {#each table.categories as category}
                    <span class="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">{category}</span>
                  {/each}
                </div>
              {/if}
              
              <div class="mt-3 text-sm text-gray-600">
                <strong>Sample Keywords:</strong> {table.entries.slice(0, 5).join(', ')}
                {#if table.entries.length > 5}
                  <span class="text-gray-400">... and {table.entries.length - 5} more</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
      
    {:else if view === 'create' || view === 'edit'}
      <!-- Create/Edit form -->
      <div class="max-w-2xl">
        <h3 class="text-xl font-semibold mb-4">{editingTable ? 'Edit' : 'Create'} Spark Table</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Table Name</label>
            <input 
              bind:value={tableName}
              placeholder="e.g., Gothic Horror, Steampunk, Medieval Fantasy"
              class="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Keywords (one per line)</label>
            <textarea 
              bind:value={tableEntries}
              placeholder="mysterious&#10;ancient&#10;forbidden&#10;cursed&#10;..."
              rows="12"
              class="w-full px-3 py-2 border rounded-md font-mono"
            ></textarea>
            <p class="text-sm text-gray-600 mt-1">
              {tableEntries.split('\n').filter(line => line.trim()).length} keywords entered
            </p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Weight (1-10)</label>
              <input 
                type="number" 
                bind:value={tableWeight}
                min="1" 
                max="10"
                class="w-full px-3 py-2 border rounded-md"
              />
              <p class="text-xs text-gray-500 mt-1">Higher weights = more frequent selection</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Categories (comma-separated)</label>
              <input 
                bind:value={tableCategories}
                placeholder="horror, atmosphere, gothic"
                class="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          
          <div class="flex gap-4">
            <label class="flex items-center gap-2">
              <input type="checkbox" bind:checked={enabledForOracle} />
              <span class="text-sm">Enable for Oracle</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" bind:checked={enabledForSparks} />
              <span class="text-sm">Enable for Sparks</span>
            </label>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button onclick={saveTable} class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            {editingTable ? 'Update' : 'Create'} Table
          </button>
          <button onclick={() => view = 'list'} class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Cancel
          </button>
        </div>
      </div>
      
    {:else if view === 'import'}
      <!-- Import view -->
      <div class="max-w-2xl">
        <h3 class="text-xl font-semibold mb-4">Import Spark Tables</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Select CSV File</label>
            <input 
              type="file" 
              accept=".csv"
              onchange={(e) => importFile = e.target.files?.[0] || null}
              class="w-full px-3 py-2 border rounded-md"
            />
            <p class="text-sm text-gray-600 mt-1">
              CSV format: First row is table name, following rows are keywords (one per row)
            </p>
          </div>
          
          {#if importFile}
            <button onclick={handleFileImport} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Preview Import
            </button>
          {/if}
        </div>
        
        {#if importError}
          <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p class="text-red-800">{importError}</p>
          </div>
        {/if}
        
        {#if importResult}
          {#if importResult.success}
            <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <h4 class="font-semibold text-green-800 mb-2">Import Preview</h4>
              {#each importResult.tables as table}
                <div class="mb-2">
                  <p><strong>{table.name}</strong>: {table.entries.length} keywords</p>
                  <p class="text-sm text-gray-600">Sample: {table.entries.slice(0, 3).join(', ')}...</p>
                </div>
              {/each}
              
              <div class="flex gap-3 mt-4">
                <button onclick={confirmImport} class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                  Import Tables
                </button>
                <button onclick={() => { importResult = null; importFile = null; }} class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p class="text-red-800">{importResult.error}</p>
            </div>
          {/if}
        {/if}
        
        <div class="mt-6">
          <button onclick={() => view = 'list'} class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Back to Tables
          </button>
        </div>
      </div>
      
    {:else if view === 'settings'}
      <!-- Settings view -->
      <div class="max-w-2xl">
        <h3 class="text-xl font-semibold mb-4">Spark Table Settings</h3>
        
        <div class="space-y-6">
          <div>
            <h4 class="font-medium mb-3">General Settings</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">Default Keyword Count (Sparks)</label>
                <input 
                  type="number" 
                  bind:value={settings.keywordCount}
                  min="1" 
                  max="10"
                  class="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Oracle Keywords Count</label>
                <input 
                  type="number" 
                  bind:value={settings.defaultTableCount}
                  min="1" 
                  max="5"
                  class="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-3">Display Options</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={settings.includeTableNames} />
                <span class="text-sm">Include source table names in output</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={settings.allowCrossover} />
                <span class="text-sm">Allow keywords from multiple tables in single generation</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={settings.defaultTableEnabled} />
                <span class="text-sm">Enable built-in default table</span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button onclick={saveSettings} class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Save Settings
          </button>
          <button onclick={resetToDefaults} class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
            Reset to Defaults
          </button>
          <button onclick={() => view = 'list'} class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Back to Tables
          </button>
        </div>
      </div>
    {/if}
    
  </div>
</SettingPage>