import * as vscode from 'vscode';
import { LLMService } from './services/llm-service';
import { StreamingLLMService } from './services/streaming-llm-service';
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
import type { InlineContinuationOptions } from './types';

export function activate(context: vscode.ExtensionContext) {
    console.log('Story Mode extension is now active!');

    // Validate setup first
    ErrorHandlingService.validateSetup();

    // Initialize services
    const repositoryManager = new RepositoryManager(context);
    const templateManager = new TemplateManager(context);
    const llmService = new LLMService(context);
    const streamingLLMService = new StreamingLLMService(context);
    const sparkTableManager = new SparkTableManager(context);
    const oracleService = new OracleService(sparkTableManager);
    const sparksService = new SparksService(sparkTableManager);
    const diceService = new DiceService();
    const templatePicker = new TemplatePicker(context);
    const tableConfigurationPicker = new TableConfigurationPicker(context, sparkTableManager);

    // Initialize context indicator (status bar)
    const contextIndicator = new ContextIndicator(context, repositoryManager);

    // Initialize smart suggestions
    const smartSuggestions = new SmartSuggestionsService(repositoryManager, templateManager);

    // Initialize file watcher
    const fileWatcher = new FileWatcher(context);
    fileWatcher.startWatching();

    // Initialize tree data provider
    const storyModeExplorer = new StoryModeExplorer(context, repositoryManager);
    vscode.window.createTreeView('storyModeExplorer', {
        treeDataProvider: storyModeExplorer,
        showCollapseAll: true
    });

    // Connect file watcher to refresh tree view and repository cache
    fileWatcher.onDidChangeFiles((changedFiles) => {
        let shouldRefreshRepo = false;
        let shouldRefreshTree = false;
        let shouldReloadSparkTables = false;

        for (const uri of changedFiles) {
            if (fileWatcher.isRepositoryFile(uri)) {
                shouldRefreshRepo = true;
                shouldRefreshTree = true;
            } else if (fileWatcher.isTemplateFile(uri) || fileWatcher.isLLMProfileFile(uri)) {
                shouldRefreshTree = true;
            } else if (fileWatcher.isSparkTableFile(uri)) {
                shouldReloadSparkTables = true;
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
    });

    // Set context for when Story Mode is enabled
    vscode.commands.executeCommand('setContext', 'story-mode:enabled', true);

    // CORE COMMAND: Continue Text with AI
    const continueTextCommand = vscode.commands.registerCommand('story-mode.continueText', async () => {
        await handleContinueText(llmService, streamingLLMService, repositoryManager);
    });

    // Continue with Oracle consultation
    const continueWithOracleCommand = vscode.commands.registerCommand('story-mode.continueWithOracle', async () => {
        await handleContinueWithOracle(llmService, streamingLLMService, repositoryManager, oracleService);
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
        await handleContinueWithTemplate(templateManager, llmService, streamingLLMService, repositoryManager, templatePicker);
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
        await handleContinueWithSparks(sparksService, llmService, streamingLLMService, repositoryManager);
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
        configureSparkTablesCommand
    );
}

// CORE FUNCTIONALITY: Continue text with AI
async function handleContinueText(
    llmService: LLMService, 
    streamingLLMService: StreamingLLMService, 
    repositoryManager: RepositoryManager
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
        return await handleStreamingContinueText(streamingLLMService, repositoryManager, streamingDelay);
    } else {
        return await handleNonStreamingContinueText(llmService, repositoryManager);
    }
}

// Streaming implementation
async function handleStreamingContinueText(
    streamingLLMService: StreamingLLMService,
    repositoryManager: RepositoryManager,
    streamingDelay: number
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
            
            // Get LLM profile
            const profileKey = vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
            const profile = await getLLMProfile(profileKey);
            
            if (!profile) {
                vscode.window.showErrorMessage('No LLM profile configured. Please set up an LLM profile in settings.');
                return;
            }

            // Stream the response with real-time insertion
            return await streamingLLMService.generateStreamingContinuation(
                textBeforeCursor,
                profile,
                repositoryItems,
                {
                    onToken: async (token: string) => {
                        if (cancellationTokenSource.token.isCancellationRequested) return;
                        
                        insertedText += token;
                        
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
                    },
                    onError: (error: Error) => {
                        vscode.window.showErrorMessage(`Streaming failed: ${error.message}`);
                    }
                },
                cancellationTokenSource.token
            );
        });

        // Auto-save if enabled
        if (vscode.workspace.getConfiguration('storyMode').get('autoSave', true)) {
            await editor.document.save();
        }

    } catch (error) {
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
    repositoryManager: RepositoryManager
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
    streamingLLMService: StreamingLLMService, 
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
    await handleContinueText(llmService, streamingLLMService, repositoryManager);
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
    streamingLLMService: StreamingLLMService,
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
        await handleContinueText(llmService, streamingLLMService, repositoryManager);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to process template: ${error}`);
        
        // Fallback: insert raw template content and continue
        await editor.edit(editBuilder => {
            editBuilder.insert(position, `\n\n${template.content}\n\n`);
        });
        
        await handleContinueText(llmService, streamingLLMService, repositoryManager);
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
    streamingLLMService: StreamingLLMService,
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
                // Use streaming service - need to get profile manually since getLLMProfile is private
                const profileKey = config.get('defaultLLMProfile', '');
                if (!profileKey) {
                    throw new Error('No LLM profile configured. Please set up an LLM profile in settings.');
                }
                
                // For now, fallback to non-streaming since we can't easily access the profile
                // TODO: Refactor LLMService to expose profile access or make streaming work with generateContinuation
                continuation = await llmService.generateContinuation(textBeforeCursor, {
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

export function deactivate() {}
