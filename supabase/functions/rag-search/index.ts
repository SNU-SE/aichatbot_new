/**
 * Enhanced RAG Search Edge Function
 * Provides vector similarity search and hybrid search capabilities
 * for the enhanced RAG system
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Types for search functionality
interface SearchRequest {
  query: string;
  options?: SearchOptions;
}

interface SearchOptions {
  documentIds?: string[];
  maxResults?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
  language?: string;
  folderId?: string;
  hybridSearch?: boolean;
  keywordWeight?: number;
  vectorWeight?: number;
}

interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  pageNumber?: number;
  similarity: number;
  metadata: any;
  highlight?: string;
  rank?: number;
}

interface HybridSearchResult extends SearchResult {
  vectorScore: number;
  keywordScore: number;
  combinedScore: number;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  processingTime: number;
  searchType: 'vector' | 'hybrid' | 'keyword';
  query: string;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Constants
const SEARCH_CONSTRAINTS = {
  MIN_QUERY_LENGTH: 3,
  MAX_QUERY_LENGTH: 1000,
  DEFAULT_MAX_RESULTS: 10,
  MAX_RESULTS_LIMIT: 100,
  DEFAULT_MIN_SIMILARITY: 0.7,
  MIN_SIMILARITY_THRESHOLD: 0.1,
  DEFAULT_KEYWORD_WEIGHT: 0.3,
  DEFAULT_VECTOR_WEIGHT: 0.7,
} as const;

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generate embedding for search query using OpenAI
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate query embedding');
  }
}

/**
 * Get user accessible documents
 */
async function getUserAccessibleDocuments(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_accessible_documents', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error getting accessible documents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAccessibleDocuments:', error);
    return [];
  }
}

/**
 * Perform vector similarity search
 */
async function performVectorSearch(
  queryEmbedding: number[],
  options: SearchOptions,
  accessibleDocs: string[]
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('search_documents_with_vector', {
      query_embedding: queryEmbedding,
      user_accessible_docs: accessibleDocs,
      similarity_threshold: options.minSimilarity || SEARCH_CONSTRAINTS.DEFAULT_MIN_SIMILARITY,
      max_results: options.maxResults || SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS
    });

    if (error) {
      console.error('Vector search error:', error);
      throw new Error('Vector search failed');
    }

    return (data || []).map((row: any) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      content: row.content,
      pageNumber: row.page_number,
      similarity: row.similarity,
      metadata: {},
    }));
  } catch (error) {
    console.error('Error in performVectorSearch:', error);
    throw error;
  }
}

/**
 * Perform keyword search using full-text search
 */
async function performKeywordSearch(
  query: string,
  options: SearchOptions,
  accessibleDocs: string[]
): Promise<SearchResult[]> {
  try {
    // Build the search query with filters
    let searchQuery = supabase
      .from('document_chunks')
      .select(`
        id,
        document_id,
        content,
        page_number,
        metadata,
        documents!inner(
          id,
          title,
          processing_status
        )
      `)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'english'
      })
      .eq('documents.processing_status', 'completed')
      .in('document_id', accessibleDocs)
      .order('ts_rank(to_tsvector(content), websearch_to_tsquery($1))', { ascending: false })
      .limit(options.maxResults || SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS);

    const { data, error } = await searchQuery;

    if (error) {
      console.error('Keyword search error:', error);
      throw new Error('Keyword search failed');
    }

    return (data || []).map((row: any, index: number) => ({
      chunkId: row.id,
      documentId: row.document_id,
      documentTitle: row.documents.title,
      content: row.content,
      pageNumber: row.page_number,
      similarity: 1 - (index * 0.1), // Approximate relevance based on rank
      metadata: row.metadata || {},
      rank: index + 1,
    }));
  } catch (error) {
    console.error('Error in performKeywordSearch:', error);
    throw error;
  }
}

/**
 * Perform hybrid search combining vector and keyword search
 */
async function performHybridSearch(
  query: string,
  queryEmbedding: number[],
  options: SearchOptions,
  accessibleDocs: string[]
): Promise<HybridSearchResult[]> {
  try {
    const vectorWeight = options.vectorWeight || SEARCH_CONSTRAINTS.DEFAULT_VECTOR_WEIGHT;
    const keywordWeight = options.keywordWeight || SEARCH_CONSTRAINTS.DEFAULT_KEYWORD_WEIGHT;

    // Perform both searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      performVectorSearch(queryEmbedding, { ...options, maxResults: options.maxResults || SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS }, accessibleDocs),
      performKeywordSearch(query, { ...options, maxResults: options.maxResults || SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS }, accessibleDocs)
    ]);

    // Create a map to combine results by chunk ID
    const combinedResults = new Map<string, HybridSearchResult>();

    // Process vector results
    vectorResults.forEach((result, index) => {
      const vectorScore = result.similarity;
      const keywordScore = 0; // Default if not found in keyword results
      
      combinedResults.set(result.chunkId, {
        ...result,
        vectorScore,
        keywordScore,
        combinedScore: (vectorScore * vectorWeight) + (keywordScore * keywordWeight),
      });
    });

    // Process keyword results and merge
    keywordResults.forEach((result, index) => {
      const keywordScore = result.similarity;
      const existing = combinedResults.get(result.chunkId);
      
      if (existing) {
        // Update existing result with keyword score
        existing.keywordScore = keywordScore;
        existing.combinedScore = (existing.vectorScore * vectorWeight) + (keywordScore * keywordWeight);
      } else {
        // Add new result with vector score of 0
        combinedResults.set(result.chunkId, {
          ...result,
          vectorScore: 0,
          keywordScore,
          combinedScore: (0 * vectorWeight) + (keywordScore * keywordWeight),
        });
      }
    });

    // Sort by combined score and return top results
    return Array.from(combinedResults.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, options.maxResults || SEARCH_CONSTRAINTS.DEFAULT_MAX_RESULTS);
  } catch (error) {
    console.error('Error in performHybridSearch:', error);
    throw error;
  }
}

/**
 * Add highlighting to search results
 */
function addHighlighting(results: SearchResult[], query: string): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  return results.map(result => {
    let highlightedContent = result.content;
    
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>');
    });
    
    // Create excerpt around first highlight
    const firstHighlight = highlightedContent.indexOf('<mark>');
    if (firstHighlight !== -1) {
      const start = Math.max(0, firstHighlight - 100);
      const end = Math.min(highlightedContent.length, firstHighlight + 300);
      result.highlight = '...' + highlightedContent.substring(start, end) + '...';
    }
    
    return result;
  });
}

/**
 * Validate search request
 */
function validateSearchRequest(request: SearchRequest): string | null {
  if (!request.query) {
    return 'Query is required';
  }
  
  if (request.query.length < SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH) {
    return `Query must be at least ${SEARCH_CONSTRAINTS.MIN_QUERY_LENGTH} characters`;
  }
  
  if (request.query.length > SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH) {
    return `Query must be at most ${SEARCH_CONSTRAINTS.MAX_QUERY_LENGTH} characters`;
  }
  
  if (request.options?.maxResults && request.options.maxResults > SEARCH_CONSTRAINTS.MAX_RESULTS_LIMIT) {
    return `Max results must be at most ${SEARCH_CONSTRAINTS.MAX_RESULTS_LIMIT}`;
  }
  
  if (request.options?.minSimilarity && 
      (request.options.minSimilarity < SEARCH_CONSTRAINTS.MIN_SIMILARITY_THRESHOLD || 
       request.options.minSimilarity > 1)) {
    return 'Min similarity must be between 0.1 and 1';
  }
  
  return null;
}

/**
 * Main handler function
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
          timestamp: new Date().toISOString(),
        } as ErrorResponse),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const requestBody: SearchRequest = await req.json();
    
    // Validate request
    const validationError = validateSearchRequest(requestBody);
    if (validationError) {
      return new Response(
        JSON.stringify({
          error: validationError,
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user ID from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Authorization header required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        } as ErrorResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
          code: 'UNAUTHORIZED',
          details: authError,
          timestamp: new Date().toISOString(),
        } as ErrorResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { query, options = {} } = requestBody;
    
    // Get user accessible documents
    const accessibleDocs = await getUserAccessibleDocuments(user.id);
    
    if (accessibleDocs.length === 0) {
      return new Response(
        JSON.stringify({
          results: [],
          totalCount: 0,
          processingTime: Date.now() - startTime,
          searchType: 'vector',
          query,
        } as SearchResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let results: SearchResult[] = [];
    let searchType: 'vector' | 'hybrid' | 'keyword' = 'vector';

    // Determine search type and perform search
    if (options.hybridSearch) {
      searchType = 'hybrid';
      const queryEmbedding = await generateQueryEmbedding(query);
      results = await performHybridSearch(query, queryEmbedding, options, accessibleDocs);
    } else {
      // Default to vector search
      const queryEmbedding = await generateQueryEmbedding(query);
      results = await performVectorSearch(queryEmbedding, options, accessibleDocs);
    }

    // Add highlighting if requested
    if (options.includeMetadata) {
      results = addHighlighting(results, query);
    }

    const response: SearchResponse = {
      results,
      totalCount: results.length,
      processingTime: Date.now() - startTime,
      searchType,
      query,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Search function error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message,
        timestamp: new Date().toISOString(),
      } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
