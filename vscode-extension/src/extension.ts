import * as vscode from 'vscode';
import { LLMService } from './services/llm-service';
import { RepositoryManager } from './services/repository-manager';
import { StoryModeExplorer } from './providers/story-mode-explorer';
import { TemplateManager } from './services/template-manager';
import { OracleService } from './services/oracle-service';
import { DiceService } from './services/dice-service';
import { FileWatcher } from './services/file-watcher';
import { TemplatePicker } from './ui/template-picker';
import { PlaceholderResolver } from './lib/placeholder-resolver';
import { ContextIndicator } from './services/context-indicator';
import { ContextService } from './services/context-service';
import { SmartSuggestionsService } from './services/smart-suggestions';
import { ErrorHandlingService } from './services/error-handling';
import { SparkTableManager } from './services/spark-table-manager';
import { SparksService } from './services/sparks-service';
import { TableConfigurationPicker } from './ui/table-configuration-picker';
import { TableManagerWebview } from './ui/table-manager-webview';
import { TableAnalyticsService } from './services/table-analytics-service';
import { WorkflowService } from './services/workflow-service';
import { WorkbookService } from './services/workbook-service';
import { LibraryService } from './services/library-service';
import { ConfigurationWizard } from './ui/configuration-wizard';
import {
  handleCreateShelf,
  handleEditShelf,
  handleDeleteShelf,
  handleCreateBook,
  handleEditBook,
  handleDeleteBook,
  handleCreateChapter,
  handleEditChapter,
  handleDeleteChapter,
  handleOpenChapter
} from './commands/library-commands';
import type { InlineContinuationOptions, Template } from './types';

// Global reference to context indicator for streaming status
let globalContextIndicator: ContextIndicator | null = null;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Story Mode extension is now active!');

    // Validate setup first
    ErrorHandlingService.validateSetup();

    // Initialize services
    const repositoryManager = new RepositoryManager(context);
    const templateManager = new TemplateManager(context);
    const llmService = new LLMService(context);
    const sparkTableManager = new SparkTableManager(context);
    const analyticsService = new TableAnalyticsService(context);
    const workflowService = new WorkflowService(context);
    const workbookService = new WorkbookService(context);
    const libraryService = new LibraryService(context);
    const oracleService = new OracleService(sparkTableManager);
    const sparksService = new SparksService(sparkTableManager);
    const diceService = new DiceService();
    const templatePicker = new TemplatePicker(context);
    const tableConfigurationPicker = new TableConfigurationPicker(context, sparkTableManager);
    const tableManagerWebview = new TableManagerWebview(context, sparkTableManager, analyticsService);

    // Initialize context service
    const contextService = new ContextService(context);
    
    // Connect context service to repository manager
    repositoryManager.setContextService(contextService);
    
    // Connect context service to workbook service
    workbookService.setContextService(contextService);

    // Initialize context indicator (status bar)
    const contextIndicator = new ContextIndicator(context, repositoryManager);
    contextIndicator.setContextService(contextService);
    globalContextIndicator = contextIndicator;

    // Initialize smart suggestions
    const smartSuggestions = new SmartSuggestionsService(repositoryManager, templateManager);

    // Initialize configuration wizard
    const configurationWizard = new ConfigurationWizard(context);

    // Initialize file watcher
    const fileWatcher = new FileWatcher(context);
    fileWatcher.startWatching();

    // Initialize library service
    await libraryService.initialize();

    // Initialize tree data provider
    const storyModeExplorer = new StoryModeExplorer(context, repositoryManager, workbookService, libraryService);
    vscode.window.createTreeView('storyModeExplorer', {
        treeDataProvider: storyModeExplorer,
        showCollapseAll: true
    });

    // Connect file watcher to refresh tree view and repository cache
    fileWatcher.onDidChangeFiles((changedFiles) => {
        let shouldRefreshRepo = false;
        let shouldRefreshTree = false;
        let shouldReloadSparkTables = false;
        let shouldReloadWorkbooks = false;

        for (const uri of changedFiles) {
            if (fileWatcher.isRepositoryFile(uri)) {
                shouldRefreshRepo = true;
                shouldRefreshTree = true;
            } else if (fileWatcher.isTemplateFile(uri) || fileWatcher.isLLMProfileFile(uri)) {
                shouldRefreshTree = true;
            } else if (fileWatcher.isSparkTableFile(uri)) {
                shouldReloadSparkTables = true;
            } else if (fileWatcher.isWorkbookFile(uri)) {
                shouldReloadWorkbooks = true;
                shouldRefreshTree = true;
            }
        }

        if (shouldRefreshRepo) {
            repositoryManager.refreshRepository();
        }
        if (shouldRefreshTree) {
            storyModeExplorer.refresh();
        }
        if (shouldReloadSparkTables) {
            sparkTableManager.reloadTables();
        }
        if (shouldReloadWorkbooks) {
            workbookService.reloadWorkbooks();
        }
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
        await handleInsertTemplate(templateManager, llmService, repositoryManager, templatePicker);
    });

    // Continue with Template
    const continueWithTemplateCommand = vscode.commands.registerCommand('story-mode.continueWithTemplate', async () => {
        await handleContinueWithTemplate(templateManager, llmService, repositoryManager, templatePicker);
    });

    // Open Repository Manager - focus on tree view
    const openRepositoryCommand = vscode.commands.registerCommand('story-mode.openRepository', async () => {
        vscode.commands.executeCommand('storyModeExplorer.focus');
        vscode.window.showInformationMessage('Repository items are available in the Story Mode tree view');
    });

    // Create Library Structure
    const createLibraryCommand = vscode.commands.registerCommand('story-mode.createLibrary', async () => {
        await handleCreateLibrary();
    });

    // Show Smart Suggestions
    const showSuggestionsCommand = vscode.commands.registerCommand('story-mode.showSuggestions', async () => {
        await handleShowSuggestions(smartSuggestions);
    });

    // Generate Sparks
    const generateSparksCommand = vscode.commands.registerCommand('story-mode.generateSparks', async () => {
        await handleGenerateSparks(sparksService);
    });

    // Continue with Sparks
    const continueWithSparksCommand = vscode.commands.registerCommand('story-mode.continueWithSparks', async () => {
        await handleContinueWithSparks(sparksService, llmService, repositoryManager);
    });

    // Generate Sparks with Custom Table Selection
    const generateSparksCustomCommand = vscode.commands.registerCommand('story-mode.generateSparksCustom', async () => {
        await handleGenerateSparksCustom(sparksService);
    });

    // Continue with Sparks with Custom Table Selection  
    const continueWithSparksCustomCommand = vscode.commands.registerCommand('story-mode.continueWithSparksCustom', async () => {
        await handleContinueWithSparksCustom(sparksService, llmService, repositoryManager);
    });

    // Query Oracle with Custom Table Selection
    const queryOracleCustomCommand = vscode.commands.registerCommand('story-mode.queryOracleCustom', async () => {
        await handleQueryOracleCustom(oracleService);
    });

    // Configure Spark Tables
    const configureSparkTablesCommand = vscode.commands.registerCommand('story-mode.configureSparkTables', async () => {
        await handleConfigureSparkTables(tableConfigurationPicker);
    });

    // Open Visual Table Manager
    const openTableManagerCommand = vscode.commands.registerCommand('story-mode.openTableManager', async () => {
        await handleOpenTableManager(tableManagerWebview);
    });

    // Refresh Visual Table Manager (internal command)
    const refreshTableManagerCommand = vscode.commands.registerCommand('story-mode.refreshTableManager', async () => {
        tableManagerWebview.refresh();
    });

    // LangChain Workflow Commands
    const executeWorkflowCommand = vscode.commands.registerCommand('story-mode.executeWorkflow', async () => {
        await handleExecuteWorkflow(workflowService);
    });

    const manageWorkflowsCommand = vscode.commands.registerCommand('story-mode.manageWorkflows', async () => {
        await handleManageWorkflows(workflowService);
    });

    const workflowStatusCommand = vscode.commands.registerCommand('story-mode.workflowStatus', async () => {
        await handleWorkflowStatus(workflowService);
    });

    // Workbook Commands
    const createWorkbookCommand = vscode.commands.registerCommand('story-mode.createWorkbook', async (treeItem?: any) => {
        await handleCreateWorkbook(workbookService, storyModeExplorer, treeItem);
    });

    const editWorkbookCommand = vscode.commands.registerCommand('story-mode.editWorkbook', async (treeItem?: any) => {
        await handleEditWorkbook(workbookService, storyModeExplorer, treeItem);
    });

    const deleteWorkbookCommand = vscode.commands.registerCommand('story-mode.deleteWorkbook', async (treeItem?: any) => {
        await handleDeleteWorkbook(workbookService, storyModeExplorer, treeItem);
    });

    const manageWorkbooksCommand = vscode.commands.registerCommand('story-mode.manageWorkbooks', async () => {
        await handleManageWorkbooks(workbookService, storyModeExplorer);
    });

    const configurationWizardCommand = vscode.commands.registerCommand('story-mode.configurationWizard', async () => {
        await configurationWizard.showWizard();
    });

    // Library Commands
    const createShelfCommand = vscode.commands.registerCommand('story-mode.createShelf', async (treeItem?: any) => {
        await handleCreateShelf(libraryService, storyModeExplorer);
    });

    const editShelfCommand = vscode.commands.registerCommand('story-mode.editShelf', async (treeItem?: any) => {
        await handleEditShelf(libraryService, storyModeExplorer, treeItem);
    });

    const deleteShelfCommand = vscode.commands.registerCommand('story-mode.deleteShelf', async (treeItem?: any) => {
        await handleDeleteShelf(libraryService, storyModeExplorer, treeItem);
    });

    const createBookCommand = vscode.commands.registerCommand('story-mode.createBook', async (treeItem?: any) => {
        await handleCreateBook(libraryService, storyModeExplorer, treeItem);
    });

    const editBookCommand = vscode.commands.registerCommand('story-mode.editBook', async (treeItem?: any) => {
        await handleEditBook(libraryService, storyModeExplorer, treeItem);
    });

    const deleteBookCommand = vscode.commands.registerCommand('story-mode.deleteBook', async (treeItem?: any) => {
        await handleDeleteBook(libraryService, storyModeExplorer, treeItem);
    });

    const createChapterCommand = vscode.commands.registerCommand('story-mode.createChapter', async (treeItem?: any) => {
        await handleCreateChapter(libraryService, storyModeExplorer, treeItem);
    });

    const editChapterCommand = vscode.commands.registerCommand('story-mode.editChapter', async (treeItem?: any) => {
        await handleEditChapter(libraryService, storyModeExplorer, treeItem);
    });

    const deleteChapterCommand = vscode.commands.registerCommand('story-mode.deleteChapter', async (treeItem?: any) => {
        await handleDeleteChapter(libraryService, storyModeExplorer, treeItem);
    });

    const openChapterCommand = vscode.commands.registerCommand('story-mode.openChapter', async (treeItem?: any) => {
        await handleOpenChapter(libraryService, treeItem);
    });

    // Context Commands
    const setContextCommand = vscode.commands.registerCommand('story-mode.setContext', async () => {
        await contextService.showContextPicker();
    });

    const clearContextCommand = vscode.commands.registerCommand('story-mode.clearContext', async () => {
        await contextService.clearContextOverride();
    });

    // Register all commands
    context.subscriptions.push(
        continueTextCommand,
        continueWithOracleCommand,
        queryOracleCommand,
        rollDiceCommand,
        insertTemplateCommand,
        continueWithTemplateCommand,
        openRepositoryCommand,
        createLibraryCommand,
        showSuggestionsCommand,
        generateSparksCommand,
        continueWithSparksCommand,
        generateSparksCustomCommand,
        continueWithSparksCustomCommand,
        queryOracleCustomCommand,
        configureSparkTablesCommand,
        openTableManagerCommand,
        refreshTableManagerCommand,
        executeWorkflowCommand,
        manageWorkflowsCommand,
        workflowStatusCommand,
        createWorkbookCommand,
        editWorkbookCommand,
        deleteWorkbookCommand,
        manageWorkbooksCommand,
        configurationWizardCommand,
        // Library commands
        createShelfCommand,
        editShelfCommand,
        deleteShelfCommand,
        createBookCommand,
        editBookCommand,
        deleteBookCommand,
        createChapterCommand,
        editChapterCommand,
        deleteChapterCommand,
        openChapterCommand,
        // Context commands
        setContextCommand,
        clearContextCommand
    );
}

// CORE FUNCTIONALITY: Continue text with AI
async function handleContinueText(
    llmService: LLMService, 
    repositoryManager: RepositoryManager,
    template?: Template
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    // Check if streaming is enabled
    const streamingEnabled = vscode.workspace.getConfiguration('storyMode').get('enableStreaming', true);
    const streamingDelay = vscode.workspace.getConfiguration('storyMode').get('streamingDelay', 50);

    if (streamingEnabled) {
        return await handleStreamingContinueText(llmService, repositoryManager, streamingDelay, globalContextIndicator!, template);
    } else {
        return await handleNonStreamingContinueText(llmService, repositoryManager, template);
    }
}

// Streaming implementation
async function handleStreamingContinueText(
    llmService: LLMService,
    repositoryManager: RepositoryManager,
    streamingDelay: number,
    contextIndicator: ContextIndicator,
    template?: Template
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const cancellationTokenSource = new vscode.CancellationTokenSource();
        let insertedText = '';
        
        // Show cancellable progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating streaming response...",
            cancellable: true
        }, async (progress, token) => {
            // Cancel streaming if user cancels
            token.onCancellationRequested(() => {
                cancellationTokenSource.cancel();
            });

            const document = editor.document;
            const position = editor.selection.active;
            
            // Get text from start to cursor
            const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            
            // Get repository context for current file
            const context = await repositoryManager.getContextForFile(document.uri);
            
            // Get relevant repository items
            const repositoryItems = await repositoryManager.getRelevantItems(textBeforeCursor, context);
            
            // Start streaming status indicator
            contextIndicator?.startStreamingStatus();
            
            // Stream the response with real-time insertion using unified service
            return await llmService.generateStreamingContinuation(
                textBeforeCursor,
                {
                    onToken: async (token: string) => {
                        if (cancellationTokenSource.token.isCancellationRequested) return;
                        
                        insertedText += token;
                        
                        // Update streaming status
                        contextIndicator?.updateStreamingToken();
                        
                        // Insert token in editor with delay for smoother experience
                        await editor.edit(editBuilder => {
                            editBuilder.insert(position, token);
                        });
                        
                        // Move cursor to end of inserted text
                        const newPosition = new vscode.Position(
                            position.line,
                            position.character + insertedText.length
                        );
                        editor.selection = new vscode.Selection(newPosition, newPosition);
                        
                        // Optional delay for smoother streaming experience
                        if (streamingDelay > 0) {
                            await new Promise(resolve => setTimeout(resolve, streamingDelay));
                        }
                    },
                    onComplete: (fullText: string) => {
                        progress.report({ message: "Streaming complete" });
                        contextIndicator?.stopStreamingStatus();
                    },
                    onError: (error: Error) => {
                        const friendlyMessage = error.message.includes('using standard mode') 
                            ? error.message 
                            : `Streaming failed: ${error.message}`;
                        vscode.window.showErrorMessage(friendlyMessage);
                        contextIndicator?.updateStreamingError(error.message);
                        // Stop status after a delay to show the error
                        setTimeout(() => contextIndicator?.stopStreamingStatus(), 3000);
                    }
                },
                {
                    repositoryItems,
                    maxContextLength: 4000,
                    includeRepositoryContext: true,
                    template
                },
                cancellationTokenSource.token
            );
        });

        // Auto-save if enabled
        if (vscode.workspace.getConfiguration('storyMode').get('autoSave', true)) {
            await editor.document.save();
        }

    } catch (error) {
        // Ensure streaming status is stopped on any error
        contextIndicator?.stopStreamingStatus();
        
        if (error instanceof Error && error.message.includes('cancelled')) {
            vscode.window.showInformationMessage('Text generation cancelled');
        } else {
            vscode.window.showErrorMessage(`Failed to generate continuation: ${error}`);
        }
    }
}

// Non-streaming fallback implementation  
async function handleNonStreamingContinueText(
    llmService: LLMService,
    repositoryManager: RepositoryManager,
    template?: Template
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

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
                includeRepositoryContext: true,
                template
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

// Helper function to get LLM profile
async function getLLMProfile(profileKey: string): Promise<any | null> {
    if (!profileKey) return null;
    
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;

        const profilePath = vscode.Uri.joinPath(
            workspaceFolders[0].uri, 
            '.story-mode', 
            'llm-profiles', 
            `${profileKey}.json`
        );

        const profileData = await vscode.workspace.fs.readFile(profilePath);
        return JSON.parse(profileData.toString());
    } catch (error) {
        console.error(`Failed to load LLM profile ${profileKey}:`, error);
        return null;
    }
}

// Show Smart Suggestions
async function handleShowSuggestions(smartSuggestions: SmartSuggestionsService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    try {
        const text = editor.document.getText();
        const cursorPosition = editor.document.offsetAt(editor.selection.active);
        await smartSuggestions.showSuggestions(text, cursorPosition);
    } catch (error) {
        ErrorHandlingService.showError('Failed to get suggestions', error, 'Suggestions');
    }
}

// Continue with Oracle consultation
async function handleContinueWithOracle(
    llmService: LLMService, 
    repositoryManager: RepositoryManager, 
    oracleService: OracleService
) {
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
    
    // Insert oracle result with enhanced formatting
    const position = editor.selection.active;
    const formattedResult = oracleService.formatOracleResult(oracleResult);
    
    await editor.edit(editBuilder => {
        editBuilder.insert(position, `\n\n${formattedResult}\n`);
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
async function handleInsertTemplate(
    templateManager: TemplateManager, 
    llmService: LLMService, 
    repositoryManager: RepositoryManager, 
    templatePicker: TemplatePicker
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    const templates = await templateManager.getTemplates();
    
    // Use enhanced template picker
    const selection = await templatePicker.showTemplateSelector(templates);
    if (!selection) return;

    const { template, key } = selection;
    const position = editor.selection.active;
    const currentText = editor.document.getText();

    try {
        // Create placeholder resolver with current services
        const placeholderResolver = new PlaceholderResolver({
            llmService,
            repositoryManager,
            currentContext: currentText
        });

        // Resolve placeholders in template content
        let resolvedContent = await placeholderResolver.resolve(template.content);

        // If LLM expansion is enabled and we have instructions, do LLM expansion
        if (template.llmEnabled && template.llmInstructions) {
            const expandedContent = await llmService.expandTemplate(template, currentText);
            
            if (template.appendMode) {
                resolvedContent = resolvedContent + '\n\n' + expandedContent;
            } else {
                resolvedContent = expandedContent;
            }
        }

        // Insert the final content
        await editor.edit(editBuilder => {
            editBuilder.insert(position, resolvedContent);
        });

        vscode.window.showInformationMessage(`Template "${template.name}" inserted successfully!`);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to process template: ${error}`);
        
        // Fallback: insert raw template content
        await editor.edit(editBuilder => {
            editBuilder.insert(position, template.content);
        });
    }
}

// Continue with Template
async function handleContinueWithTemplate(
    templateManager: TemplateManager, 
    llmService: LLMService, 
    repositoryManager: RepositoryManager, 
    templatePicker: TemplatePicker
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    const templates = await templateManager.getTemplates();
    
    // Use enhanced template picker
    const selection = await templatePicker.showTemplateSelector(templates);
    if (!selection) return;

    const { template, key } = selection;
    const position = editor.selection.active;
    const currentText = editor.document.getText();

    try {
        // Create placeholder resolver with current services
        const placeholderResolver = new PlaceholderResolver({
            llmService,
            repositoryManager,
            currentContext: currentText
        });

        // Resolve placeholders in template content
        let resolvedContent = await placeholderResolver.resolve(template.content);

        // If LLM expansion is enabled and we have instructions, do LLM expansion
        if (template.llmEnabled && template.llmInstructions) {
            const expandedContent = await llmService.expandTemplate(template, currentText);
            
            if (template.appendMode) {
                resolvedContent = resolvedContent + '\n\n' + expandedContent;
            } else {
                resolvedContent = expandedContent;
            }
        }

        // Insert the template content
        await editor.edit(editBuilder => {
            editBuilder.insert(position, `\n\n${resolvedContent}\n\n`);
        });

        // Now continue with AI using the template result as context
        vscode.window.showInformationMessage(`Template "${template.name}" applied, continuing with AI...`);
        await handleContinueText(llmService, repositoryManager, template);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to process template: ${error}`);
        
        // Fallback: insert raw template content and continue
        await editor.edit(editBuilder => {
            editBuilder.insert(position, `\n\n${template.content}\n\n`);
        });
        
        await handleContinueText(llmService, repositoryManager, template);
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

        // Create comprehensive example library with Fantasy Adventures shelf and The Crystal Quest book
        const now = Date.now();
        const library = {
            shelves: {
                'fantasy-adventures': {
                    id: 'fantasy-adventures',
                    name: 'Fantasy Adventures',
                    bannerImage: '',
                    books: {
                        'the-crystal-quest': {
                            id: 'the-crystal-quest',
                            name: 'The Crystal Quest',
                            coverImage: '',
                            chapters: {
                                'chapter-1-the-beginning': {
                                    id: 'chapter-1-the-beginning',
                                    name: 'Chapter 1: The Beginning',
                                    content: {},
                                    createdAt: now,
                                    updatedAt: now
                                },
                                'chapter-2-the-journey': {
                                    id: 'chapter-2-the-journey',
                                    name: 'Chapter 2: The Journey',
                                    content: {},
                                    createdAt: now,
                                    updatedAt: now
                                }
                            },
                            lastAccessedChapter: 'chapter-1-the-beginning',
                            createdAt: now,
                            updatedAt: now
                        }
                    },
                    createdAt: now,
                    updatedAt: now
                }
            },
            settings: {
                created: now,
                updated: now,
                lastAccessedShelf: 'fantasy-adventures',
                lastAccessedBook: 'the-crystal-quest'
            }
        };
        
        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'library.json'),
            Buffer.from(JSON.stringify(library, null, 2))
        );

        // Create comprehensive character repository items (4 characters)
        
        // Character 1: Aria the Mage (Protagonist)
        const ariaTheMage = `---
type: character
tags: [protagonist, mage, aria, magic, wizard, hero]
scope: library
forceContext: false
llmProfile: ""
---

# Aria the Mage

A brilliant young mage with an insatiable curiosity about ancient magic and a destiny tied to crystal magic.

## Personality
- Intelligent and quick-witted
- Compassionate but sometimes impulsive
- Driven by a thirst for knowledge
- Loyal to her friends and mentors

## Background
Born in the Village of Brightwater, Aria discovered her magical abilities at a young age when she accidentally made flowers bloom with her touch. She was trained by the Elder Sage and has become one of the most promising mages of her generation.

## Abilities
- Crystal magic specialist
- Healing spells
- Elemental manipulation (particularly light magic)
- Ancient text translation

## Equipment
- Crystal staff inherited from her grandmother
- Spellbook of ancient incantations
- Protective amulet from Elder Sage
- Traveling robes with magical protection enchantments
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'characters', 'aria-the-mage.md'),
            Buffer.from(ariaTheMage)
        );

        // Character 2: Lord Darkmore (Antagonist)
        const lordDarkmore = `---
type: character
tags: [antagonist, darkmore, villain, dark-lord, evil, shadow]
scope: library
forceContext: false
llmProfile: ""
---

# Lord Darkmore

A powerful dark sorcerer who seeks to corrupt the crystal magic for his own evil purposes and rule over all lands.

## Personality
- Ruthlessly ambitious
- Manipulative and cunning
- Believes might makes right
- Harbors ancient grudges against the light mages

## Background
Once a promising student alongside Elder Sage, Darkmore was corrupted by forbidden shadow magic. He was banished from the magical community but has spent decades growing his power and building his dark army from his fortress in the Dark Tower.

## Abilities
- Shadow magic mastery
- Mind manipulation and control
- Dark crystal corruption
- Necromancy and undead summoning

## Equipment
- Staff of Shadows (corrupted crystal focus)
- Armor of Dark Steel
- Crown of Mind Control
- Ancient tomes of forbidden magic
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'characters', 'lord-darkmore.md'),
            Buffer.from(lordDarkmore)
        );

        // Character 3: Finn the Rogue (Supporting)
        const finnTheRogue = `---
type: character
tags: [rogue, finn, thief, scout, supporting, agile]
scope: library
forceContext: false
llmProfile: ""
---

# Finn the Rogue

A skilled scout and former street thief who becomes Aria's loyal companion and provides crucial reconnaissance and stealth support.

## Personality
- Quick-witted and street-smart
- Loyal once trust is earned
- Humorous and lighthearted to mask deeper insecurities
- Values freedom above material wealth

## Background
Grew up as an orphan on the streets, surviving by wit and stealth. Initially tried to pickpocket Aria but was caught by her magic. Instead of turning him in, she offered him friendship and a chance for a better life, earning his unwavering loyalty.

## Abilities
- Master of stealth and infiltration
- Lock picking and trap detection
- Archery and dual-wielding daggers
- Urban navigation and information gathering

## Equipment
- Twin enchanted daggers
- Composite longbow
- Thieves' tools and lockpicks
- Cloak of Blending (minor invisibility)
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'characters', 'finn-the-rogue.md'),
            Buffer.from(finnTheRogue)
        );

        // Character 4: Elder Sage (Supporting)
        const elderSage = `---
type: character
tags: [elder, sage, mentor, wisdom, teacher, old-mage]
scope: library
forceContext: false
llmProfile: ""
---

# Elder Sage

The wise and ancient mentor who trained Aria in the ways of magic and holds crucial knowledge about the crystal magic's true potential.

## Personality
- Deeply wise and patient
- Speaks in riddles and metaphors
- Protective of his students
- Carries the weight of past mistakes

## Background
One of the last surviving members of the original Crystal Mage order, Elder Sage witnessed the corruption of Lord Darkmore and has spent his life preparing the next generation to face the coming darkness. He discovered Aria's potential and has been secretly grooming her for her destiny.

## Abilities
- Master of all magical disciplines
- Prophetic visions and scrying
- Ancient lore and crystal magic history
- Protective ward creation

## Equipment
- Staff of Ancient Woods (predates crystal magic)
- Robes of the Crystal Order
- Scrying crystal for visions
- Library of ancient magical tomes
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'characters', 'elder-sage.md'),
            Buffer.from(elderSage)
        );

        // Create comprehensive location repository items (4 locations)
        
        // Location 1: Crystal Caves
        const crystalCaves = `---
type: location
tags: [caves, crystals, magical, underground, ancient]
scope: library
forceContext: false
llmProfile: ""
---

# Crystal Caves

Ancient underground caverns filled with naturally occurring magic crystals that pulse with inner light and hold immense magical power.

## Description
Deep beneath the mountains, these vast caverns stretch for miles in every direction. The walls are lined with crystals of every color imaginable, each one humming with magical energy. The air itself seems to shimmer with power, and soft, multicolored light emanates from the crystal formations.

## Notable Features
- Central Crystal Chamber with massive formation
- Echoing corridors that amplify magical energy
- Underground pools that reflect crystal light
- Hidden passages leading to ancient crystal workshops
- Magical creatures that have been changed by crystal exposure

## Dangers
- Unstable magical fields that can overload spellcasters
- Crystal golems that guard important formations
- Maze-like passages that can trap explorers
- Raw magical energy that can corrupt those unprepared
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'locations', 'crystal-caves.md'),
            Buffer.from(crystalCaves)
        );

        // Location 2: Mystic Forest
        const mysticForest = `---
type: location
tags: [forest, mystic, magical, trees, nature, ancient]
scope: library
forceContext: false
llmProfile: ""
---

# Mystic Forest

An ancient woodland where magic has seeped into every tree and leaf, creating a living ecosystem that responds to the emotions and intentions of those who enter.

## Description
Towering ancient trees with silver bark and leaves that shimmer between green and gold create a dense canopy that filters sunlight into dancing patterns. The forest floor is covered in luminescent moss and flowers that bloom in impossible colors. Whispered voices seem to come from the trees themselves.

## Notable Features
- Talking trees that offer wisdom to the worthy
- Paths that change based on the traveler's need
- Clearings where time moves differently
- Ancient druid circles with powerful magic
- Wildlife that can communicate telepathically

## Inhabitants
- Forest sprites and nature spirits
- Wise old druids who guard ancient secrets
- Magical creatures seeking sanctuary
- Lost travelers from across time and space
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'locations', 'mystic-forest.md'),
            Buffer.from(mysticForest)
        );

        // Location 3: Dark Tower
        const darkTower = `---
type: location
tags: [tower, fortress, dark, evil, stronghold, darkmore]
scope: library
forceContext: false
llmProfile: ""
---

# Dark Tower

Lord Darkmore's imposing fortress of black stone that rises from a barren wasteland, serving as the stronghold for his dark magic and undead army.

## Description
A massive spire of obsidian-black stone that pierces the sky like a dagger. The tower is surrounded by a desolate wasteland where nothing grows, and the very air seems thick with malevolent energy. Dark clouds perpetually swirl around its peak, and lightning occasionally illuminates its angular architecture.

## Notable Features
- Throne room at the apex with views of all surrounding lands
- Dungeons filled with corrupted crystal formations
- Laboratory for dark magical experiments
- Armory containing weapons of shadow and corruption
- Portal chambers for summoning and transportation

## Defenses
- Undead guardians patrolling every level
- Magical wards that repel light magic
- Maze of deadly traps and illusions
- Corrupted crystal barriers
- Flying dark creatures as sentries
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'locations', 'dark-tower.md'),
            Buffer.from(darkTower)
        );

        // Location 4: Village of Brightwater
        const villageOfBrightwater = `---
type: location
tags: [village, peaceful, home, brightwater, starting-point]
scope: library
forceContext: false
llmProfile: ""
---

# Village of Brightwater

A small, peaceful village known for its clear spring waters and the birthplace of Aria the Mage, representing hope and innocence in a world threatened by darkness.

## Description
Nestled in a green valley beside a crystal-clear stream, Brightwater is a collection of cozy cottages with thatched roofs and flower gardens. The village is famous for its magical spring that bubbles up from underground sources and is said to have minor healing properties.

## Notable Features
- The Brightwater Spring at the village center
- Elder Sage's cottage and magical library
- Village inn "The Laughing Brook"
- Market square where traveling merchants gather
- Ancient stone circle on the hill overlooking the village

## Inhabitants
- Simple folk who live in harmony with nature
- Local blacksmith who creates basic magical implements
- Herbalist who knows the properties of magical plants
- Village elder who maintains local traditions
- Children who show early magical potential
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'locations', 'village-of-brightwater.md'),
            Buffer.from(villageOfBrightwater)
        );

        // Create comprehensive situation repository items (4 scenes + 4 plot points)
        
        // Scene 1: The Quest Begins
        const questBegins = `---
type: situation
tags: [scene, quest-begins, starting-scene, adventure, call-to-adventure]
scope: library
forceContext: false
llmProfile: ""
---

# The Quest Begins

The opening scene where Aria receives her quest and sets out from the Village of Brightwater to find the legendary Crystal of Power.

## Setup
Aria is studying ancient texts in Elder Sage's cottage when she discovers a prophecy about a great crystal that can either save the world or destroy it. Dark omens suggest Lord Darkmore is already searching for it.

## Key Elements
- Elder Sage reveals the prophecy and Aria's role
- Warning signs of Darkmore's growing power
- Aria's decision to leave her comfortable life
- Meeting with Finn the Rogue who offers to guide her
- Preparation for the dangerous journey ahead

## Mood
Mixture of excitement and trepidation, hope tinged with fear, the weight of destiny settling on young shoulders.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'the-quest-begins.md'),
            Buffer.from(questBegins)
        );

        // Scene 2: Forest Encounter
        const forestEncounter = `---
type: situation
tags: [scene, forest-encounter, mystic-forest, action, adventure]
scope: library
forceContext: false
llmProfile: ""
---

# Forest Encounter

A pivotal scene where Aria and Finn encounter magical creatures and face their first real test in the Mystic Forest.

## Setup
While traveling through the Mystic Forest, the party encounters both helpful forest spirits and dangerous corrupted creatures sent by Lord Darkmore's influence.

## Key Elements
- Test of Aria's growing magical abilities
- Finn proves his worth as a scout and protector
- Meeting with forest spirits who offer cryptic guidance
- Battle with shadow creatures tracking them
- Discovery of ancient forest magic that aids their quest

## Mood
Wonder at the forest's beauty contrasted with lurking danger, growing confidence in abilities, strengthening bond between companions.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'forest-encounter.md'),
            Buffer.from(forestEncounter)
        );

        // Scene 3: Crystal Discovery
        const crystalDiscovery = `---
type: situation
tags: [scene, crystal-discovery, crystal-caves, magical, revelation]
scope: library
forceContext: false
llmProfile: ""
---

# Crystal Discovery

The climactic scene where Aria finally reaches the Crystal Caves and discovers the true nature of her power and destiny.

## Setup
Deep within the Crystal Caves, Aria and Finn find the legendary Crystal of Power, but discover it's not what they expected - it's a test that will either awaken Aria's true potential or destroy her.

## Key Elements
- Navigation through the dangerous Crystal Caves
- Solving ancient puzzles to reach the central chamber
- Aria's magical connection with the crystal formations
- Revelation about her family's connection to crystal magic
- The crystal's test of worthiness and character

## Mood
Awe and wonder at the crystal formations, tension from unknown dangers, triumph mixed with the weight of great responsibility.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'crystal-discovery.md'),
            Buffer.from(crystalDiscovery)
        );

        // Scene 4: Final Confrontation
        const finalConfrontation = `---
type: situation
tags: [scene, final-confrontation, dark-tower, climax, battle]
scope: library
forceContext: false
llmProfile: ""
---

# Final Confrontation

The epic final battle where Aria, now empowered by crystal magic, faces Lord Darkmore in his Dark Tower to prevent him from corrupting the world.

## Setup
With her newfound powers and loyal companions, Aria storms the Dark Tower to confront Lord Darkmore before he can complete his ritual to corrupt all crystal magic in the world.

## Key Elements
- Infiltration of the heavily guarded Dark Tower
- Battle through undead minions and dark magic traps
- Emotional confrontation with Darkmore revealing their shared history
- Epic magical duel using light versus shadow magic
- Resolution that saves the world but comes at great personal cost

## Mood
High tension and epic scope, the weight of the world's fate, courage in the face of overwhelming odds, bittersweet victory.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'final-confrontation.md'),
            Buffer.from(finalConfrontation)
        );

        // Plot Point 1: Call to Adventure
        const callToAdventure = `---
type: situation
tags: [plot-point, call-to-adventure, inciting-incident, prophecy]
scope: library
forceContext: false
llmProfile: ""
---

# Call to Adventure

The fundamental plot point where Aria is called from her ordinary life to embark on a extraordinary quest to save the world.

## Story Function
This plot point establishes the central conflict and gives the protagonist a clear goal that will drive the entire narrative forward.

## Key Components
- Discovery of the ancient prophecy about the Crystal of Power
- Realization that Lord Darkmore is seeking the same crystal
- Elder Sage's revelation about Aria's special heritage
- The moral imperative to prevent catastrophe
- Aria's internal struggle between safety and duty

## Narrative Impact
Transforms Aria from a student mage into a hero with a world-saving mission, establishing the story's central quest and raising the stakes to global consequences.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'call-to-adventure.md'),
            Buffer.from(callToAdventure)
        );

        // Plot Point 2: Meeting the Mentor
        const meetingTheMentor = `---
type: situation
tags: [plot-point, meeting-mentor, elder-sage, guidance, wisdom]
scope: library
forceContext: false
llmProfile: ""
---

# Meeting the Mentor

The crucial plot point where Elder Sage provides Aria with wisdom, training, and magical tools necessary for her quest.

## Story Function
Provides the protagonist with knowledge, skills, and confidence needed to face the challenges ahead while establishing the mentor-student relationship.

## Key Components
- Elder Sage's revelation of Aria's true magical heritage
- Training in advanced crystal magic techniques
- Gifting of protective magical items and ancient knowledge
- Sharing of crucial information about Lord Darkmore's weaknesses
- Emotional preparation for the dangers ahead

## Narrative Impact
Elevates Aria's capabilities and confidence while creating an emotional anchor to her past that will motivate her throughout the journey.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'meeting-the-mentor.md'),
            Buffer.from(meetingTheMentor)
        );

        // Plot Point 3: Crossing the Threshold
        const crossingThreshold = `---
type: situation
tags: [plot-point, crossing-threshold, leaving-home, commitment, transformation]
scope: library
forceContext: false
llmProfile: ""
---

# Crossing the Threshold

The pivotal plot point where Aria leaves the familiar world of Brightwater behind and fully commits to her dangerous quest.

## Story Function
Marks the point of no return where the protagonist fully enters the adventure world and accepts the challenges that lie ahead.

## Key Components
- Final farewell to the Village of Brightwater and normal life
- Crossing into the dangerous wilderness with Finn
- First encounter with real magical threats
- Commitment to the quest despite fear and uncertainty
- Beginning of true character growth and transformation

## Narrative Impact
Establishes that this is now a true adventure with real stakes, moving beyond preparation into actual danger and growth.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'crossing-the-threshold.md'),
            Buffer.from(crossingThreshold)
        );

        // Plot Point 4: The Ordeal
        const theOrdeal = `---
type: situation
tags: [plot-point, ordeal, greatest-test, crisis, transformation]
scope: library
forceContext: false
llmProfile: ""
---

# The Ordeal

The most challenging plot point where Aria faces her greatest test and must overcome seemingly impossible odds to prove her worth.

## Story Function
The crisis point that tests everything the protagonist has learned and forces them to dig deep to find the strength to continue.

## Key Components
- Aria's magical abilities pushed to their absolute limits
- Confrontation with her deepest fears and insecurities
- Moment where failure seems inevitable and hope is lost
- Discovery of inner strength she didn't know she possessed
- Transformation from student to true magical master

## Narrative Impact
Creates the lowest point of the journey that makes the eventual triumph more meaningful and demonstrates complete character growth.
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'situations', 'the-ordeal.md'),
            Buffer.from(theOrdeal)
        );

        // Create comprehensive Character Template
        const characterTemplate = `---
name: "Character Profile Template"
description: "Complete character profile template for creating detailed NPCs and protagonists"
category: "Characters"
llmEnabled: true
llmInstructions: "Generate a complete character profile with physical description, personality traits, background, motivations, and role in the story"
llmProfile: ""
appendMode: false
repositoryTarget: "Character"
---

# {{character_name}} {{surname}}

## Basic Information
- **Full Name:** {{character_name}} {{surname}}
- **Age:** {{rand 16-70}}
- **Gender:** [Choose: Male/Female/Non-binary/Other]
- **Race/Species:** [Human/Elf/Dwarf/etc.]
- **Occupation:** {{profession}}
- **Social Status:** {{roll 1d6}} (1-2: Common, 3-4: Middle Class, 5-6: Noble)

## Physical Description
{{#llm}}Create a detailed physical description including height, build, distinctive features, clothing style, and any notable characteristics{{/llm}}

- **Height:** {{rand 5.0-6.5}} feet
- **Build:** [Slim/Athletic/Average/Stocky/Heavy]
- **Hair:** {{hair_color}}, {{hair_style}}
- **Eyes:** {{eye_color}}
- **Distinctive Features:** [Scars, tattoos, unusual features]

## Personality
{{#llm}}Develop a complex personality including core traits, flaws, fears, and quirks that make this character memorable and three-dimensional{{/llm}}

### Core Traits
- Primary: {{personality_trait}}
- Secondary: {{personality_trait}}
- Hidden Trait: [Something not immediately obvious]

### Motivations & Goals
- **Primary Goal:** [What drives them most]
- **Secret Desire:** [What they secretly want]
- **Greatest Fear:** [What terrifies them most]

## Background & History
{{#llm}}Create a compelling backstory that explains how this character became who they are, including formative experiences and relationships{{/llm}}

### Personal History
- **Birthplace:** {{location}}
- **Family:** [Parents, siblings, spouse, children]
- **Education/Training:** [How they learned their skills]
- **Significant Events:** [3-5 life-changing moments]

## Abilities & Skills
- **Primary Skill:** {{skill}} (Expert)
- **Secondary Skills:** {{skill}}, {{skill}} (Proficient)
- **Weapon of Choice:** {{weapon}}
- **Special Abilities:** [Magic, unique talents, etc.]
- **Weaknesses:** [Physical or mental limitations]

## Relationships & Connections
- **Allies:** [Who supports them]
- **Enemies:** [Who opposes them]
- **Romantic Interest:** [Current or potential]
- **Mentor/Student:** [Who taught/teaches them]

## Role in Story
- **Narrative Function:** [Hero, Villain, Mentor, etc.]
- **Character Arc:** [How they change/grow]
- **Key Scenes:** [Where they're most important]
- **Potential Conflicts:** [Internal and external struggles]

## Equipment & Possessions
- **Weapons:** {{weapon}}
- **Armor/Protection:** {{armor}}
- **Important Items:** {{magical_item}}
- **Wealth:** {{roll 1d100}} gold coins equivalent
- **Residence:** [Where they live]

## Notes & Hooks
{{#llm}}Add interesting plot hooks, secrets, or potential story connections that could involve this character in adventures{{/llm}}

- **Secret:** [Something they hide]
- **Plot Hooks:** [3 ways to involve them in stories]
- **Rumors:** [What people say about them]
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'templates', 'character-profile-template.md'),
            Buffer.from(characterTemplate)
        );

        // Create comprehensive Location Template  
        const locationTemplate = `---
name: "Location Description Template"
description: "Detailed location template for creating immersive settings and environments"
category: "Locations"
llmEnabled: true
llmInstructions: "Generate a vivid, immersive location description with atmosphere, history, inhabitants, and adventure potential"
llmProfile: ""
appendMode: false
repositoryTarget: "Location"
---

# {{location_name}}

## Basic Information
- **Type:** [City, Village, Dungeon, Wilderness, etc.]
- **Size:** {{roll 1d6}} (1-2: Small, 3-4: Medium, 5-6: Large)
- **Population:** {{rand 50-5000}} inhabitants
- **Climate:** {{climate}}
- **Terrain:** {{terrain_type}}

## Overview & Atmosphere
{{#llm}}Create an evocative overview that captures the location's essence, mood, and first impression for visitors{{/llm}}

### First Impressions
- **Approach:** [What visitors see arriving]
- **Sounds:** {{roll 1d4}} distinct ambient sounds
- **Smells:** [Characteristic scents and aromas]
- **Overall Mood:** {{atmosphere}}

## Physical Description
{{#llm}}Provide detailed descriptions of the location's layout, architecture, notable landmarks, and environmental features{{/llm}}

### Layout & Architecture
- **Central Feature:** [Main landmark or focal point]
- **Building Style:** [Architectural characteristics]
- **Materials:** [Primary construction materials]
- **Condition:** {{roll 1d6}} (1-2: Poor, 3-4: Fair, 5-6: Excellent)

### Notable Locations
1. **{{building_type}}** - [Important building/area]
2. **{{landmark}}** - [Significant landmark]
3. **{{gathering_place}}** - [Where people meet]

## History & Background
{{#llm}}Develop the location's history, including its founding, major events, and how it became what it is today{{/llm}}

### Historical Timeline
- **Founded:** [When and by whom]
- **Major Events:** [3-5 significant historical moments]
- **Current Era:** [Recent developments]
- **Legends:** [Myths and stories told about this place]

## Inhabitants & Culture
{{#llm}}Describe the people who live here, their customs, social structure, and daily life{{/llm}}

### Population
- **Primary Race/Species:** {{race}}
- **Social Structure:** [How society is organized]
- **Common Occupations:** {{profession}}, {{profession}}, {{profession}}
- **Cultural Traits:** [Customs, traditions, values]

### Important NPCs
- **Leader:** {{character_name}} the {{title}}
- **Notable Merchant:** {{character_name}}
- **Local Expert:** {{character_name}} ({{expertise}})
- **Troublemaker:** {{character_name}}

## Economy & Resources
- **Primary Industry:** {{industry}}
- **Exports:** [What they sell to others]
- **Imports:** [What they need from elsewhere]
- **Currency:** [Standard/Barter/Special]
- **Wealth Level:** {{roll 1d6}} (1-2: Poor, 3-4: Modest, 5-6: Wealthy)

## Conflicts & Challenges
{{#llm}}Identify current problems, tensions, or threats that could drive adventures and conflicts{{/llm}}

### Current Issues
- **Primary Threat:** [Main danger or problem]
- **Political Tensions:** [Internal conflicts]
- **External Pressures:** [Outside threats]
- **Environmental Hazards:** [Natural dangers]

## Adventure Opportunities
{{#llm}}Generate specific plot hooks, quests, and adventure opportunities centered around this location{{/llm}}

### Plot Hooks
1. **{{mystery}}** needs investigation
2. **{{threat}}** threatens the community
3. **{{opportunity}}** presents itself to bold adventurers

### Rumors & Secrets
- **Common Rumor:** [What everyone talks about]
- **Hidden Secret:** [What few know]
- **Ancient Mystery:** [Old legends with truth]

## Practical Information
### Services Available
- **Inn/Lodging:** {{inn_name}} ({{roll 1d10}} silver per night)
- **Shops:** {{shop_type}}, {{shop_type}}, {{shop_type}}
- **Temple/Shrine:** Dedicated to {{deity}}
- **Tavern:** {{tavern_name}} (Atmosphere: {{atmosphere}})

### Travel Information
- **Access Routes:** [How to reach this location]
- **Travel Time:** {{rand 1-7}} days from nearest major city
- **Dangers:** [Hazards on the journey]
- **Guides Available:** [Who can show the way]

## Seasonal Variations
- **Spring:** [How location changes]
- **Summer:** [Seasonal characteristics]
- **Autumn:** [Autumn features]
- **Winter:** [Winter conditions]

## Map Notes
{{#llm}}Provide specific details that would be useful for creating a map or planning tactical encounters{{/llm}}

- **Key Distances:** [Between important locations]
- **Defensive Features:** [Natural or artificial fortifications]
- **Hidden Areas:** [Secret or hard-to-find locations]
- **Tactical Considerations:** [For combat encounters]
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'templates', 'location-description-template.md'),
            Buffer.from(locationTemplate)
        );

        // Create default LLM profile
        const defaultProfile = {
            name: "Default Creative Writer",
            provider: "openai",
            apiKey: "",
            endpoint: "",
            model: "gpt-4",
            systemPrompt: "You are a creative writing assistant helping with interactive storytelling. Continue the narrative in a vivid, engaging style that matches the tone and genre of the existing text.",
            settings: {
                temperature: 0.7,
                maxTokens: 500,
                topP: 1.0,
                frequencyPenalty: 0.0,
                presencePenalty: 0.0
            },
            includeSystemContent: true,
            maxContextEntries: 10,
            created: Date.now(),
            updated: Date.now()
        };

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'llm-profiles', 'default.json'),
            Buffer.from(JSON.stringify(defaultProfile, null, 2))
        );

        // Create comprehensive workbooks system
        const workbookSystem = {
            stacks: {
                'story-development': {
                    id: 'story-development',
                    name: 'Story Development',
                    workbooks: {
                        'story-bible': {
                            id: 'story-bible',
                            name: 'Story Bible',
                            description: 'Main story elements and world-building notes for The Crystal Quest',
                            stackId: 'story-development',
                            masterScope: 'library',
                            masterScopeContext: {},
                            tags: ['world-building', 'lore', 'bible', 'reference'],
                            createdAt: now,
                            updatedAt: now
                        },
                        'chapter-notes': {
                            id: 'chapter-notes',
                            name: 'Chapter Notes',
                            description: 'Planning and development notes for current chapter writing',
                            stackId: 'story-development',
                            masterScope: 'chapter',
                            masterScopeContext: {
                                chapterId: 'chapter-1-the-beginning',
                                bookId: 'the-crystal-quest',
                                shelfId: 'fantasy-adventures'
                            },
                            tags: ['planning', 'notes', 'chapter', 'writing'],
                            createdAt: now,
                            updatedAt: now
                        }
                    }
                }
            }
        };

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'workbooks.json'),
            Buffer.from(JSON.stringify(workbookSystem, null, 2))
        );

        // Create metadata files for repository categories with correct counts
        const categoriesMetadata = {
            characters: { count: 4, lastUpdated: now },
            locations: { count: 4, lastUpdated: now },
            objects: { count: 0, lastUpdated: now },
            situations: { count: 8, lastUpdated: now }
        };

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'metadata.json'),
            Buffer.from(JSON.stringify(categoriesMetadata, null, 2))
        );

        vscode.window.showInformationMessage('Story Mode library structure created! Check the .story-mode folder.');
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create library structure: ${error}`);
    }
}

// Generate Sparks (uses configured tables, no prompts)
async function handleGenerateSparks(sparksService: SparksService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    try {
        // Generate and insert sparks using configured tables
        await sparksService.insertSparks();
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate sparks: ${error}`);
    }
}

// Continue with Sparks
async function handleContinueWithSparks(
    sparksService: SparksService, 
    llmService: LLMService, 
    repositoryManager: RepositoryManager
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating sparks and continuing with AI...",
            cancellable: true
        }, async (progress, token) => {
            // Step 1: Generate sparks
            progress.report({ message: "Generating sparks..." });
            
            const sparksFormatted = sparksService.generateSparksForContinuation();

            // Step 2: Insert sparks  
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, `\n${sparksFormatted}\n`);
            });

            // Step 3: Continue with AI using sparks as context
            progress.report({ message: "Continuing with AI..." });
            
            const document = editor.document;
            const newPosition = new vscode.Position(position.line + 2, 0); // After sparks insertion
            
            // Get text from start to cursor (including sparks)
            const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), newPosition));
            
            // Get repository context for current file
            const context = await repositoryManager.getContextForFile(document.uri);
            
            // Get relevant repository items
            const repositoryItems = await repositoryManager.getRelevantItems(textBeforeCursor, context);
            
            // Generate continuation inline (no separate progress modal)
            const config = vscode.workspace.getConfiguration('storyMode');
            const enableStreaming = config.get('enableStreaming', true);
            
            let continuation: string;
            
            if (enableStreaming) {
                // Use unified LLM service with streaming
                continuation = await llmService.generateStreamingContinuation(textBeforeCursor, {
                    onToken: (token: string) => {
                        // For inline continuation, we don't need real-time streaming
                        // but we could add it later if needed
                    },
                    onError: (error: Error) => {
                        console.error('Streaming error:', error);
                    }
                }, {
                    repositoryItems,
                    maxContextLength: config.get('maxContextLength', 4000),
                    includeRepositoryContext: true
                }, token);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Insert continuation at cursor
                await editor.edit(editBuilder => {
                    editBuilder.insert(newPosition, continuation);
                });
            } else {
                // Use non-streaming service
                continuation = await llmService.generateContinuation(textBeforeCursor, {
                    repositoryItems,
                    maxContextLength: config.get('maxContextLength', 4000),
                    includeRepositoryContext: true
                }, token);
                
                if (token.isCancellationRequested) {
                    return;
                }

                // Insert continuation at cursor (non-streaming)
                await editor.edit(editBuilder => {
                    editBuilder.insert(newPosition, continuation);
                });
            }

            // Auto-save if enabled
            if (config.get('autoSave', true)) {
                await document.save();
            }
        });
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to continue with sparks: ${error}`);
    }
}

// Generate Sparks with Custom Table Selection
async function handleGenerateSparksCustom(sparksService: SparksService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    try {
        await sparksService.insertSparksCustom();
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate sparks: ${error}`);
    }
}

// Continue with Sparks with Custom Table Selection
async function handleContinueWithSparksCustom(
    sparksService: SparksService, 
    llmService: LLMService, 
    repositoryManager: RepositoryManager
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating sparks and continuing with AI...",
            cancellable: true
        }, async (progress, token) => {
            // Step 1: Generate sparks with custom table selection
            progress.report({ message: "Selecting tables and generating sparks..." });
            
            const sparksFormatted = await sparksService.generateSparksForContinuationCustom();
            if (!sparksFormatted) return; // User cancelled table selection

            // Step 2: Insert sparks  
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, `\n${sparksFormatted}\n`);
            });

            // Step 3: Continue with AI using sparks as context
            progress.report({ message: "Continuing with AI..." });
            
            const document = editor.document;
            const newPosition = new vscode.Position(position.line + 2, 0); // After sparks insertion
            
            // Get text from start to cursor (including sparks)
            const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), newPosition));
            
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

            // Insert continuation
            await editor.edit(editBuilder => {
                editBuilder.insert(newPosition, continuation);
            });

            // Move cursor to end of insertion
            const lines = continuation.split('\n');
            const finalPosition = new vscode.Position(
                newPosition.line + lines.length - 1,
                lines[lines.length - 1].length
            );
            editor.selection = new vscode.Selection(finalPosition, finalPosition);
        });
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to continue with sparks: ${error}`);
    }
}

// Query Oracle with Custom Table Selection
async function handleQueryOracleCustom(oracleService: OracleService) {
    const editor = vscode.window.activeTextEditor;
    
    const question = await vscode.window.showInputBox({
        prompt: 'Ask the Oracle a question',
        placeHolder: 'Will the guard notice me?'
    });

    if (!question) return;

    try {
        const result = await oracleService.queryOracleCustom(question);
        if (!result) return; // User cancelled table selection
        
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
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to query oracle: ${error}`);
    }
}

// Configure Spark Tables
async function handleConfigureSparkTables(tableConfigurationPicker: TableConfigurationPicker) {
    try {
        await tableConfigurationPicker.showTableConfiguration();
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to configure spark tables: ${error}`);
    }
}

// Open Visual Table Manager
async function handleOpenTableManager(tableManagerWebview: TableManagerWebview) {
    try {
        tableManagerWebview.show();
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open table manager: ${error}`);
    }
}

// LangChain Workflow Handlers

// Execute a workflow
async function handleExecuteWorkflow(workflowService: WorkflowService) {
    try {
        const workflows = workflowService.getWorkflows();
        const workflowList = Object.values(workflows).filter(w => w.enabled);
        
        if (workflowList.length === 0) {
            vscode.window.showInformationMessage('No workflows available. Create workflows in .story-mode/workflows/');
            return;
        }

        const selectedWorkflow = await vscode.window.showQuickPick(
            workflowList.map(w => ({
                label: w.name,
                description: w.description,
                detail: `Category: ${w.category} | Nodes: ${w.nodes.length}`,
                workflow: w
            })),
            {
                placeHolder: 'Select a workflow to execute',
                matchOnDescription: true,
                matchOnDetail: true
            }
        );

        if (selectedWorkflow) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Executing workflow: ${selectedWorkflow.workflow.name}`,
                cancellable: true
            }, async (progress, token) => {
                try {
                    const executionId = await workflowService.executeWorkflow(
                        selectedWorkflow.workflow.id,
                        { source: 'manual' }
                    );
                    
                    // Monitor execution progress
                    const interval = setInterval(() => {
                        const status = workflowService.getExecutionStatus(executionId);
                        if (status) {
                            progress.report({ 
                                message: `${status.status} - ${status.progress}%`,
                                increment: status.progress 
                            });
                            
                            if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                                clearInterval(interval);
                                if (status.status === 'completed') {
                                    vscode.window.showInformationMessage(`Workflow completed: ${selectedWorkflow.workflow.name}`);
                                } else if (status.status === 'failed') {
                                    const errors = status.errors.map(e => e.error).join(', ');
                                    vscode.window.showErrorMessage(`Workflow failed: ${errors}`);
                                }
                            }
                        }
                    }, 500);

                    // Handle cancellation
                    token.onCancellationRequested(() => {
                        workflowService.cancelExecution(executionId);
                        clearInterval(interval);
                    });
                    
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to execute workflow: ${error}`);
                }
            });
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to show workflows: ${error}`);
    }
}

// Manage workflows
async function handleManageWorkflows(workflowService: WorkflowService) {
    const options = [
        { label: 'View All Workflows', value: 'view' },
        { label: 'Import Workflow', value: 'import' },
        { label: 'Export Workflow', value: 'export' },
        { label: 'Create New Workflow', value: 'create' },
        { label: 'Delete Workflow', value: 'delete' }
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select workflow management action'
    });

    if (!selection) return;

    switch (selection.value) {
        case 'view':
            await showWorkflowList(workflowService);
            break;
        case 'create':
            vscode.window.showInformationMessage(
                'Create workflows by adding JSON files to .story-mode/workflows/ directory. See documentation for workflow schema.'
            );
            break;
        case 'import':
        case 'export':
        case 'delete':
            vscode.window.showInformationMessage(`${selection.label} feature will be available in future updates.`);
            break;
    }
}

// Show workflow execution status
async function handleWorkflowStatus(workflowService: WorkflowService) {
    // For now, just show a summary of available workflows
    const workflows = workflowService.getWorkflows();
    const workflowCount = Object.keys(workflows).length;
    const enabledCount = Object.values(workflows).filter(w => w.enabled).length;
    
    const categories = [...new Set(Object.values(workflows).map(w => w.category))];
    
    vscode.window.showInformationMessage(
        `Workflows: ${enabledCount}/${workflowCount} enabled | Categories: ${categories.join(', ')}`
    );
}

// Helper function to show workflow list
async function showWorkflowList(workflowService: WorkflowService) {
    const workflows = workflowService.getWorkflows();
    const workflowItems = Object.values(workflows).map(workflow => {
        const status = workflow.enabled ? '✅' : '❌';
        const nodeTypes = [...new Set(workflow.nodes.map(n => n.type))].join(', ');
        return {
            label: `${status} ${workflow.name}`,
            description: workflow.description,
            detail: `Category: ${workflow.category} | Nodes: ${workflow.nodes.length} (${nodeTypes})`,
            workflow
        };
    });

    if (workflowItems.length === 0) {
        vscode.window.showInformationMessage('No workflows found. Add workflow files to .story-mode/workflows/');
        return;
    }

    const selected = await vscode.window.showQuickPick(workflowItems, {
        placeHolder: 'Workflow Library - Select for details',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selected) {
        const details = [
            `Name: ${selected.workflow.name}`,
            `Description: ${selected.workflow.description}`,
            `Category: ${selected.workflow.category}`,
            `Status: ${selected.workflow.enabled ? 'Enabled' : 'Disabled'}`,
            `Nodes: ${selected.workflow.nodes.length}`,
            `Triggers: ${selected.workflow.triggers.length}`,
            `Version: ${selected.workflow.version || 'Unknown'}`,
            `Created: ${new Date(selected.workflow.created).toLocaleDateString()}`
        ].join('\n');
        
        vscode.window.showInformationMessage(details, { modal: true });
    }
}

// Workbook Management Handlers

// Create a new workbook
async function handleCreateWorkbook(workbookService: WorkbookService, explorer: any, treeItem?: any) {
    // If called from a stack context menu, pre-select that stack
    let preselectedStackId: string | undefined;
    
    if (treeItem && treeItem.contextValue === 'workbook-stack' && treeItem.stackId) {
        preselectedStackId = treeItem.stackId;
    }
    
    // First, get or create a stack
    const workbookSystem = workbookService.getWorkbookSystem();
    const stacks = Object.values(workbookSystem.stacks);
    
    let selectedStackId: string;
    
    if (preselectedStackId) {
        selectedStackId = preselectedStackId;
    } else if (stacks.length === 0) {
        // Create first stack
        const stackName = await vscode.window.showInputBox({
            prompt: 'Enter stack name (stacks organize related workbooks)',
            placeHolder: 'e.g., "Character Development", "World Building"'
        });
        
        if (!stackName) {
            return;
        }
        
        selectedStackId = await workbookService.createStack(stackName);
    } else {
        // Let user choose existing stack or create new one
        const stackOptions = [
            ...stacks.map(stack => ({
                label: stack.name,
                description: `${Object.keys(stack.workbooks).length} workbooks`,
                stackId: stack.id
            })),
            {
                label: '$(plus) Create New Stack',
                description: 'Create a new workbook stack',
                stackId: 'new'
            }
        ];
        
        const selectedStack = await vscode.window.showQuickPick(stackOptions, {
            placeHolder: 'Select a stack for your workbook'
        });
        
        if (!selectedStack) {
            return;
        }
        
        if (selectedStack.stackId === 'new') {
            const stackName = await vscode.window.showInputBox({
                prompt: 'Enter new stack name',
                placeHolder: 'e.g., "Character Development"'
            });
            
            if (!stackName) {
                return;
            }
            
            selectedStackId = await workbookService.createStack(stackName);
        } else {
            selectedStackId = selectedStack.stackId;
        }
    }
    
    // Get workbook details
    const workbookName = await vscode.window.showInputBox({
        prompt: 'Enter workbook name',
        placeHolder: 'e.g., "Main Characters", "Kingdom Politics"'
    });
    
    if (!workbookName) {
        return;
    }
    
    const description = await vscode.window.showInputBox({
        prompt: 'Enter workbook description (optional)',
        placeHolder: 'Brief description of what this workbook contains'
    });
    
    const tagsInput = await vscode.window.showInputBox({
        prompt: 'Enter tags (optional, comma-separated)',
        placeHolder: 'e.g., "character, protagonist, main"'
    });
    
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    
    // Scope selection
    const scopeOptions = [
        { label: 'No Scope', description: 'Available everywhere', value: undefined },
        { label: 'Library Scope', description: 'Available across entire library', value: 'library' },
        { label: 'Shelf Scope', description: 'Limited to current shelf', value: 'shelf' },
        { label: 'Book Scope', description: 'Limited to current book', value: 'book' },
        { label: 'Chapter Scope', description: 'Limited to current chapter', value: 'chapter' }
    ];
    
    const selectedScope = await vscode.window.showQuickPick(scopeOptions, {
        placeHolder: 'Select workbook scope (controls where workbook is active)'
    });
    
    if (selectedScope === undefined) {
        return;
    }
    
    // TODO: Get current context for scope context
    const masterScopeContext = undefined; // This would come from repositoryManager.getCurrentContext()
    
    try {
        await workbookService.createWorkbook(
            selectedStackId,
            workbookName,
            description || undefined,
            tags,
            selectedScope.value as any,
            masterScopeContext
        );
        
        explorer.refresh();
        vscode.window.showInformationMessage(`Created workbook "${workbookName}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create workbook: ${error}`);
    }
}

// Edit an existing workbook
async function handleEditWorkbook(workbookService: WorkbookService, explorer: any, treeItem?: any) {
    let selectedWorkbook: any;
    
    // If called from workbook context menu, pre-select that workbook
    if (treeItem && treeItem.contextValue === 'workbook' && treeItem.workbookId && treeItem.stackId) {
        const workbookSystem = workbookService.getWorkbookSystem();
        const stack = workbookSystem.stacks[treeItem.stackId];
        if (stack && stack.workbooks[treeItem.workbookId]) {
            selectedWorkbook = {
                workbook: stack.workbooks[treeItem.workbookId]
            };
        }
    }
    
    // If no workbook pre-selected, show picker
    if (!selectedWorkbook) {
        const allWorkbooks = workbookService.getAllWorkbooks();
        
        if (allWorkbooks.length === 0) {
            vscode.window.showInformationMessage('No workbooks found. Create one first.');
            return;
        }
        
        const workbookOptions = allWorkbooks.map(workbook => ({
            label: workbook.name,
            description: workbook.description || 'No description',
            detail: `Tags: ${workbook.tags.join(', ') || 'none'} | Scope: ${workbook.masterScope || 'none'}`,
            workbook
        }));
        
        selectedWorkbook = await vscode.window.showQuickPick(workbookOptions, {
            placeHolder: 'Select workbook to edit',
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (!selectedWorkbook) {
            return;
        }
    }
    
    const workbook = selectedWorkbook.workbook;
    
    // Edit name
    const newName = await vscode.window.showInputBox({
        prompt: 'Edit workbook name',
        value: workbook.name
    });
    
    if (!newName) {
        return;
    }
    
    // Edit description
    const newDescription = await vscode.window.showInputBox({
        prompt: 'Edit workbook description (optional)',
        value: workbook.description || ''
    });
    
    // Edit tags
    const newTagsInput = await vscode.window.showInputBox({
        prompt: 'Edit tags (comma-separated)',
        value: workbook.tags.join(', ')
    });
    
    const newTags = newTagsInput ? newTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    
    try {
        await workbookService.updateWorkbook(workbook.stackId, workbook.id, {
            name: newName,
            description: newDescription || undefined,
            tags: newTags
        });
        
        explorer.refresh();
        vscode.window.showInformationMessage(`Updated workbook "${newName}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to update workbook: ${error}`);
    }
}

// Delete a workbook
async function handleDeleteWorkbook(workbookService: WorkbookService, explorer: any, treeItem?: any) {
    const allWorkbooks = workbookService.getAllWorkbooks();
    
    if (allWorkbooks.length === 0) {
        vscode.window.showInformationMessage('No workbooks found.');
        return;
    }
    
    const workbookOptions = allWorkbooks.map(workbook => ({
        label: workbook.name,
        description: workbook.description || 'No description',
        detail: `Tags: ${workbook.tags.join(', ') || 'none'}`,
        workbook
    }));
    
    const selectedWorkbook = await vscode.window.showQuickPick(workbookOptions, {
        placeHolder: 'Select workbook to delete',
        matchOnDescription: true,
        matchOnDetail: true
    });
    
    if (!selectedWorkbook) {
        return;
    }
    
    const confirmDelete = await vscode.window.showWarningMessage(
        `Are you sure you want to delete the workbook "${selectedWorkbook.workbook.name}"?`,
        { modal: true },
        'Delete'
    );
    
    if (confirmDelete !== 'Delete') {
        return;
    }
    
    try {
        await workbookService.deleteWorkbook(selectedWorkbook.workbook.stackId, selectedWorkbook.workbook.id);
        explorer.refresh();
        vscode.window.showInformationMessage(`Deleted workbook "${selectedWorkbook.workbook.name}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete workbook: ${error}`);
    }
}

// Manage workbooks (overview and bulk operations)
async function handleManageWorkbooks(workbookService: WorkbookService, explorer: any) {
    const options = [
        { label: 'View All Workbooks', value: 'view' },
        { label: 'Create New Stack', value: 'create-stack' },
        { label: 'Delete Stack', value: 'delete-stack' },
        { label: 'View All Tags', value: 'view-tags' },
        { label: 'Reload Workbooks', value: 'reload' }
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select workbook management action'
    });

    if (!selection) {
        return;
    }

    switch (selection.value) {
        case 'view':
            await showWorkbookList(workbookService);
            break;
        case 'create-stack':
            await createStack(workbookService, explorer);
            break;
        case 'delete-stack':
            await deleteStack(workbookService, explorer);
            break;
        case 'view-tags':
            await showAllTags(workbookService);
            break;
        case 'reload':
            await workbookService.reloadWorkbooks();
            explorer.refresh();
            vscode.window.showInformationMessage('Workbooks reloaded from file system');
            break;
    }
}

// Helper function to show workbook list
async function showWorkbookList(workbookService: WorkbookService) {
    const allWorkbooks = workbookService.getAllWorkbooks();
    
    if (allWorkbooks.length === 0) {
        vscode.window.showInformationMessage('No workbooks found. Create your first workbook to get started.');
        return;
    }
    
    const workbookList = allWorkbooks.map(workbook => {
        const scopeInfo = workbook.masterScope ? ` [${workbookService.getScopeDisplayName(workbook.masterScope)}]` : '';
        const tagInfo = workbook.tags.length > 0 ? ` (${workbook.tags.join(', ')})` : '';
        return `• ${workbook.name}${scopeInfo}${tagInfo}`;
    }).join('\n');
    
    const message = `Total Workbooks: ${allWorkbooks.length}\n\n${workbookList}`;
    
    vscode.window.showInformationMessage(message, { modal: true });
}

// Helper function to create a new stack
async function createStack(workbookService: WorkbookService, explorer: any) {
    const stackName = await vscode.window.showInputBox({
        prompt: 'Enter new stack name',
        placeHolder: 'e.g., "Character Development", "World Building"'
    });
    
    if (!stackName) {
        return;
    }
    
    try {
        await workbookService.createStack(stackName);
        explorer.refresh();
        vscode.window.showInformationMessage(`Created stack "${stackName}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create stack: ${error}`);
    }
}

// Helper function to delete a stack
async function deleteStack(workbookService: WorkbookService, explorer: any) {
    const workbookSystem = workbookService.getWorkbookSystem();
    const stacks = Object.values(workbookSystem.stacks);
    
    if (stacks.length === 0) {
        vscode.window.showInformationMessage('No stacks found.');
        return;
    }
    
    const stackOptions = stacks.map(stack => ({
        label: stack.name,
        description: `${Object.keys(stack.workbooks).length} workbooks`,
        stack
    }));
    
    const selectedStack = await vscode.window.showQuickPick(stackOptions, {
        placeHolder: 'Select stack to delete'
    });
    
    if (!selectedStack) {
        return;
    }
    
    const workbookCount = Object.keys(selectedStack.stack.workbooks).length;
    const warning = workbookCount > 0 
        ? `This will delete the stack "${selectedStack.stack.name}" and all ${workbookCount} workbooks in it.`
        : `This will delete the empty stack "${selectedStack.stack.name}".`;
        
    const confirmDelete = await vscode.window.showWarningMessage(
        warning + '\n\nAre you sure?',
        { modal: true },
        'Delete Stack'
    );
    
    if (confirmDelete !== 'Delete Stack') {
        return;
    }
    
    try {
        await workbookService.deleteStack(selectedStack.stack.id);
        explorer.refresh();
        vscode.window.showInformationMessage(`Deleted stack "${selectedStack.stack.name}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete stack: ${error}`);
    }
}

// Helper function to show all tags
async function showAllTags(workbookService: WorkbookService) {
    const allTags = workbookService.getAllTags();
    
    if (allTags.length === 0) {
        vscode.window.showInformationMessage('No tags found in workbooks.');
        return;
    }
    
    const tagList = allTags.map(tag => {
        const workbooksWithTag = workbookService.getWorkbooksByTag(tag);
        return `• ${tag} (${workbooksWithTag.length} workbooks)`;
    }).join('\n');
    
    const message = `All Tags (${allTags.length}):\n\n${tagList}`;
    
    vscode.window.showInformationMessage(message, { modal: true });
}

export function deactivate() {}
