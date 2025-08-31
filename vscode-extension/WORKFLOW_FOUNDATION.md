# LangChain Workflow Integration - Foundation

This document describes the foundational architecture for LangChain-based workflow orchestration in Story Mode.

## Overview

The workflow system provides a foundation for advanced AI orchestration through chained operations. This initial implementation establishes the core types, services, and command structure needed for future full LangChain integration.

## Architecture

### Core Types

#### StoryModeChain
Represents a complete workflow with nodes, triggers, and outputs.

```typescript
interface StoryModeChain {
  id: string;
  name: string;
  description: string;
  category: 'character' | 'world' | 'plot' | 'gaming' | 'analysis';
  nodes: ChainNode[];
  triggers: ChainTrigger[];
  outputs: ChainOutput[];
  created: number;
  updated: number;
  enabled: boolean;
  version?: string;
}
```

#### ChainNode
Individual processing units in a workflow.

```typescript
interface ChainNode {
  id: string;
  type: 'llm' | 'prompt' | 'parser' | 'retriever' | 'memory' | 'custom';
  config: Record<string, any>;
  connections: string[]; // Connected node IDs
  position?: { x: number; y: number }; // For visual workflow builder
  label?: string;
  description?: string;
}
```

#### ChainTrigger
Defines when workflows are executed.

```typescript
interface ChainTrigger {
  event: 'manual' | 'content_added' | 'chapter_start' | 'oracle_roll' | 'template_expansion';
  conditions?: Record<string, any>;
  enabled: boolean;
}
```

## Workflow Categories

### Character Development
- Multi-step character creation
- Personality generation with research
- Consistency validation against world lore

### Plot Analysis
- Story context analysis
- Theme identification
- Plot development suggestions

### World Building
- Location relationship mapping
- Culture development workflows
- Historical consistency checking

### Gaming Enhancement
- Dynamic scenario generation
- Oracle interpretation chains
- Campaign state tracking

### Analysis Workflows
- Content categorization
- Relationship detection
- Contradiction identification

## File Structure

Workflows are stored as JSON files in `.story-mode/workflows/`:

```
.story-mode/
└── workflows/
    ├── character-development-basic.json
    ├── plot-analysis-basic.json
    ├── world-building-simple.json
    └── custom-workflow.json
```

## Commands

### story-mode.executeWorkflow (Ctrl+Shift+W)
Launch workflow execution with interactive picker.

### story-mode.manageWorkflows
Manage workflow library:
- View all workflows
- Import/export workflows  
- Create new workflows
- Delete workflows

### story-mode.workflowStatus
Show workflow system status and statistics.

## Sample Workflows

### Basic Character Development

```json
{
  "id": "character-development-basic",
  "name": "Character Development Pro", 
  "description": "Multi-step character creation with personality generation and validation",
  "category": "character",
  "nodes": [
    {
      "id": "research-node",
      "type": "retriever",
      "config": {
        "source": "repository",
        "query": "character archetype background",
        "maxResults": 5
      },
      "connections": ["personality-node"],
      "label": "Research"
    },
    {
      "id": "personality-node", 
      "type": "llm",
      "config": {
        "profileId": "default",
        "prompt": "Generate detailed character personality based on research: {{research-output}}",
        "temperature": 0.8,
        "maxTokens": 300
      },
      "connections": ["validation-node"],
      "label": "Personality Generation"
    }
  ],
  "triggers": [
    {
      "event": "manual",
      "enabled": true
    }
  ],
  "outputs": [
    {
      "id": "character-output",
      "type": "repository_item",
      "target": "Character",
      "format": "markdown"
    }
  ]
}
```

## Current Implementation

### Phase 1 (Foundation) - ✅ Implemented
- Core workflow types and interfaces
- Basic workflow service with storage
- Command structure and UI integration
- Sample workflow creation
- Manual workflow execution (simulated)

### Phase 2 (Future) - LangChain Integration
- Full LangChain.js integration
- Real node execution with LangChain primitives
- Advanced node types (vector stores, retrievers)
- Streaming workflow execution
- Error handling and recovery

### Phase 3 (Future) - Visual Builder
- Visual workflow builder UI
- Drag-and-drop node creation
- Real-time workflow validation
- Node configuration editors
- Workflow debugging tools

### Phase 4 (Future) - Community Features
- Workflow sharing and marketplace
- Workflow templates library
- Community-contributed node types
- Workflow versioning and updates
- Performance analytics

## Integration Points

### Template System
Workflows can be triggered when templates are expanded, enabling sophisticated template enhancement.

### Repository System  
Workflows can read from and write to the repository system, enabling automated content organization.

### Oracle System
Oracle queries can trigger analysis workflows for enhanced interpretation.

### LLM Profiles
Workflows can use different LLM profiles for different node types, optimizing performance and cost.

## Configuration

Workflows are automatically discovered from the `.story-mode/workflows/` directory. Create new workflows by adding properly formatted JSON files to this directory.

## Future Extensions

The foundation supports these planned enhancements:

- **Custom Node Types**: JavaScript-based custom processing nodes
- **External Integrations**: API calls to external services
- **Conditional Logic**: Complex decision trees within workflows
- **Loop Constructs**: Iterative processing workflows
- **Parallel Execution**: Concurrent node processing
- **Workflow Chaining**: Workflows that trigger other workflows

## Error Handling

The current implementation includes basic error handling for:
- Invalid workflow definitions
- Missing dependencies
- Execution failures
- Resource conflicts

Future phases will add sophisticated error recovery and debugging capabilities.

## Performance Considerations

- Workflows are lazily loaded on demand
- Execution results are cached where appropriate
- Long-running workflows show progress indicators
- Workflows can be cancelled during execution
- Resource usage is monitored and limited

## Security

- Workflows run in a controlled environment
- Custom node scripts are sandboxed
- External API access is controlled
- User data privacy is maintained throughout workflows

This foundation provides the architecture needed for sophisticated AI workflow orchestration while maintaining backward compatibility with existing Story Mode features.