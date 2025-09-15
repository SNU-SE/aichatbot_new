/**
 * Enhanced RAG System Types
 * Core TypeScript interfaces and types for the enhanced RAG system
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Document processing status enum
 * Matches the processing_status_enum in the database
 */
export enum ProcessingStatus {
  UPLOADING = 'uploading',
  EXTRACTING = 'extracting',
  CHUNKING = 'chunking',
  EMBEDDING = 'embedding',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Language detection method enum
 * Matches the language_detection_method_enum in the database
 */
export enum LanguageDetectionMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  FALLBACK = 'fallback'
}

/**
 * Supported language codes
 */
export enum SupportedLanguage {
  ENGLISH = 'en',
  KOREAN = 'ko',
  JAPANESE = 'ja',
  CHINESE = 'zh',
  FRENCH = 'fr',
  GERMAN = 'de',
  SPANISH = 'es',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  ARABIC = 'ar',
  HINDI = 'hi'
}

/**
 * Access level enum for document permissions
 * Matches the access_level_enum in the database
 */
export enum AccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

/**
 * Message role enum for chat functionality
 * Matches the message_role_enum in the database
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * Error codes for document processing and system operations
 */
export enum DocumentErrorCode {
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  INVALID_DOCUMENT_STATE = 'INVALID_DOCUMENT_STATE',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Search error codes
 */
export enum SearchErrorCode {
  QUERY_TOO_SHORT = 'QUERY_TOO_SHORT',
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  SEARCH_SERVICE_UNAVAILABLE = 'SEARCH_SERVICE_UNAVAILABLE',
  NO_ACCESSIBLE_DOCUMENTS = 'NO_ACCESSIBLE_DOCUMENTS',
  INVALID_SEARCH_PARAMETERS = 'INVALID_SEARCH_PARAMETERS'
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  extractionMethod?: string;
  processingDuration?: number;
  errorDetails?: string;
  languageDetection?: LanguageDetectionResult;
  supportedLanguages?: string[];
  customFields?: Record<string, any>;
}

/**
 * Language detection result interface
 */
export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  method: LanguageDetectionMethod;
  alternatives?: Array<{
    language: string;
    confidence: number;
  }>;
}

/**
 * Language embedding interface
 */
export interface LanguageEmbedding {
  id: string;
  chunkId: string;
  languageCode: string;
  embedding: number[];
  translationQuality?: number;
  createdAt: Date;
}

/**
 * Document chunk position information
 */
export interface ChunkPosition {
  start: number;
  end: number;
}

/**
 * Document chunk metadata
 */
export interface ChunkMetadata {
  wordCount?: number;
  sentenceCount?: number;
  extractionConfidence?: number;
  customFields?: Record<string, any>;
}

/**
 * Core Document interface
 * Represents a document in the enhanced RAG system
 */
export interface Document {
  id: string;
  userId: string;
  title: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  language: string;
  detectedLanguage?: string;
  detectionMethod?: LanguageDetectionMethod;
  detectionConfidence?: number;
  supportedLanguages?: string[];
  processingStatus: ProcessingStatus;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  metadata: DocumentMetadata;
}

/**
 * Document chunk interface
 * Represents a processed chunk of a document with embeddings
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  positionStart?: number;
  positionEnd?: number;
  embedding?: number[];
  language?: string;
  languageEmbedding?: number[];
  languageEmbeddings?: LanguageEmbedding[];
  metadata: ChunkMetadata;
  createdAt: Date;
}

/**
 * Document folder interface
 * Represents hierarchical organization of documents
 */
export interface DocumentFolder {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  children?: DocumentFolder[];
  documentCount?: number;
}

/**
 * Document permission interface
 * Represents access control for documents
 */
export interface DocumentPermission {
  id: string;
  documentId: string;
  classId?: string;
  userId?: string;
  permissionLevel: AccessLevel;
  grantedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document reference interface
 * Used in chat responses to reference source documents
 */
export interface DocumentReference {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  pageNumber?: number;
  relevanceScore: number;
  excerpt: string;
  confidence?: number;
}

/**
 * Enhanced chat message interface
 */
export interface EnhancedChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  message: string;
  role: MessageRole;
  documentReferences: DocumentReference[];
  confidenceScore?: number;
  processingTimeMs?: number;
  createdAt: Date;
}

// ============================================================================
// REQUEST/RESPONSE INTERFACES
// ============================================================================

/**
 * Document upload request interface
 */
export interface DocumentUploadRequest {
  file: File;
  title?: string;
  folderId?: string;
  language?: string;
  metadata?: Partial<DocumentMetadata>;
}

/**
 * Document upload response interface
 */
export interface DocumentUploadResponse {
  documentId: string;
  status: ProcessingStatus;
  message: string;
  estimatedProcessingTime?: number;
}

/**
 * Search options interface
 */
export interface SearchOptions {
  documentIds?: string[];
  maxResults?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
  language?: string;
  enableCrossLanguage?: boolean;
  targetLanguages?: string[];
  folderId?: string;
}

/**
 * Multi-language search options
 */
export interface MultiLanguageSearchOptions extends SearchOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  enableTranslation?: boolean;
  translationQualityThreshold?: number;
}

/**
 * Search result interface
 */
export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  pageNumber?: number;
  similarity: number;
  sourceLanguage: string;
  isTranslated: boolean;
  metadata: ChunkMetadata;
  highlight?: string;
}

/**
 * Language statistics interface
 */
export interface LanguageStatistics {
  languageCode: string;
  languageName: string;
  documentCount: number;
  totalChunks: number;
  percentage: number;
}

/**
 * AI response interface
 */
export interface AIResponse {
  content: string;
  sources: DocumentReference[];
  confidence: number;
  processingTime: number;
  sessionId: string;
}

/**
 * Processing status update interface
 */
export interface ProcessingStatusUpdate {
  documentId: string;
  status: ProcessingStatus;
  progress?: number;
  message?: string;
  errorDetails?: string;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

/**
 * Enhanced error response interface
 */
export interface EnhancedErrorResponse {
  code: DocumentErrorCode | SearchErrorCode | string;
  message: string;
  details?: any;
  retryable: boolean;
  suggestedAction?: string;
  timestamp: Date;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Document creation input type
 */
export type DocumentCreateInput = Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'processedAt'>;

/**
 * Document update input type
 */
export type DocumentUpdateInput = Partial<Pick<Document, 'title' | 'folderId' | 'metadata'>>;

/**
 * Folder creation input type
 */
export type FolderCreateInput = Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'documentCount'>;

/**
 * Permission creation input type
 */
export type PermissionCreateInput = Omit<DocumentPermission, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Chat message creation input type
 */
export type ChatMessageCreateInput = Omit<EnhancedChatMessage, 'id' | 'createdAt'>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * File validation constants
 */
export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf'],
  MIN_FILE_SIZE: 1024, // 1KB
} as const;

/**
 * Search constraints
 */
export const SEARCH_CONSTRAINTS = {
  MIN_QUERY_LENGTH: 3,
  MAX_QUERY_LENGTH: 1000,
  DEFAULT_MAX_RESULTS: 10,
  MAX_RESULTS_LIMIT: 100,
  DEFAULT_MIN_SIMILARITY: 0.7,
  MIN_SIMILARITY_THRESHOLD: 0.1,
} as const;

/**
 * Processing constraints
 */
export const PROCESSING_CONSTRAINTS = {
  MAX_CHUNK_SIZE: 1000,
  MIN_CHUNK_SIZE: 100,
  CHUNK_OVERLAP: 200,
  MAX_PROCESSING_TIME: 30 * 60 * 1000, // 30 minutes
  EMBEDDING_DIMENSION: 1536, // OpenAI embedding dimension
} as const;

/**
 * Folder constraints
 */
export const FOLDER_CONSTRAINTS = {
  MAX_NAME_LENGTH: 255,
  MAX_DEPTH: 10,
  MAX_FOLDERS_PER_USER: 1000,
} as const;