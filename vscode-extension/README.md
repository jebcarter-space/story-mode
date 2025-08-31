# Story Mode VSCode Extension

AI-powered interactive storytelling and solo RPG tools integrated directly into VSCode.

## 🎯 Key Features

### Inline Text Continuation
- **Cmd/Ctrl+Shift+Enter**: Continue text with AI from cursor position
- No need to leave your editor or switch to external tools
- Smart context detection based on file location and repository items

### Repository System  
- Organize characters, locations, objects, and situations
- Automatic keyword matching and context injection
- Scoped to library/shelf/book/chapter levels
- Route different content to different LLM profiles

### Interactive Story Tools
- **Cmd/Ctrl+Shift+O**: Query the Oracle for Yes/No questions
- **Cmd/Ctrl+Shift+D**: Roll dice with standard notation (1d20, 3d6+2, etc.)
- Template system with LLM expansion

### File-Based Storage
- All data stored as plain markdown and JSON files
- Full version control with Git
- Cross-platform compatibility
- No vendor lock-in

## 🚀 Getting Started

1. **Create Library Structure**: 
   - Command Palette → "Story Mode: Create Story Library"
   - Creates `.story-mode/` folder in your workspace

2. **Set Up LLM Profile**:
   - Add your API key to `.story-mode/llm-profiles/default.json`
   - Supports OpenAI, OpenRouter, KoboldCPP, and more

3. **Start Writing**:
   - Create markdown files anywhere in your workspace
   - Use **Cmd/Ctrl+Shift+Enter** to continue text with AI
   - Repository items automatically inject based on keywords

## 📁 File Structure

```
workspace/
├── .story-mode/
│   ├── library.json
│   ├── repositories/
│   │   ├── characters/
│   │   ├── locations/
│   │   ├── objects/
│   │   └── situations/
│   ├── templates/
│   ├── llm-profiles/
│   └── shelves/
└── your-story-files.md
```

## 🎲 Commands

| Command | Keybind | Description |
|---------|---------|-------------|
| Continue Text | `Cmd+Shift+Enter` | Continue text with AI |
| Query Oracle | `Cmd+Shift+O` | Ask yes/no questions |
| Roll Dice | `Cmd+Shift+D` | Roll dice with notation |
| Insert Template | - | Insert and expand templates |
| Open Repository | - | Manage characters/locations |

## 🔧 Configuration

- `storyMode.defaultLLMProfile`: Default LLM profile to use
- `storyMode.maxContextLength`: Max context length (characters)
- `storyMode.autoSave`: Auto-save files after AI generation
- `storyMode.repositoryPath`: Path to repository folder

## 🧠 LLM Providers

Supports all major LLM providers:
- OpenAI (GPT-4, GPT-3.5)
- OpenRouter (Claude, Llama, etc.)  
- KoboldCPP (Local models)
- Mistral AI
- Custom endpoints

## 🎭 Repository Items

Create markdown files in `.story-mode/repositories/[category]/` with frontmatter:

```markdown
---
type: character
tags: [hero, brave, magical]
scope: library
forceContext: false
llmProfile: character-specialist
---

# Aragorn

The ranger who became king...
```

## 📝 Templates

Templates in `.story-mode/templates/` can be expanded with LLM:

```markdown
---
name: Character Introduction
llmEnabled: true
llmInstructions: Expand this into a vivid character introduction
llmProfile: descriptive-writer
---

**{{character_name}}** appears, {{basic_description}}.
```

## Development Status

This extension is in active development. Current phase: **Core Implementation**

See GitHub Issues for detailed roadmap and progress tracking.
