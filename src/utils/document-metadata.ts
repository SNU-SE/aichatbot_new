/**
 * Document Metadata Utilities
 * Utility functions for handling document metadata in the enhanced RAG system
 */

import {
  Document,
  DocumentChunk,
  DocumentMetadata,
  ChunkMetadata,
  ProcessingStatus,
  DocumentErrorCode,
  EnhancedErrorResponse,
  FILE_CONSTRAINTS,
  PROCESSING_CONSTRAINTS,
} from '../types/enhanced-rag';

// ============================================================================
// METADATA CREATION UTILITIES
// ============================================================================

/**
 * Creates initial document metadata from file information
 */
export const createInitialDocumentMetadata = (
  file: File,
  additionalMetadata?: Partial<DocumentMetadata>
): DocumentMetadata => {
  return {
    pageCount: undefined, // Will be set after processing
    wordCount: undefined, // Will be set after processing
    language: 'auto', // Will be detected during processing
    extractionMethod: 'pdf-parse', // Default extraction method
    processingDuration: undefined, // Will be set after processing
    errorDetails: undefined,
    customFields: {},
    ...additionalMetadata,
  };
};

/**
 * Creates chunk metadata from processing information
 */
export const createChunkMetadata = (
  content: string,
  extractionConfidence?: number,
  additionalMetadata?: Partial<ChunkMetadata>
): ChunkMetadata => {
  const wordCount = countWords(content);
  const sentenceCount = countSentences(content);

  return {
    wordCount,
    sentenceCount,
    extractionConfidence,
    customFields: {},
    ...additionalMetadata,
  };
};

/**
 * Updates document metadata after successful processing
 */
export const updateDocumentMetadataAfterProcessing = (
  currentMetadata: DocumentMetadata,
  chunks: DocumentChunk[],
  processingDuration: number,
  detectedLanguage?: string
): DocumentMetadata => {
  const totalWordCount = chunks.reduce((sum, chunk) => 
    sum + (chunk.metadata.wordCount || 0), 0
  );

  const pageCount = Math.max(...chunks.map(chunk => chunk.pageNumber || 1));

  return {
    ...currentMetadata,
    pageCount,
    wordCount: totalWordCount,
    language: detectedLanguage || currentMetadata.language || 'auto',
    processingDuration,
    errorDetails: undefined, // Clear any previous errors
  };
};

/**
 * Updates document metadata after processing failure
 */
export const updateDocumentMetadataAfterError = (
  currentMetadata: DocumentMetadata,
  errorCode: DocumentErrorCode,
  errorMessage: string,
  processingDuration?: number
): DocumentMetadata => {
  return {
    ...currentMetadata,
    processingDuration,
    errorDetails: `${errorCode}: ${errorMessage}`,
  };
};

// ============================================================================
// METADATA VALIDATION UTILITIES
// ============================================================================

/**
 * Validates file metadata before upload
 */
export const validateFileMetadata = (file: File): EnhancedErrorResponse | null => {
  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    return {
      code: DocumentErrorCode.FILE_TOO_LARGE,
      message: `File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)}`,
      retryable: false,
      suggestedAction: 'Please select a smaller file or compress the document',
      timestamp: new Date(),
    };
  }

  if (file.size < FILE_CONSTRAINTS.MIN_FILE_SIZE) {
    return {
      code: DocumentErrorCode.INVALID_FILE_FORMAT,
      message: `File size ${formatFileSize(file.size)} is too small`,
      retryable: false,
      suggestedAction: 'Please select a valid document file',
      timestamp: new Date(),
    };
  }

  // Check file type
  if (!FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      code: DocumentErrorCode.INVALID_FILE_FORMAT,
      message: `File type ${file.type} is not supported. Allowed types: ${FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.join(', ')}`,
      retryable: false,
      suggestedAction: 'Please select a PDF file',
      timestamp: new Date(),
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      code: DocumentErrorCode.INVALID_FILE_FORMAT,
      message: `File extension ${extension} is not supported. Allowed extensions: ${FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`,
      retryable: false,
      suggestedAction: 'Please select a file with a valid extension',
      timestamp: new Date(),
    };
  }

  return null; // No validation errors
};

/**
 * Validates document processing status transition
 */
export const validateStatusTransition = (
  currentStatus: ProcessingStatus,
  newStatus: ProcessingStatus
): boolean => {
  const validTransitions: Record<ProcessingStatus, ProcessingStatus[]> = {
    [ProcessingStatus.UPLOADING]: [ProcessingStatus.EXTRACTING, ProcessingStatus.FAILED],
    [ProcessingStatus.EXTRACTING]: [ProcessingStatus.CHUNKING, ProcessingStatus.FAILED],
    [ProcessingStatus.CHUNKING]: [ProcessingStatus.EMBEDDING, ProcessingStatus.FAILED],
    [ProcessingStatus.EMBEDDING]: [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED],
    [ProcessingStatus.COMPLETED]: [], // Terminal state
    [ProcessingStatus.FAILED]: [ProcessingStatus.UPLOADING], // Can retry from failed
  };

  return validTransitions[currentStatus].includes(newStatus);
};

/**
 * Validates chunk content and metadata
 */
export const validateChunkContent = (content: string): EnhancedErrorResponse | null => {
  if (content.length < PROCESSING_CONSTRAINTS.MIN_CHUNK_SIZE) {
    return {
      code: DocumentErrorCode.EXTRACTION_FAILED,
      message: `Chunk content is too short (${content.length} characters). Minimum required: ${PROCESSING_CONSTRAINTS.MIN_CHUNK_SIZE}`,
      retryable: true,
      suggestedAction: 'Try adjusting chunk size parameters',
      timestamp: new Date(),
    };
  }

  if (content.length > PROCESSING_CONSTRAINTS.MAX_CHUNK_SIZE) {
    return {
      code: DocumentErrorCode.EXTRACTION_FAILED,
      message: `Chunk content is too long (${content.length} characters). Maximum allowed: ${PROCESSING_CONSTRAINTS.MAX_CHUNK_SIZE}`,
      retryable: true,
      suggestedAction: 'Try reducing chunk size parameters',
      timestamp: new Date(),
    };
  }

  return null;
};

// ============================================================================
// METADATA ANALYSIS UTILITIES
// ============================================================================

/**
 * Analyzes document processing efficiency
 */
export const analyzeProcessingEfficiency = (document: Document): {
  efficiency: 'high' | 'medium' | 'low';
  metrics: {
    processingTimePerPage?: number;
    processingTimePerWord?: number;
    extractionRate?: number;
  };
  suggestions: string[];
} => {
  const { metadata } = document;
  const suggestions: string[] = [];
  
  if (!metadata.processingDuration || !metadata.pageCount || !metadata.wordCount) {
    return {
      efficiency: 'low',
      metrics: {},
      suggestions: ['Insufficient processing data for analysis'],
    };
  }

  const processingTimePerPage = metadata.processingDuration / metadata.pageCount;
  const processingTimePerWord = metadata.processingDuration / metadata.wordCount;
  const extractionRate = metadata.wordCount / document.fileSize; // words per byte

  let efficiency: 'high' | 'medium' | 'low' = 'high';

  // Analyze processing time per page (assuming reasonable thresholds)
  if (processingTimePerPage > 10000) { // > 10 seconds per page
    efficiency = 'low';
    suggestions.push('Consider optimizing PDF structure or reducing image content');
  } else if (processingTimePerPage > 5000) { // > 5 seconds per page
    efficiency = 'medium';
    suggestions.push('Processing time is moderate, document complexity may be high');
  }

  // Analyze extraction rate
  if (extractionRate < 0.001) { // Very low text-to-file-size ratio
    efficiency = 'low';
    suggestions.push('Document may contain mostly images or complex formatting');
  }

  return {
    efficiency,
    metrics: {
      processingTimePerPage,
      processingTimePerWord,
      extractionRate,
    },
    suggestions,
  };
};

/**
 * Generates processing summary for document
 */
export const generateProcessingSummary = (document: Document, chunks: DocumentChunk[]): {
  summary: string;
  statistics: {
    totalChunks: number;
    averageChunkSize: number;
    totalWords: number;
    averageWordsPerChunk: number;
    processingTime: number;
    pagesProcessed: number;
  };
} => {
  const totalChunks = chunks.length;
  const totalWords = chunks.reduce((sum, chunk) => sum + (chunk.metadata.wordCount || 0), 0);
  const averageChunkSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / totalChunks;
  const averageWordsPerChunk = totalWords / totalChunks;
  const pagesProcessed = document.metadata.pageCount || 0;
  const processingTime = document.metadata.processingDuration || 0;

  const summary = `Successfully processed ${pagesProcessed} pages into ${totalChunks} chunks containing ${totalWords} words in ${formatDuration(processingTime)}.`;

  return {
    summary,
    statistics: {
      totalChunks,
      averageChunkSize: Math.round(averageChunkSize),
      totalWords,
      averageWordsPerChunk: Math.round(averageWordsPerChunk),
      processingTime,
      pagesProcessed,
    },
  };
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Counts words in text content
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Counts sentences in text content
 */
export const countSentences = (text: string): number => {
  return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
};

/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Formats duration in human-readable format
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Extracts language from document content (basic implementation)
 */
export const detectLanguage = (content: string): string => {
  // This is a simplified language detection
  // In a real implementation, you might use a library like franc or langdetect
  
  const commonWords = {
    en: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
    es: ['el', 'la', 'y', 'o', 'pero', 'en', 'con', 'por', 'para', 'de', 'que', 'se'],
    fr: ['le', 'la', 'et', 'ou', 'mais', 'dans', 'sur', 'à', 'pour', 'de', 'avec', 'par'],
    de: ['der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'auf', 'zu', 'für', 'von', 'mit'],
  };

  const words = content.toLowerCase().split(/\s+/).slice(0, 100); // Check first 100 words
  const scores: Record<string, number> = {};

  Object.entries(commonWords).forEach(([lang, langWords]) => {
    scores[lang] = words.filter(word => langWords.includes(word)).length;
  });

  const detectedLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
  
  return scores[detectedLang] > 2 ? detectedLang : 'auto'; // Require at least 3 matches
};

/**
 * Sanitizes filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Limit length
};

/**
 * Generates unique document title if title already exists
 */
export const generateUniqueTitle = (baseTitle: string, existingTitles: string[]): string => {
  let title = baseTitle;
  let counter = 1;

  while (existingTitles.includes(title)) {
    title = `${baseTitle} (${counter})`;
    counter++;
  }

  return title;
};

/**
 * Calculates estimated processing time based on document characteristics
 */
export const estimateProcessingTime = (fileSize: number, pageCount?: number): number => {
  // Base time per MB (in milliseconds)
  const baseTimePerMB = 5000; // 5 seconds per MB
  
  // Additional time per page (in milliseconds)
  const timePerPage = 1000; // 1 second per page
  
  const fileSizeInMB = fileSize / (1024 * 1024);
  let estimatedTime = fileSizeInMB * baseTimePerMB;
  
  if (pageCount) {
    estimatedTime += pageCount * timePerPage;
  }
  
  // Add 20% buffer for processing overhead
  return Math.round(estimatedTime * 1.2);
};

/**
 * Validates and normalizes document metadata
 */
export const normalizeDocumentMetadata = (metadata: Partial<DocumentMetadata>): DocumentMetadata => {
  return {
    pageCount: metadata.pageCount && metadata.pageCount > 0 ? metadata.pageCount : undefined,
    wordCount: metadata.wordCount && metadata.wordCount >= 0 ? metadata.wordCount : undefined,
    language: metadata.language || 'auto',
    extractionMethod: metadata.extractionMethod || 'pdf-parse',
    processingDuration: metadata.processingDuration && metadata.processingDuration >= 0 ? metadata.processingDuration : undefined,
    errorDetails: metadata.errorDetails || undefined,
    customFields: metadata.customFields || {},
  };
};