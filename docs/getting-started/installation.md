# Installation & Setup

This guide will help you install and configure Story Mode for both the VSCode extension and web application.

## Choose Your Platform

Story Mode offers two complementary interfaces:

- **VSCode Extension**: Perfect for developers and writers who work in VS Code
- **Web Application**: Ideal for pure storytelling with a clean interface
- **Both**: You can use both simultaneously - they share the same file format!

## VSCode Extension Installation

### Prerequisites
- [Visual Studio Code](https://code.visualstudio.com/) installed
- Node.js (optional, for local development)

### Install from VSCode Marketplace

1. **Open VS Code**
2. **Open Extensions Panel**: Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. **Search**: Type "Story Mode" in the search box
4. **Install**: Click the Install button next to the Story Mode extension
5. **Reload**: VS Code will prompt you to reload when installation completes

### Manual Installation (Advanced)

If you have a `.vsix` file:

1. **Open Command Palette**: `Ctrl+Shift+P` / `Cmd+Shift+P`
2. **Run Command**: Type "Extensions: Install from VSIX"
3. **Select File**: Choose your `story-mode-vscode-*.vsix` file
4. **Reload**: Restart VS Code when prompted

## Web Application Setup

### Option 1: Use Online Version (Recommended)

1. **Visit**: [story-mode.app](https://story-mode.app) (or your hosted instance)
2. **Start Creating**: No installation required!

### Option 2: Local Development

```bash
# Clone repository
git clone https://github.com/jebcarter-space/story-mode.git
cd story-mode

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## First-Time Setup

### 1. Create Your First Library

**VSCode Extension:**
1. **Open a Folder**: File → Open Folder (choose your writing workspace)
2. **Create Library**: Command Palette → "Story Mode: Create Story Library"
3. **Library Created**: A `.story-mode/` folder appears in your workspace

**Web Application:**
1. **Visit Library Page**: Click "Library" in the navigation
2. **Create New Library**: Click "+" to create your first library
3. **Name Your Library**: Give it a meaningful name like "My Stories"

### 2. Set Up LLM Profile (AI Integration)

Story Mode supports multiple AI providers. Here's how to configure your first one:

#### Supported Providers
- **OpenAI** (GPT-3.5, GPT-4)
- **OpenRouter** (Access to multiple models)
- **KoboldCPP** (Local AI hosting)
- **Mistral AI**
- **Any OpenAI-compatible API**

#### VSCode Configuration

1. **Open Profile File**: `.story-mode/llm-profiles/default.json`
2. **Add Your Configuration**:

```json
{
  "name": "OpenAI GPT-3.5",
  "provider": "openai",
  "apiKey": "your-api-key-here",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-3.5-turbo",
  "systemPrompt": "You are a helpful assistant for creative writing and interactive storytelling. Continue the story naturally, maintaining consistency with the established tone, characters, and setting.",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 400,
    "topP": 1.0,
    "frequencyPenalty": 0.0,
    "presencePenalty": 0.0
  },
  "includeSystemContent": true,
  "maxContextEntries": 10
}
```

#### Web Application Configuration

1. **Navigate to Settings**: Click "Settings" in the navigation
2. **LLM Settings**: Select "LLM Settings" from the dropdown
3. **Add Profile**: Click "Add New Profile"
4. **Fill in Details**: Enter your API key and configuration
5. **Test Connection**: Use the test button to verify everything works

### 3. Configure Extension Settings (VSCode Only)

Open VS Code settings and configure:

- **Story Mode: Default LLM Profile**: Set to "default"
- **Story Mode: Max Context Length**: Set to 4000 (or your preference)
- **Story Mode: Auto Save**: Enable for automatic saving
- **Story Mode: Repository Path**: Usually auto-detected

### 4. Test Your Setup

#### VSCode Extension Test
1. **Create Test File**: Create a new `.md` file in your workspace
2. **Write Something**: Type "The old wizard looked at the mysterious artifact and"
3. **Continue with AI**: Press `Ctrl+Shift+Enter` / `Cmd+Shift+Enter`
4. **Try Oracle**: Press `Ctrl+Shift+O` / `Cmd+Shift+O` and ask "Is it magical?"

#### Web Application Test
1. **Create New Story**: Go to Library → Create new story
2. **Write and Continue**: Type some text and use the continue button
3. **Try Oracle**: Click the Oracle button and ask a yes/no question

## Security Considerations

### API Keys
- **Never commit API keys** to version control
- **Use environment variables** for shared repositories
- **Rotate keys regularly** for security

### File Storage
- **Local Storage**: Web app stores data in browser localStorage
- **File-Based**: VSCode extension uses local files
- **Git Integration**: Both work well with version control (exclude sensitive files)

### Recommended .gitignore

Add these lines to your `.gitignore`:

```gitignore
# Story Mode - API Keys
.story-mode/llm-profiles/*.json

# Story Mode - Generated Content (optional)
.story-mode/cache/
```

## Troubleshooting

### Common Setup Issues

**"Command not found" in VSCode**
- Reload VS Code after installation
- Check that extension is enabled in Extensions panel

**API Connection Errors**
- Verify your API key is correct
- Check internet connection
- Ensure endpoint URL is correct

**No .story-mode folder created**
- Make sure you have write permissions to the workspace
- Try creating the folder manually: `.story-mode/repositories/`

**Web app not loading**
- Clear browser cache and reload
- Check browser console for errors
- Try incognito/private browsing mode

### Getting Help

If you're still having issues:

1. **Check the [Common Issues](../troubleshooting/common-issues.md) page**
2. **Review the [FAQ](../troubleshooting/faq.md)**
3. **Search [GitHub Issues](https://github.com/jebcarter-space/story-mode/issues)**
4. **Create a new issue** if your problem isn't covered

## What's Next?

Once you have Story Mode installed and configured:

1. **[Your First Story](first-story.md)** - Complete walkthrough for new users
2. **[Basic Concepts](basic-concepts.md)** - Understand the core concepts
3. **[Feature Guides](../features/)** - Learn about specific features
4. **[Workflow Examples](../workflows/)** - See real-world usage patterns

---

**Need help?** Check our [troubleshooting guide](../troubleshooting/common-issues.md) or [create an issue](https://github.com/jebcarter-space/story-mode/issues) on GitHub.