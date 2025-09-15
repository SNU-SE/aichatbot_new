/**
 * Multi-Language Search Interface Component
 * Enhanced search interface with multi-language support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  SearchResult, 
  MultiLanguageSearchOptions, 
  LanguageStatistics,
  SupportedLanguage 
} from '../../types/enhanced-rag';
import { MultiLanguageSearchService } from '../../services/multiLanguageSearchService';
import { LanguageDetectionService } from '../../services/languageDetectionService';
import { 
  LanguageSelector, 
  LanguageDetectionIndicator, 
  CrossLanguageToggle 
} from './LanguageSelector';

interface MultiLanguageSearchInterfaceProps {
  onSearchResults: (results: SearchResult[]) => void;
  onLanguageStats: (stats: LanguageStatistics[]) => void;
  userId?: string;
  className?: string;
}

export const MultiLanguageSearchInterface: React.FC<MultiLanguageSearchInterfaceProps> = ({
  onSearchResults,
  onLanguageStats,
  userId,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchOptions, setSearchOptions] = useState<MultiLanguageSearchOptions>({
    maxResults: 10,
    minSimilarity: 0.7,
    enableCrossLanguage: false
  });
  const [detectedQueryLanguage, setDetectedQueryLanguage] = useState<string>('');
  const [queryLanguageConfidence, setQueryLanguageConfidence] = useState<number>(0);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<Array<{
    query: string;
    language: string;
    timestamp: Date;
    resultCount: number;
  }>>([]);

  useEffect(() => {
    if (userId) {
      loadAvailableLanguages();
    }
  }, [userId]);

  useEffect(() => {
    // Detect query language when user types
    if (query.length > 10) {
      detectQueryLanguage();
    }
  }, [query]);

  const loadAvailableLanguages = async () => {
    if (!userId) return;
    
    try {
      const stats = await MultiLanguageSearchService.getLanguageDistribution(userId);
      const languages = stats
        .filter(stat => stat.documentCount > 0)
        .map(stat => stat.languageCode);
      
      setAvailableLanguages(languages);
    } catch (error) {
      console.error('Failed to load available languages:', error);
    }
  };

  const detectQueryLanguage = async () => {
    try {
      const detection = await LanguageDetectionService.detectLanguageFromText(query);
      setDetectedQueryLanguage(detection.detectedLanguage);
      setQueryLanguageConfidence(detection.confidence);
    } catch (error) {
      console.error('Query language detection failed:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || query.length < 3) {
      return;
    }

    setIsSearching(true);
    
    try {
      const result = await MultiLanguageSearchService.searchWithLanguageSupport(
        query,
        searchOptions
      );

      onSearchResults(result.results);
      onLanguageStats(result.languageStats);

      // Add to search history
      setSearchHistory(prev => [{
        query,
        language: detectedQueryLanguage || 'unknown',
        timestamp: new Date(),
        resultCount: result.results.length
      }, ...prev.slice(0, 9)]); // Keep last 10 searches

    } catch (error) {
      console.error('Search failed:', error);
      onSearchResults([]);
      onLanguageStats([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCrossLanguageSearch = async () => {
    if (!query.trim() || availableLanguages.length === 0) {
      return;
    }

    setIsSearching(true);
    
    try {
      const suggestedLanguages = await MultiLanguageSearchService.suggestSearchLanguages(query);
      const targetLanguages = suggestedLanguages.filter(lang => 
        availableLanguages.includes(lang) && lang !== detectedQueryLanguage
      );

      const result = await MultiLanguageSearchService.crossLanguageSearch(
        query,
        detectedQueryLanguage,
        targetLanguages,
        searchOptions
      );

      onSearchResults(result.results);
      
      // Generate language stats from cross-language results
      const languageStats = result.translationInfo.map(info => ({
        languageCode: info.language,
        languageName: LanguageDetectionService.getLanguageName(info.language),
        documentCount: info.resultCount,
        totalChunks: info.resultCount,
        percentage: (info.resultCount / result.results.length) * 100
      }));
      
      onLanguageStats(languageStats);

    } catch (error) {
      console.error('Cross-language search failed:', error);
      onSearchResults([]);
      onLanguageStats([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchOptions.enableCrossLanguage) {
        handleCrossLanguageSearch();
      } else {
        handleSearch();
      }
    }
  };

  const updateSearchOptions = (updates: Partial<MultiLanguageSearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className={`multi-language-search-interface ${className}`}>
      {/* Search Input */}
      <div className="search-input-section mb-4">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your search query in any language..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            disabled={isSearching}
          />
          
          {/* Query Language Detection */}
          {detectedQueryLanguage && (
            <div className="absolute top-2 right-2">
              <LanguageDetectionIndicator
                detectedLanguage={detectedQueryLanguage}
                confidence={queryLanguageConfidence}
              />
            </div>
          )}
        </div>

        {/* Search Actions */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex space-x-2">
            <button
              onClick={handleSearch}
              disabled={isSearching || query.length < 3}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            
            {availableLanguages.length > 1 && (
              <button
                onClick={handleCrossLanguageSearch}
                disabled={isSearching || query.length < 3}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cross-Language Search
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            {query.length}/1000 characters
          </div>
        </div>
      </div>

      {/* Search Options */}
      <div className="search-options-section mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Search Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language Selection */}
          <LanguageSelector
            mode="search"
            selectedLanguage={searchOptions.targetLanguage}
            onLanguageChange={(language) => updateSearchOptions({ targetLanguage: language })}
            showStatistics={true}
            userId={userId}
          />

          {/* Cross-Language Toggle */}
          <CrossLanguageToggle
            enabled={searchOptions.enableCrossLanguage || false}
            onToggle={(enabled) => updateSearchOptions({ enableCrossLanguage: enabled })}
            availableLanguages={availableLanguages}
          />
        </div>

        {/* Advanced Options */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Results
            </label>
            <select
              value={searchOptions.maxResults}
              onChange={(e) => updateSearchOptions({ maxResults: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value={5}>5 results</option>
              <option value={10}>10 results</option>
              <option value={20}>20 results</option>
              <option value={50}>50 results</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Similarity Threshold
            </label>
            <select
              value={searchOptions.minSimilarity}
              onChange={(e) => updateSearchOptions({ minSimilarity: parseFloat(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value={0.5}>Low (50%)</option>
              <option value={0.7}>Medium (70%)</option>
              <option value={0.8}>High (80%)</option>
              <option value={0.9}>Very High (90%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Translation Quality
            </label>
            <select
              value={searchOptions.translationQualityThreshold || 0.7}
              onChange={(e) => updateSearchOptions({ 
                translationQualityThreshold: parseFloat(e.target.value) 
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              disabled={!searchOptions.enableCrossLanguage}
            >
              <option value={0.5}>Any Quality</option>
              <option value={0.7}>Good Quality</option>
              <option value={0.8}>High Quality</option>
              <option value={0.9}>Excellent Quality</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="search-history-section">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
          
          <div className="space-y-1">
            {searchHistory.slice(0, 3).map((search, index) => (
              <button
                key={index}
                onClick={() => setQuery(search.query)}
                className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <span className="truncate">{search.query}</span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <LanguageDetectionIndicator
                      detectedLanguage={search.language}
                    />
                    <span>{search.resultCount} results</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Search Result Item with Language Information
 */
interface MultiLanguageSearchResultProps {
  result: SearchResult;
  onDocumentClick: (documentId: string) => void;
  className?: string;
}

export const MultiLanguageSearchResult: React.FC<MultiLanguageSearchResultProps> = ({
  result,
  onDocumentClick,
  className = ''
}) => {
  const handleDocumentClick = () => {
    onDocumentClick(result.documentId);
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.9) return 'text-green-600 bg-green-50';
    if (similarity >= 0.8) return 'text-blue-600 bg-blue-50';
    if (similarity >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className={`multi-language-search-result ${className} p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow`}>
      {/* Result Header */}
      <div className="flex justify-between items-start mb-2">
        <button
          onClick={handleDocumentClick}
          className="text-lg font-medium text-blue-600 hover:text-blue-800 text-left"
        >
          {result.documentTitle}
        </button>
        
        <div className="flex items-center space-x-2">
          {/* Language Indicator */}
          <LanguageDetectionIndicator
            detectedLanguage={result.sourceLanguage}
          />
          
          {/* Translation Indicator */}
          {result.isTranslated && (
            <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded-full">
              Translated
            </span>
          )}
          
          {/* Similarity Score */}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            getSimilarityColor(result.similarity)
          }`}>
            {Math.round(result.similarity * 100)}% match
          </span>
        </div>
      </div>

      {/* Content Preview */}
      <div className="mb-3">
        <p className="text-gray-700 text-sm leading-relaxed">
          {result.highlight || result.content}
        </p>
      </div>

      {/* Result Footer */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {result.pageNumber && (
            <span>Page {result.pageNumber}</span>
          )}
          
          <span>Chunk {result.chunkId.slice(-8)}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>
            {LanguageDetectionService.getLanguageName(result.sourceLanguage)}
          </span>
          
          {result.isTranslated && (
            <span className="text-purple-600">• Translated</span>
          )}
        </div>
      </div>
    </div>
  );
};