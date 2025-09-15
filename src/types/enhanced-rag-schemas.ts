/**
 * Enhanced RAG System Validation Schemas
 * Zod schemas for runtime validation of enhanced RAG system data
 */

import { z } from 'zod';
import {
  ProcessingStatus,
  AccessLevel,
  MessageRole,
  DocumentErrorCode,
  SearchErrorCode,
  FILE_CONSTRAINTS,
  SEARCH_CONSTRAINTS,
  PROCESSING_CONSTRAINTS,
  FOLDER_CONSTRAINTS,
} from './enhanced-rag';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const ProcessingStatusSchema = z.nativeEnum(ProcessingStatus);
export const AccessLevelSchema = z.nativeEnum(AccessLevel);
export const MessageRoleSchema = z.nativeEnum(MessageRole);
export const DocumentErrorCodeSchema = z.nativeEnum(DocumentErrorCode);
export const SearchErrorCodeSchema = z.nativeEnum(SearchErrorCode);

// ============================================================================
// BASIC VALIDATION SCHEMAS
// ============================================================================

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format');

/**
 * File validation schema
 */
export const FileSchema = z.object({
  name: z.string().min(1, 'Filename is required'),
  size: z.number()
    .min(FILE_CONSTRAINTS.MIN_FILE_SIZE, `File must be at least ${FILE_CONSTRAINTS.MIN_FILE_SIZE} bytes`)
    .max(FILE_CONSTRAINTS.MAX_FILE_SIZE, `File must be smaller than ${FILE_CONSTRAINTS.MAX_FILE_SIZE} bytes`),
  type: z.string()
    .refine(
      (type) => FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(type as any),
      `File type must be one of: ${FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.join(', ')}`
    ),
});

/**
 * Language code validation schema
 */
export const LanguageSchema = z.string()
  .min(2, 'Language code must be at least 2 characters')
  .max(10, 'Language code must be at most 10 characters')
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$|^auto$/, 'Invalid language code format');

/**
 * Folder name validation schema
 */
export const FolderNameSchema = z.string()
  .min(1, 'Folder name is required')
  .max(FOLDER_CONSTRAINTS.MAX_NAME_LENGTH, `Folder name must be at most ${FOLDER_CONSTRAINTS.MAX_NAME_LENGTH} characters`)
  .regex(/^[^/\\:*?"<>|]+$/, 'Folder name contains invalid characters');

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

/**
 * Document metadata validation schema
 */
export const DocumentMetadataSchema = z.object({
  pageCount: z.number().int().positive().optional(),
  wordCount: z.number().int().nonnegative().optional(),
  language: LanguageSchema.optional(),
  extractionMethod: z.string().optional(),
  processingDuration: z.number().nonnegative().optional(),
  errorDetails: z.string().optional(),
  customFields: z.record(z.any()).optional(),
}).strict();

/**
 * Chunk metadata validation schema
 */
export const ChunkMetadataSchema = z.object({
  wordCount: z.number().int().nonnegative().optional(),
  sentenceCount: z.number().int().nonnegative().optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  customFields: z.record(z.any()).optional(),
}).strict();

/**
 * Chunk position validation schema
 */
export const ChunkPositionSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
}).refine(
  (data) => data.start <= data.end,
  'Start position must be less than or equal to end position'
);

// ============================================================================
// CORE ENTITY SCHEMAS
// ============================================================================

/**
 * Document validation schema
 */
export const DocumentSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename must be at most 255 characters'),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().int()
    .min(FILE_CONSTRAINTS.MIN_FILE_SIZE)
    .max(FILE_CONSTRAINTS.MAX_FILE_SIZE),
  mimeType: z.string().refine(
    (type) => FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(type as any),
    'Invalid MIME type'
  ),
  language: LanguageSchema,
  processingStatus: ProcessingStatusSchema,
  folderId: UUIDSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  processedAt: z.date().optional(),
  metadata: DocumentMetadataSchema,
}).strict();

/**
 * Document chunk validation schema
 */
export const DocumentChunkSchema = z.object({
  id: UUIDSchema,
  documentId: UUIDSchema,
  chunkIndex: z.number().int().nonnegative(),
  content: z.string()
    .min(PROCESSING_CONSTRAINTS.MIN_CHUNK_SIZE, `Chunk content must be at least ${PROCESSING_CONSTRAINTS.MIN_CHUNK_SIZE} characters`)
    .max(PROCESSING_CONSTRAINTS.MAX_CHUNK_SIZE, `Chunk content must be at most ${PROCESSING_CONSTRAINTS.MAX_CHUNK_SIZE} characters`),
  pageNumber: z.number().int().positive().optional(),
  positionStart: z.number().int().nonnegative().optional(),
  positionEnd: z.number().int().nonnegative().optional(),
  embedding: z.array(z.number()).length(PROCESSING_CONSTRAINTS.EMBEDDING_DIMENSION).optional(),
  metadata: ChunkMetadataSchema,
  createdAt: z.date(),
}).strict()
.refine(
  (data) => {
    if (data.positionStart !== undefined && data.positionEnd !== undefined) {
      return data.positionStart <= data.positionEnd;
    }
    return true;
  },
  'Position start must be less than or equal to position end'
);

/**
 * Document folder validation schema
 */
export const DocumentFolderSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  name: FolderNameSchema,
  parentId: UUIDSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  children: z.array(z.lazy(() => DocumentFolderSchema)).optional(),
  documentCount: z.number().int().nonnegative().optional(),
}).strict();

/**
 * Document permission validation schema
 */
export const DocumentPermissionSchema = z.object({
  id: UUIDSchema,
  documentId: UUIDSchema,
  classId: UUIDSchema.optional(),
  userId: UUIDSchema.optional(),
  permissionLevel: AccessLevelSchema,
  grantedBy: UUIDSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict()
.refine(
  (data) => (data.classId !== undefined) !== (data.userId !== undefined),
  'Either classId or userId must be specified, but not both'
);

/**
 * Document reference validation schema
 */
export const DocumentReferenceSchema = z.object({
  documentId: UUIDSchema,
  documentTitle: z.string().min(1, 'Document title is required'),
  chunkId: UUIDSchema,
  pageNumber: z.number().int().positive().optional(),
  relevanceScore: z.number().min(0).max(1),
  excerpt: z.string().min(1, 'Excerpt is required').max(500, 'Excerpt must be at most 500 characters'),
  confidence: z.number().min(0).max(1).optional(),
}).strict();

/**
 * Enhanced chat message validation schema
 */
export const EnhancedChatMessageSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  sessionId: UUIDSchema,
  message: z.string().min(1, 'Message is required').max(10000, 'Message must be at most 10000 characters'),
  role: MessageRoleSchema,
  documentReferences: z.array(DocumentReferenceSchema),
  confidenceScore: z.number().min(0).max(1).optional(),
  processingTimeMs: z.number().int().nonnegative().optional(),
  createdAt: z.date(),
}).strict();

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

/**
 * Document upload request validation schema
 */
export const DocumentUploadRequestSchema = z.object({
  file: FileSchema,
  title: z.string().min(1).max(255).optional(),
  folderId: UUIDSchema.optional(),
  language: LanguageSchema.optional(),
  metadata: DocumentMetadataSchema.partial().optional(),
}).strict();

/**
 * Document upload response validation schema
 */
export const DocumentUploadResponseSchema = z.object({
  documentId: UUIDSchema,
  status: ProcessingStatusSchema,
  message: z.string().min(1, 'Message is required'),
  estimatedProcessingTime: z.number().int().nonnegative().optional(),
}).strict();

/**
 * Search options validation schema
 */
export const SearchOptionsSchema = z.object({
  documentIds: z.array(UUIDSchema).optional(),
  maxResults: z.number().int()
    .min(1, 'Max results must be at least 1')
    .max(SEARCH_CONSTRAINTS.MAX_RESULTS_LIMIT, `Max results must be at most ${SEARCH_CONSTRAINTS.MAX_RESULTS_LIMIT}`)
    .default(SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS),
  minSimilarity: z.number()
    .min(SEARCH_CONSTRAINTS.MIN_SIMILARITY_THRESHOLD, `Min similarity must be at least ${SEARCH_CONSTRAINTS.MIN_SIMILARITY_THRESHOLD}`)
    .max(1, 'Min similarity must be at most 1')
    .default(SEARCH_CONSTRAINTS.DEFAULT_MIN_SIMILARITY),
  includeMetadata: z.boolean().default(false),
  language: LanguageSchema.optional(),
  folderId: UUIDSchema.optional(),
}).strict();

/**
 * Extended search options validation schema for frontend service
 */
export const ExtendedSearchOptionsSchema = SearchOptionsSchema.extend({
  hybridSearch: z.boolean().optional(),
  keywordWeight: z.number().min(0).max(1).optional(),
  vectorWeight: z.number().min(0).max(1).optional(),
}).strict();

/**
 * Search result validation schema
 */
export const SearchResultSchema = z.object({
  chunkId: UUIDSchema,
  documentId: UUIDSchema,
  documentTitle: z.string().min(1, 'Document title is required'),
  content: z.string().min(1, 'Content is required'),
  pageNumber: z.number().int().positive().optional(),
  similarity: z.number().min(0).max(1),
  metadata: ChunkMetadataSchema,
  highlight: z.string().optional(),
}).strict();

/**
 * AI response validation schema
 */
export const AIResponseSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  sources: z.array(DocumentReferenceSchema),
  confidence: z.number().min(0).max(1),
  processingTime: z.number().nonnegative(),
  sessionId: UUIDSchema,
}).strict();

/**
 * Processing status update validation schema
 */
export const ProcessingStatusUpdateSchema = z.object({
  documentId: UUIDSchema,
  status: ProcessingStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  errorDetails: z.string().optional(),
  estimatedTimeRemaining: z.number().int().nonnegative().optional(),
}).strict();

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

/**
 * Enhanced error response validation schema
 */
export const EnhancedErrorResponseSchema = z.object({
  code: z.union([DocumentErrorCodeSchema, SearchErrorCodeSchema, z.string()]),
  message: z.string().min(1, 'Error message is required'),
  details: z.any().optional(),
  retryable: z.boolean(),
  suggestedAction: z.string().optional(),
  timestamp: z.date(),
}).strict();

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  message: z.string().min(1, 'Error message is required'),
  code: z.string().min(1, 'Error code is required'),
  value: z.any().optional(),
}).strict();

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Document creation input validation schema
 */
export const DocumentCreateInputSchema = z.object({
  userId: UUIDSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename must be at most 255 characters'),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().int()
    .min(FILE_CONSTRAINTS.MIN_FILE_SIZE)
    .max(FILE_CONSTRAINTS.MAX_FILE_SIZE),
  mimeType: z.string().refine(
    (type) => FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(type as any),
    'Invalid MIME type'
  ),
  language: LanguageSchema,
  processingStatus: ProcessingStatusSchema,
  folderId: UUIDSchema.optional(),
  metadata: DocumentMetadataSchema,
}).strict();

/**
 * Document update input validation schema
 */
export const DocumentUpdateInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters').optional(),
  folderId: UUIDSchema.optional(),
  metadata: DocumentMetadataSchema.optional(),
}).strict();

/**
 * Folder creation input validation schema
 */
export const FolderCreateInputSchema = z.object({
  userId: UUIDSchema,
  name: FolderNameSchema,
  parentId: UUIDSchema.optional(),
}).strict();

/**
 * Permission creation input validation schema
 */
export const PermissionCreateInputSchema = z.object({
  documentId: UUIDSchema,
  classId: UUIDSchema.optional(),
  userId: UUIDSchema.optional(),
  permissionLevel: AccessLevelSchema,
  grantedBy: UUIDSchema.optional(),
}).strict()
.refine(
  (data) => (data.classId !== undefined) !== (data.userId !== undefined),
  'Either classId or userId must be specified, but not both'
);

/**
 * Chat message creation input validation schema
 */
export const ChatMessageCreateInputSchema = z.object({
  userId: UUIDSchema,
  sessionId: UUIDSchema,
  message: z.string().min(1, 'Message is required').max(10000, 'Message must be at most 10000 characters'),
  role: MessageRoleSchema,
  documentReferences: z.array(DocumentReferenceSchema),
  confidenceScore: z.number().min(0).max(1).optional(),
  processingTimeMs: z.number().int().nonnegative().optional(),
}).strict();

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Search query validation schema
 */
export const SearchQuerySchema = z.object({
  query: z.string()
    .min(SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH, `Query must be at least ${SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH} characters`)
    .max(SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH, `Query must be at most ${SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH} characters`),
  options: SearchOptionsSchema.optional(),
}).strict();

/**
 * Pagination parameters validation schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

/**
 * Document list filters validation schema
 */
export const DocumentFiltersSchema = z.object({
  folderId: UUIDSchema.optional(),
  processingStatus: ProcessingStatusSchema.optional(),
  language: LanguageSchema.optional(),
  search: z.string().max(255).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
}).strict()
.refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return data.dateFrom <= data.dateTo;
    }
    return true;
  },
  'Date from must be before or equal to date to'
);

// ============================================================================
// UTILITY VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates file extension against filename
 */
export const validateFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
};

/**
 * Validates MIME type against file extension
 */
export const validateMimeTypeConsistency = (filename: string, mimeType: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const mimeTypeMap: Record<string, string[]> = {
    '.pdf': ['application/pdf'],
  };
  
  const allowedMimeTypes = mimeTypeMap[extension];
  return allowedMimeTypes ? allowedMimeTypes.includes(mimeType) : false;
};

/**
 * Validates folder hierarchy depth
 */
export const validateFolderDepth = (parentPath: string[]): boolean => {
  return parentPath.length < FOLDER_CONSTRAINTS.MAX_DEPTH;
};

/**
 * Validates embedding vector dimensions
 */
export const validateEmbeddingDimensions = (embedding: number[]): boolean => {
  return embedding.length === PROCESSING_CONSTRAINTS.EMBEDDING_DIMENSION;
};

/**
 * Validates search similarity threshold
 */
export const validateSimilarityThreshold = (threshold: number): boolean => {
  return threshold >= SEARCH_CONSTRAINTS.MIN_SIMILARITY_THRESHOLD && threshold <= 1;
};