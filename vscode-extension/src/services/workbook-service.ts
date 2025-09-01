import * as vscode from 'vscode';
import * as path from 'path';
import type { Workbook, Stack, WorkbookSystem } from '../types';

/**
 * WorkbookService manages workbook system for VSCode extension
 * Adapted from web app's createWorkbooks() function with file-based storage
 */
export class WorkbookService {
    private workbookSystem: WorkbookSystem = { stacks: {} };
    private workbookFilePath: vscode.Uri | null = null;
    private contextService: any = null; // Will be set later

    constructor(private context: vscode.ExtensionContext) {
        this.initializeWorkbookPath();
        this.loadWorkbooks();
    }

    /**
     * Set the context service for context-aware workbook filtering
     */
    setContextService(contextService: any): void {
        this.contextService = contextService;
    }

    /**
     * Initialize the path to workbooks.json file
     */
    private initializeWorkbookPath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const storyModeDir = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode');
        this.workbookFilePath = vscode.Uri.joinPath(storyModeDir, 'workbooks.json');
    }

    /**
     * Load workbooks from file system
     */
    private async loadWorkbooks(): Promise<void> {
        if (!this.workbookFilePath) {
            return;
        }

        try {
            const workbookData = await vscode.workspace.fs.readFile(this.workbookFilePath);
            const workbookJson = new TextDecoder().decode(workbookData);
            this.workbookSystem = JSON.parse(workbookJson);
        } catch (error) {
            // File doesn't exist or is invalid, start with empty system
            this.workbookSystem = { stacks: {} };
        }
    }

    /**
     * Save workbooks to file system
     */
    private async saveWorkbooks(): Promise<void> {
        if (!this.workbookFilePath) {
            return;
        }

        try {
            // Ensure .story-mode directory exists
            const parentDir = vscode.Uri.joinPath(this.workbookFilePath, '..');
            await vscode.workspace.fs.createDirectory(parentDir);

            // Write workbooks data
            const workbookJson = JSON.stringify(this.workbookSystem, null, 2);
            await vscode.workspace.fs.writeFile(this.workbookFilePath, new TextEncoder().encode(workbookJson));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save workbooks: ${error}`);
        }
    }

    /**
     * Get current workbook system
     */
    getWorkbookSystem(): WorkbookSystem {
        return this.workbookSystem;
    }

    /**
     * Create a new stack
     */
    async createStack(name: string): Promise<string> {
        const stackId = `stack_${Date.now()}`;
        const stack: Stack = {
            id: stackId,
            name,
            workbooks: {}
        };
        
        this.workbookSystem.stacks[stackId] = stack;
        await this.saveWorkbooks();
        return stackId;
    }

    /**
     * Delete a stack
     */
    async deleteStack(stackId: string): Promise<void> {
        delete this.workbookSystem.stacks[stackId];
        await this.saveWorkbooks();
    }

    /**
     * Create a new workbook
     */
    async createWorkbook(
        stackId: string, 
        name: string, 
        description?: string,
        tags: string[] = [],
        masterScope?: 'chapter' | 'book' | 'shelf' | 'library',
        masterScopeContext?: { chapterId?: string; bookId?: string; shelfId?: string }
    ): Promise<string> {
        const workbookId = `workbook_${Date.now()}`;
        const workbook: Workbook = {
            id: workbookId,
            name,
            description,
            stackId,
            masterScope,
            masterScopeContext,
            tags,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (this.workbookSystem.stacks[stackId]) {
            this.workbookSystem.stacks[stackId].workbooks[workbookId] = workbook;
            await this.saveWorkbooks();
        }
        
        return workbookId;
    }

    /**
     * Update an existing workbook
     */
    async updateWorkbook(stackId: string, workbookId: string, updates: Partial<Workbook>): Promise<void> {
        if (this.workbookSystem.stacks[stackId]?.workbooks[workbookId]) {
            this.workbookSystem.stacks[stackId].workbooks[workbookId] = {
                ...this.workbookSystem.stacks[stackId].workbooks[workbookId],
                ...updates,
                updatedAt: Date.now()
            };
            await this.saveWorkbooks();
        }
    }

    /**
     * Delete a workbook
     */
    async deleteWorkbook(stackId: string, workbookId: string): Promise<void> {
        if (this.workbookSystem.stacks[stackId]?.workbooks[workbookId]) {
            delete this.workbookSystem.stacks[stackId].workbooks[workbookId];
            await this.saveWorkbooks();
        }
    }

    /**
     * Get workbooks by tag
     */
    getWorkbooksByTag(tag: string): Workbook[] {
        const workbooks: Workbook[] = [];
        for (const stack of Object.values(this.workbookSystem.stacks)) {
            for (const workbook of Object.values(stack.workbooks)) {
                if (workbook.tags.includes(tag)) {
                    workbooks.push(workbook);
                }
            }
        }
        return workbooks;
    }

    /**
     * Get all workbooks
     */
    getAllWorkbooks(): Workbook[] {
        const workbooks: Workbook[] = [];
        for (const stack of Object.values(this.workbookSystem.stacks)) {
            for (const workbook of Object.values(stack.workbooks)) {
                workbooks.push(workbook);
            }
        }
        return workbooks;
    }

    /**
     * Get all tags used across workbooks
     */
    getAllTags(): string[] {
        const tags = new Set<string>();
        for (const stack of Object.values(this.workbookSystem.stacks)) {
            for (const workbook of Object.values(stack.workbooks)) {
                workbook.tags.forEach(tag => tags.add(tag));
            }
        }
        return Array.from(tags).sort();
    }

    /**
     * Auto-create default workbook when shelf is created
     */
    async createDefaultWorkbook(shelfId: string, shelfName: string): Promise<string> {
        // Check if a stack for this shelf already exists
        const existingStack = Object.values(this.workbookSystem.stacks).find(
            stack => stack.name === `${shelfName} Stacks`
        );
        
        let stackId: string;
        if (existingStack) {
            stackId = existingStack.id;
        } else {
            stackId = await this.createStack(`${shelfName} Stacks`);
        }

        // Create default workbook for this shelf
        return await this.createWorkbook(
            stackId,
            `${shelfName} Workbook`,
            `Default workbook for ${shelfName} shelf`,
            ['default'],
            'shelf',
            { shelfId }
        );
    }

    /**
     * Reload workbooks from file system
     */
    async reloadWorkbooks(): Promise<void> {
        await this.loadWorkbooks();
    }

    /**
     * Get workbooks filtered by current context
     */
    async getWorkbooksInCurrentScope(): Promise<Workbook[]> {
        if (!this.contextService) {
            return this.getAllWorkbooks(); // Fallback to all workbooks
        }

        try {
            const currentContext = await this.contextService.getCurrentContext();
            const allWorkbooks = this.getAllWorkbooks();
            
            return allWorkbooks.filter(workbook => 
                this.isWorkbookInCurrentScope(workbook, currentContext)
            );
        } catch (error) {
            console.warn('Failed to filter workbooks by context:', error);
            return this.getAllWorkbooks();
        }
    }

    /**
     * Check if a workbook is in the current scope
     */
    isWorkbookInCurrentScope(workbook: Workbook, currentContext?: { chapterId?: string; bookId?: string; shelfId?: string }): boolean {
        if (!workbook.masterScope || !workbook.masterScopeContext || !currentContext) {
            return true; // No scope restrictions or context
        }

        switch (workbook.masterScope) {
            case 'chapter':
                return workbook.masterScopeContext.chapterId === currentContext.chapterId;
            case 'book':
                return workbook.masterScopeContext.bookId === currentContext.bookId;
            case 'shelf':
                return workbook.masterScopeContext.shelfId === currentContext.shelfId;
            case 'library':
                return true; // Library scope is always active
            default:
                return true;
        }
    }

    /**
     * Get scope display name
     */
    getScopeDisplayName(scope: string): string {
        switch(scope) {
            case 'chapter': return 'Chapter';
            case 'book': return 'Book';
            case 'shelf': return 'Shelf';
            case 'library': return 'Library';
            default: return 'None';
        }
    }
}