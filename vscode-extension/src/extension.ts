import * as vscode from 'vscode';
import { LLMService } from './services/llm-service';
import { RepositoryManager } from './services/repository-manager';
import { StoryModeExplorer } from './providers/story-mode-explorer';
import { TemplateManager } from './services/template-manager';
import { OracleService } from './services/oracle-service';
import { DiceService } from './services/dice-service';
import type { InlineContinuationOptions } from './types';

export function activate(context: vscode.ExtensionContext) {
    console.log('Story Mode extension is now active!');

    // Initialize services
    const repositoryManager = new RepositoryManager(context);
    const templateManager = new TemplateManager(context);
    const llmService = new LLMService(context);
    const oracleService = new OracleService();
    const diceService = new DiceService();

    // Initialize tree data provider
    const storyModeExplorer = new StoryModeExplorer(context, repositoryManager);
    vscode.window.createTreeView('storyModeExplorer', {
        treeDataProvider: storyModeExplorer,
        showCollapseAll: true
    });

    // Set context for when Story Mode is enabled
    vscode.commands.executeCommand('setContext', 'story-mode:enabled', true);

    // CORE COMMAND: Continue Text with AI
    const continueTextCommand = vscode.commands.registerCommand('story-mode.continueText', async () => {
        await handleContinueText(llmService, repositoryManager);
    });

    // Continue with Oracle consultation
    const continueWithOracleCommand = vscode.commands.registerCommand('story-mode.continueWithOracle', async () => {
        await handleContinueWithOracle(llmService, repositoryManager, oracleService);
    });

    // Query Oracle (standalone)
    const queryOracleCommand = vscode.commands.registerCommand('story-mode.queryOracle', async () => {
        await handleQueryOracle(oracleService);
    });

    // Roll Dice (inline)
    const rollDiceCommand = vscode.commands.registerCommand('story-mode.rollDice', async () => {
        await handleRollDice(diceService);
    });

    // Insert Template
    const insertTemplateCommand = vscode.commands.registerCommand('story-mode.insertTemplate', async () => {
        await handleInsertTemplate(templateManager, llmService);
    });

    // Open Repository Manager
    const openRepositoryCommand = vscode.commands.registerCommand('story-mode.openRepository', async () => {
        await repositoryManager.openRepositoryPanel();
    });

    // Create Library Structure
    const createLibraryCommand = vscode.commands.registerCommand('story-mode.createLibrary', async () => {
        await handleCreateLibrary();
    });

    // Register all commands
    context.subscriptions.push(
        continueTextCommand,
        continueWithOracleCommand,
        queryOracleCommand,
        rollDiceCommand,
        insertTemplateCommand,
        openRepositoryCommand,
        createLibraryCommand
    );
}

// CORE FUNCTIONALITY: Continue text with AI
async function handleContinueText(llmService: LLMService, repositoryManager: RepositoryManager) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    try {
        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating continuation...",
            cancellable: true
        }, async (progress, token) => {
            const document = editor.document;
            const position = editor.selection.active;
            
            // Get text from start to cursor
            const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            
            // Get repository context for current file
            const context = await repositoryManager.getContextForFile(document.uri);
            
            // Get relevant repository items
            const repositoryItems = await repositoryManager.getRelevantItems(textBeforeCursor, context);
            
            // Generate continuation
            const continuation = await llmService.generateContinuation(textBeforeCursor, {
                repositoryItems,
                maxContextLength: vscode.workspace.getConfiguration('storyMode').get('maxContextLength', 4000),
                includeRepositoryContext: true
            }, token);

            if (token.isCancellationRequested) {
                return;
            }

            // Insert continuation at cursor
            await editor.edit(editBuilder => {
                editBuilder.insert(position, continuation);
            });

            // Auto-save if enabled
            if (vscode.workspace.getConfiguration('storyMode').get('autoSave', true)) {
                await document.save();
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate continuation: ${error}`);
    }
}

// Continue with Oracle consultation
async function handleContinueWithOracle(llmService: LLMService, repositoryManager: RepositoryManager, oracleService: OracleService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    // First, get oracle response
    const question = await vscode.window.showInputBox({
        prompt: 'Ask the Oracle a question',
        placeHolder: 'Will the guard notice me?'
    });

    if (!question) return;

    const oracleResult = oracleService.queryOracle(question);
    
    // Insert oracle result
    const position = editor.selection.active;
    await editor.edit(editBuilder => {
        editBuilder.insert(position, `\n\n**Oracle:** ${question}\n**Answer:** ${oracleResult.answer} *(${oracleResult.roll})*\n\n`);
    });

    // Now continue with AI using the oracle result as context
    await handleContinueText(llmService, repositoryManager);
}

// Query Oracle (standalone)
async function handleQueryOracle(oracleService: OracleService) {
    const editor = vscode.window.activeTextEditor;
    
    const question = await vscode.window.showInputBox({
        prompt: 'Ask the Oracle a question',
        placeHolder: 'Will the guard notice me?'
    });

    if (!question) return;

    const result = oracleService.queryOracle(question);
    
    if (editor) {
        // Insert into editor if available
        const position = editor.selection.active;
        await editor.edit(editBuilder => {
            editBuilder.insert(position, `**Oracle:** ${question}\n**Answer:** ${result.answer} *(${result.roll})*\n\n`);
        });
    } else {
        // Show in notification if no editor
        vscode.window.showInformationMessage(`🔮 Oracle says: ${result.answer} (${result.roll})`);
    }
}

// Roll Dice (inline)
async function handleRollDice(diceService: DiceService) {
    const editor = vscode.window.activeTextEditor;
    
    const diceNotation = await vscode.window.showInputBox({
        prompt: 'Enter dice notation',
        placeHolder: '1d20, 3d6+2, 1d100',
        value: '1d20'
    });

    if (!diceNotation) return;

    const result = diceService.roll(diceNotation);
    
    if (editor) {
        // Insert into editor if available
        const position = editor.selection.active;
        await editor.edit(editBuilder => {
            editBuilder.insert(position, `🎲 ${diceNotation}: **${result.total}** ${result.breakdown ? `(${result.breakdown})` : ''}\n`);
        });
    } else {
        // Show in notification if no editor
        vscode.window.showInformationMessage(`🎲 ${diceNotation}: ${result.total} ${result.breakdown ? `(${result.breakdown})` : ''}`);
    }
}

// Insert Template
async function handleInsertTemplate(templateManager: TemplateManager, llmService: LLMService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    const templates = await templateManager.getTemplates();
    const templateNames = Object.keys(templates);
    
    if (templateNames.length === 0) {
        vscode.window.showErrorMessage('No templates found. Create templates in .story-mode/templates/');
        return;
    }

    const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
        placeHolder: 'Select a template to insert'
    });

    if (!selectedTemplate) return;

    const template = templates[selectedTemplate];
    const position = editor.selection.active;

    if (template.llmEnabled && template.llmInstructions) {
        // Process template with LLM
        try {
            const expandedContent = await llmService.expandTemplate(template, editor.document.getText());
            await editor.edit(editBuilder => {
                editBuilder.insert(position, expandedContent);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to expand template: ${error}`);
        }
    } else {
        // Insert template as-is
        await editor.edit(editBuilder => {
            editBuilder.insert(position, template.content);
        });
    }
}

// Create Library Structure
async function handleCreateLibrary() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Please open a workspace first');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri;
    const storyModeRoot = vscode.Uri.joinPath(workspaceRoot, '.story-mode');

    try {
        // Create directory structure
        await vscode.workspace.fs.createDirectory(storyModeRoot);
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'repositories'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'repositories', 'characters'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'repositories', 'locations'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'repositories', 'objects'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'templates'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'llm-profiles'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storyModeRoot, 'shelves'));

        // Create initial files
        const library = {
            shelves: {},
            settings: {
                created: Date.now(),
                updated: Date.now()
            }
        };
        
        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'library.json'),
            Buffer.from(JSON.stringify(library, null, 2))
        );

        // Create example repository item
        const exampleCharacter = `---
type: character
tags: [hero, brave, determined]
scope: library
forceContext: false
llmProfile: ""
---

# Example Hero

A brave and determined hero ready for adventure.

## Personality
- Courageous in the face of danger
- Loyal to friends and allies
- Driven by a strong moral compass

## Background
Born in a small village, they left home to seek their destiny...
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'characters', 'example-hero.md'),
            Buffer.from(exampleCharacter)
        );

        vscode.window.showInformationMessage('Story Mode library structure created! Check the .story-mode folder.');
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create library structure: ${error}`);
    }
}

export function deactivate() {}
