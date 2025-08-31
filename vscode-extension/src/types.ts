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
  provider: 'openai' | 'mistral' | 'openrouter' | 'koboldcpp' | 'custom';
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
    // KoboldCPP Repetition Control  
    repPen?: number;
    repPenRange?: number;
    samplerOrder?: number[];
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
    bannedTokens?: string[];
    logitBias?: { [key: string]: number };
    memory?: string;
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
