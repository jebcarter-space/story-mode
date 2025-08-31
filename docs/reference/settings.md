# Settings Reference

Complete reference for all Story Mode configuration options in both the VSCode extension and web application.

## LLM Profiles

LLM profiles configure AI providers for text continuation and Oracle interpretation.

### Profile Structure

```json
{
  "name": "Profile Name",
  "provider": "openai|openrouter|koboldcpp|mistral|custom",
  "apiKey": "your-api-key-here",
  "endpoint": "https://api.provider.com/v1/chat/completions",
  "model": "model-name",
  "systemPrompt": "Instructions for the AI...",
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

### Provider-Specific Settings

#### OpenAI
```json
{
  "provider": "openai",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-3.5-turbo",
  "apiKey": "sk-..."
}
```

**Available Models:**
- `gpt-3.5-turbo` - Fast, cost-effective
- `gpt-4` - Higher quality, more expensive
- `gpt-4-turbo` - Latest GPT-4 variant

#### OpenRouter
```json
{
  "provider": "openrouter",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "model": "openai/gpt-3.5-turbo",
  "apiKey": "sk-or-..."
}
```

**Popular Models:**
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-haiku`
- `meta-llama/llama-2-70b-chat`
- `mistralai/mistral-7b-instruct`

#### KoboldCPP (Local)
```json
{
  "provider": "koboldcpp",
  "endpoint": "http://localhost:5001/api/v1/chat/completions",
  "model": "any-name",
  "apiKey": "not-required"
}
```

#### Custom Provider
```json
{
  "provider": "custom",
  "endpoint": "https://your-api.com/v1/chat/completions",
  "model": "your-model",
  "apiKey": "your-key"
}
```

### AI Generation Settings

#### Temperature (0.0 - 2.0)
Controls creativity and randomness:
- **0.1-0.3**: Very focused, consistent output
- **0.7**: Balanced creativity (recommended)
- **1.0-1.5**: More creative and varied
- **1.8-2.0**: Highly creative, potentially chaotic

#### Max Tokens (50 - 4000)
Maximum response length:
- **200-400**: Good for story continuation
- **100-200**: Shorter responses, faster generation
- **500-1000**: Longer responses for detailed scenes
- **1000+**: Very long responses (expensive)

#### Top P (0.1 - 1.0)
Alternative to temperature for controlling randomness:
- **0.9**: Slightly focused
- **1.0**: Full vocabulary available (recommended)
- **0.7**: More focused vocabulary

#### Frequency Penalty (-2.0 - 2.0)
Reduces repetition of tokens:
- **0.0**: No penalty (recommended)
- **0.1-0.5**: Slight reduction in repetition
- **1.0+**: Strong penalty (may reduce quality)

#### Presence Penalty (-2.0 - 2.0)
Encourages topic diversity:
- **0.0**: No penalty (recommended)
- **0.1-0.3**: Slight encouragement for new topics
- **0.5+**: Strong push for topic diversity

### Context Management

#### Include System Content
Controls whether Oracle results and dice rolls are included in AI context:
- **true**: AI sees all story content including game mechanics
- **false**: AI only sees narrative text

#### Max Context Entries
Number of recent content entries to include:
- **5-10**: Shorter context, faster processing
- **10-15**: Balanced context (recommended)
- **20+**: Long context, better consistency but slower

## VSCode Extension Settings

Configure through VS Code settings (File → Preferences → Settings → Extensions → Story Mode).

### Core Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `storyMode.defaultLLMProfile` | `"default"` | Default LLM profile name |
| `storyMode.maxContextLength` | `4000` | Maximum context length for AI |
| `storyMode.autoSave` | `true` | Auto-save stories after changes |
| `storyMode.repositoryPath` | `".story-mode"` | Path to Story Mode directory |

### Keyboard Shortcuts

| Command | Default Shortcut | Description |
|---------|------------------|-------------|
| Continue Text | `Ctrl+Shift+Enter` | AI text continuation |
| Query Oracle | `Ctrl+Shift+O` | Ask Oracle question |
| Roll Dice | `Ctrl+Shift+D` | Roll dice notation |
| Insert Template | `Ctrl+Shift+T` | Insert template |
| Create Library | None | Create Story Mode library |

### Advanced Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `storyMode.enableTemplates` | `true` | Enable template system |
| `storyMode.enableRepository` | `true` | Enable repository features |
| `storyMode.debugMode` | `false` | Enable debug logging |
| `storyMode.templateDirectory` | `"templates"` | Template directory name |

## Web Application Settings

Access through Settings page in the web application.

### Feature Toggles

Control which features are enabled:

| Feature | Description | Default |
|---------|-------------|---------|
| Enhanced Tables | Advanced spark table features | Enabled |
| Templates | Template system with LLM expansion | Enabled |
| LLM Integration | AI text continuation and interpretation | Enabled |

### Theme Settings

| Option | Values | Description |
|--------|--------|-------------|
| Theme Mode | `auto`, `light`, `dark` | Color scheme preference |
| Accent Color | Various colors | Primary UI color |
| Font Size | `small`, `medium`, `large` | Text size preference |

### Spark Tables Configuration

#### Default Tables
Built-in spark tables with configurable settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Default | Use built-in keywords | Enabled |
| Table Weight | Selection frequency multiplier | 1 |
| Oracle Usage | Use in Oracle responses | Enabled |
| Sparks Usage | Use in Spark generation | Enabled |

#### Custom Tables
User-created keyword collections:

| Property | Description | Format |
|----------|-------------|---------|
| Name | Table identifier | String |
| Keywords | List of keywords | CSV or JSON |
| Weight | Selection frequency | 1-10 |
| Category | Organization tag | String |

## File Structure Configuration

### Directory Layout

```
workspace/
├── .story-mode/                    # Main configuration directory
│   ├── library.json               # Library metadata
│   ├── llm-profiles/              # AI provider configurations
│   │   ├── default.json           # Default LLM profile
│   │   ├── creative.json          # Alternative profile
│   │   └── local.json             # Local AI profile
│   ├── repositories/              # Story element storage
│   │   ├── characters/            # Character definitions
│   │   │   ├── protagonist.md     # Main character
│   │   │   └── villains/          # Organized subfolders
│   │   ├── locations/             # Location definitions
│   │   ├── objects/               # Item and artifact definitions
│   │   └── situations/            # Scenario definitions
│   ├── templates/                 # Reusable content templates
│   │   ├── character-creation.md  # Character generation template
│   │   ├── scene-setup.md         # Scene structure template
│   │   └── categories/            # Organized by category
│   └── spark-tables/              # Custom keyword tables
│       ├── default.csv            # Default keywords
│       ├── fantasy.csv            # Fantasy-themed keywords
│       └── horror.csv             # Horror-themed keywords
├── stories/                       # Your story files
│   ├── campaign-1/               # Campaign organization
│   │   ├── session-01.md         # Individual sessions
│   │   └── characters.md         # Campaign notes
│   └── standalone/               # Individual stories
└── backups/                      # Manual backups (optional)
```

### File Naming Conventions

#### Repository Items
- Use kebab-case: `eldara-the-wise.md`
- Include type prefix: `char-eldara.md`, `loc-tavern.md`
- Organize in subfolders: `characters/npcs/`, `locations/cities/`

#### Templates
- Descriptive names: `character-introduction.md`
- Category folders: `combat/`, `social/`, `exploration/`
- Version numbers: `scene-setup-v2.md`

#### Spark Tables
- Theme-based names: `fantasy-keywords.csv`
- Difficulty indicators: `easy-prompts.csv`, `complex-scenarios.csv`
- Source attribution: `dnd5e-spells.csv`

## Import/Export Configuration

### Export Options

#### VSCode Extension
- **Git repository**: Version control integration
- **ZIP archive**: Complete library backup
- **Individual files**: Standard Markdown format

#### Web Application
- **JSON export**: Complete library with settings
- **Markdown export**: Stories only
- **CSV export**: Spark tables and data

### Import Formats

#### Supported Formats
- **JSON**: Complete library import
- **Markdown**: Individual story files
- **CSV**: Spark table keywords
- **YAML**: Template frontmatter

#### Import Process
1. **Backup current data** before importing
2. **Validate format** of import files
3. **Resolve conflicts** between existing and imported data
4. **Test functionality** after import completion

## Security and Privacy

### API Key Management

#### Best Practices
- **Environment variables**: Use `.env` files for shared projects
- **Git exclusion**: Add API keys to `.gitignore`
- **Regular rotation**: Change keys periodically
- **Limited scope**: Use keys with minimal required permissions

#### Storage Locations
- **VSCode**: `.story-mode/llm-profiles/*.json`
- **Web app**: Browser localStorage (encrypted)
- **Environment**: `.env` files (development)

### Data Privacy

#### Local Storage
- **VSCode extension**: All data stored locally
- **Web application**: Data stored in browser localStorage
- **No cloud sync**: Data never leaves your device

#### AI Provider Privacy
- **API calls**: Only story context sent to AI providers
- **No metadata**: Personal information excluded from requests
- **Provider policies**: Review individual provider privacy policies

---

**Need more details?** Check the [Getting Started](../getting-started/) guides for setup instructions, or [Features](../features/) documentation for specific functionality details.