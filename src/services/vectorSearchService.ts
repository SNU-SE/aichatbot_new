/**
 * Vector Search Service
 * Frontend service for interacting with the RAG search Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import {
  SearchOptions,
  SearchResult,
  SearchErrorCode,
  EnhancedErrorResponse,
  SEARCH_CONSTRAINTS,
} from '@/types/enhanced-rag';
import { ExtendedSearchOptionsSchema } from '@/types/enhanced-rag-schemas';
import { AnalyticsService } from './analyticsService';
import { cacheService, CacheService, cached } from './cacheService';

// Extended search options for the service
export interface ExtendedSearchOptions extends SearchOptions {
  hybridSearch?: boolean;
  keywordWeight?: number;
  vectorWeight?: number;
}

// Search response from the Edge Function
export interface VectorSearchResponse {
  results: SearchResult[];
  totalCount: number;
  processingTime: number;
  searchType: 'vector' | 'hybrid' | 'keyword';
  query: string;
}

// Search suggestions response
export interface SearchSuggestionsResponse {
  suggestions: Array<{
    suggestion: string;
    frequency: number;
    documentCount: number;
  }>;
}

// Search analytics response
export interface SearchAnalyticsResponse {
  totalSearches: number;
  uniqueDocumentsSearched: number;
  avgResultsPerSearch: number;
  mostSearchedTerms: string[];
  topDocuments: string[];
}

/**
 * Vector Search Service Class
 */
export class VectorSearchService {
  private static instance: VectorSearchService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = `${supabase.supabaseUrl}/functions/v1`;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): VectorSearchService {
    if (!VectorSearchService.instance) {
      VectorSearchService.instance = new VectorSearchService();
    }
    return VectorSearchService.instance;
  }

  /**
   * Get authorization headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session found');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate search query and options
   */
  private validateSearchRequest(query: string, options?: ExtendedSearchOptions): void {
    // Validate query length
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length < SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH) {
      throw new Error(`Query must be at least ${SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH} characters`);
    }

    if (query.length > SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH) {
      throw new Error(`Query must be at most ${SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH} characters`);
    }

    // Validate options if provided
    if (options) {
      const optionsValidation = ExtendedSearchOptionsSchema.partial().safeParse(options);
      if (!optionsValidation.success) {
        throw new Error(`Invalid search options: ${optionsValidation.error.message}`);
      }

      // Additional validation for extended options
      if (options.keywordWeight !== undefined && options.vectorWeight !== undefined) {
        const totalWeight = options.keywordWeight + options.vectorWeight;
        if (Math.abs(totalWeight - 1) > 0.01) {
          throw new Error('Keyword weight and vector weight must sum to 1');
        }
      }

      if (options.maxResults && options.maxResults > SEARCH_CONSTRAINTS.MAX_RESULTS_LIMIT) {
        throw new Error(`Max results must be at most ${SEARCH_CONSTRAINTS.MAX_RESULTS_LIMIT}`);
      }

      if (options.minSimilarity && (options.minSimilarity < SEARCH_CONSTRAINTS.MIN_SIMILARITY_THRESHOLD || options.minSimilarity > 1)) {
        throw new Error('Min similarity must be between 0.1 and 1');
      }
    }
  }

  /**
   * Handle API errors and convert to enhanced error response
   */
  private handleApiError(error: any, context: string): never {
    console.error(`${context} error:`, error);

    if (error.name === 'AbortError') {
      throw {
        code: SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
        message: 'Search request was cancelled',
        retryable: true,
        timestamp: new Date(),
      } as EnhancedErrorResponse;
    }

    if (error.message?.includes('No active session')) {
      throw {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        retryable: false,
        timestamp: new Date(),
      } as EnhancedErrorResponse;
    }

    throw {
      code: SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
      message: error.message || 'Search service unavailable',
      details: error,
      retryable: true,
      timestamp: new Date(),
    } as EnhancedErrorResponse;
  }

  /**
   * Perform vector similarity search with caching
   */
  public async search(
    query: string,
    options: ExtendedSearchOptions = {},
    abortSignal?: AbortSignal
  ): Promise<VectorSearchResponse> {
    try {
      // Validate input
      this.validateSearchRequest(query, options);

      // Generate cache key
      const cacheKey = CacheService.getSearchCacheKey(query, options);
      
      // Try to get from cache first
      const cachedResult = await cacheService.get<VectorSearchResponse>(cacheKey, 'search');
      if (cachedResult && !abortSignal?.aborted) {
        return cachedResult;
      }

      // Get auth headers
      const headers = await this.getAuthHeaders();

      // Prepare request body
      const requestBody = {
        query: query.trim(),
        options: {
          ...options,
          maxResults: options.maxResults || SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS,
          minSimilarity: options.minSimilarity || SEARCH_CONSTRAINTS.DEFAULT_MIN_SIMILARITY,
        },
      };

      // Make API request
      const response = await fetch(`${this.baseUrl}/rag-search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: VectorSearchResponse = await response.json();
      
      // Cache the result
      await cacheService.set(cacheKey, data, 'search');
      
      // Track search analytics
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await AnalyticsService.trackSearch({
          user_id: user?.id,
          query_text: query.trim(),
          query_type: options.hybridSearch ? 'hybrid' : 'semantic',
          results_count: data.results.length,
          response_time_ms: data.processingTime,
          documents_found: data.results.map(r => r.document_id),
          language: options.language || 'en',
          metadata: { searchType: data.searchType }
        });
      } catch (analyticsError) {
        console.warn('Failed to track search analytics:', analyticsError);
      }
      
      return data;

    } catch (error) {
      this.handleApiError(error, 'Vector search');
    }
  }

  /**
   * Perform hybrid search combining vector and keyword search
   */
  public async hybridSearch(
    query: string,
    options: ExtendedSearchOptions = {},
    abortSignal?: AbortSignal
  ): Promise<VectorSearchResponse> {
    return this.search(query, { ...options, hybridSearch: true }, abortSignal);
  }

  /**
   * Get search suggestions based on partial query with caching
   */
  @cached('search', (partialQuery: string, maxSuggestions: number = 5) => 
    `suggestions:${partialQuery}:${maxSuggestions}`
  )
  public async getSearchSuggestions(
    partialQuery: string,
    maxSuggestions: number = 5,
    abortSignal?: AbortSignal
  ): Promise<SearchSuggestionsResponse> {
    try {
      if (partialQuery.length < 2) {
        return { suggestions: [] };
      }

      const { data, error } = await supabase.rpc('get_search_suggestions', {
        partial_query: partialQuery.toLowerCase(),
        max_suggestions: maxSuggestions,
      });

      if (error) {
        throw error;
      }

      return {
        suggestions: data || [],
      };

    } catch (error) {
      this.handleApiError(error, 'Search suggestions');
    }
  }

  /**
   * Get search analytics for the current user
   */
  public async getSearchAnalytics(
    dateFrom?: Date,
    dateTo?: Date,
    abortSignal?: AbortSignal
  ): Promise<SearchAnalyticsResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_document_search_analytics', {
        user_id_param: user.id,
        date_from: dateFrom?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        date_to: dateTo?.toISOString() || new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      const result = data?.[0] || {};
      return {
        totalSearches: result.total_searches || 0,
        uniqueDocumentsSearched: result.unique_documents_searched || 0,
        avgResultsPerSearch: result.avg_results_per_search || 0,
        mostSearchedTerms: result.most_searched_terms || [],
        topDocuments: result.top_documents || [],
      };

    } catch (error) {
      this.handleApiError(error, 'Search analytics');
    }
  }

  /**
   * Search within specific documents
   */
  public async searchInDocuments(
    query: string,
    documentIds: string[],
    options: Omit<ExtendedSearchOptions, 'documentIds'> = {},
    abortSignal?: AbortSignal
  ): Promise<VectorSearchResponse> {
    return this.search(query, { ...options, documentIds }, abortSignal);
  }

  /**
   * Search within a specific folder
   */
  public async searchInFolder(
    query: string,
    folderId: string,
    options: Omit<ExtendedSearchOptions, 'folderId'> = {},
    abortSignal?: AbortSignal
  ): Promise<VectorSearchResponse> {
    return this.search(query, { ...options, folderId }, abortSignal);
  }

  /**
   * Get similar documents based on a document chunk
   */
  public async findSimilarDocuments(
    chunkId: string,
    options: ExtendedSearchOptions = {},
    abortSignal?: AbortSignal
  ): Promise<VectorSearchResponse> {
    try {
      // Get the chunk content to use as query
      const { data: chunk, error } = await supabase
        .from('document_chunks')
        .select('content')
        .eq('id', chunkId)
        .single();

      if (error || !chunk) {
        throw new Error('Chunk not found');
      }

      // Use the chunk content as the search query
      return this.search(chunk.content, {
        ...options,
        maxResults: options.maxResults || 5,
        minSimilarity: options.minSimilarity || 0.8,
      }, abortSignal);

    } catch (error) {
      this.handleApiError(error, 'Similar documents search');
    }
  }

  /**
   * Batch search multiple queries
   */
  public async batchSearch(
    queries: string[],
    options: ExtendedSearchOptions = {},
    abortSignal?: AbortSignal
  ): Promise<VectorSearchResponse[]> {
    try {
      const searchPromises = queries.map(query => 
        this.search(query, options, abortSignal)
      );

      return await Promise.all(searchPromises);

    } catch (error) {
      this.handleApiError(error, 'Batch search');
    }
  }

  /**
   * Clear search cache (if implemented)
   */
  public clearCache(): void {
    // Implementation for clearing any local cache
    // This could be expanded to include IndexedDB or other caching mechanisms
    console.log('Search cache cleared');
  }

  /**
   * Get search performance metrics
   */
  public getPerformanceMetrics(): {
    averageResponseTime: number;
    totalSearches: number;
    errorRate: number;
  } {
    // This could be implemented to track performance metrics
    // For now, return placeholder values
    return {
      averageResponseTime: 0,
      totalSearches: 0,
      errorRate: 0,
    };
  }
}

// Export singleton instance
export const vectorSearchService = VectorSearchService.getInstance();

// Export utility functions
export const searchUtils = {
  /**
   * Highlight search terms in text
   */
  highlightSearchTerms(text: string, query: string): string {
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    let highlightedText = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  },

  /**
   * Extract excerpt around search terms
   */
  extractExcerpt(text: string, query: string, maxLength: number = 200): string {
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const lowerText = text.toLowerCase();

    // Find the first occurrence of any search term
    let firstIndex = -1;
    for (const term of terms) {
      const index = lowerText.indexOf(term);
      if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
        firstIndex = index;
      }
    }

    if (firstIndex === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Extract text around the first occurrence
    const start = Math.max(0, firstIndex - maxLength / 2);
    const end = Math.min(text.length, start + maxLength);
    
    let excerpt = text.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  },

  /**
   * Validate search query
   */
  validateQuery(query: string): { isValid: boolean; error?: string } {
    if (!query || query.trim().length === 0) {
      return { isValid: false, error: 'Query cannot be empty' };
    }

    if (query.length < SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH) {
      return { 
        isValid: false, 
        error: `Query must be at least ${SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH} characters` 
      };
    }

    if (query.length > SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH) {
      return { 
        isValid: false, 
        error: `Query must be at most ${SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH} characters` 
      };
    }

    return { isValid: true };
  },
};