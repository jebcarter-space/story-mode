import { writable } from 'svelte/store';
import type { 
  StoryModeChain, 
  ChainLibrary, 
  WorkflowExecution,
  ChainNode,
  ChainTrigger,
  ChainOutput
} from '../types';

/**
 * Workflow Management Data Model
 * 
 * Provides workflow state management for LangChain integration foundation.
 * This will be expanded with full LangChain.js integration in future phases.
 */
export function createWorkflowManager() {
  const workflows = writable<ChainLibrary>({});
  const activeExecutions = writable<Map<string, WorkflowExecution>>(new Map());
  const isLoaded = writable<boolean>(false);

  // Load workflows from localStorage
  function loadWorkflows() {
    try {
      const stored = localStorage.getItem('story-mode-workflows');
      if (stored) {
        const parsed = JSON.parse(stored);
        workflows.set(parsed);
      } else {
        // Create default workflows if none exist
        const defaultWorkflows = createDefaultWorkflows();
        workflows.set(defaultWorkflows);
        saveWorkflows(defaultWorkflows);
      }
      isLoaded.set(true);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      workflows.set({});
      isLoaded.set(true);
    }
  }

  // Save workflows to localStorage
  function saveWorkflows(workflowData: ChainLibrary) {
    try {
      localStorage.setItem('story-mode-workflows', JSON.stringify(workflowData));
    } catch (error) {
      console.error('Failed to save workflows:', error);
    }
  }

  // Create default sample workflows
  function createDefaultWorkflows(): ChainLibrary {
    const now = Date.now();
    
    return {
      'character-development-basic': {
        id: 'character-development-basic',
        name: 'Character Development Pro',
        description: 'Multi-step character creation with personality generation and validation',
        category: 'character',
        nodes: [
          {
            id: 'research-node',
            type: 'retriever',
            config: {
              source: 'repository',
              query: 'character archetype background',
              maxResults: 5
            },
            connections: ['personality-node'],
            label: 'Research Character Archetypes',
            description: 'Retrieve relevant character background information from repository'
          },
          {
            id: 'personality-node',
            type: 'llm',
            config: {
              profileId: 'default',
              prompt: 'Generate a detailed character personality based on the following research: {{research-output}}\\n\\nCreate a well-rounded character with motivations, flaws, and distinctive traits.',
              temperature: 0.8,
              maxTokens: 400
            },
            connections: ['validation-node'],
            label: 'Generate Personality',
            description: 'Create character personality using LLM based on research'
          },
          {
            id: 'validation-node',
            type: 'custom',
            config: {
              scriptPath: 'validate-character.js',
              parameters: {
                checkConsistency: true,
                validateAgainstLore: true
              }
            },
            connections: [],
            label: 'Validate Consistency',
            description: 'Check character consistency against world lore and existing characters'
          }
        ],
        triggers: [
          {
            event: 'manual',
            conditions: {},
            enabled: true
          },
          {
            event: 'template_expansion',
            conditions: { templateCategory: 'character' },
            enabled: true
          }
        ],
        outputs: [
          {
            id: 'character-output',
            type: 'repository_item',
            target: 'Character',
            format: 'markdown'
          }
        ],
        created: now,
        updated: now,
        enabled: true,
        version: '1.0.0'
      },
      
      'plot-analysis-basic': {
        id: 'plot-analysis-basic',
        name: 'Plot Analyzer & Enhancer',
        description: 'Analyze story content and suggest compelling plot developments',
        category: 'plot',
        nodes: [
          {
            id: 'context-analysis',
            type: 'llm',
            config: {
              profileId: 'default',
              prompt: 'Analyze the current story context for themes, character tensions, unresolved conflicts, and potential plot developments. Identify what story elements need development or resolution.',
              temperature: 0.6,
              maxTokens: 500
            },
            connections: ['suggestion-node'],
            label: 'Analyze Story Context',
            description: 'Deep analysis of current story state and themes'
          },
          {
            id: 'suggestion-node',
            type: 'llm',
            config: {
              profileId: 'default',
              prompt: 'Based on this story analysis: {{context-analysis-output}}\\n\\nSuggest 3 compelling plot developments that would:\\n1. Advance the main story\\n2. Develop characters further\\n3. Create meaningful tension or resolution\\n\\nMake suggestions specific and actionable.',
              temperature: 0.8,
              maxTokens: 400
            },
            connections: [],
            label: 'Generate Plot Suggestions',
            description: 'Create specific plot development recommendations'
          }
        ],
        triggers: [
          {
            event: 'content_added',
            conditions: { minWords: 200 },
            enabled: false // Disabled by default to avoid overwhelming users
          },
          {
            event: 'manual',
            conditions: {},
            enabled: true
          }
        ],
        outputs: [
          {
            id: 'plot-suggestions',
            type: 'text',
            format: 'markdown'
          }
        ],
        created: now,
        updated: now,
        enabled: true,
        version: '1.0.0'
      },

      'world-building-simple': {
        id: 'world-building-simple',
        name: 'World Building Assistant',
        description: 'Automated world expansion based on existing lore and context',
        category: 'world',
        nodes: [
          {
            id: 'lore-analysis',
            type: 'retriever',
            config: {
              source: 'repository',
              query: 'location world culture history',
              maxResults: 10
            },
            connections: ['expansion-node'],
            label: 'Analyze Existing Lore',
            description: 'Gather existing world-building elements from repository'
          },
          {
            id: 'expansion-node',
            type: 'llm',
            config: {
              profileId: 'default',
              prompt: 'Based on existing world lore: {{lore-analysis-output}}\\n\\nExpand this world by creating:\\n1. A new location that fits the established setting\\n2. Cultural details that enhance the world\\n3. Historical events that add depth\\n\\nEnsure consistency with existing lore.',
              temperature: 0.7,
              maxTokens: 600
            },
            connections: [],
            label: 'Expand World Elements',
            description: 'Generate new world-building content consistent with existing lore'
          }
        ],
        triggers: [
          {
            event: 'manual',
            conditions: {},
            enabled: true
          }
        ],
        outputs: [
          {
            id: 'world-expansion',
            type: 'repository_item',
            target: 'Location',
            format: 'markdown'
          }
        ],
        created: now,
        updated: now,
        enabled: true,
        version: '1.0.0'
      }
    };
  }

  // Add a new workflow
  function addWorkflow(workflow: StoryModeChain) {
    workflows.update(current => {
      const updated = { ...current, [workflow.id]: workflow };
      saveWorkflows(updated);
      return updated;
    });
  }

  // Remove a workflow
  function removeWorkflow(id: string) {
    workflows.update(current => {
      const updated = { ...current };
      delete updated[id];
      saveWorkflows(updated);
      return updated;
    });
  }

  // Update a workflow
  function updateWorkflow(workflow: StoryModeChain) {
    workflow.updated = Date.now();
    workflows.update(current => {
      const updated = { ...current, [workflow.id]: workflow };
      saveWorkflows(updated);
      return updated;
    });
  }

  // Get workflows by category
  function getWorkflowsByCategory(category: string) {
    return workflows.subscribe(current => {
      return Object.values(current).filter(w => w.category === category && w.enabled);
    });
  }

  // Execute workflow (foundation - simulation only)
  async function executeWorkflow(chainId: string, context?: Record<string, any>): Promise<string> {
    return new Promise((resolve, reject) => {
      workflows.subscribe(current => {
        const workflow = current[chainId];
        if (!workflow) {
          reject(new Error(`Workflow ${chainId} not found`));
          return;
        }

        if (!workflow.enabled) {
          reject(new Error(`Workflow ${chainId} is disabled`));
          return;
        }

        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const execution: WorkflowExecution = {
          id: executionId,
          chainId,
          status: 'queued',
          startTime: Date.now(),
          currentNode: undefined,
          results: {},
          errors: [],
          progress: 0
        };

        // Add to active executions
        activeExecutions.update(current => {
          current.set(executionId, execution);
          return current;
        });

        // Simulate workflow execution
        setTimeout(async () => {
          try {
            execution.status = 'running';
            execution.progress = 10;

            // Simulate processing each node
            for (let i = 0; i < workflow.nodes.length; i++) {
              const node = workflow.nodes[i];
              execution.currentNode = node.id;
              execution.progress = ((i + 1) / workflow.nodes.length) * 100;

              // Simulate node processing delay
              await new Promise(resolve => setTimeout(resolve, 800));

              // Mock results based on node type
              switch (node.type) {
                case 'llm':
                  execution.results[node.id] = `Generated content from LLM node: ${node.label}`;
                  break;
                case 'retriever':
                  execution.results[node.id] = `Retrieved information for: ${node.label}`;
                  break;
                case 'custom':
                  execution.results[node.id] = `Custom processing result for: ${node.label}`;
                  break;
                default:
                  execution.results[node.id] = `Processed by ${node.type} node: ${node.label}`;
              }

              // Update execution state
              activeExecutions.update(current => {
                current.set(executionId, execution);
                return current;
              });
            }

            execution.status = 'completed';
            execution.endTime = Date.now();
            execution.progress = 100;

            activeExecutions.update(current => {
              current.set(executionId, execution);
              return current;
            });

            resolve(executionId);
          } catch (error) {
            execution.status = 'failed';
            execution.errors.push({
              nodeId: execution.currentNode || 'unknown',
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now(),
              recoverable: false
            });

            activeExecutions.update(current => {
              current.set(executionId, execution);
              return current;
            });

            reject(error);
          }
        }, 100);
      })();
    });
  }

  // Initialize workflows on first access
  loadWorkflows();

  return {
    workflows: { subscribe: workflows.subscribe },
    activeExecutions: { subscribe: activeExecutions.subscribe },
    isLoaded: { subscribe: isLoaded.subscribe },
    addWorkflow,
    removeWorkflow,
    updateWorkflow,
    executeWorkflow,
    getWorkflowsByCategory,
    loadWorkflows,
    saveWorkflows
  };
}