/**
 * Enhanced RAG Search Performance Tests
 * Comprehensive tests for vector search functionality and performance
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { vectorSearchService, VectorSearchService } from '@/services/vectorSearchService';
import { SearchResult, SearchErrorCode } from '@/types/enhanced-rag';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    supabaseUrl: 'https://test.supabase.co',
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

// Mock fetch for Edge Function calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VectorSearchService', () => {
  let searchService: VectorSearchService;
  let mockAbortController: AbortController;

  beforeAll(() => {
    // Setup performance monitoring
    performance.mark = vi.fn();
    performance.measure = vi.fn();
  });

  beforeEach(() => {
    searchService = VectorSearchService.getInstance();
    mockAbortController = new AbortController();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default auth session
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
        },
      },
    });

    (supabase.auth.getUser as any).mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Search Functionality', () => {
    it('should perform a successful vector search', async () => {
      const mockResponse = {
        results: [
          {
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            documentTitle: 'Test Document',
            content: 'This is test content about artificial intelligence.',
            similarity: 0.85,
            metadata: {},
          },
        ],
        totalCount: 1,
        processingTime: 150,
        searchType: 'vector',
        query: 'artificial intelligence',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchService.search('artificial intelligence');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/rag-search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('artificial intelligence'),
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].similarity).toBeGreaterThan(0.8);
    });

    it('should perform a successful hybrid search', async () => {
      const mockResponse = {
        results: [
          {
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            documentTitle: 'Test Document',
            content: 'Machine learning algorithms are powerful.',
            similarity: 0.9,
            metadata: {},
            vectorScore: 0.85,
            keywordScore: 0.95,
            combinedScore: 0.88,
          },
        ],
        totalCount: 1,
        processingTime: 200,
        searchType: 'hybrid',
        query: 'machine learning',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchService.hybridSearch('machine learning', {
        vectorWeight: 0.6,
        keywordWeight: 0.4,
      });

      expect(result.searchType).toBe('hybrid');
      expect(result.results[0]).toHaveProperty('vectorScore');
      expect(result.results[0]).toHaveProperty('keywordScore');
    });

    it('should handle search with custom options', async () => {
      const mockResponse = {
        results: [],
        totalCount: 0,
        processingTime: 100,
        searchType: 'vector',
        query: 'test query',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const options = {
        maxResults: 5,
        minSimilarity: 0.8,
        folderId: '123e4567-e89b-12d3-a456-426614174000',
        includeMetadata: true,
      };

      await searchService.search('test query', options);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.options).toMatchObject(options);
    });
  });

  describe('Performance Tests', () => {
    it('should complete search within acceptable time limits', async () => {
      const mockResponse = {
        results: Array.from({ length: 10 }, (_, i) => ({
          chunkId: `chunk-${i}`,
          documentId: `doc-${i}`,
          documentTitle: `Document ${i}`,
          content: `Content for document ${i}`,
          similarity: 0.8 - (i * 0.05),
          metadata: {},
        })),
        totalCount: 10,
        processingTime: 250,
        searchType: 'vector',
        query: 'performance test',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const startTime = Date.now();
      const result = await searchService.search('performance test');
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      
      // Should complete within 2 seconds (including network simulation)
      expect(totalTime).toBeLessThan(2000);
      expect(result.processingTime).toBeLessThan(500);
    });

    it('should handle concurrent searches efficiently', async () => {
      const mockResponse = {
        results: [
          {
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            documentTitle: 'Test Document',
            content: 'Concurrent search test content.',
            similarity: 0.85,
            metadata: {},
          },
        ],
        totalCount: 1,
        processingTime: 150,
        searchType: 'vector',
        query: 'concurrent test',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const queries = [
        'query 1',
        'query 2',
        'query 3',
        'query 4',
        'query 5',
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        queries.map(query => searchService.search(query))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(mockFetch).toHaveBeenCalledTimes(5);
      
      // Concurrent searches should not take significantly longer than sequential
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
        chunkId: `chunk-${i}`,
        documentId: `doc-${Math.floor(i / 10)}`,
        documentTitle: `Document ${Math.floor(i / 10)}`,
        content: `This is chunk ${i} content with relevant information.`,
        similarity: 0.9 - (i * 0.005),
        metadata: { chunkIndex: i },
      }));

      const mockResponse = {
        results: largeResultSet,
        totalCount: 100,
        processingTime: 300,
        searchType: 'vector',
        query: 'large dataset test',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchService.search('large dataset test', {
        maxResults: 100,
      });

      expect(result.results).toHaveLength(100);
      expect(result.totalCount).toBe(100);
      
      // Verify results are properly sorted by similarity
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].similarity).toBeLessThanOrEqual(
          result.results[i - 1].similarity
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        searchService.search('test query')
      ).rejects.toMatchObject({
        code: SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
        message: expect.stringContaining('Network error'),
        retryable: true,
      });
    });

    it('should handle authentication errors', async () => {
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(
        searchService.search('test query')
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        retryable: false,
      });
    });

    it('should handle API errors with proper error codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Invalid query parameters',
          code: 'INVALID_REQUEST',
        }),
      });

      await expect(
        searchService.search('test query')
      ).rejects.toMatchObject({
        code: SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
        retryable: true,
      });
    });

    it('should handle request cancellation', async () => {
      const abortController = new AbortController();
      
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Request cancelled');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      // Cancel the request after 50ms
      setTimeout(() => abortController.abort(), 50);

      await expect(
        searchService.search('test query', {}, abortController.signal)
      ).rejects.toMatchObject({
        code: SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
        message: 'Search request was cancelled',
        retryable: true,
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate query length', async () => {
      // Too short
      await expect(
        searchService.search('ab')
      ).rejects.toThrow('Query must be at least 3 characters');

      // Too long
      const longQuery = 'a'.repeat(1001);
      await expect(
        searchService.search(longQuery)
      ).rejects.toThrow('Query must be at most 1000 characters');
    });

    it('should validate search options', async () => {
      await expect(
        searchService.search('valid query', { maxResults: 101 })
      ).rejects.toThrow('Max results must be at most 100');

      await expect(
        searchService.search('valid query', { minSimilarity: 1.5 })
      ).rejects.toThrow('Invalid search options');

      await expect(
        searchService.search('valid query', { 
          vectorWeight: 0.8, 
          keywordWeight: 0.3 
        })
      ).rejects.toThrow('Keyword weight and vector weight must sum to 1');
    });

    it('should validate empty queries', async () => {
      await expect(
        searchService.search('')
      ).rejects.toThrow('Query cannot be empty');

      await expect(
        searchService.search('   ')
      ).rejects.toThrow('Query cannot be empty');
    });
  });

  describe('Search Suggestions', () => {
    it('should fetch search suggestions', async () => {
      const mockSuggestions = [
        { suggestion: 'artificial intelligence', frequency: 10, documentCount: 5 },
        { suggestion: 'artificial neural networks', frequency: 8, documentCount: 3 },
      ];

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockSuggestions,
        error: null,
      });

      const result = await searchService.getSearchSuggestions('artif');

      expect(supabase.rpc).toHaveBeenCalledWith('get_search_suggestions', {
        partial_query: 'artif',
        max_suggestions: 5,
      });

      expect(result.suggestions).toEqual(mockSuggestions);
    });

    it('should handle empty suggestions for short queries', async () => {
      const result = await searchService.getSearchSuggestions('a');
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('Search Analytics', () => {
    it('should fetch search analytics', async () => {
      const mockAnalytics = [{
        total_searches: 25,
        unique_documents_searched: 10,
        avg_results_per_search: 3.5,
        most_searched_terms: ['AI', 'machine learning'],
        top_documents: ['Doc 1', 'Doc 2'],
      }];

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockAnalytics,
        error: null,
      });

      const result = await searchService.getSearchAnalytics();

      expect(result).toEqual({
        totalSearches: 25,
        uniqueDocumentsSearched: 10,
        avgResultsPerSearch: 3.5,
        mostSearchedTerms: ['AI', 'machine learning'],
        topDocuments: ['Doc 1', 'Doc 2'],
      });
    });
  });

  describe('Specialized Search Methods', () => {
    it('should search within specific documents', async () => {
      const mockResponse = {
        results: [
          {
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            documentTitle: 'Specific Document',
            content: 'Content from specific document.',
            similarity: 0.9,
            metadata: {},
          },
        ],
        totalCount: 1,
        processingTime: 120,
        searchType: 'vector',
        query: 'specific content',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchService.searchInDocuments(
        'specific content',
        ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002']
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.options.documentIds).toEqual(['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002']);
      expect(result.results[0].documentId).toBe('doc-1');
    });

    it('should search within a specific folder', async () => {
      const mockResponse = {
        results: [],
        totalCount: 0,
        processingTime: 100,
        searchType: 'vector',
        query: 'folder content',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchService.searchInFolder('folder content', '123e4567-e89b-12d3-a456-426614174003');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.options.folderId).toBe('123e4567-e89b-12d3-a456-426614174003');
    });

    it('should find similar documents', async () => {
      const mockChunk = {
        content: 'This is the content of the reference chunk.',
      };

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockChunk,
              error: null,
            }),
          }),
        }),
      });

      const mockResponse = {
        results: [
          {
            chunkId: 'similar-chunk-1',
            documentId: 'similar-doc-1',
            documentTitle: 'Similar Document',
            content: 'Similar content to the reference.',
            similarity: 0.85,
            metadata: {},
          },
        ],
        totalCount: 1,
        processingTime: 150,
        searchType: 'vector',
        query: mockChunk.content,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchService.findSimilarDocuments('reference-chunk-id');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].chunkId).toBe('similar-chunk-1');
    });

    it('should perform batch search', async () => {
      const queries = ['query 1', 'query 2', 'query 3'];
      const mockResponses = queries.map((query, index) => ({
        results: [
          {
            chunkId: `chunk-${index}`,
            documentId: `doc-${index}`,
            documentTitle: `Document ${index}`,
            content: `Content for ${query}`,
            similarity: 0.8,
            metadata: {},
          },
        ],
        totalCount: 1,
        processingTime: 100,
        searchType: 'vector' as const,
        query,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[0]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[1]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses[2]),
        });

      const results = await searchService.batchSearch(queries);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      results.forEach((result, index) => {
        expect(result.query).toBe(queries[index]);
        expect(result.results[0].documentId).toBe(`doc-${index}`);
      });
    });
  });

  describe('Utility Functions', () => {
    it('should highlight search terms correctly', async () => {
      const { searchUtils } = await import('@/services/vectorSearchService');
      
      const text = 'This is a test about artificial intelligence and machine learning.';
      const query = 'artificial intelligence';
      
      const highlighted = searchUtils.highlightSearchTerms(text, query);
      
      expect(highlighted).toContain('<mark>artificial</mark>');
      expect(highlighted).toContain('<mark>intelligence</mark>');
    });

    it('should extract excerpts around search terms', async () => {
      const { searchUtils } = await import('@/services/vectorSearchService');
      
      const longText = 'This is a very long text that contains information about artificial intelligence and machine learning algorithms. The text continues with more details about neural networks and deep learning techniques.';
      const query = 'artificial intelligence';
      
      const excerpt = searchUtils.extractExcerpt(longText, query, 100);
      
      expect(excerpt).toContain('artificial intelligence');
      expect(excerpt.length).toBeLessThanOrEqual(106); // 100 + '...' prefix/suffix
    });

    it('should validate queries correctly', async () => {
      const { searchUtils } = await import('@/services/vectorSearchService');
      
      expect(searchUtils.validateQuery('')).toEqual({
        isValid: false,
        error: 'Query cannot be empty',
      });

      expect(searchUtils.validateQuery('ab')).toEqual({
        isValid: false,
        error: 'Query must be at least 3 characters',
      });

      expect(searchUtils.validateQuery('valid query')).toEqual({
        isValid: true,
      });
    });
  });
});