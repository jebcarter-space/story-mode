# Spark Tables System - Implementation Guide

This document demonstrates the new Spark Tables system that provides configurable keyword generation for both Oracle and Sparks commands.

## Quick Start

### 1. VSCode Extension Commands

#### Sparks Command (`Cmd+Shift+K`)
Generates 2-3 inspiration keywords without Oracle structure:
```
**Sparks:** obsidian, whispering, clockwork
```

#### Continue with Sparks (`Cmd+Shift+Alt+K`)  
Generates sparks first, then continues with AI:
```
**Sparks:** mysterious, ancient, forbidden

The mysterious artifact lay buried beneath the ancient ruins, its forbidden knowledge...
```

### 2. Main App Settings

Navigate to Settings → Spark Tables to:
- Create custom keyword tables
- Import CSV files with theme-specific keywords  
- Configure table weights and enabled states
- Export/import table collections

### 3. Template System

Use spark placeholders in templates:
```markdown
## Scene Setup
**Atmosphere:** {{spark:gothic}}
**Key Elements:** {{sparks:horror,mystery:2}}
**Random Detail:** {{sparks:default:1}}
```

## Table Format

### CSV Structure
```csv
Gothic Horror
mysterious
ancient  
forbidden
cursed
haunted
decayed
```

First row = table name, following rows = keywords (one per line)

## Configuration Examples

### Example 1: Horror Campaign
```
Tables:
- default.csv (enabled, weight: 1)
- gothic-horror.csv (enabled, weight: 3) 
- haunting-sounds.csv (enabled, weight: 2)

Settings:
- Keyword Count: 3
- Oracle Keywords: 2  
- Include Table Names: false
- Allow Crossover: true
```

### Example 2: Multi-Genre Setup
```
Tables:
- fantasy.csv (enabled for Sparks only)
- steampunk.csv (enabled for Oracle only)
- cosmic-horror.csv (enabled for both)
- default.csv (disabled - using only custom)

Settings:
- Keyword Count: 2
- Oracle Keywords: 1
- Include Table Names: true  
- Allow Crossover: false
```

## Template Placeholder Reference

### Basic Syntax
- `{{spark:tableName}}` - Single keyword from specific table
- `{{sparks:table1,table2:count}}` - Multiple keywords from multiple tables
- `{{sparks:default:2}}` - Keywords from default table

### Examples
```markdown
# Character Creation
**Personality:** {{spark:personality}}
**Background:** {{sparks:background,history:2}}  
**Equipment:** {{spark:weapons}} and {{spark:armor}}

# Location Generation  
**Atmosphere:** {{sparks:gothic,haunted:3}}
**Notable Features:** 
- {{spark:architecture}}
- {{spark:lighting}}  
- {{spark:sounds}}

# Story Hooks
**Conflict:** {{sparks:conflict,mystery:1}}
**Stakes:** {{spark:consequences}}
**Twist:** {{spark:revelations}}
```

## Migration Notes

### Automatic Default Table
- Existing 798 hardcoded keywords moved to `default.csv`
- Auto-created on first run
- Oracle continues working exactly as before
- Zero breaking changes

### Backward Compatibility
- All existing Oracle functionality preserved
- Existing templates continue working
- No user action required for upgrade
- Default table can be disabled if desired

## Advanced Features

### Table Weights
Higher weights = more frequent selection:
- Weight 1: Standard frequency  
- Weight 5: 5x more likely to be selected
- Weight 10: 10x more likely (maximum)

### Usage Statistics
Track which tables and keywords are used most:
- Generation count per table
- Last used timestamps  
- Recent keyword history
- Most/least used table filtering

### File Watching
- CSV files watched for changes
- Tables reload automatically when modified
- Live updates during gameplay
- No restart required

## Best Practices

### Table Organization
```
.story-mode/spark-tables/
├── default.csv (general keywords)
├── atmosphere/
│   ├── gothic.csv
│   ├── steampunk.csv  
│   └── cosmic-horror.csv
├── characters/
│   ├── personalities.csv
│   ├── backgrounds.csv
│   └── quirks.csv
└── locations/
    ├── architecture.csv
    ├── lighting.csv
    └── sounds.csv
```

### Weight Guidelines
- **Default table**: Weight 1 (baseline)
- **Genre-specific**: Weight 2-3 (more thematic)
- **Campaign-specific**: Weight 3-5 (highly relevant)
- **Rare/special**: Weight 1 (occasional flavor)

### Keyword Quality
- Keep entries 1-3 words
- Avoid duplicates across tables
- Use evocative, inspiring words
- Test generation frequently
- Get feedback from players

## Community Resources

### Sharing Tables
Export your table collections:
1. Settings → Spark Tables → Export All
2. Share JSON file with community
3. Others can import via Import Tables

### Recommended Tables
- **D&D 5e Themes**: Fantasy archetypes and settings
- **Call of Cthulhu**: Cosmic horror atmosphere
- **Steampunk**: Victorian technology themes  
- **Cyberpunk**: Dystopian future elements
- **Western**: Frontier and outlaw themes

## Troubleshooting

### Common Issues

**No keywords generated**
- Check if tables are enabled
- Verify CSV format (header + entries)
- Ensure default table is available

**Duplicate keywords**  
- Review table overlap
- Adjust weights to balance selection
- Use categories to organize

**Performance issues**
- Limit total keywords < 10,000
- Reduce number of active tables
- Clear usage statistics periodically

### Support
- Check VSCode extension logs
- Review browser console in main app
- Verify CSV file encoding (UTF-8)
- Test with minimal configuration first