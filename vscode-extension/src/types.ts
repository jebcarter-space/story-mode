// Core types for Story Mode VSCode Extension
// Ported from ../src/data/types.ts

export interface Content {
  [timestamp: number]: ContentEntry;
}

export interface ContentEntry {
  output: string;
  type: ContentType;
  input?: string;
}

export type ContentType = 'start' | 'task' | 'oracle' | 'keyword' | 'input' | 'roll' | 'table' | 'template' | 'llm';

// Library System Types
export interface Library {
  shelves: Record<string, Shelf>;
  settings: LibrarySettings;
}

export interface LibrarySettings {
  lastAccessedShelf?: string;
  lastAccessedBook?: string;
  created: number;
  updated: number;
}

export interface Shelf {
  id: string;
  name: string;
  bannerImage?: string;
  books: Record<string, Book>;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  name: string;
  coverImage?: string;
  chapters: Record<string, Chapter>;
  lastAccessedChapter?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  name: string;
  content: Content;
  createdAt: number;
  updatedAt: number;
}

// Repository System Types
export interface RepositoryItem {
  name: string;
  description: string;
  keywords: string[];
  content: string;
  forceInContext: boolean;
  category: RepositoryCategory;
  created: number;
  updated: number;
  scope: 'chapter' | 'book' | 'shelf' | 'library';
  scopeContext: {
    chapterId?: string;
    bookId?: string; 
    shelfId?: string;
  };
  workbookTags: string[];
  llmProfile?: string; // Route to specific LLM profile
}

export interface RepositoryList {
  [key: string]: RepositoryItem;
}

export type RepositoryCategory = 'Character' | 'Location' | 'Object' | 'Situation';

// LLM System Types
export interface LLMProfile {
  name: string;
  provider: 'openai' | 'anthropic' | 'mistral' | 'openrouter' | 'koboldcpp' | 'custom';
  apiKey: string;
  endpoint: string;
  model: string;
  systemPrompt?: string;
  authorNote?: string;
  settings: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    // KoboldCPP Advanced Sampling
    tfs?: number;
    topA?: number;
    topK?: number;
    minP?: number;
    typical?: number;
    nsigma?: number; // N-Sigma sampling
    // KoboldCPP Repetition Control  
    repPen?: number;
    repPenRange?: number;
    samplerOrder?: number[];
    samplerSeed?: number; // RNG seed for sampling
    // KoboldCPP Dynamic Temperature
    dynatempRange?: number;
    dynatempExponent?: number;
    smoothingFactor?: number;
    // KoboldCPP Mirostat
    mirostat?: number;
    mirostatTau?: number;
    mirostatEta?: number;
    // KoboldCPP DRY (Don't Repeat Yourself)
    dryMultiplier?: number;
    dryBase?: number;
    dryAllowedLength?: number;
    drySequenceBreakers?: string[];
    // KoboldCPP XTC
    xtcThreshold?: number;
    xtcProbability?: number;
    // KoboldCPP Grammar & Constraints
    grammar?: string;
    grammarRetainState?: boolean; // Retain grammar state between generations
    bannedTokens?: string[];
    logitBias?: { [key: string]: number };
    memory?: string;
    // KoboldCPP Control Settings
    useDefaultBadWordsIds?: boolean; // Ban EOS token
    trimStop?: boolean; // Remove stop sequences from output
    renderSpecial?: boolean; // Render special tokens as text
    bypassEOS?: boolean; // Allow EOS token generation
    stopSequence?: string[]; // Custom stop sequences
    // KoboldCPP Generation Settings
    genkey?: string; // Unique generation key for multiuser
    images?: string[]; // Base64 encoded images for multimodal models
    logprobs?: boolean; // Return token logprobs
    replaceInstructPlaceholders?: boolean; // Replace instruct placeholders
  };
  includeSystemContent: boolean;
  maxContextEntries: number;
  maxContextSize?: number;
  autoDetectContextSize?: boolean;
  created: number;
  updated: number;
}

export interface LLMProfileList {
  [key: string]: LLMProfile;
}

// Template System Types
export interface Template {
  name: string;
  description: string;
  content: string;
  category: string;
  created: number;
  updated: number;
  llmInstructions?: string;
  llmEnabled?: boolean;
  appendMode?: boolean;
  repositoryTarget?: string;
  llmProfile?: string; // Route to specific LLM
  // System Prompt and Author's Note override fields
  systemPrompt?: string; // Override connection's system prompt
  authorNote?: string;   // Override connection's author note
}

export interface TemplateList {
  [key: string]: Template;
}

// Random Tables
export interface RandomTable {
  name: string;
  description: string;
  diceFormula: string;
  table: MinMaxRow[];
  consumable?: boolean;
}

export interface MinMaxRow {
  min: number | string | null;
  max: number | string | null;
  description: string | Function;
}

// Repository Context for resolution
export interface RepositoryContext {
  chapterId?: string;
  bookId?: string;
  shelfId?: string;
  filePath?: string; // VSCode-specific: current file path
}

// Spark Tables System Types  
export interface SparkTable {
  name: string;
  source: string; // file path or 'built-in'
  entries: string[];
  lastModified: number;
  enabled: boolean;
  weight: number;
  oracleEnabled: boolean;
  sparksEnabled: boolean;
  categories: string[];
  isDefault: boolean;
}

export interface SparkTableList {
  [key: string]: SparkTable;
}

export interface SparkResult {
  keywords: string[];
  tableNames?: string[];
  timestamp: number;
}

// Repository resolution result
export interface ResolvedRepositoryItem {
  item: RepositoryItem;
  key: string;
  source: 'library' | 'shelf' | 'book' | 'chapter' | 'file';
}

export interface KeywordResolution {
  keyword: string;
  items: ResolvedRepositoryItem[];
  concatenatedContent: string;
  hasConflicts: boolean;
}

// VSCode-specific types
export interface StoryModeWorkspace {
  libraryPath: string;
  repositoryPath: string;
  templatesPath: string;
  llmProfilesPath: string;
}

export interface InlineContinuationOptions {
  includeRepositoryContext: boolean;
  maxContextLength: number;
  llmProfile?: string;
  templateName?: string;
}

// File metadata for markdown files
export interface StoryFileMetadata {
  id: string;
  title: string;
  created: string;
  updated: string;
  tags?: string[];
  shelf?: string;
  book?: string;
  chapter?: string;
  repositoryScope?: RepositoryContext;
}

// Enhanced Streaming Configuration
export interface StreamingErrorHandler {
  onConnectionError(error: Error): void;
  onTimeoutError(timeoutMs: number): void;
  onPartialResponse(partialText: string): void;
  onApiError(statusCode: number, message: string): void;
}

export interface StreamingReliabilityOptions {
  enableFallback: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  fallbackToNonStreaming: boolean;
  exponentialBackoff: boolean;
}

export interface StreamingStatus {
  isActive: boolean;
  tokensReceived: number;
  tokensPerSecond?: number;
  elapsedTime: number;
  retryCount?: number;
  lastError?: string;
}

// LangChain Workflow Orchestration Types (Foundation)
export interface StoryModeChain {
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

export interface ChainNode {
  id: string;
  type: 'llm' | 'prompt' | 'parser' | 'retriever' | 'memory' | 'custom';
  config: Record<string, any>;
  connections: string[]; // Connected node IDs
  position?: { x: number; y: number }; // For visual workflow builder
  label?: string;
  description?: string;
}

export interface ChainTrigger {
  event: 'manual' | 'content_added' | 'chapter_start' | 'oracle_roll' | 'template_expansion';
  conditions?: Record<string, any>;
  enabled: boolean;
}

export interface ChainOutput {
  id: string;
  type: 'text' | 'repository_item' | 'template' | 'metadata';
  target?: string; // Where to output (repository category, template name, etc.)
  format?: string;
}

export interface WorkflowExecution {
  id: string;
  chainId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  currentNode?: string;
  results: Record<string, any>;
  errors: WorkflowError[];
  progress: number; // 0-100
}

export interface WorkflowError {
  nodeId: string;
  error: string;
  timestamp: number;
  recoverable: boolean;
}

export interface ChainLibrary {
  [chainId: string]: StoryModeChain;
}

// Workflow Node Configurations
export interface LLMNodeConfig {
  profileId: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
}

export interface PromptNodeConfig {
  template: string;
  variables: Record<string, string>;
}

export interface ParserNodeConfig {
  type: 'json' | 'yaml' | 'regex' | 'custom';
  pattern?: string;
  schema?: Record<string, any>;
}

export interface RetrieverNodeConfig {
  source: 'repository' | 'content' | 'external';
  query: string;
  filters?: Record<string, any>;
  maxResults?: number;
}

export interface MemoryNodeConfig {
  type: 'buffer' | 'summary' | 'vector';
  capacity?: number;
  key?: string;
}

export interface CustomNodeConfig {
  scriptPath: string;
  parameters: Record<string, any>;
}

// Workbook System Types (ported from web app)
export interface Workbook {
  id: string;
  name: string;
  description?: string;
  stackId: string; // Which stack contains this workbook
  masterScope?: 'chapter' | 'book' | 'shelf' | 'library';
  masterScopeContext?: {
    chapterId?: string;
    bookId?: string;
    shelfId?: string;
  };
  tags: string[]; // Tags this workbook represents
  createdAt: number;
  updatedAt: number;
}

export interface Stack {
  id: string;
  name: string;
  workbooks: Record<string, Workbook>;
}

export interface WorkbookSystem {
  stacks: Record<string, Stack>;
}
