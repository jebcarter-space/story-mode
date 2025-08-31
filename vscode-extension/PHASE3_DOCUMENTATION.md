# Story Mode Extension - Phase 3: Template System & Multi-LLM Routing

## Overview

Phase 3 introduces a sophisticated template system with LLM-powered expansion and multi-LLM routing capabilities, enabling specialized AI models for different content types and use cases.

## Key Features Implemented

### 1. Enhanced Template Management Service

- **Improved YAML parsing** with proper handling of quoted strings and boolean values
- **Template loading** from `.story-mode/templates/` folder
- **Metadata extraction** from frontmatter with error handling
- **Category organization** for better template management

### 2. Advanced Template Picker UI

- **Category-organized selection** with visual separators
- **Template details display** showing LLM profile, repository target, and content preview
- **Search and filtering** with match on name, description, and details
- **Auto-creation** of template folder with sample templates when none exist

### 3. Multi-LLM Routing System

- **Per-template LLM profiles** via `llmProfile` field in frontmatter
- **Fallback to default profile** when template profile unavailable
- **Simultaneous multi-model usage** for different templates
- **Performance optimization** through appropriate model selection

### 4. LLM-Powered Placeholder Expansion

New `{{#llm}}prompt{{/llm}}` syntax for dynamic content generation:

```markdown
{{#llm}}Create a detailed character description{{/llm}}
{{#llm}}Generate atmospheric details for this tavern{{/llm}}
{{#llm}}Describe the current weather and mood{{/llm}}
```

### 5. Repository-Aware Templates

Smart placeholders that pull from repository items:

```markdown
{{random_character}} - Random character from repository
{{random_location}} - Random location from repository
{{random_object}} - Random object from repository  
{{random_situation}} - Random situation from repository
```

### 6. Smart Placeholder System

Enhanced placeholder resolver supporting:

- **Basic placeholders**: `{{rand 1-100}}`, `{{roll 2d6+3}}`
- **LLM expansion**: `{{#llm}}prompt{{/llm}}`
- **Repository integration**: `{{random_character}}`
- **Recursive resolution** with depth limiting
- **Error handling** with meaningful fallbacks

## Template Format Specification

### Frontmatter Fields

```yaml
---
name: "Template Name"                    # Display name
description: "Template description"      # Brief description
category: "Characters"                   # Category for organization
llmEnabled: true                         # Enable LLM processing
llmInstructions: "LLM prompt"           # Instructions for LLM
llmProfile: "character-specialist"       # Specific LLM profile to use
appendMode: false                        # true: append LLM to template, false: replace
repositoryTarget: "Character"            # Save result to repository category
---
```

### Template Content Examples

#### 1. Character Creation Template

```markdown
---
name: "Detailed NPC"
description: "Generate a fully detailed NPC"
category: "Characters"
llmEnabled: true
llmInstructions: "Create a detailed character with personality, background, and motivations"
llmProfile: "character-specialist"
appendMode: false
repositoryTarget: "Character"
---

# {{random_character}}

## Basic Info
**Age**: {{rand 18-65}}
**Occupation**: Merchant
**Disposition**: {{roll 1d6}}

## Character Details
{{#llm}}Create a detailed personality, background, and current goals for this character{{/llm}}

## Relationships
- Knows {{random_character}} from the {{random_location}}
- Has conflict with {{random_character}}
```

#### 2. Location Description Template

```markdown
---
name: "Tavern Description" 
description: "Create a detailed tavern with atmosphere"
category: "Locations"
llmEnabled: true
llmInstructions: "Describe a fantasy tavern with atmosphere, patrons, and notable features"
llmProfile: "world-builder"
appendMode: true
---

# The {{random_location}} Tavern

## Basic Details
- **Size**: {{rand 10-50}} patrons
- **Noise Level**: {{roll 2d6}}
- **Notable NPCs**: {{random_character}} (bartender)

{{#llm}}Add rich sensory details about the tavern's atmosphere, sounds, smells, and current mood{{/llm}}
```

#### 3. Quick Name Generator

```markdown
---
name: "Quick Name"
description: "Generate a fantasy name quickly"
category: "Quick Generators"
llmEnabled: true
llmInstructions: "Generate a single fantasy character name"
llmProfile: "fast-model"
appendMode: false
---

{{#llm}}Generate a fantasy character name{{/llm}}
```

## Usage Instructions

### 1. Creating Templates

1. Create `.story-mode/templates/` folder in your workspace
2. Add `.md` files with YAML frontmatter
3. Use supported placeholder syntax in content
4. Test with `Ctrl+Shift+T` (Cmd+Shift+T on Mac)

### 2. Using the Template System

1. **Insert Template**: `Ctrl+Shift+T` or Command Palette → "Story Mode: Insert Template"
2. **Browse by Category**: Templates are organized with visual separators
3. **Preview Details**: See LLM profile, repository target, and content preview
4. **Smart Processing**: Templates automatically resolve placeholders and apply LLM expansion

### 3. Multi-LLM Configuration

1. Set up multiple LLM profiles in `.story-mode/llm-profiles/`
2. Assign profiles to templates via `llmProfile` field
3. Use different models for different purposes:
   - Fast models for simple tasks (name generation, quick fills)
   - Premium models for complex narrative generation
   - Specialized models for specific content types

## Implementation Architecture

### Core Components

- **TemplateManager**: Enhanced template loading with better YAML parsing
- **TemplatePicker**: Category-organized UI with search and preview
- **PlaceholderResolver**: Smart resolver with LLM and repository integration
- **LLMService**: Multi-profile routing with template-specific selection
- **RepositoryManager**: Repository-aware placeholder resolution

### Integration Points

- Templates integrate with repository system for contextual placeholders
- LLM routing uses existing profile management system
- Error handling provides meaningful fallbacks and user guidance
- UI follows VSCode design patterns with proper categorization

## Error Handling

- **Missing Templates**: Auto-offer to create template folder with samples
- **LLM Failures**: Graceful fallback with error indication in output  
- **Repository Errors**: Meaningful placeholder replacement with error context
- **YAML Parse Errors**: Detailed error messages with line information
- **Profile Missing**: Fallback to default profile with user notification

## Testing

The implementation includes comprehensive error handling and fallback mechanisms. Sample templates and repository items are created automatically to demonstrate all features.

## Performance Considerations

- **Lazy Loading**: Templates loaded on-demand
- **Caching**: Repository items cached with TTL
- **Smart Routing**: Use appropriate LLM models to optimize cost and performance
- **Depth Limiting**: Recursive placeholder resolution with safety limits

## Future Enhancements

The template system is designed to be extensible:

- **Community Templates**: Template sharing and library system
- **Advanced Syntax**: Conditional logic and loops in templates  
- **Custom Placeholders**: User-defined placeholder types
- **Template Validation**: Syntax checking and preview system
- **Version Control**: Template versioning and change tracking

This implementation provides a solid foundation for sophisticated content generation workflows while maintaining simplicity for basic use cases.