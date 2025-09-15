/**
 * Enhanced Search Interface Component
 * Provides comprehensive search functionality with options and filters
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Filter, Settings, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { vectorSearchService, ExtendedSearchOptions, VectorSearchResponse } from '@/services/vectorSearchService';
import { SearchResult, DocumentFolder } from '@/types/enhanced-rag';
import { searchUtils } from '@/services/vectorSearchService';

interface SearchInterfaceProps {
  onSearchResults?: (results: SearchResult[], query: string, searchType: string) => void;
  onError?: (error: string) => void;
  availableFolders?: DocumentFolder[];
  className?: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  searchType: 'vector' | 'hybrid' | 'keyword';
  processingTime: number;
  totalCount: number;
}

interface SearchFilters extends ExtendedSearchOptions {
  searchMode: 'vector' | 'hybrid';
  showAdvanced: boolean;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  onSearchResults,
  onError,
  availableFolders = [],
  className = '',
}) => {
  // State management
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    searchType: 'vector',
    processingTime: 0,
    totalCount: 0,
  });

  const [filters, setFilters] = useState<SearchFilters>({
    searchMode: 'vector',
    maxResults: 10,
    minSimilarity: 0.7,
    includeMetadata: true,
    hybridSearch: false,
    vectorWeight: 0.7,
    keywordWeight: 0.3,
    showAdvanced: false,
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Debounced search suggestions
  const [suggestionTimeout, setSuggestionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Memoized validation
  const queryValidation = useMemo(() => {
    return searchUtils.validateQuery(searchState.query);
  }, [searchState.query]);

  // Handle query input changes
  const handleQueryChange = useCallback((value: string) => {
    setSearchState(prev => ({ ...prev, query: value, error: null }));

    // Clear existing timeout
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }

    // Set new timeout for suggestions
    if (value.length >= 2) {
      const timeout = setTimeout(async () => {
        try {
          const response = await vectorSearchService.getSearchSuggestions(value, 5);
          setSuggestions(response.suggestions.map(s => s.suggestion));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      }, 300);
      setSuggestionTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [suggestionTimeout]);

  // Handle search execution
  const handleSearch = useCallback(async (searchQuery?: string) => {
    const query = searchQuery || searchState.query;
    
    if (!queryValidation.isValid) {
      setSearchState(prev => ({ ...prev, error: queryValidation.error || 'Invalid query' }));
      onError?.(queryValidation.error || 'Invalid query');
      return;
    }

    // Cancel previous search
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setSearchState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      results: [],
    }));

    setShowSuggestions(false);

    try {
      const searchOptions: ExtendedSearchOptions = {
        maxResults: filters.maxResults,
        minSimilarity: filters.minSimilarity,
        includeMetadata: filters.includeMetadata,
        folderId: filters.folderId,
        documentIds: filters.documentIds,
        language: filters.language,
        hybridSearch: filters.searchMode === 'hybrid',
        vectorWeight: filters.vectorWeight,
        keywordWeight: filters.keywordWeight,
      };

      const response: VectorSearchResponse = await vectorSearchService.search(
        query,
        searchOptions,
        newAbortController.signal
      );

      setSearchState(prev => ({
        ...prev,
        results: response.results,
        searchType: response.searchType,
        processingTime: response.processingTime,
        totalCount: response.totalCount,
        isLoading: false,
      }));

      onSearchResults?.(response.results, query, response.searchType);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage = error.message || 'Search failed';
        setSearchState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        onError?.(errorMessage);
      }
    } finally {
      setAbortController(null);
    }
  }, [searchState.query, filters, queryValidation, abortController, onSearchResults, onError]);

  // Handle filter changes
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSearchState(prev => ({ ...prev, query: suggestion }));
    setShowSuggestions(false);
    handleSearch(suggestion);
  }, [handleSearch]);

  // Handle key press events
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSearch();
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [handleSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }
    };
  }, [abortController, suggestionTimeout]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input Section */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={searchState.query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 pr-4"
                  disabled={searchState.isLoading}
                />
                
                {/* Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <span className="text-sm">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                onClick={() => handleSearch()}
                disabled={searchState.isLoading || !queryValidation.isValid}
                className="px-6"
              >
                {searchState.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Query Validation Error */}
            {!queryValidation.isValid && searchState.query.length > 0 && (
              <p className="text-sm text-red-500 mt-1">{queryValidation.error}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Filters */}
      <Collapsible open={filters.showAdvanced} onOpenChange={(open) => updateFilter('showAdvanced', open)}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Search Options
            </span>
            <Settings className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-4">
              <Tabs value={filters.searchMode} onValueChange={(value) => updateFilter('searchMode', value as 'vector' | 'hybrid')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="vector">Vector Search</TabsTrigger>
                  <TabsTrigger value="hybrid">Hybrid Search</TabsTrigger>
                </TabsList>
                
                <TabsContent value="vector" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Similarity Threshold: {filters.minSimilarity}</label>
                    <Slider
                      value={[filters.minSimilarity || 0.7]}
                      onValueChange={([value]) => updateFilter('minSimilarity', value)}
                      min={0.1}
                      max={1}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="hybrid" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Vector Weight: {filters.vectorWeight}</label>
                    <Slider
                      value={[filters.vectorWeight || 0.7]}
                      onValueChange={([value]) => {
                        updateFilter('vectorWeight', value);
                        updateFilter('keywordWeight', 1 - value);
                      }}
                      min={0}
                      max={1}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Keyword Weight: {filters.keywordWeight}</label>
                    <Slider
                      value={[filters.keywordWeight || 0.3]}
                      onValueChange={([value]) => {
                        updateFilter('keywordWeight', value);
                        updateFilter('vectorWeight', 1 - value);
                      }}
                      min={0}
                      max={1}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Max Results</label>
                  <Select
                    value={filters.maxResults?.toString()}
                    onValueChange={(value) => updateFilter('maxResults', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 results</SelectItem>
                      <SelectItem value="10">10 results</SelectItem>
                      <SelectItem value="20">20 results</SelectItem>
                      <SelectItem value="50">50 results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {availableFolders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Search in Folder</label>
                    <Select
                      value={filters.folderId || 'all'}
                      onValueChange={(value) => updateFilter('folderId', value === 'all' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All folders</SelectItem>
                        {availableFolders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-metadata"
                  checked={filters.includeMetadata}
                  onCheckedChange={(checked) => updateFilter('includeMetadata', checked)}
                />
                <label htmlFor="include-metadata" className="text-sm font-medium">
                  Include highlighting and metadata
                </label>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Error */}
      {searchState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchState.error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results Summary */}
      {searchState.results.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Search Results</span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>{searchState.processingTime}ms</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Found {searchState.totalCount} results</span>
              <Badge variant="secondary">{searchState.searchType} search</Badge>
              {filters.folderId && (
                <Badge variant="outline">
                  Folder: {availableFolders.find(f => f.id === filters.folderId)?.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results List */}
      {searchState.results.length > 0 && (
        <div className="space-y-3">
          {searchState.results.map((result, index) => (
            <Card key={result.chunkId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-lg">{result.documentTitle}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {Math.round(result.similarity * 100)}% match
                      </Badge>
                      {result.pageNumber && (
                        <Badge variant="secondary">
                          Page {result.pageNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-gray-700">
                    {filters.includeMetadata && result.highlight ? (
                      <div dangerouslySetInnerHTML={{ __html: result.highlight }} />
                    ) : (
                      <p>{searchUtils.extractExcerpt(result.content, searchState.query)}</p>
                    )}
                  </div>
                  
                  {filters.includeMetadata && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Chunk {index + 1}</span>
                      <span>•</span>
                      <span>Document ID: {result.documentId.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!searchState.isLoading && searchState.query && searchState.results.length === 0 && !searchState.error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { SearchInterface };
export default SearchInterface;