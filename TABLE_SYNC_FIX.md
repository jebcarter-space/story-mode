# Table Synchronization Fix

## Problem
The Visual Table tool and Sparks tool in the VSCode extension were not aware of the same table configurations. This was because they were using different storage mechanisms:

- **Sparks Tool**: Expected table enabled/disabled state to be stored in table properties (`enabled`, `oracleEnabled`, `sparksEnabled`)
- **Visual Table Tool**: Stored enabled/disabled state in VSCode workspace settings (`storyMode.oracleTables`, `storyMode.sparksTables`)

## Solution
Unified both tools to use VSCode workspace settings as the single source of truth through the `ConfigurationService`.

### Changes Made

#### 1. Updated SparkTableManager
- **File**: `src/services/spark-table-manager.ts`
- **Changes**:
  - Added import for `ConfigurationService`
  - Modified `getEnabledTables()` to read from VSCode settings instead of table properties
  - Added `initializeDefaultConfiguration()` to set up default configurations when tables are first loaded
  - Added `getAvailableTableNames()` and `isTableEnabled()` helper methods
  - Added automatic refresh notification to Visual Table Manager when tables are reloaded

#### 2. Updated TableManagerWebview
- **File**: `src/ui/table-manager-webview.ts`
- **Changes**:
  - Added public `refresh()` method to allow external refresh requests

#### 3. Updated Extension Commands
- **File**: `src/extension.ts` 
- **Changes**:
  - Added `story-mode.refreshTableManager` command to sync Visual Table Manager when data changes

## How It Works Now

1. **Single Source of Truth**: Both tools now read enabled/disabled table state from VSCode workspace settings:
   - `storyMode.oracleTables` - Array of table names enabled for Oracle queries
   - `storyMode.sparksTables` - Array of table names enabled for Sparks generation

2. **Automatic Synchronization**: When tables are reloaded from the filesystem, the Visual Table Manager automatically refreshes to stay in sync.

3. **Default Initialization**: When tables are first loaded and no configuration exists, all available tables are automatically enabled for both Oracle and Sparks.

## Benefits

- ✅ Visual Table Manager and Sparks tool now see the same table configurations
- ✅ Changes in one tool are immediately reflected in the other
- ✅ Single source of truth eliminates configuration conflicts
- ✅ Backward compatible with existing table configuration picker
- ✅ Automatic setup of default configurations for new workspaces

## Testing

To verify the fix works:

1. Open Visual Table Manager and enable/disable some tables
2. Use the Sparks tool - it should only use the tables you enabled in the Visual Table Manager
3. Use the configuration picker - it should show the same enabled tables as the Visual Table Manager
4. All three tools should now be synchronized

## Configuration Storage

Table configurations are now stored in workspace settings (`.vscode/settings.json`):

```json
{
  "storyMode.oracleTables": ["default", "gothic-atmosphere", "steampunk-elements"],
  "storyMode.sparksTables": ["default", "character-personality", "haunting-grounds"],
  "storyMode.sparkKeywordCount": 3,
  "storyMode.defaultTableEnabled": true,
  "storyMode.includeTableNames": false
}
```
