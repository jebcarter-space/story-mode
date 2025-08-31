# Basic Concepts

Understanding these core concepts will help you get the most out of Story Mode's features and create better stories with AI assistance.

## The Story Mode Philosophy

Story Mode is built around three core principles:

1. **Human-AI Collaboration**: You maintain creative control while AI provides inspiration and assistance
2. **Structured Flexibility**: Organized systems that don't constrain your creativity
3. **File-Based Freedom**: Plain text files that work with any editor and version control

## Core Components

### 1. Libraries, Shelves, Books, and Chapters

Story Mode organizes content hierarchically:

```
Library
├── Shelf (Collection/Series)
│   ├── Book (Story/Campaign)
│   │   ├── Chapter
│   │   └── Chapter
│   └── Book
└── Shelf
```

**Examples:**
- **Library**: "My Fantasy Stories"
- **Shelf**: "Dragon Chronicles Series" 
- **Book**: "The Awakening"
- **Chapter**: "Chapter 1: The Discovery"

This structure helps you organize related stories and maintain consistency across large projects.

### 2. The Oracle System

The Oracle is your AI-powered decision-making assistant that helps drive your narrative forward.

#### How It Works
1. **Ask a yes/no question** about your story
2. **Get a weighted response** (Yes/No/Maybe with qualifiers)
3. **Receive keywords** for inspiration
4. **Get an AI interpretation** of what the result means for your story

#### Oracle Results
- **Yes, and**: Strongly positive with additional benefits
- **Yes**: Simple positive result
- **Yes, but**: Positive with complications
- **No, but**: Negative with silver lining  
- **No**: Simple negative result
- **No, and**: Strongly negative with additional complications

#### Keywords and Interpretation
Each Oracle response includes:
- **2-3 keywords** drawn from a large database for inspiration
- **AI interpretation** that suggests what the result means in your story context

**Example:**
```
Query: "Does the dragon accept the peace offering?"
Result: Yes, but (Rolled: 12)
Keywords: honor, debt, ancient
Interpretation: The dragon accepts the offering, recognizing the honor in your gesture, but now considers you bound by ancient laws of debt and obligation.
```

### 3. AI Text Continuation

AI continuation helps you overcome writer's block and explore new narrative directions.

#### How It Works
1. **Position your cursor** anywhere in your text
2. **Press the continue shortcut** or button
3. **AI analyzes context** from your text and repository
4. **Generates continuation** that matches tone and style
5. **Edit or rewrite** as needed

#### Context Understanding
The AI considers:
- **Recent text** around your cursor position
- **Repository items** (characters, locations, objects)
- **Story history** and established patterns
- **Your writing style** and preferences

#### Best Practices
- **Give clear context**: End sentences with clear direction
- **Use repository items**: Reference characters and locations for consistency
- **Edit freely**: Treat AI output as a first draft
- **Maintain your voice**: Adapt AI suggestions to match your style

### 4. Repository System

The Repository organizes your story elements for consistent reference and automatic context injection.

#### Repository Types
- **Characters**: People, creatures, entities in your stories
- **Locations**: Places, settings, geographical features
- **Objects**: Items, artifacts, tools, weapons
- **Situations**: Scenarios, conflicts, plot devices

#### Keywords and Auto-Injection
Each repository item includes keywords that trigger automatic inclusion:

```markdown
# Eldara the Wise

**Type**: Character
**Keywords**: wizard, eldara, scholar, magic

## Description
Ancient wizard known for her vast knowledge...
```

When you write "The wizard Eldara studied the tome," the system automatically includes her information in AI context.

#### Repository Scope
Repository items can be scoped to different levels:
- **Library-wide**: Available across all stories
- **Shelf-specific**: Only for stories in a particular collection
- **Book-specific**: Only for chapters in one story
- **Chapter-specific**: Only for the current chapter

### 5. Template System

Templates provide reusable content patterns that can be expanded with AI assistance.

#### Template Structure
Templates use YAML frontmatter for metadata and support placeholders:

```yaml
---
title: "Character Introduction"
category: "characters"
description: "Generate a character introduction scene"
llmProfile: "creative"
---

## Meeting {{character.name}}

{{character.description}}

As {{viewpoint.character}} approached, {{llm:Describe the first meeting between these characters, focusing on {{character.keywords}} and the setting {{location.name}}.}}
```

#### Placeholder Types
- **Direct substitution**: `{{character.name}}` → "Eldara"
- **LLM expansion**: `{{llm:Generate a description...}}` → AI-generated content
- **Repository queries**: `{{characters:wizard}}` → Information about wizard characters
- **Oracle queries**: `{{oracle:Is this character friendly?}}` → Oracle response

### 6. Spark Tables

Spark Tables provide random keywords for inspiration when you're stuck.

#### Types of Sparks
- **Individual Spark**: A single random keyword
- **Spark Collection**: 2-3 related keywords
- **Themed Sparks**: Keywords from specific tables (gothic, sci-fi, etc.)

#### Using Sparks
- **Direct inspiration**: "The {{spark}} caught her attention"
- **Plot direction**: Use sparks to decide what happens next
- **Atmosphere**: Add sparks to set mood and tone
- **Problem solving**: When stuck, sparks provide new directions

## File Structure and Organization

### Standard Directory Layout

```
workspace/
├── .story-mode/
│   ├── library.json                    # Library configuration
│   ├── llm-profiles/                   # AI provider settings
│   │   ├── default.json
│   │   └── creative.json
│   ├── repositories/                   # Story elements
│   │   ├── characters/
│   │   ├── locations/
│   │   ├── objects/
│   │   └── situations/
│   ├── templates/                      # Reusable templates
│   │   ├── character-creation.md
│   │   └── scene-setup.md
│   └── spark-tables/                   # Custom keyword tables
│       ├── default.csv
│       └── gothic-horror.csv
├── my-story.md                         # Your story files
├── campaign-notes/                     # Organization folders
│   ├── session-1.md
│   └── session-2.md
└── world-building/
    ├── kingdoms.md
    └── timeline.md
```

### File Formats

- **Stories**: Markdown (.md) for easy editing and version control
- **Configuration**: JSON for structured data
- **Spark Tables**: CSV for easy editing in spreadsheets
- **Templates**: Markdown with YAML frontmatter

## Writing Workflows

### Discovery Writing
1. **Start with a premise** or opening sentence
2. **Use AI continuation** to explore possibilities  
3. **Ask Oracle questions** when facing decisions
4. **Let the story emerge** organically through AI collaboration

### Structured Planning
1. **Create repository items** for key elements first
2. **Use templates** for consistent scenes and encounters
3. **Plan with Oracle queries** for major plot points
4. **Execute with AI assistance** for detailed writing

### Hybrid Approach
1. **Plan key story beats** and major elements
2. **Use discovery writing** for detailed scenes
3. **Oracle for decisions** you haven't predetermined
4. **AI for inspiration** when creativity lags

## Best Practices

### Effective AI Collaboration
- **Be specific**: Give clear context about what you want
- **Maintain control**: Edit AI output to match your vision
- **Use incremental prompts**: Build up complex scenes gradually
- **Mix AI and human writing**: Don't rely entirely on either

### Oracle Mastery
- **Ask about uncertainty**: Don't ask questions you've already decided
- **Use keywords actively**: Let random keywords drive new directions
- **Follow the logic**: Even unwanted results can lead to great stories
- **Ask follow-up questions**: Drill down into interesting results

### Repository Management
- **Start simple**: Don't over-plan initially
- **Add details gradually**: Build complexity as stories develop
- **Use consistent keywords**: Help automatic injection work better
- **Link related items**: Reference other repository items within descriptions

### Organization and Workflow
- **Version control**: Use Git to track story development
- **Regular backups**: Stories are valuable creative work
- **Consistent naming**: Develop conventions for files and folders
- **Export options**: Keep copies in other formats for safety

## Common Patterns and Anti-Patterns

### Effective Patterns ✅
- **End sentences with direction**: "As she approached the door..."
- **Reference repository items**: Use character and location names
- **Ask Oracle about genuine uncertainty**: Let randomness drive creativity
- **Edit AI output**: Treat it as collaborative draft, not final text
- **Build incrementally**: Develop complexity over time

### Things to Avoid ❌
- **Over-relying on AI**: Maintain your creative voice and control
- **Ignoring Oracle results**: Even unwanted results can enhance stories
- **Creating too much upfront**: Build repository as you need it
- **Inconsistent naming**: Makes automatic features less effective
- **No version control**: Stories are too valuable to lose

## Integration with Other Tools

### Version Control (Git)
Story Mode files work perfectly with Git:
- **Track story development** with meaningful commits
- **Branch for different story directions** or experimental scenes
- **Collaborate with other writers** using standard Git workflows
- **Exclude sensitive files** (.gitignore API keys)

### External Editors
Since everything is plain text:
- **Write in any markdown editor** (Typora, Obsidian, etc.)
- **Use specialized writing software** (Scrivener export/import)
- **Mobile writing apps** for on-the-go creativity
- **Web editors** for cloud-based collaboration

### Publishing Workflows
- **Export to any format** using Pandoc or similar tools
- **Version control** provides complete revision history
- **Markdown compatibility** with most publishing platforms
- **Plain text portability** ensures long-term access

---

**Ready to dive deeper?** Explore our [feature guides](../features/) for detailed information about specific tools, or check out [workflow examples](../workflows/) to see how different users approach various types of creative projects.