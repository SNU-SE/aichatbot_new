/**
 * Multi-Language Search Service
 * Handles cross-language document search and retrieval
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  SearchResult, 
  MultiLanguageSearchOptions, 
  LanguageStatistics,
  EnhancedErrorResponse,
  SearchErrorCode,
  SupportedLanguage 
} from '../types/enhanced-rag';
import { LanguageDetectionService } from './languageDetectionService';

/**
 * Multi-language search service class
 */
export class MultiLanguageSearchService {
  /**
   * Search documents with multi-language support
   */
  static async searchWithLanguageSupport(
    query: string,
    options: MultiLanguageSearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    languageStats: LanguageStatistics[];
    totalResults: number;
  }> {
    try {
      // Generate query embedding (this would typically call OpenAI API)
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      // Get user accessible documents
      const accessibleDocs = await this.getUserAccessibleDocuments();
      
      // Perform language-aware search
      const { data: searchResults, error } = await supabase.rpc(
        'search_documents_with_language_support',
        {
          query_embedding: queryEmbedding,
          user_accessible_docs: accessibleDocs,
          target_language: options.targetLanguage || null,
          enable_cross_language: options.enableCrossLanguage || false,
          similarity_threshold: options.minSimilarity || 0.7,
          max_results: options.maxResults || 10
        }
      );

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      // Process and format results
      const formattedResults = this.formatSearchResults(searchResults || []);
      
      // Generate language statistics
      const languageStats = this.generateLanguageStatistics(formattedResults);

      return {
        results: formattedResults,
        languageStats,
        totalResults: formattedResults.length
      };

    } catch (error) {
      console.error('Multi-language search failed:', error);
      throw this.createSearchError(
        SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
        'Multi-language search service is currently unavailable',
        error
      );
    }
  }

  /**
   * Search within specific language documents
   */
  static async searchByLanguage(
    query: string,
    languageCode: string,
    options: MultiLanguageSearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const searchOptions: MultiLanguageSearchOptions = {
        ...options,
        targetLanguage: languageCode,
        enableCrossLanguage: false
      };

      const result = await this.searchWithLanguageSupport(query, searchOptions);
      return result.results;

    } catch (error) {
      console.error(`Language-specific search failed for ${languageCode}:`, error);
      throw error;
    }
  }

  /**
   * Cross-language search with translation support
   */
  static async crossLanguageSearch(
    query: string,
    sourceLanguage: string,
    targetLanguages: string[],
    options: MultiLanguageSearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    translationInfo: Array<{
      language: string;
      resultCount: number;
      avgConfidence: number;
    }>;
  }> {
    try {
      const allResults: SearchResult[] = [];
      const translationInfo: Array<{
        language: string;
        resultCount: number;
        avgConfidence: number;
      }> = [];

      // Search in each target language
      for (const targetLang of targetLanguages) {
        const searchOptions: MultiLanguageSearchOptions = {
          ...options,
          sourceLanguage,
          targetLanguage: targetLang,
          enableCrossLanguage: true,
          maxResults: Math.ceil((options.maxResults || 10) / targetLanguages.length)
        };

        const result = await this.searchWithLanguageSupport(query, searchOptions);
        
        if (result.results.length > 0) {
          allResults.push(...result.results);
          
          const avgConfidence = result.results.reduce((sum, r) => sum + r.similarity, 0) / result.results.length;
          translationInfo.push({
            language: targetLang,
            resultCount: result.results.length,
            avgConfidence
          });
        }
      }

      // Sort by relevance and remove duplicates
      const uniqueResults = this.deduplicateResults(allResults);
      const sortedResults = uniqueResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.maxResults || 10);

      return {
        results: sortedResults,
        translationInfo
      };

    } catch (error) {
      console.error('Cross-language search failed:', error);
      throw error;
    }
  }

  /**
   * Get language distribution for user's documents
   */
  static async getLanguageDistribution(userId: string): Promise<LanguageStatistics[]> {
    try {
      const rawStats = await LanguageDetectionService.getUserLanguageStatistics(userId);
      
      const totalDocs = rawStats.reduce((sum, stat) => sum + parseInt(stat.document_count), 0);
      
      return rawStats.map(stat => ({
        languageCode: stat.language_code,
        languageName: LanguageDetectionService.getLanguageName(stat.language_code),
        documentCount: parseInt(stat.document_count),
        totalChunks: parseInt(stat.total_chunks),
        percentage: totalDocs > 0 ? (parseInt(stat.document_count) / totalDocs) * 100 : 0
      }));

    } catch (error) {
      console.error('Failed to get language distribution:', error);
      return [];
    }
  }

  /**
   * Suggest search languages based on query
   */
  static async suggestSearchLanguages(query: string): Promise<string[]> {
    try {
      // Detect query language
      const detection = await LanguageDetectionService.detectLanguageFromText(query);
      
      const suggestions = [detection.detectedLanguage];
      
      // Add common cross-language pairs
      const crossLanguagePairs: Record<string, string[]> = {
        [SupportedLanguage.ENGLISH]: [SupportedLanguage.KOREAN, SupportedLanguage.JAPANESE, SupportedLanguage.CHINESE],
        [SupportedLanguage.KOREAN]: [SupportedLanguage.ENGLISH, SupportedLanguage.JAPANESE],
        [SupportedLanguage.JAPANESE]: [SupportedLanguage.ENGLISH, SupportedLanguage.KOREAN],
        [SupportedLanguage.CHINESE]: [SupportedLanguage.ENGLISH],
        [SupportedLanguage.FRENCH]: [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH],
        [SupportedLanguage.GERMAN]: [SupportedLanguage.ENGLISH],
        [SupportedLanguage.SPANISH]: [SupportedLanguage.ENGLISH, SupportedLanguage.FRENCH]
      };

      const additionalLangs = crossLanguagePairs[detection.detectedLanguage] || [];
      suggestions.push(...additionalLangs);

      return [...new Set(suggestions)]; // Remove duplicates

    } catch (error) {
      console.error('Failed to suggest search languages:', error);
      return [SupportedLanguage.ENGLISH];
    }
  }

  /**
   * Generate query embedding (placeholder - would use actual embedding service)
   */
  private static async generateQueryEmbedding(query: string): Promise<number[]> {
    // In a real implementation, this would call OpenAI's embedding API
    // For now, return a mock embedding
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }

  /**
   * Get user accessible documents
   */
  private static async getUserAccessibleDocuments(): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_accessible_documents', {
        target_user_id: user.id
      });

      if (error) {
        console.error('Failed to get accessible documents:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Failed to get user accessible documents:', error);
      return [];
    }
  }

  /**
   * Format search results
   */
  private static formatSearchResults(rawResults: any[]): SearchResult[] {
    return rawResults.map(result => ({
      chunkId: result.chunk_id,
      documentId: result.document_id,
      documentTitle: result.document_title,
      content: result.content,
      pageNumber: result.page_number,
      similarity: parseFloat(result.similarity),
      sourceLanguage: result.source_language || 'unknown',
      isTranslated: result.is_translated || false,
      metadata: {},
      highlight: this.generateHighlight(result.content, 150)
    }));
  }

  /**
   * Generate language statistics from search results
   */
  private static generateLanguageStatistics(results: SearchResult[]): LanguageStatistics[] {
    const langCounts: Record<string, number> = {};
    
    results.forEach(result => {
      const lang = result.sourceLanguage;
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    const total = results.length;
    
    return Object.entries(langCounts).map(([code, count]) => ({
      languageCode: code,
      languageName: LanguageDetectionService.getLanguageName(code),
      documentCount: count,
      totalChunks: count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  /**
   * Remove duplicate results based on chunk ID
   */
  private static deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.chunkId)) {
        return false;
      }
      seen.add(result.chunkId);
      return true;
    });
  }

  /**
   * Generate content highlight
   */
  private static generateHighlight(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create search error
   */
  private static createSearchError(
    code: SearchErrorCode,
    message: string,
    originalError?: any
  ): EnhancedErrorResponse {
    return {
      code,
      message,
      details: originalError,
      retryable: code !== SearchErrorCode.INVALID_SEARCH_PARAMETERS,
      suggestedAction: this.getSuggestedAction(code),
      timestamp: new Date()
    };
  }

  /**
   * Get suggested action for error code
   */
  private static getSuggestedAction(code: SearchErrorCode): string {
    switch (code) {
      case SearchErrorCode.QUERY_TOO_SHORT:
        return 'Please enter a longer search query (minimum 3 characters)';
      case SearchErrorCode.EMBEDDING_GENERATION_FAILED:
        return 'Please try again in a few moments';
      case SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE:
        return 'Please check your connection and try again';
      case SearchErrorCode.NO_ACCESSIBLE_DOCUMENTS:
        return 'Please upload documents or check your permissions';
      case SearchErrorCode.INVALID_SEARCH_PARAMETERS:
        return 'Please check your search parameters and try again';
      default:
        return 'Please try again or contact support if the problem persists';
    }
  }
}

/**
 * Multi-language search utilities
 */
export const multiLanguageSearchUtils = {
  /**
   * Check if cross-language search is beneficial
   */
  shouldEnableCrossLanguage: (
    queryLanguage: string, 
    availableLanguages: string[]
  ): boolean => {
    // Enable cross-language if query language is different from available languages
    return !availableLanguages.includes(queryLanguage) && availableLanguages.length > 0;
  },

  /**
   * Get optimal search languages for a query
   */
  getOptimalSearchLanguages: (
    queryLanguage: string,
    availableLanguages: string[],
    maxLanguages: number = 3
  ): string[] => {
    const languages = new Set([queryLanguage]);
    
    // Add available languages, prioritizing common cross-language pairs
    const priorities: Record<string, string[]> = {
      [SupportedLanguage.ENGLISH]: [SupportedLanguage.KOREAN, SupportedLanguage.JAPANESE],
      [SupportedLanguage.KOREAN]: [SupportedLanguage.ENGLISH],
      [SupportedLanguage.JAPANESE]: [SupportedLanguage.ENGLISH]
    };

    const priorityLangs = priorities[queryLanguage] || [];
    
    for (const lang of priorityLangs) {
      if (availableLanguages.includes(lang) && languages.size < maxLanguages) {
        languages.add(lang);
      }
    }

    // Fill remaining slots with other available languages
    for (const lang of availableLanguages) {
      if (languages.size >= maxLanguages) break;
      languages.add(lang);
    }

    return Array.from(languages);
  },

  /**
   * Format language statistics for display
   */
  formatLanguageStats: (stats: LanguageStatistics[]): string => {
    if (stats.length === 0) return 'No language data available';
    
    const topLanguages = stats
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3)
      .map(stat => `${stat.languageName} (${stat.percentage.toFixed(1)}%)`)
      .join(', ');
    
    return `Languages: ${topLanguages}`;
  }
};
