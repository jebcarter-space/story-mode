import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
    StoryModeChain, 
    ChainNode, 
    ChainTrigger, 
    ChainOutput,
    ChainLibrary,
    WorkflowExecution,
    WorkflowError,
    LLMNodeConfig,
    PromptNodeConfig,
    RetrieverNodeConfig
} from '../types';

/**
 * Workflow Service for LangChain Integration
 * 
 * This service provides the foundation for advanced AI workflow orchestration.
 * It manages workflow definitions, execution, and integration with existing Story Mode features.
 */
export class WorkflowService {
    private workflowLibrary: ChainLibrary = {};
    private activeExecutions: Map<string, WorkflowExecution> = new Map();
    private workflowPath: string;
    
    constructor(private context: vscode.ExtensionContext) {
        this.workflowPath = this.getWorkflowPath();
        this.loadWorkflows();
    }

    private getWorkflowPath(): string {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const storyModeDir = path.join(workspaceFolder.uri.fsPath, '.story-mode');
            const workflowDir = path.join(storyModeDir, 'workflows');
            if (!fs.existsSync(workflowDir)) {
                fs.mkdirSync(workflowDir, { recursive: true });
                this.createDefaultWorkflows(workflowDir);
            }
            return workflowDir;
        }
        return path.join(this.context.extensionPath, 'workflows');
    }

    /**
     * Load workflows from the .story-mode/workflows directory
     */
    private async loadWorkflows(): Promise<void> {
        try {
            if (!fs.existsSync(this.workflowPath)) {
                return;
            }

            const workflowFiles = fs.readdirSync(this.workflowPath)
                .filter(file => file.endsWith('.json'));

            for (const file of workflowFiles) {
                const filePath = path.join(this.workflowPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                try {
                    const workflow: StoryModeChain = JSON.parse(content);
                    this.workflowLibrary[workflow.id] = workflow;
                } catch (error) {
                    console.warn(`Failed to parse workflow file ${file}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to load workflows:', error);
        }
    }

    /**
     * Create default sample workflows for demonstration
     */
    private createDefaultWorkflows(workflowDir: string): void {
        const defaultWorkflows: StoryModeChain[] = [
            {
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
                        } as RetrieverNodeConfig,
                        connections: ['personality-node'],
                        label: 'Research'
                    },
                    {
                        id: 'personality-node',
                        type: 'llm',
                        config: {
                            profileId: 'default',
                            prompt: 'Generate detailed character personality based on research: {{research-output}}',
                            temperature: 0.8,
                            maxTokens: 300
                        } as LLMNodeConfig,
                        connections: ['validation-node'],
                        label: 'Personality Generation'
                    },
                    {
                        id: 'validation-node',
                        type: 'custom',
                        config: {
                            scriptPath: 'validate-character.js',
                            parameters: {}
                        },
                        connections: [],
                        label: 'Consistency Check'
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
                created: Date.now(),
                updated: Date.now(),
                enabled: true,
                version: '1.0.0'
            },
            {
                id: 'plot-analysis-basic',
                name: 'Plot Analyzer & Enhancer',
                description: 'Analyze story content and suggest plot developments',
                category: 'plot',
                nodes: [
                    {
                        id: 'context-analysis',
                        type: 'llm',
                        config: {
                            profileId: 'default',
                            prompt: 'Analyze the current story context for themes, tensions, and potential plot developments.',
                            temperature: 0.6,
                            maxTokens: 400
                        } as LLMNodeConfig,
                        connections: ['suggestion-node'],
                        label: 'Context Analysis'
                    },
                    {
                        id: 'suggestion-node',
                        type: 'llm',
                        config: {
                            profileId: 'default',
                            prompt: 'Based on analysis: {{context-analysis-output}}, suggest 3 compelling plot developments.',
                            temperature: 0.8,
                            maxTokens: 300
                        } as LLMNodeConfig,
                        connections: [],
                        label: 'Plot Suggestions'
                    }
                ],
                triggers: [
                    {
                        event: 'content_added',
                        conditions: { minWords: 100 },
                        enabled: false // Disabled by default to avoid overwhelming users
                    }
                ],
                outputs: [
                    {
                        id: 'plot-suggestions',
                        type: 'text',
                        format: 'markdown'
                    }
                ],
                created: Date.now(),
                updated: Date.now(),
                enabled: true,
                version: '1.0.0'
            }
        ];

        // Save default workflows
        defaultWorkflows.forEach(workflow => {
            const filePath = path.join(workflowDir, `${workflow.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
        });
    }

    /**
     * Get all available workflows
     */
    getWorkflows(): ChainLibrary {
        return { ...this.workflowLibrary };
    }

    /**
     * Get workflows by category
     */
    getWorkflowsByCategory(category: string): StoryModeChain[] {
        return Object.values(this.workflowLibrary)
            .filter(workflow => workflow.category === category && workflow.enabled);
    }

    /**
     * Execute a workflow manually
     */
    async executeWorkflow(chainId: string, context?: Record<string, any>): Promise<string> {
        const chain = this.workflowLibrary[chainId];
        if (!chain) {
            throw new Error(`Workflow ${chainId} not found`);
        }

        if (!chain.enabled) {
            throw new Error(`Workflow ${chainId} is disabled`);
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

        this.activeExecutions.set(executionId, execution);

        try {
            // For now, provide a basic simulation of workflow execution
            // Future implementation will integrate with actual LangChain
            await this.simulateWorkflowExecution(execution, chain, context);
            return executionId;
        } catch (error) {
            execution.status = 'failed';
            execution.errors.push({
                nodeId: execution.currentNode || 'unknown',
                error: error instanceof Error ? error.message : String(error),
                timestamp: Date.now(),
                recoverable: false
            });
            throw error;
        }
    }

    /**
     * Basic workflow execution simulation
     * This will be replaced with actual LangChain integration in future phases
     */
    private async simulateWorkflowExecution(
        execution: WorkflowExecution, 
        chain: StoryModeChain, 
        context?: Record<string, any>
    ): Promise<void> {
        execution.status = 'running';
        execution.progress = 10;

        // Simulate processing each node
        for (let i = 0; i < chain.nodes.length; i++) {
            const node = chain.nodes[i];
            execution.currentNode = node.id;
            execution.progress = ((i + 1) / chain.nodes.length) * 100;

            // Simulate node processing delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Mock results based on node type
            switch (node.type) {
                case 'llm':
                    execution.results[node.id] = `Generated content from LLM node ${node.label}`;
                    break;
                case 'retriever':
                    execution.results[node.id] = `Retrieved information for ${node.label}`;
                    break;
                case 'custom':
                    execution.results[node.id] = `Custom processing result for ${node.label}`;
                    break;
                default:
                    execution.results[node.id] = `Processed by ${node.type} node`;
            }
        }

        execution.status = 'completed';
        execution.endTime = Date.now();
        execution.progress = 100;
    }

    /**
     * Get execution status
     */
    getExecutionStatus(executionId: string): WorkflowExecution | undefined {
        return this.activeExecutions.get(executionId);
    }

    /**
     * Cancel a running workflow execution
     */
    async cancelExecution(executionId: string): Promise<void> {
        const execution = this.activeExecutions.get(executionId);
        if (execution && execution.status === 'running') {
            execution.status = 'cancelled';
            execution.endTime = Date.now();
        }
    }

    /**
     * Save a workflow to disk
     */
    async saveWorkflow(workflow: StoryModeChain): Promise<void> {
        workflow.updated = Date.now();
        this.workflowLibrary[workflow.id] = workflow;
        
        const filePath = path.join(this.workflowPath, `${workflow.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
    }

    /**
     * Delete a workflow
     */
    async deleteWorkflow(chainId: string): Promise<void> {
        delete this.workflowLibrary[chainId];
        const filePath = path.join(this.workflowPath, `${chainId}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    /**
     * Check if workflows can be triggered by an event
     */
    getTriggeredWorkflows(event: string, context?: Record<string, any>): StoryModeChain[] {
        return Object.values(this.workflowLibrary)
            .filter(workflow => 
                workflow.enabled &&
                workflow.triggers.some(trigger => 
                    trigger.enabled && 
                    trigger.event === event &&
                    this.evaluateTriggerConditions(trigger.conditions, context)
                )
            );
    }

    /**
     * Evaluate trigger conditions (basic implementation)
     */
    private evaluateTriggerConditions(
        conditions: Record<string, any> | undefined, 
        context: Record<string, any> | undefined
    ): boolean {
        if (!conditions || Object.keys(conditions).length === 0) {
            return true;
        }
        
        if (!context) {
            return false;
        }

        // Simple condition evaluation - can be enhanced later
        return Object.entries(conditions).every(([key, value]) => {
            return context[key] === value || 
                   (typeof value === 'number' && typeof context[key] === 'number' && context[key] >= value);
        });
    }
}