# Story Mode VSCode Extension - Quick Start Guide

## 🚀 Getting Started

### 1. Create Library Structure
- Open the Command Palette (`Cmd/Ctrl+Shift+P`)
- Run "Story Mode: Create Story Library"
- This creates the `.story-mode/` folder structure in your workspace

### 2. Set up LLM Profile
Create a file `.story-mode/llm-profiles/default.json`:

```json
{
  "name": "OpenAI GPT-3.5",
  "provider": "openai",
  "apiKey": "your-api-key-here",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-3.5-turbo",
  "systemPrompt": "You are a helpful assistant for creative writing and interactive storytelling. Continue the story naturally, maintaining consistency with the established tone, characters, and setting. Keep responses engaging and appropriate for the context.",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 400,
    "topP": 1.0,
    "frequencyPenalty": 0.0,
    "presencePenalty": 0.0
  },
  "includeSystemContent": true,
  "maxContextEntries": 10,
  "created": 1693532400000,
  "updated": 1693532400000
}
```

### 3. Configure Extension Settings
Open VSCode settings and set:
- `Story Mode: Default LLM Profile` to "default"
- `Story Mode: Max Context Length` to 4000 (or your preferred limit)

### 4. Start Writing!
- Create any markdown file in your workspace
- Use **Cmd/Ctrl+Shift+Enter** to continue text with AI
- Use **Cmd/Ctrl+Shift+O** to query the Oracle
- Use **Cmd/Ctrl+Shift+D** to roll dice

## 🎮 Core Commands

| Command | Keybind | Description |
|---------|---------|-------------|
| Continue Text | `Cmd/Ctrl+Shift+Enter` | Continue text with AI from cursor position |
| Query Oracle | `Cmd/Ctrl+Shift+O` | Ask yes/no questions |
| Roll Dice | `Cmd/Ctrl+Shift+D` | Roll dice with standard notation |

## 🔧 Supported LLM Providers

- **OpenAI**: GPT models via API
- **OpenRouter**: Access to multiple models
- **KoboldCPP**: Local models
- **Mistral**: Mistral AI models
- **Custom**: Any OpenAI-compatible endpoint

Replace "your-api-key-here" with your actual API key for the chosen provider.

## 🎯 Primary Goal Achieved

The extension now supports **inline text continuation** - the key functionality where you can press `Cmd/Ctrl+Shift+Enter` in any text editor to have AI continue your story from the cursor position.