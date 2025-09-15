/**
 * Enhanced RAG Upload System Tests
 * Unit tests for document upload and validation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateFile,
  validateMultipleFiles,
  formatFileSize,
  sanitizeFilename,
  createProcessingError,
  createSearchError,
  isProcessingComplete,
  isProcessingFailed,
  isProcessingInProgress
} from '../utils/enhanced-rag-utils';
import {
  DocumentErrorCode,
  SearchErrorCode,
  FILE_CONSTRAINTS,
  ProcessingStatus
} from '../types/enhanced-rag';

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockFile = (
  name: string,
  size: number,
  type: string = 'application/pdf',
  lastModified: number = Date.now()
): File => {
  const file = new File(['mock content'], name, { type, lastModified });
  
  // Mock the size property since File constructor doesn't set it properly in tests
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  
  return file;
};

// ============================================================================
// FILE VALIDATION TESTS
// ============================================================================

describe('File Validation', () => {
  describe('validateFile', () => {
    it('should validate a correct PDF file', () => {
      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf'); // 1MB
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const file = createMockFile('large.pdf', FILE_CONSTRAINTS.MAX_FILE_SIZE + 1);
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
    });

    it('should reject files that are too small', () => {
      const file = createMockFile('tiny.pdf', FILE_CONSTRAINTS.MIN_FILE_SIZE - 1);
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('below minimum size'))).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const file = createMockFile('document.docx', 1024 * 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unsupported file type'))).toBe(true);
    });

    it('should reject files with unsupported extensions', () => {
      const file = createMockFile('document.txt', 1024 * 1024, 'application/pdf');
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unsupported file extension'))).toBe(true);
    });

    it('should reject files with empty names', () => {
      const file = createMockFile('', 1024 * 1024);
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File must have a valid name');
    });

    it('should warn about problematic characters in filename', () => {
      const file = createMockFile('test<file>.pdf', 1024 * 1024);
      const result = validateFile(file);
      
      expect(result.warnings.some(warning => warning.includes('special characters'))).toBe(true);
    });

    it('should reject files with names that are too long', () => {
      const longName = 'a'.repeat(256) + '.pdf';
      const file = createMockFile(longName, 1024 * 1024);
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Filename is too long'))).toBe(true);
    });
  });

  describe('validateMultipleFiles', () => {
    it('should validate multiple correct files', () => {
      const files = [
        createMockFile('file1.pdf', 1024 * 1024),
        createMockFile('file2.pdf', 2 * 1024 * 1024),
        createMockFile('file3.pdf', 3 * 1024 * 1024)
      ];
      
      const result = validateMultipleFiles(files);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty file arrays', () => {
      const result = validateMultipleFiles([]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No files selected');
    });

    it('should reject batch if total size is too large', () => {
      const files = Array.from({ length: 6 }, (_, i) => 
        createMockFile(`file${i}.pdf`, FILE_CONSTRAINTS.MAX_FILE_SIZE)
      );
      
      const result = validateMultipleFiles(files);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum batch size'))).toBe(true);
    });

    it('should report individual file errors', () => {
      const files = [
        createMockFile('good.pdf', 1024 * 1024),
        createMockFile('bad.txt', 1024 * 1024, 'text/plain'),
        createMockFile('toolarge.pdf', FILE_CONSTRAINTS.MAX_FILE_SIZE + 1)
      ];
      
      const result = validateMultipleFiles(files);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('File 2 (bad.txt)'))).toBe(true);
      expect(result.errors.some(error => error.includes('File 3 (toolarge.pdf)'))).toBe(true);
    });

    it('should warn about duplicate filenames', () => {
      const files = [
        createMockFile('duplicate.pdf', 1024 * 1024),
        createMockFile('unique.pdf', 1024 * 1024),
        createMockFile('duplicate.pdf', 2 * 1024 * 1024)
      ];
      
      const result = validateMultipleFiles(files);
      
      expect(result.warnings.some(warning => warning.includes('Duplicate filenames detected'))).toBe(true);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should handle large numbers', () => {
      const largeSize = 1024 * 1024 * 1024 * 1024; // 1TB
      const result = formatFileSize(largeSize);
      expect(result).toContain('GB'); // Should cap at GB in our implementation
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove problematic characters', () => {
      expect(sanitizeFilename('file<name>.pdf')).toBe('file_name_.pdf');
      expect(sanitizeFilename('file:name.pdf')).toBe('file_name.pdf');
      expect(sanitizeFilename('file|name.pdf')).toBe('file_name.pdf');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.pdf')).toBe('my_file_name.pdf');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeFilename('file___name.pdf')).toBe('file_name.pdf');
    });

    it('should trim leading and trailing underscores', () => {
      expect(sanitizeFilename('_filename_.pdf')).toBe('filename_.pdf');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  describe('createProcessingError', () => {
    it('should create a processing error with correct structure', () => {
      const error = createProcessingError(
        DocumentErrorCode.INVALID_FILE_FORMAT,
        'Test error message',
        { filename: 'test.pdf' },
        true
      );

      expect(error.code).toBe(DocumentErrorCode.INVALID_FILE_FORMAT);
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ filename: 'test.pdf' });
      expect(error.retryable).toBe(true);
      expect(error.suggestedAction).toBe('Please upload a PDF file');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should provide appropriate suggested actions', () => {
      const fileTooLargeError = createProcessingError(
        DocumentErrorCode.FILE_TOO_LARGE,
        'File too large'
      );
      
      expect(fileTooLargeError.suggestedAction).toBe(
        'Please reduce file size or split into smaller files'
      );

      const networkError = createProcessingError(
        DocumentErrorCode.NETWORK_ERROR,
        'Network failed'
      );
      
      expect(networkError.suggestedAction).toBe(
        'Network error occurred, please check your connection'
      );
    });
  });

  describe('createSearchError', () => {
    it('should create a search error with correct structure', () => {
      const error = createSearchError(
        SearchErrorCode.QUERY_TOO_SHORT,
        'Query too short',
        { query: 'ab' },
        false
      );

      expect(error.code).toBe(SearchErrorCode.QUERY_TOO_SHORT);
      expect(error.message).toBe('Query too short');
      expect(error.details).toEqual({ query: 'ab' });
      expect(error.retryable).toBe(false);
      expect(error.suggestedAction).toContain('at least');
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// PROCESSING STATUS TESTS
// ============================================================================

describe('Processing Status', () => {
  it('should identify processing states correctly', () => {
    expect(isProcessingComplete(ProcessingStatus.COMPLETED)).toBe(true);
    expect(isProcessingComplete(ProcessingStatus.UPLOADING)).toBe(false);

    expect(isProcessingFailed(ProcessingStatus.FAILED)).toBe(true);
    expect(isProcessingFailed(ProcessingStatus.COMPLETED)).toBe(false);

    expect(isProcessingInProgress(ProcessingStatus.UPLOADING)).toBe(true);
    expect(isProcessingInProgress(ProcessingStatus.EXTRACTING)).toBe(true);
    expect(isProcessingInProgress(ProcessingStatus.COMPLETED)).toBe(false);
    expect(isProcessingInProgress(ProcessingStatus.FAILED)).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  describe('Complete Upload Validation Flow', () => {
    it('should handle a complete validation scenario', () => {
      // Create a mix of valid and invalid files
      const files = [
        createMockFile('valid1.pdf', 1024 * 1024), // Valid
        createMockFile('valid2.pdf', 2 * 1024 * 1024), // Valid
        createMockFile('invalid.txt', 1024 * 1024, 'text/plain'), // Invalid type
        createMockFile('toolarge.pdf', FILE_CONSTRAINTS.MAX_FILE_SIZE + 1), // Too large
        createMockFile('', 1024 * 1024) // Empty name
      ];

      // Validate individual files
      const individualValidations = files.map(validateFile);
      
      // Validate batch
      const batchValidation = validateMultipleFiles(files);

      // Check individual results
      expect(individualValidations[0].valid).toBe(true);
      expect(individualValidations[1].valid).toBe(true);
      expect(individualValidations[2].valid).toBe(false);
      expect(individualValidations[3].valid).toBe(false);
      expect(individualValidations[4].valid).toBe(false);

      // Check batch result
      expect(batchValidation.valid).toBe(false);
      expect(batchValidation.errors.length).toBeGreaterThan(0);

      // Verify error messages contain file references
      expect(batchValidation.errors.some(error => 
        error.includes('File 3') && error.includes('invalid.txt')
      )).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      // Test with exactly max size file
      const maxSizeFile = createMockFile('max.pdf', FILE_CONSTRAINTS.MAX_FILE_SIZE);
      const maxSizeResult = validateFile(maxSizeFile);
      expect(maxSizeResult.valid).toBe(true);

      // Test with exactly min size file
      const minSizeFile = createMockFile('min.pdf', FILE_CONSTRAINTS.MIN_FILE_SIZE);
      const minSizeResult = validateFile(minSizeFile);
      expect(minSizeResult.valid).toBe(true);

      // Test with file at size boundaries
      const justOverMax = createMockFile('over.pdf', FILE_CONSTRAINTS.MAX_FILE_SIZE + 1);
      const justOverResult = validateFile(justOverMax);
      expect(justOverResult.valid).toBe(false);

      const justUnderMin = createMockFile('under.pdf', FILE_CONSTRAINTS.MIN_FILE_SIZE - 1);
      const justUnderResult = validateFile(justUnderMin);
      expect(justUnderResult.valid).toBe(false);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide appropriate retry guidance', () => {
      // Network errors should be retryable
      const networkError = createProcessingError(
        DocumentErrorCode.NETWORK_ERROR,
        'Connection failed',
        undefined,
        true
      );
      expect(networkError.retryable).toBe(true);

      // File format errors should not be retryable
      const formatError = createProcessingError(
        DocumentErrorCode.INVALID_FILE_FORMAT,
        'Wrong format',
        undefined,
        false
      );
      expect(formatError.retryable).toBe(false);

      // Processing errors should be retryable
      const processingError = createProcessingError(
        DocumentErrorCode.EXTRACTION_FAILED,
        'Extraction failed',
        undefined,
        true
      );
      expect(processingError.retryable).toBe(true);
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance Tests', () => {
  it('should validate large numbers of files efficiently', () => {
    const startTime = performance.now();
    
    // Create 100 files for testing
    const files = Array.from({ length: 100 }, (_, i) => 
      createMockFile(`file${i}.pdf`, 1024 * 1024)
    );
    
    const result = validateMultipleFiles(files);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(1000); // 1 second
    expect(result.valid).toBe(true);
  });

  it('should handle file size calculations efficiently', () => {
    const sizes = [
      0, 1024, 1024 * 1024, 1024 * 1024 * 1024,
      FILE_CONSTRAINTS.MAX_FILE_SIZE, FILE_CONSTRAINTS.MIN_FILE_SIZE
    ];
    
    sizes.forEach(size => {
      const formatted = formatFileSize(size);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});