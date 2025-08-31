# 🧪 Story Mode VS Code Extension - Testing Checklist

## ⚙️ Initial Setup & Configuration

### Extension Installation & Activation
- [ ] Extension shows in Extensions panel as "Story Mode" by jebcarter
- [ ] Extension activates without errors (check VS Code Developer Console)
- [ ] "Story Mode" appears in Command Palette (`Cmd+Shift+P`)
- [ ] Story Mode tree view appears in Explorer panel
- [ ] Status bar shows context indicator (if configured)

### Library Structure Setup
- [ ] Test `story-mode.createLibrary` command
- [ ] Verify `.story-mode/` folder created with subdirectories:
  - [ ] `repositories/` (characters, locations, objects, situations)
  - [ ] `templates/`
  - [ ] `llm-profiles/`
  - [ ] `shelves/`
- [ ] Verify `library.json` created with correct structure
- [ ] Check example files created (character, location, templates)

### LLM Profile Configuration
- [ ] Verify `koboldcpp-default.json` profile exists and is valid
- [ ] Test VS Code settings: `storyMode.defaultLLMProfile` set to "koboldcpp-default"
- [ ] Test remote KoboldCPP connection (https://micro-existing-they-grammar.trycloudflare.com/)
- [ ] Verify profile loads without errors in extension

---

## 🎮 Core Commands & Keybindings

### Continue Text with AI (`Cmd+Shift+Enter`)
- [ ] **Setup**: Open a markdown file with some text
- [ ] **Action**: Place cursor at end of text, press `Cmd+Shift+Enter`
- [ ] **Expected**: Progress indicator appears, AI continuation generated
- [ ] **Verify**: Text inserted at cursor position
- [ ] **Check**: Auto-save works (enabled in settings)
- [ ] **Test**: Works with various text lengths and styles
- [ ] **Error handling**: Graceful failure if LLM unavailable

### Query Oracle (`Cmd+Shift+O`)
- [ ] **Action**: Press `Cmd+Shift+O`, enter question
- [ ] **Expected**: Oracle result with answer, roll number
- [ ] **Verify**: Keywords appear (should always show 2 keywords now)
- [ ] **Check**: Interpretation provided for all answer types
- [ ] **Format**: Properly formatted markdown output
- [ ] **Test**: Different Oracle results (1-2, 3-6, 7-9, 10-11, 12-14, 15-18, 19-20)
- [ ] **Variety**: Keywords change between uses (from 200+ keyword pool)
- [ ] **No editor**: Works when no active editor (shows notification)

### Continue with Oracle (`Cmd+Shift+U`)
- [ ] **Action**: Use command, enter Oracle question
- [ ] **Expected**: Oracle result inserted first
- [ ] **Then**: AI continuation generated automatically
- [ ] **Verify**: Both Oracle and AI content appear
- [ ] **Check**: Proper formatting and flow

### Roll Dice (`Cmd+Shift+D`)
- [ ] **Action**: Press `Cmd+Shift+D`, enter dice notation
- [ ] **Test notations**: `1d20`, `3d6+2`, `1d100`, `2d10-1`
- [ ] **Expected**: Dice result with breakdown if applicable
- [ ] **Format**: Proper emoji and formatting
- [ ] **No editor**: Works when no active editor (shows notification)

### Insert Template (`Cmd+Shift+T`)
- [ ] **Prerequisites**: Templates exist in `.story-mode/templates/`
- [ ] **Action**: Press `Cmd+Shift+T`
- [ ] **Expected**: Template picker appears with categories
- [ ] **Test**: Select template, verify insertion
- [ ] **Check**: Placeholder resolution works
- [ ] **Verify**: LLM expansion works (if template has `{{#llm}}` blocks)
- [ ] **Test**: Different template types and categories

### Continue with Template (`Cmd+Shift+Alt+T`)
- [ ] **Action**: Use command, select template
- [ ] **Expected**: Template inserted first
- [ ] **Then**: AI continuation generated automatically
- [ ] **Verify**: Template + AI content flows naturally

### Show Smart Suggestions (`Cmd+Shift+S`)
- [ ] **Setup**: Open file with text
- [ ] **Action**: Place cursor in text, press `Cmd+Shift+S`
- [ ] **Expected**: Suggestions appear based on context
- [ ] **Test**: Different cursor positions and text types

---

## 📁 Repository & File Management

### Story Mode Explorer Tree View
- [ ] **Visibility**: Tree view appears in Explorer panel
- [ ] **Content**: Shows repository categories and items
- [ ] **Navigation**: Can expand/collapse categories
- [ ] **Files**: Individual repository files listed
- [ ] **Interaction**: Can click items to open files
- [ ] **Refresh**: Tree updates when files change

### Repository Context System
- [ ] **Test**: Create new character file in `repositories/characters/`
- [ ] **Verify**: File appears in tree view
- [ ] **Check**: File has proper frontmatter structure
- [ ] **Test**: Repository context used in AI generation
- [ ] **Verify**: `{{random_character}}` placeholder resolves

### File Watcher System
- [ ] **Test**: Create new repository file manually
- [ ] **Expected**: Tree view refreshes automatically
- [ ] **Test**: Edit existing repository file
- [ ] **Verify**: Changes reflected in system
- [ ] **Performance**: No excessive CPU usage from watching

---

## 🎨 Template System

### Template Loading & Management
- [ ] **Test**: Templates load from `.story-mode/templates/`
- [ ] **Verify**: YAML frontmatter parsed correctly
- [ ] **Check**: Categories organize templates properly
- [ ] **Test**: Template picker shows all templates
- [ ] **Verify**: Template details display correctly

### Template Picker UI
- [ ] **Categories**: Templates grouped with visual separators
- [ ] **Details**: Shows LLM profile, repository target, preview
- [ ] **Search**: Filtering works on name/description
- [ ] **Selection**: Can select and insert templates
- [ ] **Preview**: Content preview shows template structure

### Placeholder System
- [ ] **Basic placeholders**: `{{rand 1-100}}`, `{{roll 2d6}}`
- [ ] **Repository placeholders**: `{{random_character}}`, `{{random_location}}`
- [ ] **LLM placeholders**: `{{#llm}}prompt{{/llm}}`
- [ ] **Nested resolution**: Complex templates work
- [ ] **Error handling**: Invalid placeholders handled gracefully

### Multi-LLM Routing
- [ ] **Test**: Template with specific `llmProfile` in frontmatter
- [ ] **Verify**: Correct LLM profile used for that template
- [ ] **Fallback**: Default profile used if template profile unavailable
- [ ] **Error handling**: Graceful failure if profile missing

---

## 🔮 Enhanced Oracle System

### Oracle Results & Keywords
- [ ] **All answer types**: Test each Oracle result type (Yes/No/Maybe + variations)
- [ ] **Keywords always present**: Every result has 2 keywords
- [ ] **Interpretation quality**: Meaningful interpretations for all results
- [ ] **Keyword variety**: 200+ keywords available, good randomness
- [ ] **Formatting**: Proper markdown formatting with **Keywords:** and **Interpretation:**

### Oracle Integration
- [ ] **History tracking**: Oracle maintains query history
- [ ] **Formatted output**: `formatOracleResult()` works correctly
- [ ] **Template integration**: Oracle can be used in templates
- [ ] **Context awareness**: Oracle considers current story context

---

## ⚙️ Settings & Configuration

### VS Code Settings
- [ ] **Default LLM Profile**: `storyMode.defaultLLMProfile` = "koboldcpp-default"
- [ ] **Auto Save**: `storyMode.autoSave` = true functions correctly
- [ ] **Max Context Length**: `storyMode.maxContextLength` = 4000 respected
- [ ] **Repository Path**: `storyMode.repositoryPath` = ".story-mode" used correctly
- [ ] **Settings UI**: Accessible via VS Code settings

### Profile Management
- [ ] **Profile loading**: LLM profiles load correctly from `.story-mode/llm-profiles/`
- [ ] **Profile validation**: Invalid profiles handled gracefully
- [ ] **Multiple profiles**: Can have multiple LLM profiles
- [ ] **Profile switching**: Different profiles work for different templates
- [ ] **KoboldCPP specific**: Remote endpoint connection works

---

## 🔧 Error Handling & Edge Cases

### Network & LLM Errors
- [ ] **LLM offline**: Graceful error messages when KoboldCPP unavailable
- [ ] **Network timeout**: Proper error handling for slow connections
- [ ] **Invalid responses**: Malformed LLM responses handled
- [ ] **Rate limiting**: API rate limits handled gracefully

### File System Errors
- [ ] **Missing files**: Missing templates/profiles handled
- [ ] **Permission errors**: File permission issues reported clearly
- [ ] **Corrupted files**: Invalid JSON/YAML files handled
- [ ] **Empty directories**: Empty folders don't break functionality

### User Experience
- [ ] **No active editor**: Commands work appropriately without editor
- [ ] **Empty files**: Commands work on empty files
- [ ] **Large files**: Performance acceptable with large files
- [ ] **Concurrent operations**: Multiple commands don't interfere

---

## 🚀 Performance & Stability

### Resource Usage
- [ ] **Memory usage**: Extension doesn't leak memory over time
- [ ] **CPU usage**: Reasonable CPU usage during operations
- [ ] **File watching**: Efficient file system monitoring
- [ ] **Caching**: Repository items cached appropriately

### Responsiveness
- [ ] **Command response**: Commands execute promptly
- [ ] **UI updates**: Tree view and UI update smoothly
- [ ] **Progress indicators**: Long operations show progress
- [ ] **Cancellation**: Can cancel long-running operations

---

## 📊 Integration Testing

### Cross-Feature Integration
- [ ] **Oracle → AI**: Continue with Oracle flows properly
- [ ] **Template → AI**: Continue with Template works correctly
- [ ] **Repository → Templates**: Repository items used in templates
- [ ] **Settings → All Features**: Settings affect all relevant features

### VS Code Integration
- [ ] **Command Palette**: All commands appear and work
- [ ] **Keybindings**: All keyboard shortcuts function
- [ ] **Tree View**: Explorer integration works smoothly
- [ ] **Settings**: VS Code settings integration complete
- [ ] **Activity Bar**: Story Mode icon appears (if implemented)

---

## 📝 Output Quality Testing

### Content Generation Quality
- [ ] **AI continuations**: Contextually appropriate and well-written
- [ ] **Oracle interpretations**: Creative and useful interpretations
- [ ] **Template expansion**: LLM expansions enhance templates appropriately
- [ ] **Formatting**: All outputs properly formatted and readable
- [ ] **Context awareness**: Generated content fits story context

### Specific Output Tests
- [ ] **Oracle format**: 
  ```
  **Oracle:** [Question]
  **Answer:** [Answer] ([Roll])
  **Keywords:** [keyword1], [keyword2]
  **Interpretation:** [Detailed interpretation]
  ```
- [ ] **Dice format**: `🎲 1d20: **15** (15)`
- [ ] **Template insertions**: Proper placeholder resolution
- [ ] **AI continuations**: Natural flow from existing text

---

## 🎯 Specific Test Scenarios

### Scenario 1: New User Setup
- [ ] Install extension in fresh VS Code
- [ ] Open folder, run Create Library command
- [ ] Configure LLM profile
- [ ] Test basic Oracle and AI functionality

### Scenario 2: Creative Writing Workflow
- [ ] Open story file
- [ ] Use Oracle for plot decisions
- [ ] Continue with AI for narrative flow
- [ ] Insert templates for character/location details
- [ ] Verify repository integration

### Scenario 3: Template-Heavy Usage
- [ ] Create custom templates with LLM expansion
- [ ] Test placeholder resolution
- [ ] Verify multi-LLM routing
- [ ] Check template picker functionality

### Scenario 4: Error Recovery
- [ ] Disconnect KoboldCPP mid-operation
- [ ] Test with corrupted profile files
- [ ] Remove template files during operation
- [ ] Verify graceful error handling

---

## ✅ Final Verification

### Documentation Alignment
- [ ] All features match PHASE3_DOCUMENTATION.md
- [ ] All keybindings work as documented
- [ ] Settings descriptions match actual functionality

### User Experience
- [ ] Intuitive workflow for new users
- [ ] Helpful error messages
- [ ] Consistent UI/UX across features
- [ ] Performance acceptable for regular use

### Future Readiness
- [ ] Extension architecture ready for Sparks system (Issue #57)
- [ ] Table system foundation in place
- [ ] Extensible design for future features

---

## 📋 Test Results Summary

**Date Tested**: ___________  
**Tester**: ___________  
**Extension Version**: 0.1.0  
**VS Code Version**: ___________  
**KoboldCPP Endpoint**: https://micro-existing-they-grammar.trycloudflare.com/

**Overall Results**:
- [ ] ✅ All core functionality working
- [ ] ✅ No critical issues found
- [ ] ✅ Ready for production use
- [ ] ⚠️ Minor issues found (list below)
- [ ] ❌ Major issues found (list below)

**Issues Found**:
```
[List any issues discovered during testing]
```

**Recommendations**:
```
[Any recommendations for improvements or fixes]
```
