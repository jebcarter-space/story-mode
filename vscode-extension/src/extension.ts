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

    // Initialize context indicator (status bar)
    const contextIndicator = new ContextIndicator(context, repositoryManager);
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
        openChapterCommand
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

        // Create example location
        const exampleLocation = `---
type: location
tags: [tavern, social, cozy]
scope: library
forceContext: false
llmProfile: ""
---

# The Prancing Pony Tavern

A warm, welcoming tavern that serves as a gathering place for travelers and locals alike.

## Description
The tavern features a large common room with wooden tables, a stone fireplace, and oil lamps that cast dancing shadows on the walls. The air is filled with the aroma of hearty stews and fresh bread.

## Notable Features
- Friendly bartender who knows all the local gossip
- Private rooms upstairs for rent
- Stable out back for horses
- Notice board with job postings and news
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'repositories', 'locations', 'prancing-pony-tavern.md'),
            Buffer.from(exampleLocation)
        );

        // Create enhanced example template
        const exampleTemplate = `---
name: "Character Introduction"
description: "Template for introducing a new character with LLM enhancement"
category: "Characters"
llmEnabled: true
llmInstructions: "Generate a vivid character introduction based on the provided details, focusing on atmosphere and first impressions"
llmProfile: ""
appendMode: false
repositoryTarget: "Character"
---

## {{random_character}} Enters the Scene

**Age:** {{rand 18-65}}
**Initial Impression:** {{roll 1d6}}

{{#llm}}Describe this character's dramatic entrance into the scene, including their appearance, mannerisms, and the immediate impression they make on others present{{/llm}}

**Notable Equipment:** 
- Primary weapon/tool: {{rand 1-10}}
- Distinctive clothing or accessory

**Random Quirk:** {{rand 1-100}}% chance of having an unusual habit
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'templates', 'character-introduction.md'),
            Buffer.from(exampleTemplate)
        );

        // Create location template example
        const locationTemplate = `---
name: "Tavern Scene"
description: "Generate a detailed tavern scene with atmosphere"
category: "Locations"  
llmEnabled: true
llmInstructions: "Create a vivid tavern scene with sensory details, atmosphere, and notable features"
llmProfile: ""
appendMode: true
repositoryTarget: "Location"
---

# The {{random_location}} Tavern

**Crowd Level:** {{rand 5-50}} patrons  
**Atmosphere Check:** {{roll 2d6}}

## Basic Setup
- **Lighting:** Flickering candlelight and oil lamps
- **Sounds:** {{roll 1d4}} conversations happening simultaneously  
- **Notable Patron:** {{random_character}} sits in the corner

## Scene Enhancement
{{#llm}}Add rich atmospheric details about the tavern's mood, smells, sounds, and any interesting events happening right now{{/llm}}
`;

        await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(storyModeRoot, 'templates', 'tavern-scene.md'),
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

        // Create metadata files for repository categories
        const categoriesMetadata = {
            characters: { count: 1, lastUpdated: Date.now() },
            locations: { count: 1, lastUpdated: Date.now() },
            objects: { count: 0, lastUpdated: Date.now() },
            situations: { count: 0, lastUpdated: Date.now() }
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
