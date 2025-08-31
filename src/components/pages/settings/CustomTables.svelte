<script lang="ts" module>
  import { createCustomTables } from "../../../data/models/custom-tables.svelte";
  import { createEnhancedTables } from "../../../data/models/enhanced-tables.svelte";
  export let customTables = createCustomTables();
  export let enhancedTables = createEnhancedTables();
</script>

<script lang="ts">
  import { emptyTable } from "../../../data/tables";
  import type { CustomTableViews, RandomTable } from "../../../data/types";
  import { TableImporter } from "../../../lib/table-importer";
  import { TableExporter } from "../../../lib/table-exporter";
  import SettingPage from "../../ui/SettingPage.svelte";
  import AdvancedTableEditor from "../../ui/AdvancedTableEditor.svelte";
  import TableIcon from '../../../assets/table.svg';
  import ImportIcon from '../../../assets/import.svg';
  import SaveIcon from '../../../assets/save.svg';
  import PlusIcon from '../../../assets/plus.svg';
  import RowIcon from '../../../assets/row.svg';
  import ListIcon from '../../../assets/list.svg';
  import CloseIcon from '../../../assets/trash.svg';
  import CopyIcon from '../../../assets/copy.svg';
  import CheckIcon from '../../../assets/check.svg';

  let open: CustomTableViews = $state('view');
  let table: RandomTable = $state({...emptyTable});
  let rows: number = $state(1);
  
  // Search and filter state
  let searchQuery: string = $state('');
  let filterMode: 'all' | 'mostUsed' | 'leastUsed' | 'recentlyUsed' | 'neverUsed' = $state('all');
  
  // Bulk operations state
  let selectedTables: Set<string> = $state(new Set());
  let selectAll: boolean = $state(false);
  
  // Import/Export state
  let importFile: File | null = $state(null);
  let importResult: any = $state(null);
  let importError: string = $state('');
  let exportFormat: 'json' | 'csv' | 'txt' = $state('json');
  let exportResult: string = $state('');
  
  // Validation state
  let validationResult: any = $state(null);

  // Enhanced table editor state
  let advancedEditingTable: RandomTable | null = $state(null);

  // Computed properties  
  let allTables = $derived(customTables.value);
  let tables = $derived(() => {
    let filteredTables = allTables;
    
    // Apply search filter first
    if (searchQuery) {
      filteredTables = customTables.search(searchQuery);
    }
    
    // Then apply usage filter
    if (filterMode !== 'all') {
      const usageFiltered = customTables.filterByUsage(filterMode);
      if (searchQuery) {
        // Intersect search results with usage filter
        const filtered: typeof filteredTables = {};
        Object.keys(usageFiltered).forEach(key => {
          if (filteredTables[key]) {
            filtered[key] = filteredTables[key];
          }
        });
        filteredTables = filtered;
      } else {
        filteredTables = usageFiltered;
      }
    }
    
    return filteredTables;
  });
  
  let tableArray = $derived(Object.values(tables()));
  let tableKeys = $derived(Object.keys(tables()));
  let hasSelectedTables = $derived(selectedTables.size > 0);
  let totalTables = $derived(Object.keys(allTables).length);

  function addRow() {
    rows += 1;
    table.table.push({ min: 0, max: 0, description: '' });
  }

  function removeRow(index: number) {
    if (table.table.length > 1) {
      table.table.splice(index, 1);
      rows = Math.max(1, rows - 1);
    }
  }

  function saveTable() {
    const validation = customTables.validateTable(table);
    validationResult = validation;
    
    if (validation.isValid) {
      customTables.add(table);
      table = {...emptyTable};
      rows = 1;
      open = 'view';
      validationResult = null;
    }
  }

  function openView(e: Event, data: RandomTable) {
    e.preventDefault();
    open = 'view';
    table = {...data};
  }

  function removeTable(name: string) {
    customTables.remove(name);
    selectedTables.delete(name);
  }

  function duplicateTable(tableName: string) {
    customTables.duplicate(tableName);
  }

  function openCreate() {
    table = {...emptyTable};
    rows = 1;
    validationResult = null;
    open = 'create';
  }

  function openAdvancedEditor(tableData?: RandomTable) {
    if (tableData) {
      advancedEditingTable = {...tableData};
    } else {
      advancedEditingTable = {...emptyTable, enhanced: true};
    }
    open = 'advanced';
  }

  function saveAdvancedTable() {
    if (advancedEditingTable) {
      // Use enhanced tables for enhanced features, regular tables for basic features
      if (advancedEditingTable.enhanced) {
        enhancedTables.addTable(advancedEditingTable);
      } else {
        customTables.add(advancedEditingTable);
      }
      
      advancedEditingTable = null;
      open = 'view';
    }
  }

  function cancelAdvancedEditor() {
    advancedEditingTable = null;
    open = 'view';
  }

  function openImport() {
    importFile = null;
    importResult = null;
    importError = '';
    open = 'import';
  }

  function openExport() {
    exportResult = '';
    open = 'export';
  }

  function openBulk() {
    selectedTables.clear();
    selectAll = false;
    open = 'bulk';
  }

  function toggleSelectAll() {
    if (selectAll) {
      selectedTables = new Set(tableKeys);
    } else {
      selectedTables.clear();
    }
  }

  function toggleTableSelection(tableName: string) {
    if (selectedTables.has(tableName)) {
      selectedTables.delete(tableName);
    } else {
      selectedTables.add(tableName);
    }
    selectAll = selectedTables.size === tableKeys.length;
  }

  async function handleFileImport() {
    if (!importFile) return;

    importError = '';
    importResult = null;

    try {
      const result = await TableImporter.importFromFile(importFile);
      importResult = result;

      if (result.success && result.table) {
        // Preview the table first
      }
    } catch (error) {
      importError = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  function confirmImport() {
    if (importResult?.success && importResult.table) {
      customTables.add(importResult.table);
      open = 'view';
      importResult = null;
      importFile = null;
    }
  }

  function exportSingle(tableName: string) {
    const tableToExport = customTables.value[tableName];
    if (!tableToExport) return;

    const result = TableExporter.exportTable(tableToExport, { format: exportFormat });
    if (result.success && result.data && result.filename) {
      const mimeType = TableExporter.getMimeType(exportFormat);
      TableExporter.downloadFile(result.data, result.filename, mimeType);
    }
  }

  function exportSelected() {
    const tablesToExport = Array.from(selectedTables).map(name => customTables.value[name]).filter(Boolean);
    if (tablesToExport.length === 0) return;

    const result = TableExporter.exportMultipleTables(tablesToExport, { format: exportFormat });
    if (result.success && result.data && result.filename) {
      const mimeType = TableExporter.getMimeType(exportFormat);
      TableExporter.downloadFile(result.data, result.filename, mimeType);
    }
  }

  function exportAll() {
    const result = TableExporter.exportAllTables(customTables.value, { format: exportFormat });
    if (result.success && result.data && result.filename) {
      const mimeType = TableExporter.getMimeType(exportFormat);
      TableExporter.downloadFile(result.data, result.filename, mimeType);
    }
  }

  function generateBackup() {
    const result = TableExporter.generateBackup(customTables.value);
    if (result.success && result.data && result.filename) {
      TableExporter.downloadFile(result.data, result.filename, 'application/json');
    }
  }

  function deleteSelected() {
    if (selectedTables.size > 0 && confirm(`Delete ${selectedTables.size} selected table(s)?`)) {
      customTables.removeMultiple(Array.from(selectedTables));
      selectedTables.clear();
      selectAll = false;
    }
  }

  function duplicateSelected() {
    Array.from(selectedTables).forEach(tableName => {
      customTables.duplicate(tableName);
    });
    selectedTables.clear();
    selectAll = false;
  }

  function clearSearch() {
    searchQuery = '';
    filterMode = 'all';
  }

  function getUsageStatsDisplay(tableName: string) {
    const stats = customTables.getUsageStats(tableName);
    const lastUsedDate = stats.lastUsed ? new Date(stats.lastUsed).toLocaleDateString() : 'Never';
    return `Used ${stats.useCount} times, last used: ${lastUsedDate}`;
  }

  // File drop handling
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      importFile = files[0];
      if (open !== 'import') {
        openImport();
      }
    }
  }
</script>

<SettingPage>
  <div class="max-w-6xl mx-auto">
    <h3 class="text-3xl font-bold mb-3">Custom Tables</h3>

    <!-- Main toolbar -->
    <div class="flex flex-wrap items-center gap-3 mb-4 p-3 bg-stone-50 rounded border">
      <button onclick={() => open = 'view'} title="View Tables" class="tooltip">
        <img src={ListIcon} alt="List Tables" class="h-5 w-5"/>
        <div id="tooltip" class="bottom">View Tables</div>
      </button>
      
      <button onclick={openCreate} class="relative tooltip" title="Create New Table">
        <img src={TableIcon} alt="Create Table" class="h-5 w-5"/>
        <img src={PlusIcon} alt="Add" class="h-3 w-3 absolute top-1 right-1 bg-stone-50 rounded"/>
        <div id="tooltip" class="bottom">Create Table</div>
      </button>
      
      <button onclick={() => openAdvancedEditor()} class="relative tooltip" title="Create Enhanced Table">
        <img src={TableIcon} alt="Enhanced Table" class="h-5 w-5"/>
        <span class="absolute top-0 right-0 bg-purple-500 text-white text-xs px-1 rounded">✨</span>
        <div id="tooltip" class="bottom">Enhanced Table</div>
      </button>
      
      <button onclick={openImport} class="tooltip" title="Import Table">
        <img src={ImportIcon} alt="Import Table" class="h-5 w-5"/>
        <div id="tooltip" class="bottom">Import Table</div>
      </button>
      
      <button onclick={openExport} class="tooltip" title="Export Tables">
        <img src={SaveIcon} alt="Export" class="h-5 w-5"/>
        <div id="tooltip" class="bottom">Export Tables</div>
      </button>
      
      <button onclick={openBulk} class="tooltip" title="Bulk Operations">
        <img src={CheckIcon} alt="Bulk Operations" class="h-5 w-5"/>
        <div id="tooltip" class="bottom">Bulk Operations</div>
      </button>

      <div class="ml-auto text-sm text-stone-600">
        {totalTables} table{totalTables !== 1 ? 's' : ''}
      </div>
    </div>

    <!-- Search and filter bar -->
    {#if open === 'view' || open === ''}
      <div class="flex flex-wrap gap-3 mb-4 p-3 bg-stone-100 rounded">
        <div class="flex-1 min-w-64">
          <input 
            type="text" 
            placeholder="Search tables by name, description, or content..." 
            bind:value={searchQuery}
            class="w-full"
          />
        </div>
        
        <select bind:value={filterMode} class="min-w-40">
          <option value="all">All Tables</option>
          <option value="mostUsed">Most Used</option>
          <option value="leastUsed">Least Used</option>
          <option value="recentlyUsed">Recently Used</option>
          <option value="neverUsed">Never Used</option>
        </select>
        
        {#if searchQuery || filterMode !== 'all'}
          <button onclick={clearSearch} class="px-3 py-1 bg-stone-500 text-white rounded text-sm">
            Clear
          </button>
        {/if}
      </div>
    {/if}

    <!-- Main content area -->
    <div class="mt-3" role="region" ondragover={handleDragOver} ondrop={handleDrop}>
      {#if open === 'create'}
        <div class="max-w-4xl">
          <h4 class="text-xl mb-4">Create New Table</h4>
          
          {#if validationResult && !validationResult.isValid}
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <h5 class="font-semibold text-red-800 mb-2">Validation Errors:</h5>
              <ul class="list-disc list-inside text-red-700">
                {#each validationResult.errors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if validationResult && validationResult.warnings && validationResult.warnings.length > 0}
            <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h5 class="font-semibold text-yellow-800 mb-2">Warnings:</h5>
              <ul class="list-disc list-inside text-yellow-700">
                {#each validationResult.warnings as warning}
                  <li>{warning}</li>
                {/each}
              </ul>
            </div>
          {/if}
          
          <div class="grid md:grid-cols-2 gap-3 mb-3">
            <input type="text" placeholder="Table Name *" bind:value={table.name} required />
            <input type="text" placeholder="Dice Formula (e.g., 1d6) *" bind:value={table.diceFormula} required />
          </div>
          
          <input type="text" placeholder="Description" bind:value={table.description} class="w-full mb-3"/>
          
          <div class="flex items-center gap-2 mb-4">
            <input type="checkbox" bind:checked={table.consumable} id="consumable"/>
            <label for="consumable">Consumable (entries are removed after use)</label>
          </div>
          
          <h5 class="text-lg mb-2">Table Entries</h5>
          <div class="space-y-2 mb-4">
            {#each Array(rows) as _, i}
              <div class="flex gap-3 items-center">
                <input type="number" placeholder="Min" bind:value={table.table[i].min} class="w-20"/>
                <input type="number" placeholder="Max" bind:value={table.table[i].max} class="w-20"/>
                <input type="text" placeholder="Description *" bind:value={table.table[i].description} class="flex-1"/>
                {#if rows > 1}
                  <button onclick={() => removeRow(i)} class="text-red-600 hover:text-red-800" title="Remove row">
                    <img src={CloseIcon} alt="Remove" class="h-4 w-4"/>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          
          <div class="flex gap-3 mb-4">
            <button onclick={addRow} class="relative px-4 py-2 bg-blue-500 text-white rounded">
              Add Row
            </button>
            
            <button onclick={saveTable} class="px-4 py-2 bg-green-500 text-white rounded">
              Save Table
            </button>
            
            <button onclick={() => open = 'view'} class="px-4 py-2 bg-gray-500 text-white rounded">
              Cancel
            </button>
          </div>
        </div>

      {:else if open === 'import'}
        <div class="max-w-4xl">
          <h4 class="text-xl mb-4">Import Table</h4>
          
          <div class="mb-6 p-6 border-2 border-dashed border-stone-300 rounded-lg text-center">
            <div class="mb-4">
              <img src={ImportIcon} alt="Import" class="h-12 w-12 mx-auto mb-2 opacity-50"/>
              <p class="text-lg mb-2">Drag and drop a file here, or click to select</p>
              <p class="text-sm text-stone-600">Supported formats: JSON, CSV, TXT</p>
            </div>
            
            <input 
              type="file" 
              onchange={(e) => { 
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) importFile = files[0];
              }}
              accept=".json,.csv,.txt" 
              class="mb-4"
            />
            
            {#if importFile}
              <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p><strong>Selected file:</strong> {importFile.name}</p>
                <p><strong>Size:</strong> {Math.round(importFile.size / 1024)} KB</p>
              </div>
              
              <button onclick={handleFileImport} class="px-4 py-2 bg-blue-500 text-white rounded">
                Process File
              </button>
            {/if}
          </div>

          {#if importError}
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p class="text-red-800">{importError}</p>
            </div>
          {/if}

          {#if importResult}
            {#if importResult.success}
              <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                <h5 class="text-green-800 font-semibold mb-2">Import Preview</h5>
                
                {#if importResult.warnings && importResult.warnings.length > 0}
                  <div class="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p class="text-yellow-800 text-sm font-semibold">Warnings:</p>
                    <ul class="text-yellow-700 text-sm list-disc list-inside">
                      {#each importResult.warnings as warning}
                        <li>{warning}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                
                <div class="mb-3">
                  <p><strong>Name:</strong> {importResult.table.name}</p>
                  <p><strong>Description:</strong> {importResult.table.description}</p>
                  <p><strong>Dice Formula:</strong> {importResult.table.diceFormula}</p>
                  <p><strong>Entries:</strong> {importResult.table.table.length}</p>
                </div>
                
                <div class="flex gap-3">
                  <button onclick={confirmImport} class="px-4 py-2 bg-green-500 text-white rounded">
                    Import Table
                  </button>
                  <button onclick={() => { importResult = null; importFile = null; }} class="px-4 py-2 bg-gray-500 text-white rounded">
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p class="text-red-800">{importResult.error}</p>
              </div>
            {/if}
          {/if}
          
          <div class="mt-6">
            <button onclick={() => open = 'view'} class="px-4 py-2 bg-gray-500 text-white rounded">
              Back to Tables
            </button>
          </div>
        </div>

      {:else if open === 'export'}
        <div class="max-w-4xl">
          <h4 class="text-xl mb-4">Export Tables</h4>
          
          <div class="mb-4">
            <label for="export-format" class="block text-sm font-medium mb-2">Export Format:</label>
            <select id="export-format" bind:value={exportFormat} class="mb-4">
              <option value="json">JSON (Full table data)</option>
              <option value="csv">CSV (Spreadsheet format)</option>
              <option value="txt">Text List (Descriptions only)</option>
            </select>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <h5 class="text-lg font-semibold">Export Options</h5>
              
              <button onclick={exportAll} class="w-full px-4 py-2 bg-blue-500 text-white rounded">
                Export All Tables ({totalTables})
              </button>
              
              <button onclick={generateBackup} class="w-full px-4 py-2 bg-green-500 text-white rounded">
                Generate Full Backup
              </button>
            </div>
            
            <div>
              <h5 class="text-lg font-semibold mb-2">Individual Export</h5>
              <p class="text-sm text-stone-600 mb-4">Click the export button next to any table in the list view</p>
            </div>
          </div>
          
          <div class="mt-6">
            <button onclick={() => open = 'view'} class="px-4 py-2 bg-gray-500 text-white rounded">
              Back to Tables
            </button>
          </div>
        </div>

      {:else if open === 'bulk'}
        <div class="max-w-6xl">
          <h4 class="text-xl mb-4">Bulk Operations</h4>
          
          {#if tableArray.length > 0}
            <div class="mb-4 flex flex-wrap gap-3 p-3 bg-stone-100 rounded">
              <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={selectAll} onchange={toggleSelectAll} />
                <span>Select All ({selectedTables.size}/{tableKeys.length})</span>
              </label>
              
              {#if hasSelectedTables}
                <button onclick={exportSelected} class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                  Export Selected ({selectedTables.size})
                </button>
                
                <button onclick={duplicateSelected} class="px-3 py-1 bg-green-500 text-white rounded text-sm">
                  Duplicate Selected
                </button>
                
                <button onclick={deleteSelected} class="px-3 py-1 bg-red-500 text-white rounded text-sm">
                  Delete Selected
                </button>
              {/if}
            </div>
            
            <div class="space-y-2">
              {#each tableArray as table, index}
                <div class="flex items-center gap-3 p-3 border rounded hover:bg-stone-50">
                  <input 
                    type="checkbox" 
                    checked={selectedTables.has(table.name)}
                    onchange={() => toggleTableSelection(table.name)}
                  />
                  
                  <div class="flex-1">
                    <div class="font-medium">{table.name}</div>
                    <div class="text-sm text-stone-600">{table.description}</div>
                    <div class="text-xs text-stone-500">{getUsageStatsDisplay(table.name)}</div>
                  </div>
                  
                  <div class="text-sm text-stone-500">
                    {table.table.length} entries
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-stone-600">No tables available for bulk operations.</p>
          {/if}
          
          <div class="mt-6">
            <button onclick={() => open = 'view'} class="px-4 py-2 bg-gray-500 text-white rounded">
              Back to Tables
            </button>
          </div>
        </div>

      {:else}
        <!-- Table list view -->
        <div class="space-y-4">
          {#if tableArray.length === 0}
            {#if searchQuery || filterMode !== 'all'}
              <div class="text-center py-8 text-stone-600">
                <p class="text-lg mb-2">No tables match your search criteria</p>
                <button onclick={clearSearch} class="px-4 py-2 bg-blue-500 text-white rounded">
                  Clear Search
                </button>
              </div>
            {:else}
              <div class="text-center py-8 text-stone-600">
                <img src={TableIcon} alt="No tables" class="h-16 w-16 mx-auto mb-4 opacity-50"/>
                <p class="text-lg mb-4">No custom tables yet</p>
                <button onclick={openCreate} class="px-4 py-2 bg-blue-500 text-white rounded">
                  Create Your First Table
                </button>
              </div>
            {/if}
          {:else}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {#each tableArray as table}
                <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between mb-2">
                    <h5 class="font-semibold text-lg leading-tight flex-1 mr-2">{table.name}</h5>
                    <div class="flex gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button onclick={() => exportSingle(table.name)} title="Export" class="tooltip">
                        <img src={SaveIcon} alt="Export" class="h-4 w-4"/>
                        <div id="tooltip" class="bottom">Export</div>
                      </button>
                      <button onclick={() => openAdvancedEditor(table)} title="Advanced Edit" class="tooltip">
                        <span class="text-purple-600 text-sm">✨</span>
                        <div id="tooltip" class="bottom">Advanced Edit</div>
                      </button>
                      <button onclick={() => duplicateTable(table.name)} title="Duplicate" class="tooltip">
                        <img src={CopyIcon} alt="Duplicate" class="h-4 w-4"/>
                        <div id="tooltip" class="bottom">Duplicate</div>
                      </button>
                      <button onclick={() => removeTable(table.name)} title="Delete" class="tooltip text-red-600">
                        <img src={CloseIcon} alt="Delete" class="h-4 w-4"/>
                        <div id="tooltip" class="bottom">Delete</div>
                      </button>
                    </div>
                  </div>
                  
                  <p class="text-stone-600 text-sm mb-2 line-clamp-2">{table.description}</p>
                  
                  <div class="text-xs text-stone-500 space-y-1 mb-3">
                    <div>Roll: {table.diceFormula}</div>
                    <div>Entries: {table.table.length}</div>
                    <div>{getUsageStatsDisplay(table.name)}</div>
                    {#if table.consumable}
                      <div class="text-orange-600">Consumable</div>
                    {/if}
                  </div>
                  
                  <button 
                    onclick={(e) => openView(e, table)} 
                    class="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if open === 'advanced'}
        <div class="max-w-full">
          {#if advancedEditingTable}
            <AdvancedTableEditor
              table={advancedEditingTable}
              onTableChange={(updatedTable) => advancedEditingTable = updatedTable}
              onSave={saveAdvancedTable}
              onCancel={cancelAdvancedEditor}
            />
          {/if}
        </div>
      {/if}
      
      <!-- Table detail view -->
      {#if open === 'view' && table.name}
        <div class="mt-6 p-4 border-t">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-xl font-semibold">{table.name}</h5>
            <button onclick={() => { table = {...emptyTable}; }} class="text-stone-600 hover:text-stone-800">
              <img src={CloseIcon} alt="Close" class="h-5 w-5"/>
            </button>
          </div>
          
          <div class="grid md:grid-cols-3 gap-6">
            <div class="md:col-span-2">
              <div class="mb-4">
                <p class="mb-2">{table.description}</p>
                <p class="text-sm text-stone-600">
                  <strong>Roll:</strong> {table.diceFormula} • 
                  <strong>Entries:</strong> {table.table.length}
                  {#if table.consumable} • <strong class="text-orange-600">Consumable</strong>{/if}
                </p>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse border">
                  <thead>
                    <tr class="bg-stone-100">
                      <th class="border p-2 text-left">Min</th>
                      <th class="border p-2 text-left">Max</th>
                      <th class="border p-2 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each table.table as row}
                      <tr class="hover:bg-stone-50">
                        <td class="border p-2">{row.min ?? ''}</td>
                        <td class="border p-2">{row.max ?? ''}</td>
                        <td class="border p-2">{row.description}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="space-y-4">
              <div class="p-3 bg-stone-50 rounded">
                <h6 class="font-semibold mb-2">Usage Statistics</h6>
                <p class="text-sm text-stone-600">{getUsageStatsDisplay(table.name)}</p>
              </div>
              
              <div class="space-y-2">
                <button onclick={() => exportSingle(table.name)} class="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm">
                  Export Table
                </button>
                <button onclick={() => openAdvancedEditor(table)} class="w-full px-3 py-2 bg-purple-500 text-white rounded text-sm flex items-center justify-center gap-2">
                  <span>✨</span>
                  Advanced Edit
                </button>
                <button onclick={() => duplicateTable(table.name)} class="w-full px-3 py-2 bg-green-500 text-white rounded text-sm">
                  Duplicate Table
                </button>
                <button onclick={() => removeTable(table.name)} class="w-full px-3 py-2 bg-red-500 text-white rounded text-sm">
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</SettingPage>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>