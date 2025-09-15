/**
 * Enhanced RAG Document Processing Integration Tests
 * Tests the complete document processing pipeline using MCP tools
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { documentProcessingService, ProcessingRequest } from '@/services/documentProcessingService';
import { ProcessingStatus, DocumentErrorCode } from '@/types/enhanced-rag';

// Mock PDF file for testing
const createMockPDFFile = (content: string = 'Test PDF content'): File => {
  const blob = new Blob([content], { type: 'application/pdf' });
  return new File([blob], 'test-document.pdf', { type: 'application/pdf' });
};

// Test user ID (should be a valid UUID in your test environment)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

describe('Enhanced RAG Document Processing Pipeline', () => {
  let testDocumentId: string;
  let testFileUrl: string;

  beforeAll(async () => {
    // Ensure we have a clean test environment
    console.log('Setting up document processing tests...');
  });

  afterAll(async () => {
    // Clean up test data
    if (testDocumentId) {
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', testDocumentId);
      
      await supabase
        .from('documents')
        .delete()
        .eq('id', testDocumentId);
    }
  });

  beforeEach(() => {
    // Reset test state
    testDocumentId = '';
    testFileUrl = '';
  });

  describe('Document Upload and Initial Processing', () => {
    it('should create a document record with uploading status', async () => {
      const mockFile = createMockPDFFile();
      
      // Upload file to Supabase storage
      const fileName = `test-${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, mockFile);

      expect(uploadError).toBeNull();
      expect(uploadData).toBeDefined();

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      testFileUrl = urlData.publicUrl;

      // Create document record
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          user_id: TEST_USER_ID,
          title: 'Test Document',
          filename: 'test-document.pdf',
          file_path: testFileUrl,
          file_size: mockFile.size,
          mime_type: 'application/pdf',
          processing_status: ProcessingStatus.UPLOADING,
        })
        .select()
        .single();

      expect(documentError).toBeNull();
      expect(documentData).toBeDefined();
      expect(documentData.processing_status).toBe(ProcessingStatus.UPLOADING);

      testDocumentId = documentData.id;
    });

    it('should validate chunking configuration', () => {
      const validConfig = {
        maxChunkSize: 1000,
        minChunkSize: 100,
        chunkOverlap: 200,
        preserveParagraphs: true,
      };

      const errors = documentProcessingService.validateChunkingConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid chunking configuration', () => {
      const invalidConfig = {
        maxChunkSize: 50, // Too small
        minChunkSize: 100,
        chunkOverlap: -10, // Negative
      };

      const errors = documentProcessingService.validateChunkingConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Maximum chunk size'))).toBe(true);
      expect(errors.some(error => error.includes('Chunk overlap cannot be negative'))).toBe(true);
    });
  });

  describe('Document Processing Service', () => {
    it('should get processing status for a document', async () => {
      if (!testDocumentId) {
        // Create a test document first
        const { data } = await supabase
          .from('documents')
          .insert({
            user_id: TEST_USER_ID,
            title: 'Status Test Document',
            filename: 'status-test.pdf',
            file_path: 'https://example.com/test.pdf',
            file_size: 1024,
            mime_type: 'application/pdf',
            processing_status: ProcessingStatus.EXTRACTING,
          })
          .select()
          .single();

        testDocumentId = data.id;
      }

      const status = await documentProcessingService.getProcessingStatus(testDocumentId);
      
      expect(status).toBeDefined();
      expect(status.documentId).toBe(testDocumentId);
      expect(status.status).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
      expect(status.message).toBeDefined();
    });

    it('should estimate processing time based on file size', () => {
      const smallFile = 1024 * 1024; // 1MB
      const largeFile = 10 * 1024 * 1024; // 10MB

      const smallFileTime = documentProcessingService.estimateProcessingTime(smallFile);
      const largeFileTime = documentProcessingService.estimateProcessingTime(largeFile);

      expect(smallFileTime).toBeGreaterThan(0);
      expect(largeFileTime).toBeGreaterThan(smallFileTime);
    });

    it('should provide default chunking configuration', () => {
      const defaultConfig = documentProcessingService.getDefaultChunkingConfig();
      
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.maxChunkSize).toBe(1000);
      expect(defaultConfig.minChunkSize).toBe(100);
      expect(defaultConfig.chunkOverlap).toBe(200);
      expect(defaultConfig.preserveParagraphs).toBe(true);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle processing errors gracefully', async () => {
      const invalidRequest: ProcessingRequest = {
        documentId: 'invalid-id',
        fileUrl: 'https://invalid-url.com/nonexistent.pdf',
        userId: TEST_USER_ID,
      };

      let errorCaught = false;
      try {
        await documentProcessingService.processDocument(invalidRequest);
      } catch (error) {
        errorCaught = true;
        expect(error).toBeDefined();
      }

      expect(errorCaught).toBe(true);
    });

    it('should support processing cancellation', () => {
      const documentId = 'test-cancel-id';
      
      // This should not throw an error even if no processing is active
      expect(() => {
        documentProcessingService.cancelProcessing(documentId);
      }).not.toThrow();
    });
  });

  describe('Database Integration via MCP', () => {
    it('should verify database schema exists', async () => {
      // Test that required tables exist
      const { data: documentsTable, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .limit(1);

      expect(documentsError).toBeNull();

      const { data: chunksTable, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id')
        .limit(1);

      expect(chunksError).toBeNull();
    });

    it('should verify processing status function exists', async () => {
      // Test the update_document_processing_status function
      if (!testDocumentId) {
        const { data } = await supabase
          .from('documents')
          .insert({
            user_id: TEST_USER_ID,
            title: 'Function Test Document',
            filename: 'function-test.pdf',
            file_path: 'https://example.com/test.pdf',
            file_size: 1024,
            mime_type: 'application/pdf',
            processing_status: ProcessingStatus.UPLOADING,
          })
          .select()
          .single();

        testDocumentId = data.id;
      }

      const { error } = await supabase.rpc('update_document_processing_status', {
        doc_id: testDocumentId,
        new_status: ProcessingStatus.EXTRACTING,
        processing_metadata: JSON.stringify({ test: true }),
      });

      expect(error).toBeNull();

      // Verify the status was updated
      const { data: updatedDoc } = await supabase
        .from('documents')
        .select('processing_status, metadata')
        .eq('id', testDocumentId)
        .single();

      expect(updatedDoc.processing_status).toBe(ProcessingStatus.EXTRACTING);
      expect(updatedDoc.metadata).toEqual({ test: true });
    });

    it('should verify vector search function exists', async () => {
      // Test the search_documents_with_vector function
      const testEmbedding = new Array(1536).fill(0.1); // Mock embedding

      const { data, error } = await supabase.rpc('search_documents_with_vector', {
        query_embedding: testEmbedding,
        user_accessible_docs: null,
        similarity_threshold: 0.5,
        max_results: 5,
      });

      // Function should exist and not error (even if no results)
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Edge Function Integration', () => {
    it('should verify enhanced-document-processor function is deployed', async () => {
      // Test that the Edge Function responds to requests
      const testRequest = {
        documentId: 'test-function-id',
        fileUrl: 'https://example.com/test.pdf',
        userId: TEST_USER_ID,
      };

      // This will likely fail due to invalid URL, but should reach the function
      const { error } = await supabase.functions.invoke(
        'enhanced-document-processor',
        { body: testRequest }
      );

      // We expect an error due to invalid URL, but not a "function not found" error
      expect(error).toBeDefined();
      expect(error.message).not.toContain('Function not found');
    });
  });

  describe('Real-time Status Updates', () => {
    it('should support status update listeners', async () => {
      let statusUpdateReceived = false;
      let errorReceived = false;
      let completionReceived = false;

      const listener = {
        onStatusUpdate: (update) => {
          statusUpdateReceived = true;
          expect(update.documentId).toBeDefined();
          expect(update.status).toBeDefined();
        },
        onError: (error) => {
          errorReceived = true;
          expect(error.code).toBeDefined();
          expect(error.message).toBeDefined();
        },
        onComplete: (result) => {
          completionReceived = true;
          expect(result.success).toBeDefined();
          expect(result.documentId).toBeDefined();
        },
      };

      // Test with invalid request to trigger error handling
      try {
        await documentProcessingService.processDocument({
          documentId: 'listener-test-id',
          fileUrl: 'https://invalid-url.com/test.pdf',
          userId: TEST_USER_ID,
        }, listener);
      } catch (error) {
        // Expected to fail
      }

      // At minimum, error should be received
      expect(errorReceived).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent status checks', async () => {
      if (!testDocumentId) {
        const { data } = await supabase
          .from('documents')
          .insert({
            user_id: TEST_USER_ID,
            title: 'Concurrent Test Document',
            filename: 'concurrent-test.pdf',
            file_path: 'https://example.com/test.pdf',
            file_size: 1024,
            mime_type: 'application/pdf',
            processing_status: ProcessingStatus.COMPLETED,
          })
          .select()
          .single();

        testDocumentId = data.id;
      }

      // Make multiple concurrent status requests
      const promises = Array.from({ length: 5 }, () =>
        documentProcessingService.getProcessingStatus(testDocumentId)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.documentId).toBe(testDocumentId);
        expect(result.status).toBe(ProcessingStatus.COMPLETED);
      });
    });

    it('should validate processing constraints', () => {
      const config = documentProcessingService.getDefaultChunkingConfig();
      
      // Verify constraints are within reasonable limits
      expect(config.maxChunkSize).toBeLessThanOrEqual(2000);
      expect(config.minChunkSize).toBeGreaterThanOrEqual(50);
      expect(config.chunkOverlap).toBeLessThan(config.maxChunkSize!);
    });
  });
});

// Helper function to wait for processing completion (for integration tests)
export async function waitForProcessingCompletion(
  documentId: string,
  timeoutMs: number = 30000
): Promise<ProcessingStatus> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await documentProcessingService.getProcessingStatus(documentId);
    
    if (status.status === ProcessingStatus.COMPLETED || 
        status.status === ProcessingStatus.FAILED) {
      return status.status;
    }
    
    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Processing timeout after ${timeoutMs}ms`);
}

// Export test utilities
export {
  createMockPDFFile,
  TEST_USER_ID,
};