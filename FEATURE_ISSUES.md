# Story Mode Enhancement Issues

## Issue 1: Enhanced Table System with Placeholder Resolution

**Title**: Implement composable table system with placeholder syntax and modifiers

**Labels**: `enhancement`, `feature`, `tables`

**Description**:
Enhance the existing random table system to support composable placeholders that can reference other tables and include modifiers for text transformation.

**Requirements**:

- Implement placeholder syntax: `{tableName}` for basic replacement
- Support modifiers: `{tableName.modifier}` (e.g., `{color.capitalize}`, `{name.uppercase}`)
- Support consumable tables: `{tableName.consumable}` removes used entries
- Add table-level consumable flag for permanent consumable behavior
- Scope consumable tracking to current story/session
- Support nested placeholder resolution
- Maintain backwards compatibility with existing table system

**Technical Implementation**:

1. Create new `PlaceholderResolver` utility class
2. Extend `RandomTable` interface to include consumable flag and consumed items tracking
3. Add modifier system with common text transformations:
   - `.capitalize`, `.uppercase`, `.lowercase`
   - `.plural`, `.singular`
   - `.article` (adds "a" or "an")
   - `.the` (adds "the")
4. Update table rolling logic to handle placeholder resolution
5. Add story-scoped consumption tracking in localStorage
6. Create UI for testing placeholder resolution

**Acceptance Criteria**:

- [ ] Can create table entry: "A {color} {gem} is found!"
- [ ] Placeholders resolve to random table entries
- [ ] Modifiers work correctly: `{color.capitalize}` → "Red"
- [ ] Consumable tables don't repeat entries: `{treasure.consumable}`
- [ ] Nested placeholders resolve: `{location}` containing `{weather}`
- [ ] Table-level consumable flag works
- [ ] Consumption resets per story session
- [ ] Existing table functionality unchanged

**Files to modify**:

- `src/data/types.ts` - extend RandomTable interface
- `src/lib/tables.ts` - add placeholder resolution
- `src/components/pages/settings/CustomTables.svelte` - add consumable UI
- Create `src/lib/placeholder-resolver.ts`

---

## Issue 2: Template System for Complex Content Generation

**Title**: Implement template system for structured content generation (CharacterBlock, etc.)

**Labels**: `enhancement`, `feature`, `templates`

**Description**:
Create a template system allowing users to define complex, structured content blocks that combine multiple randomization methods.

**Requirements**:

- Support custom template creation and management
- Enable multiple randomization types:
  - Table references: `{tableName}`
  - Dice ranges: `{rand 10-60}`
  - Consumable lists: `{skills.consumable}`
- Provide pre-built templates (Character, Location, Quest, Item)
- Allow template saving, editing, and sharing
- Support template categories/organization
- Add template execution from main story interface

**Technical Implementation**:

1. Create `Template` interface and data model
2. Build `TemplateEngine` for parsing and executing templates
3. Extend placeholder resolver to handle:
   - Range notation: `{rand min-max}`
   - Dice notation: `{roll 2d6+3}`
   - List operations: `{list.consumable}`, `{list.pick 3}`
4. Create template management UI (new settings page)
5. Add template execution button/interface to main story
6. Include default template library

**Example Template Structure**:

```
CharacterBlock:
Name: {names}
Age: {rand 18-65}
Profession: {occupations}
Personality: {traits.pick 2}
Equipment: {gear.consumable} and {gear.consumable}
```

**Acceptance Criteria**:

- [ ] Can create custom templates with mixed randomization
- [ ] Range syntax works: `{rand 10-60}`
- [ ] Multiple picks work: `{skills.pick 3}`
- [ ] Templates save/load from localStorage
- [ ] Pre-built templates available
- [ ] Template execution integrates with story content
- [ ] Template categories/organization
- [ ] Export/import template functionality

**Files to create**:

- `src/data/models/templates.svelte.ts`
- `src/lib/template-engine.ts`
- `src/components/pages/settings/Templates.svelte`
- `src/components/story-mode/TemplateButton.svelte`

---

## Issue 3: LLM Integration with Generation Profiles

**Title**: Integrate LLM API support with configurable generation profiles

**Labels**: `enhancement`, `feature`, `llm`, `ai`

**Description**:
Add LLM integration for continuing story narratives with configurable generation profiles supporting multiple OpenAPI-compatible providers.

**Requirements**:

- Support OpenAPI-compatible providers (OpenAI, Mistral, OpenRouter, KoboldCPP)
- Configurable generation profiles with custom settings
- Trigger on empty input + send (Enter/Ctrl+Enter)
- Stream responses for fluid user experience
- Context management with story history
- Toggle to include/exclude system content (dice, oracle results)
- Response integration as standard story content
- Profile management (save, edit, delete, duplicate)

**Technical Implementation**:

### Phase 1: Core Infrastructure

1. Create `LLMProfile` interface with configuration options:

   ```typescript
   interface LLMProfile {
     name: string;
     provider: 'openai' | 'mistral' | 'openrouter' | 'koboldcpp' | 'custom';
     apiKey: string;
     endpoint: string;
     model: string;
     settings: {
       temperature: number;
       maxTokens: number;
       topP: number;
       frequencyPenalty: number;
       presencePenalty: number;
     };
     includeSystemContent: boolean;
     maxContextEntries: number;
   }
   ```
2. Create `LLMService` class for API communication
3. Add profile management data model
4. Implement streaming response handling

### Phase 2: UI Implementation

1. Create LLM settings page with profile management
2. Add profile selector to main story interface
3. Implement generation status indicators
4. Add toggle for including system content

### Phase 3: Integration

1. Modify input handler to detect empty input + send
2. Build context window from story history
3. Filter system content based on profile settings
4. Stream and append responses as story content
5. Add error handling and retry logic

**Context Management Strategy**:

- Send last N story entries based on profile setting
- Smart truncation to stay within token limits
- Option to include full story or sliding window
- System content filtering (oracle results, dice rolls, etc.)

**Acceptance Criteria**:

- [ ] Can configure multiple LLM profiles
- [ ] Profiles save/load from localStorage
- [ ] Empty input + Enter triggers LLM generation
- [ ] Responses stream in real-time
- [ ] Context includes relevant story history
- [ ] System content toggle works correctly
- [ ] Multiple provider support (OpenAI, Mistral, etc.)
- [ ] Error handling for API failures
- [ ] Generation can be cancelled mid-stream
- [ ] Profile import/export functionality

**Files to create**:

- `src/data/models/llm-profiles.svelte.ts`
- `src/lib/llm-service.ts`
- `src/components/pages/settings/LLMSettings.svelte`
- `src/components/story-mode/LLMIndicator.svelte`

**Files to modify**:

- `src/components/story-mode/Input.svelte` - add LLM trigger logic
- `src/data/types.ts` - add LLM-related interfaces
- `src/data/setting-pages.ts` - add LLM settings page

---

## Issue 4: Configuration System for Optional Features

**Title**: Implement feature toggle system for enhanced functionality

**Labels**: `enhancement`, `configuration`, `settings`

**Description**:
Create a configuration system allowing users to enable/disable advanced features to maintain the app's simplicity for users who prefer the basic functionality.

**Requirements**:

- Feature toggles for:
  - Enhanced table system (placeholders/modifiers)
  - Template system
  - LLM integration
- Settings persistence in localStorage
- Graceful feature hiding when disabled
- Import/export of full configuration
- Reset to defaults option

**Technical Implementation**:

1. Create `AppConfig` interface and data model
2. Add feature toggle UI to main settings
3. Implement conditional rendering throughout app
4. Add configuration export/import
5. Create migration system for config updates

**Acceptance Criteria**:

- [ ] Can toggle each major feature on/off
- [ ] Disabled features hidden from UI
- [ ] Settings persist across sessions
- [ ] Configuration export/import works
- [ ] Default configuration available
- [ ] Smooth feature activation without restart

**Files to create**:

- `src/data/models/app-config.svelte.ts`
- `src/components/pages/settings/FeatureToggles.svelte`

---

## Issue 5: Enhanced Table Management UI

**Title**: Improve table management with import/export and enhanced creation tools

**Labels**: `enhancement`, `ui`, `tables`

**Description**:
Enhance the existing custom table interface to support file-based import/export, bulk operations, and improved creation workflows.

**Requirements**:

- Import tables from text files (CSV, JSON, plain text lists)
- Export tables individually or in bulk
- Duplicate existing tables for modification
- Bulk edit operations
- Table validation and error reporting
- Search/filter tables by name or content
- Table usage statistics
- Improved mobile responsiveness

**Technical Implementation**:

1. Add file import/export utilities
2. Enhance table creation UI with validation
3. Add table search and filtering
4. Implement bulk operations
5. Add usage tracking for tables

**Acceptance Criteria**:

- [ ] Can import table from text file
- [ ] Can export tables as JSON/CSV
- [ ] Table validation prevents invalid entries
- [ ] Search and filter functionality works
- [ ] Bulk operations available
- [ ] Mobile-friendly interface
- [ ] Usage statistics display

**Files to modify**:

- `src/components/pages/settings/CustomTables.svelte`
- `src/data/models/custom-tables.svelte.ts`

---

## Implementation Priority

**Phase 1** (Core functionality):

1. Issue #1: Enhanced Table System
2. Issue #4: Configuration System

**Phase 2** (Advanced features):
3. Issue #2: Template System
4. Issue #5: Enhanced Table UI

**Phase 3** (LLM Integration):
5. Issue #3: LLM Integration

Each issue is designed to be independently implementable, with clear dependencies noted. The configuration system (#4) should be implemented early to support optional activation of other features.
