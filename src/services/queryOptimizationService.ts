/**
 * Query Optimization Service
 * Optimizes database queries and implements query caching
 */

import { supabase } from '@/integrations/supabase/client';
import { cacheService } from './cacheService';

export interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  timeout?: number;
}

export interface QueryResult<T> {
  data: T | null;
  error: any;
  count?: number;
  executionTime: number;
  fromCache: boolean;
}

/**
 * Query Optimization Service
 */
export class QueryOptimizationService {
  private static instance: QueryOptimizationService;
  private queryStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  private constructor() {}

  public static getInstance(): QueryOptimizationService {
    if (!QueryOptimizationService.instance) {
      QueryOptimizationService.instance = new QueryOptimizationService();
    }
    return QueryOptimizationService.instance;
  }

  /**
   * Execute optimized query with caching
   */
  async executeQuery<T>(
    queryBuilder: any,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = performance.now();
    const {
      useCache = true,
      cacheTTL = 5 * 60 * 1000, // 5 minutes default
      cacheKey,
      timeout = 30000, // 30 seconds default
    } = options;

    // Generate cache key if not provided
    const key = cacheKey || this.generateCacheKey(queryBuilder);

    // Try cache first
    if (useCache) {
      const cached = await cacheService.get<T>(key, 'documents');
      if (cached) {
        return {
          data: cached,
          error: null,
          executionTime: performance.now() - startTime,
          fromCache: true,
        };
      }
    }

    try {
      // Execute query with timeout
      const queryPromise = queryBuilder;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const executionTime = performance.now() - startTime;

      // Update query statistics
      this.updateQueryStats(key, executionTime);

      // Cache successful results
      if (useCache && result.data && !result.error) {
        await cacheService.set(key, result.data, 'documents');
      }

      return {
        data: result.data,
        error: result.error,
        count: result.count,
        executionTime,
        fromCache: false,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updateQueryStats(key, executionTime);

      return {
        data: null,
        error,
        executionTime,
        fromCache: false,
      };
    }
  }

  /**
   * Optimized document queries
   */
  async getDocuments(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters?: Record<string, any>;
      search?: string;
    } = {}
  ) {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters = {},
      search,
    } = options;

    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        description,
        file_path,
        file_size,
        file_type,
        processing_status,
        created_at,
        updated_at,
        folder_id,
        metadata
      `)
      .eq('user_id', userId);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Apply search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const cacheKey = `documents:${userId}:${JSON.stringify(options)}`;

    return this.executeQuery(query, {
      cacheKey,
      cacheTTL: 2 * 60 * 1000, // 2 minutes for document lists
    });
  }

  /**
   * Optimized document chunks query
   */
  async getDocumentChunks(
    documentId: string,
    options: {
      limit?: number;
      offset?: number;
      includeEmbeddings?: boolean;
    } = {}
  ) {
    const { limit = 50, offset = 0, includeEmbeddings = false } = options;

    let selectFields = `
      id,
      document_id,
      content,
      chunk_index,
      page_number,
      metadata,
      created_at
    `;

    if (includeEmbeddings) {
      selectFields += ', embedding';
    }

    const query = supabase
      .from('document_chunks')
      .select(selectFields)
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .range(offset, offset + limit - 1);

    const cacheKey = `chunks:${documentId}:${JSON.stringify(options)}`;

    return this.executeQuery(query, {
      cacheKey,
      cacheTTL: 10 * 60 * 1000, // 10 minutes for chunks
    });
  }

  /**
   * Optimized search query with vector similarity
   */
  async searchDocuments(
    userId: string,
    query: string,
    options: {
      limit?: number;
      minSimilarity?: number;
      documentIds?: string[];
      folderId?: string;
    } = {}
  ) {
    const {
      limit = 10,
      minSimilarity = 0.7,
      documentIds,
      folderId,
    } = options;

    // Use RPC function for optimized vector search
    let rpcQuery = supabase.rpc('search_documents_optimized', {
      user_id_param: userId,
      query_text: query,
      similarity_threshold: minSimilarity,
      max_results: limit,
      document_ids_filter: documentIds,
      folder_id_filter: folderId,
    });

    const cacheKey = `search:${userId}:${btoa(query)}:${JSON.stringify(options)}`;

    return this.executeQuery(rpcQuery, {
      cacheKey,
      cacheTTL: 5 * 60 * 1000, // 5 minutes for search results
    });
  }

  /**
   * Batch document operations
   */
  async batchUpdateDocuments(
    updates: Array<{ id: string; updates: Record<string, any> }>
  ) {
    const startTime = performance.now();

    try {
      // Use batch update for better performance
      const promises = updates.map(({ id, updates: updateData }) =>
        supabase
          .from('documents')
          .update(updateData)
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const executionTime = performance.now() - startTime;

      // Invalidate related caches
      updates.forEach(({ id }) => {
        this.invalidateDocumentCache(id);
      });

      return {
        data: results,
        error: null,
        executionTime,
        fromCache: false,
      };
    } catch (error) {
      return {
        data: null,
        error,
        executionTime: performance.now() - startTime,
        fromCache: false,
      };
    }
  }

  /**
   * Optimized analytics queries
   */
  async getAnalyticsData(
    userId: string,
    dateRange: { from: Date; to: Date },
    metrics: string[]
  ) {
    const cacheKey = `analytics:${userId}:${dateRange.from.toISOString()}:${dateRange.to.toISOString()}:${metrics.join(',')}`;

    // Check cache first
    const cached = await cacheService.get(cacheKey, 'analytics');
    if (cached) {
      return {
        data: cached,
        error: null,
        executionTime: 0,
        fromCache: true,
      };
    }

    const startTime = performance.now();

    try {
      const promises = metrics.map(metric => {
        switch (metric) {
          case 'document_count':
            return supabase
              .from('documents')
              .select('id', { count: 'exact' })
              .eq('user_id', userId)
              .gte('created_at', dateRange.from.toISOString())
              .lte('created_at', dateRange.to.toISOString());

          case 'search_count':
            return supabase
              .from('search_analytics')
              .select('id', { count: 'exact' })
              .eq('user_id', userId)
              .gte('created_at', dateRange.from.toISOString())
              .lte('created_at', dateRange.to.toISOString());

          case 'chat_count':
            return supabase
              .from('enhanced_chat_logs')
              .select('id', { count: 'exact' })
              .eq('user_id', userId)
              .gte('created_at', dateRange.from.toISOString())
              .lte('created_at', dateRange.to.toISOString());

          default:
            return Promise.resolve({ data: null, count: 0 });
        }
      });

      const results = await Promise.all(promises);
      const data = metrics.reduce((acc, metric, index) => {
        acc[metric] = results[index].count || 0;
        return acc;
      }, {} as Record<string, number>);

      const executionTime = performance.now() - startTime;

      // Cache the results
      await cacheService.set(cacheKey, data, 'analytics');

      return {
        data,
        error: null,
        executionTime,
        fromCache: false,
      };
    } catch (error) {
      return {
        data: null,
        error,
        executionTime: performance.now() - startTime,
        fromCache: false,
      };
    }
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(queryBuilder: any): string {
    // Simple hash of query string representation
    const queryStr = JSON.stringify(queryBuilder);
    return btoa(queryStr).substring(0, 50);
  }

  /**
   * Update query statistics
   */
  private updateQueryStats(queryKey: string, executionTime: number): void {
    const stats = this.queryStats.get(queryKey) || { count: 0, totalTime: 0, avgTime: 0 };
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    this.queryStats.set(queryKey, stats);
  }

  /**
   * Invalidate document-related caches
   */
  private async invalidateDocumentCache(documentId: string): Promise<void> {
    await cacheService.delete(`document:${documentId}`, 'documents');
    await cacheService.delete(`chunks:${documentId}`, 'documents');
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): Map<string, { count: number; totalTime: number; avgTime: number }> {
    return new Map(this.queryStats);
  }

  /**
   * Clear query statistics
   */
  clearQueryStats(): void {
    this.queryStats.clear();
  }

  /**
   * Preload frequently accessed data
   */
  async preloadUserData(userId: string): Promise<void> {
    // Preload user's recent documents
    this.getDocuments(userId, { limit: 10 });

    // Preload user's folders
    supabase
      .from('document_folders')
      .select('*')
      .eq('user_id', userId)
      .then(result => {
        if (result.data) {
          cacheService.set(`folders:${userId}`, result.data, 'documents');
        }
      });
  }
}

// Export singleton instance
export const queryOptimizationService = QueryOptimizationService.getInstance();