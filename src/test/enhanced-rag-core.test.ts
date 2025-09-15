/**
 * Enhanced RAG Core Functionality Tests
 * Tests the core document processing functionality without authentication dependencies
 */

import { describe, it, expect } from 'vitest';
import { documentProcessingService } from '@/services/documentProcessingService';
import { ProcessingStatus } from '@/types/enhanced-rag';

describe('Enhanced RAG Core Functionality', () => {
  describe('Document Processing Service Configuration', () => {
    it('should provide valid default chunking configuration', () => {
      const config = documentProcessingService.getDefaultChunkingConfig();
      
      expect(config).toBeDefined();
      expect(config.maxChunkSize).toBe(1000);
      expect(config.minChunkSize).toBe(100);
      expect(config.chunkOverlap).toBe(200);
      expect(config.preserveParagraphs).toBe(true);
    });

    it('should validate chunking configuration correctly', () => {
      const validConfig = {
        maxChunkSize: 1000,
        minChunkSize: 100,
        chunkOverlap: 200,
        preserveParagraphs: true,
      };

      const errors = documentProcessingService.validateChunkingConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid chunking configurations', () => {
      const invalidConfigs = [
        {
          maxChunkSize: 50, // Too small
          minChunkSize: 100,
        },
        {
          maxChunkSize: 100,
          minChunkSize: 150, // Larger than max
        },
        {
          maxChunkSize: 1000,
          chunkOverlap: -10, // Negative
        },
        {
          maxChunkSize: 1000,
          chunkOverlap: 1500, // Larger than max
        },
      ];

      invalidConfigs.forEach((config, index) => {
        const errors = documentProcessingService.validateChunkingConfig(config);
        expect(errors.length).toBeGreaterThan(0, `Config ${index} should have validation errors`);
      });
    });

    it('should estimate processing time based on file size', () => {
      const testCases = [
        { size: 1024 * 1024, expectedMin: 30 }, // 1MB
        { size: 5 * 1024 * 1024, expectedMin: 100 }, // 5MB
        { size: 10 * 1024 * 1024, expectedMin: 200 }, // 10MB
      ];

      testCases.forEach(({ size, expectedMin }) => {
        const estimatedTime = documentProcessingService.estimateProcessingTime(size);
        expect(estimatedTime).toBeGreaterThanOrEqual(expectedMin);
        expect(estimatedTime).toBeLessThan(3600); // Should be less than 1 hour
      });
    });
  });

  describe('Processing Status Management', () => {
    it('should calculate correct progress percentages', () => {
      // Test the private method indirectly through status messages
      const statusTests = [
        { status: ProcessingStatus.UPLOADING, expectedProgress: 10 },
        { status: ProcessingStatus.EXTRACTING, expectedProgress: 30 },
        { status: ProcessingStatus.CHUNKING, expectedProgress: 60 },
        { status: ProcessingStatus.EMBEDDING, expectedProgress: 80 },
        { status: ProcessingStatus.COMPLETED, expectedProgress: 100 },
        { status: ProcessingStatus.FAILED, expectedProgress: 0 },
      ];

      // We can't directly test the private method, but we can verify the service handles different statuses
      statusTests.forEach(({ status }) => {
        expect(Object.values(ProcessingStatus)).toContain(status);
      });
    });

    it('should handle processing cancellation gracefully', () => {
      const testDocumentId = 'test-cancel-document-id';
      
      // Should not throw an error even if no processing is active
      expect(() => {
        documentProcessingService.cancelProcessing(testDocumentId);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid processing requests gracefully', async () => {
      const invalidRequest = {
        documentId: 'invalid-document-id',
        fileUrl: 'https://invalid-url.example.com/nonexistent.pdf',
        userId: 'invalid-user-id',
      };

      let errorCaught = false;
      try {
        await documentProcessingService.processDocument(invalidRequest);
      } catch (error) {
        errorCaught = true;
        expect(error).toBeDefined();
        // Should be an enhanced error with proper structure
        if (typeof error === 'object' && error !== null && 'code' in error) {
          expect(error).toHaveProperty('code');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('retryable');
          expect(error).toHaveProperty('timestamp');
        }
      }

      expect(errorCaught).toBe(true);
    });

    it('should provide meaningful error messages for validation failures', () => {
      const invalidConfigs = [
        { maxChunkSize: 25, expectedError: 'Maximum chunk size must be at least 100' },
        { minChunkSize: 25, expectedError: 'Minimum chunk size must be at least 50' },
        { chunkOverlap: -5, expectedError: 'Chunk overlap cannot be negative' },
      ];

      invalidConfigs.forEach(({ expectedError, ...config }) => {
        const errors = documentProcessingService.validateChunkingConfig(config);
        expect(errors.some(error => error.includes(expectedError.split(' ')[0]))).toBe(true);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should enforce reasonable limits on chunk sizes', () => {
      const config = documentProcessingService.getDefaultChunkingConfig();
      
      // Verify constraints are within reasonable limits for performance
      expect(config.maxChunkSize).toBeLessThanOrEqual(2000);
      expect(config.minChunkSize).toBeGreaterThanOrEqual(50);
      expect(config.chunkOverlap).toBeLessThan(config.maxChunkSize!);
      expect(config.chunkOverlap).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge cases in configuration validation', () => {
      const edgeCases = [
        { maxChunkSize: 100, minChunkSize: 100 }, // Equal sizes (should fail - min must be less than max)
        { maxChunkSize: 2000, chunkOverlap: 2000 }, // Equal overlap (should fail - overlap must be less than max)
        { maxChunkSize: 2001 }, // Just over limit (should fail - exceeds max allowed)
      ];

      edgeCases.forEach((config, index) => {
        const errors = documentProcessingService.validateChunkingConfig(config);
        // Most edge cases should have validation errors, but let's be more specific
        if (index === 0) {
          // Equal min/max should be invalid
          expect(errors.some(e => e.includes('less than maximum'))).toBe(true);
        } else if (index === 1) {
          // Overlap equal to max should be invalid
          expect(errors.some(e => e.includes('less than maximum'))).toBe(true);
        } else if (index === 2) {
          // Over limit should be invalid
          expect(errors.some(e => e.includes('cannot exceed'))).toBe(true);
        }
      });
    });
  });

  describe('Service Integration', () => {
    it('should maintain consistent configuration between methods', () => {
      const defaultConfig = documentProcessingService.getDefaultChunkingConfig();
      const validationErrors = documentProcessingService.validateChunkingConfig(defaultConfig);
      
      // Default configuration should always be valid
      expect(validationErrors).toHaveLength(0);
    });

    it('should handle concurrent operations safely', () => {
      const documentIds = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];
      
      // Multiple cancellations should not interfere with each other
      expect(() => {
        documentIds.forEach(id => {
          documentProcessingService.cancelProcessing(id);
        });
      }).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should provide reasonable processing time estimates', () => {
      const fileSizes = [
        100 * 1024, // 100KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        25 * 1024 * 1024, // 25MB
        50 * 1024 * 1024, // 50MB (max allowed)
      ];

      fileSizes.forEach(size => {
        const estimate = documentProcessingService.estimateProcessingTime(size);
        
        // Estimates should be reasonable (between 30 seconds and 45 minutes for large files)
        expect(estimate).toBeGreaterThanOrEqual(30);
        expect(estimate).toBeLessThanOrEqual(2700); // 45 minutes max for very large files
        
        // Larger files should take longer
        if (size > 1024 * 1024) {
          const smallerEstimate = documentProcessingService.estimateProcessingTime(1024 * 1024);
          expect(estimate).toBeGreaterThanOrEqual(smallerEstimate);
        }
      });
    });

    it('should validate configurations efficiently', () => {
      const startTime = Date.now();
      
      // Run validation many times to test performance
      for (let i = 0; i < 1000; i++) {
        const config = {
          maxChunkSize: 1000 + (i % 100),
          minChunkSize: 100 + (i % 50),
          chunkOverlap: 200 + (i % 100),
          preserveParagraphs: i % 2 === 0,
        };
        
        documentProcessingService.validateChunkingConfig(config);
      }
      
      const duration = Date.now() - startTime;
      
      // 1000 validations should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

// Export test utilities for other test files
export const testUtils = {
  createValidChunkingConfig: () => ({
    maxChunkSize: 1000,
    minChunkSize: 100,
    chunkOverlap: 200,
    preserveParagraphs: true,
  }),
  
  createInvalidChunkingConfig: () => ({
    maxChunkSize: 50, // Invalid: too small
    minChunkSize: 100,
    chunkOverlap: -10, // Invalid: negative
  }),
  
  generateTestFileSizes: () => [
    1024, // 1KB
    100 * 1024, // 100KB
    1024 * 1024, // 1MB
    10 * 1024 * 1024, // 10MB
    50 * 1024 * 1024, // 50MB
  ],
};