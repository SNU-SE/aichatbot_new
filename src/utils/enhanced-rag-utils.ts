/**
 * Enhanced RAG System Utilities
 * This file contains utility functions for the enhanced RAG system
 */

import { 
  ProcessingStatus, 
  AccessLevel, 
  MessageRole,
  DocumentErrorCode,
  SearchErrorCode,
  EnhancedErrorResponse,
  FILE_CONSTRAINTS,
  SEARCH_CONSTRAINTS,
  Document,
  DocumentChunk,
  SearchResult,
  DocumentReference
} from '../types/enhanced-rag';

// ============================================================================
// FILE VALIDATION UTILITIES
// ============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a single file for upload
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (!FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    errors.push(`Unsupported file type: ${file.type}. Supported types: ${FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)})`);
  }

  if (file.size < FILE_CONSTRAINTS.MIN_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) is below minimum size (${formatFileSize(FILE_CONSTRAINTS.MIN_FILE_SIZE)})`);
  }

  // Check filename
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File must have a valid name');
  }

  // Check for potentially problematic characters in filename
  const problematicChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (problematicChars.test(file.name)) {
    warnings.push('Filename contains special characters that may cause issues');
  }

  // Check filename length
  if (file.name.length > 255) {
    errors.push('Filename is too long (maximum 255 characters)');
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(`Unsupported file extension: ${extension}. Supported extensions: ${FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates multiple files for batch upload
 */
export function validateMultipleFiles(files: File[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) {
    errors.push('No files selected');
    return { valid: false, errors, warnings };
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = FILE_CONSTRAINTS.MAX_FILE_SIZE * 5; // Allow up to 5x single file limit for batch
  
  if (totalSize > maxTotalSize) {
    errors.push(`Total file size (${formatFileSize(totalSize)}) exceeds maximum batch size (${formatFileSize(maxTotalSize)})`);
  }

  // Validate each file
  files.forEach((file, index) => {
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      errors.push(`File ${index + 1} (${file.name}): ${fileValidation.errors.join(', ')}`);
    }
    if (fileValidation.warnings && fileValidation.warnings.length > 0) {
      warnings.push(`File ${index + 1} (${file.name}): ${fileValidation.warnings.join(', ')}`);
    }
  });

  // Check for duplicate filenames
  const filenames = files.map(f => f.name.toLowerCase());
  const duplicates = filenames.filter((name, index) => filenames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate filenames detected: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// File formatting utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Ensure we don't exceed the sizes array
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace problematic characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 255);
}

// Processing status utilities
export function getProcessingStatusDisplay(status: ProcessingStatus): string {
  const statusMap: Record<ProcessingStatus, string> = {
    [ProcessingStatus.UPLOADING]: 'Uploading...',
    [ProcessingStatus.EXTRACTING]: 'Extracting text...',
    [ProcessingStatus.CHUNKING]: 'Creating chunks...',
    [ProcessingStatus.EMBEDDING]: 'Generating embeddings...',
    [ProcessingStatus.COMPLETED]: 'Completed',
    [ProcessingStatus.FAILED]: 'Failed'
  };
  
  return statusMap[status] || status;
}

export function getProcessingStatusColor(status: ProcessingStatus): string {
  const colorMap: Record<ProcessingStatus, string> = {
    [ProcessingStatus.UPLOADING]: 'blue',
    [ProcessingStatus.EXTRACTING]: 'yellow',
    [ProcessingStatus.CHUNKING]: 'orange',
    [ProcessingStatus.EMBEDDING]: 'purple',
    [ProcessingStatus.COMPLETED]: 'green',
    [ProcessingStatus.FAILED]: 'red'
  };
  
  return colorMap[status] || 'gray';
}

export function isProcessingComplete(status: ProcessingStatus): boolean {
  return status === ProcessingStatus.COMPLETED;
}

export function isProcessingFailed(status: ProcessingStatus): boolean {
  return status === ProcessingStatus.FAILED;
}

export function isProcessingInProgress(status: ProcessingStatus): boolean {
  return [
    ProcessingStatus.UPLOADING,
    ProcessingStatus.EXTRACTING,
    ProcessingStatus.CHUNKING,
    ProcessingStatus.EMBEDDING
  ].includes(status);
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Creates a standardized error response for document processing
 */
export function createProcessingError(
  code: DocumentErrorCode,
  message: string,
  details?: any,
  retryable: boolean = false
): EnhancedErrorResponse {
  const suggestedActions: Record<DocumentErrorCode, string> = {
    [DocumentErrorCode.INVALID_FILE_FORMAT]: 'Please upload a PDF file',
    [DocumentErrorCode.FILE_TOO_LARGE]: 'Please reduce file size or split into smaller files',
    [DocumentErrorCode.EXTRACTION_FAILED]: 'The PDF may be corrupted or password-protected',
    [DocumentErrorCode.EMBEDDING_FAILED]: 'Please try again or contact support',
    [DocumentErrorCode.STORAGE_ERROR]: 'Please check your connection and try again',
    [DocumentErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action',
    [DocumentErrorCode.DOCUMENT_NOT_FOUND]: 'The requested document could not be found',
    [DocumentErrorCode.PROCESSING_TIMEOUT]: 'Document processing took too long, please try again',
    [DocumentErrorCode.INVALID_DOCUMENT_STATE]: 'Document is in an invalid state for this operation',
    [DocumentErrorCode.NETWORK_ERROR]: 'Network error occurred, please check your connection'
  };

  return {
    code,
    message,
    details,
    retryable,
    suggestedAction: suggestedActions[code],
    timestamp: new Date()
  };
}

/**
 * Creates a standardized error response for search operations
 */
export function createSearchError(
  code: SearchErrorCode,
  message: string,
  details?: any,
  retryable: boolean = false
): EnhancedErrorResponse {
  const suggestedActions: Record<SearchErrorCode, string> = {
    [SearchErrorCode.QUERY_TOO_SHORT]: `Please enter at least ${SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH} characters`,
    [SearchErrorCode.EMBEDDING_GENERATION_FAILED]: 'Please try rephrasing your query',
    [SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE]: 'Search service is temporarily unavailable, please try again',
    [SearchErrorCode.NO_ACCESSIBLE_DOCUMENTS]: 'No documents are available for search',
    [SearchErrorCode.INVALID_SEARCH_PARAMETERS]: 'Please check your search parameters and try again'
  };

  return {
    code,
    message,
    details,
    retryable,
    suggestedAction: suggestedActions[code],
    timestamp: new Date()
  };
}

// Text processing utilities
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function extractTextPreview(text: string, query?: string, contextLength: number = 200): string {
  if (!query) {
    return truncateText(text, contextLength);
  }

  const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
  if (queryIndex === -1) {
    return truncateText(text, contextLength);
  }

  const start = Math.max(0, queryIndex - contextLength / 2);
  const end = Math.min(text.length, start + contextLength);
  
  let preview = text.substring(start, end);
  
  if (start > 0) preview = '...' + preview;
  if (end < text.length) preview = preview + '...';
  
  return preview;
}

// Date and time utilities
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return targetDate.toLocaleDateString();
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}m`;
  return `${(milliseconds / 3600000).toFixed(1)}h`;
}

// Permission utilities
export function hasPermission(userPermissions: AccessLevel[], requiredLevel: AccessLevel): boolean {
  const levelHierarchy: Record<AccessLevel, number> = {
    [AccessLevel.READ]: 1,
    [AccessLevel.WRITE]: 2,
    [AccessLevel.ADMIN]: 3
  };

  const userMaxLevel = Math.max(...userPermissions.map(p => levelHierarchy[p]));
  return userMaxLevel >= levelHierarchy[requiredLevel];
}

export function getPermissionDisplay(level: AccessLevel): string {
  const displayMap: Record<AccessLevel, string> = {
    [AccessLevel.READ]: 'Read Only',
    [AccessLevel.WRITE]: 'Read & Write',
    [AccessLevel.ADMIN]: 'Full Access'
  };
  
  return displayMap[level] || level;
}

// Search utilities
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const words = normalizeSearchQuery(text)
    .split(' ')
    .filter(word => word.length > 2)
    .filter(word => !isStopWord(word));

  // Count word frequency
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  return stopWords.has(word.toLowerCase());
}

// ============================================================================
// UUID UTILITIES
// ============================================================================

/**
 * Generates a new session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// DOCUMENT UTILITIES
// ============================================================================

/**
 * Sorts documents by various criteria
 */
export function sortDocuments(
  documents: Document[], 
  sortBy: 'title' | 'createdAt' | 'updatedAt' | 'fileSize' | 'processingStatus',
  order: 'asc' | 'desc' = 'desc'
): Document[] {
  return [...documents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'fileSize':
        comparison = a.fileSize - b.fileSize;
        break;
      case 'processingStatus':
        const statusOrder = {
          [ProcessingStatus.FAILED]: 0,
          [ProcessingStatus.UPLOADING]: 1,
          [ProcessingStatus.EXTRACTING]: 2,
          [ProcessingStatus.CHUNKING]: 3,
          [ProcessingStatus.EMBEDDING]: 4,
          [ProcessingStatus.COMPLETED]: 5
        };
        comparison = statusOrder[a.processingStatus] - statusOrder[b.processingStatus];
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filters documents based on criteria
 */
export function filterDocuments(
  documents: Document[],
  filters: {
    search?: string;
    processingStatus?: ProcessingStatus;
    language?: string;
    folderId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Document[] {
  return documents.filter(doc => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = doc.title.toLowerCase().includes(searchLower);
      const matchesFilename = doc.filename.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesFilename) return false;
    }
    
    // Status filter
    if (filters.processingStatus && doc.processingStatus !== filters.processingStatus) {
      return false;
    }
    
    // Language filter
    if (filters.language && doc.language !== filters.language) {
      return false;
    }
    
    // Folder filter
    if (filters.folderId && doc.folderId !== filters.folderId) {
      return false;
    }
    
    // Date range filter
    if (filters.dateFrom && new Date(doc.createdAt) < filters.dateFrom) {
      return false;
    }
    
    if (filters.dateTo && new Date(doc.createdAt) > filters.dateTo) {
      return false;
    }
    
    return true;
  });
}

/**
 * Groups documents by folder
 */
export function groupDocumentsByFolder(documents: Document[]): Record<string, Document[]> {
  return documents.reduce((groups, doc) => {
    const folderId = doc.folderId || 'root';
    if (!groups[folderId]) {
      groups[folderId] = [];
    }
    groups[folderId].push(doc);
    return groups;
  }, {} as Record<string, Document[]>);
}

// ============================================================================
// SEARCH RESULT UTILITIES
// ============================================================================

/**
 * Sorts search results by relevance and other criteria
 */
export function sortSearchResults(
  results: SearchResult[],
  sortBy: 'similarity' | 'documentTitle' | 'pageNumber' = 'similarity',
  order: 'asc' | 'desc' = 'desc'
): SearchResult[] {
  return [...results].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'similarity':
        comparison = a.similarity - b.similarity;
        break;
      case 'documentTitle':
        comparison = a.documentTitle.localeCompare(b.documentTitle);
        break;
      case 'pageNumber':
        const pageA = a.pageNumber || 0;
        const pageB = b.pageNumber || 0;
        comparison = pageA - pageB;
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Groups search results by document
 */
export function groupSearchResultsByDocument(results: SearchResult[]): Record<string, SearchResult[]> {
  return results.reduce((groups, result) => {
    if (!groups[result.documentId]) {
      groups[result.documentId] = [];
    }
    groups[result.documentId].push(result);
    return groups;
  }, {} as Record<string, SearchResult[]>);
}

/**
 * Calculates search result statistics
 */
export function calculateSearchStats(results: SearchResult[]): {
  totalResults: number;
  uniqueDocuments: number;
  averageSimilarity: number;
  maxSimilarity: number;
  minSimilarity: number;
} {
  if (results.length === 0) {
    return {
      totalResults: 0,
      uniqueDocuments: 0,
      averageSimilarity: 0,
      maxSimilarity: 0,
      minSimilarity: 0
    };
  }

  const uniqueDocuments = new Set(results.map(r => r.documentId)).size;
  const similarities = results.map(r => r.similarity);
  const averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  const maxSimilarity = Math.max(...similarities);
  const minSimilarity = Math.min(...similarities);

  return {
    totalResults: results.length,
    uniqueDocuments,
    averageSimilarity,
    maxSimilarity,
    minSimilarity
  };
}

// ============================================================================
// DOCUMENT REFERENCE UTILITIES
// ============================================================================

/**
 * Creates a formatted citation from document references
 */
export function formatDocumentCitation(references: DocumentReference[]): string {
  if (references.length === 0) return '';
  
  const citations = references.map(ref => {
    let citation = ref.documentTitle;
    if (ref.pageNumber) {
      citation += `, p. ${ref.pageNumber}`;
    }
    return citation;
  });
  
  return `Sources: ${citations.join('; ')}`;
}

/**
 * Extracts unique documents from references
 */
export function getUniqueDocumentsFromReferences(references: DocumentReference[]): string[] {
  return [...new Set(references.map(ref => ref.documentId))];
}

/**
 * Calculates average confidence from references
 */
export function calculateAverageConfidence(references: DocumentReference[]): number {
  if (references.length === 0) return 0;
  
  const confidences = references
    .map(ref => ref.confidence || ref.relevanceScore)
    .filter(conf => conf !== undefined);
    
  if (confidences.length === 0) return 0;
  
  return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
}