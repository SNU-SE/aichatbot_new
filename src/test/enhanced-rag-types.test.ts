/**
 * Enhanced RAG Types Test Suite
 * Tests for the enhanced RAG system types, schemas, and utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ProcessingStatus,
  AccessLevel,
  MessageRole,
  DocumentErrorCode,
  SearchErrorCode,
  FILE_CONSTRAINTS,
  SEARCH_CONSTRAINTS,
  Document,
  DocumentChunk,
  DocumentFolder,
  DocumentPermission,
  DocumentReference,
  EnhancedChatMessage,
  DocumentMetadata,
  ChunkMetadata,
} from '../types/enhanced-rag';

import {
  DocumentSchema,
  DocumentChunkSchema,
  DocumentFolderSchema,
  DocumentPermissionSchema,
  DocumentReferenceSchema,
  EnhancedChatMessageSchema,
  DocumentMetadataSchema,
  ChunkMetadataSchema,
  SearchOptionsSchema,
  ValidationErrorSchema,
} from '../types/enhanced-rag-schemas';

import {
  validateFile,
  validateMultipleFiles,
  createProcessingError,
  createSearchError,
  formatFileSize,
  getProcessingStatusDisplay,
  isProcessingComplete,
  sortDocuments,
  filterDocuments,
  formatDocumentCitation,
} from '../utils/enhanced-rag-utils';

import {
  createInitialDocumentMetadata,
  createChunkMetadata,
  validateFileMetadata,
  countWords,
  countSentences,
  formatDuration,
  detectLanguage,
} from '../utils/document-metadata';

describe('Enhanced RAG Types', () => {
  describe('Enums', () => {
    it('should have correct ProcessingStatus values', () => {
      expect(ProcessingStatus.UPLOADING).toBe('uploading');
      expect(ProcessingStatus.EXTRACTING).toBe('extracting');
      expect(ProcessingStatus.CHUNKING).toBe('chunking');
      expect(ProcessingStatus.EMBEDDING).toBe('embedding');
      expect(ProcessingStatus.COMPLETED).toBe('completed');
      expect(ProcessingStatus.FAILED).toBe('failed');
    });

    it('should have correct AccessLevel values', () => {
      expect(AccessLevel.READ).toBe('read');
      expect(AccessLevel.WRITE).toBe('write');
      expect(AccessLevel.ADMIN).toBe('admin');
    });

    it('should have correct MessageRole values', () => {
      expect(MessageRole.USER).toBe('user');
      expect(MessageRole.ASSISTANT).toBe('assistant');
      expect(MessageRole.SYSTEM).toBe('system');
    });
  });

  describe('Constants', () => {
    it('should have correct file constraints', () => {
      expect(FILE_CONSTRAINTS.MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
      expect(FILE_CONSTRAINTS.ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(FILE_CONSTRAINTS.ALLOWED_EXTENSIONS).toContain('.pdf');
      expect(FILE_CONSTRAINTS.MIN_FILE_SIZE).toBe(1024);
    });

    it('should have correct search constraints', () => {
      expect(SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH).toBe(3);
      expect(SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS).toBe(10);
      expect(SEARCH_CONSTRAINTS.DEFAULT_MIN_SIMILARITY).toBe(0.7);
    });
  });
});

describe('Zod Schemas', () => {
  describe('DocumentSchema', () => {
    it('should validate a correct document', () => {
      const validDocument: Document = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Test Document',
        filename: 'test.pdf',
        filePath: '/documents/test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        language: 'en',
        processingStatus: ProcessingStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          pageCount: 10,
          wordCount: 1000,
          language: 'en',
        },
      };

      const result = DocumentSchema.safeParse(validDocument);
      expect(result.success).toBe(true);
    });

    it('should reject invalid document', () => {
      const invalidDocument = {
        id: 'invalid-uuid',
        title: '', // Empty title should fail
        fileSize: -1, // Negative size should fail
      };

      const result = DocumentSchema.safeParse(invalidDocument);
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentChunkSchema', () => {
    it('should validate a correct chunk', () => {
      const validChunk: DocumentChunk = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        documentId: '123e4567-e89b-12d3-a456-426614174001',
        chunkIndex: 0,
        content: 'This is a test chunk with sufficient content to meet minimum requirements for validation. This content is long enough to pass the minimum chunk size validation which requires at least 100 characters for proper processing.',
        pageNumber: 1,
        positionStart: 0,
        positionEnd: 100,
        metadata: {
          wordCount: 15,
          sentenceCount: 1,
        },
        createdAt: new Date(),
      };

      const result = DocumentChunkSchema.safeParse(validChunk);
      if (!result.success) {
        console.log('Validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });
  });

  describe('SearchOptionsSchema', () => {
    it('should validate correct search options', () => {
      const validOptions = {
        maxResults: 20,
        minSimilarity: 0.8,
        includeMetadata: true,
      };

      const result = SearchOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      expect(result.data?.maxResults).toBe(20);
    });

    it('should apply defaults for missing options', () => {
      const result = SearchOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.maxResults).toBe(SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS);
      expect(result.data?.minSimilarity).toBe(SEARCH_CONSTRAINTS.DEFAULT_MIN_SIMILARITY);
    });
  });
});

describe('Enhanced RAG Utils', () => {
  describe('File Validation', () => {
    it('should validate correct PDF file', () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });
      
      // Mock file size
      Object.defineProperty(mockFile, 'size', {
        value: 1024 * 1024, // 1MB
        writable: false,
      });

      const result = validateFile(mockFile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid file type', () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const result = validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unsupported file type'))).toBe(true);
    });

    it('should reject oversized file', () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });
      
      // Mock oversized file
      Object.defineProperty(mockFile, 'size', {
        value: FILE_CONSTRAINTS.MAX_FILE_SIZE + 1,
        writable: false,
      });

      const result = validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
    });
  });

  describe('Error Creation', () => {
    it('should create processing error with correct structure', () => {
      const error = createProcessingError(
        DocumentErrorCode.EXTRACTION_FAILED,
        'Failed to extract text from PDF',
        { details: 'Corrupted file' },
        true
      );

      expect(error.code).toBe(DocumentErrorCode.EXTRACTION_FAILED);
      expect(error.message).toBe('Failed to extract text from PDF');
      expect(error.retryable).toBe(true);
      expect(error.suggestedAction).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create search error with correct structure', () => {
      const error = createSearchError(
        SearchErrorCode.QUERY_TOO_SHORT,
        'Query must be longer',
        null,
        false
      );

      expect(error.code).toBe(SearchErrorCode.QUERY_TOO_SHORT);
      expect(error.retryable).toBe(false);
      expect(error.suggestedAction).toContain('at least');
    });
  });

  describe('Processing Status Utils', () => {
    it('should return correct status display', () => {
      expect(getProcessingStatusDisplay(ProcessingStatus.UPLOADING)).toBe('Uploading...');
      expect(getProcessingStatusDisplay(ProcessingStatus.COMPLETED)).toBe('Completed');
      expect(getProcessingStatusDisplay(ProcessingStatus.FAILED)).toBe('Failed');
    });

    it('should correctly identify completed status', () => {
      expect(isProcessingComplete(ProcessingStatus.COMPLETED)).toBe(true);
      expect(isProcessingComplete(ProcessingStatus.UPLOADING)).toBe(false);
      expect(isProcessingComplete(ProcessingStatus.FAILED)).toBe(false);
    });
  });

  describe('Document Utilities', () => {
    const mockDocuments: Document[] = [
      {
        id: '1',
        userId: 'user1',
        title: 'Document A',
        filename: 'a.pdf',
        filePath: '/a.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        language: 'en',
        processingStatus: ProcessingStatus.COMPLETED,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        metadata: {},
      },
      {
        id: '2',
        userId: 'user1',
        title: 'Document B',
        filename: 'b.pdf',
        filePath: '/b.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
        language: 'es',
        processingStatus: ProcessingStatus.FAILED,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
        metadata: {},
      },
    ];

    it('should sort documents by title', () => {
      const sorted = sortDocuments(mockDocuments, 'title', 'asc');
      expect(sorted[0].title).toBe('Document A');
      expect(sorted[1].title).toBe('Document B');
    });

    it('should filter documents by status', () => {
      const filtered = filterDocuments(mockDocuments, {
        processingStatus: ProcessingStatus.COMPLETED,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Document A');
    });

    it('should filter documents by search term', () => {
      const filtered = filterDocuments(mockDocuments, {
        search: 'Document A',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Document A');
    });
  });

  describe('Citation Formatting', () => {
    it('should format document citations correctly', () => {
      const references: DocumentReference[] = [
        {
          documentId: '1',
          documentTitle: 'Test Document',
          chunkId: 'chunk1',
          pageNumber: 5,
          relevanceScore: 0.9,
          excerpt: 'Test excerpt',
        },
        {
          documentId: '2',
          documentTitle: 'Another Document',
          chunkId: 'chunk2',
          relevanceScore: 0.8,
          excerpt: 'Another excerpt',
        },
      ];

      const citation = formatDocumentCitation(references);
      expect(citation).toContain('Test Document, p. 5');
      expect(citation).toContain('Another Document');
      expect(citation).toContain('Sources:');
    });
  });
});

describe('Document Metadata Utils', () => {
  describe('Metadata Creation', () => {
    it('should create initial document metadata', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const metadata = createInitialDocumentMetadata(mockFile);

      expect(metadata.language).toBe('auto');
      expect(metadata.extractionMethod).toBe('pdf-parse');
      expect(metadata.customFields).toEqual({});
    });

    it('should create chunk metadata with word count', () => {
      const content = 'This is a test sentence with multiple words.';
      const metadata = createChunkMetadata(content, 0.95);

      expect(metadata.wordCount).toBe(8); // Corrected expected count
      expect(metadata.sentenceCount).toBe(1);
      expect(metadata.extractionConfidence).toBe(0.95);
    });
  });

  describe('File Validation', () => {
    it('should validate file metadata correctly', () => {
      const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

      const error = validateFileMetadata(validFile);
      expect(error).toBeNull();
    });

    it('should reject oversized file', () => {
      const oversizedFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(oversizedFile, 'size', { value: FILE_CONSTRAINTS.MAX_FILE_SIZE + 1 });

      const error = validateFileMetadata(oversizedFile);
      expect(error).not.toBeNull();
      expect(error?.code).toBe(DocumentErrorCode.FILE_TOO_LARGE);
    });
  });

  describe('Text Analysis', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  Multiple   spaces   between   words  ')).toBe(4);
      expect(countWords('')).toBe(0);
    });

    it('should count sentences correctly', () => {
      expect(countSentences('Hello world.')).toBe(1);
      expect(countSentences('First sentence. Second sentence!')).toBe(2);
      expect(countSentences('Question? Answer!')).toBe(2);
    });

    it('should detect language (basic)', () => {
      const englishText = 'The quick brown fox jumps over the lazy dog and runs to the forest';
      const detected = detectLanguage(englishText);
      expect(detected).toBe('en');
    });
  });

  describe('Formatting Utils', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(500)).toBe('0s'); // Less than 1 second floors to 0s
      expect(formatDuration(1500)).toBe('1s'); // 1.5 seconds floors to 1s
      expect(formatDuration(65000)).toBe('1m 5s'); // 65 seconds = 1m 5s
      expect(formatDuration(3665000)).toBe('1h 1m 5s'); // 3665 seconds = 1h 1m 5s
    });

    it('should format file size correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB'); // Corrected expected format
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});