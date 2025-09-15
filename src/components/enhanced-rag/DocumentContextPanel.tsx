/**
 * Document Context Panel Component
 * Panel for managing document context and search
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  FileText, 
  Check, 
  Plus, 
  X, 
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentContextPanelProps, DocumentContext } from '@/types/enhanced-chat';
import { cn } from '@/lib/utils';

/**
 * Document Context Item Component
 */
interface DocumentContextItemProps {
  document: DocumentContext;
  isSelected: boolean;
  onToggle: (documentId: string) => void;
  onExpand?: (documentId: string) => void;
  className?: string;
}

const DocumentContextItem: React.FC<DocumentContextItemProps> = ({
  document,
  isSelected,
  onToggle,
  onExpand,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    onToggle(document.documentId);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    onExpand?.(document.documentId);
  };

  return (
    <Card className={cn(
      'transition-colors',
      isSelected && 'ring-2 ring-primary',
      className
    )}>
      <CardContent className="p-3">
        {/* Document Header */}
        <div className="flex items-start space-x-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleToggle}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h4 className="font-medium text-sm truncate">
                {document.documentTitle}
              </h4>
            </div>
            
            {/* Relevance Score */}
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {document.relevantChunks.length} chunk(s)
              </Badge>
              <Badge 
                variant="secondary" 
                className="text-xs"
              >
                {Math.round(document.totalRelevanceScore * 100)}% relevance
              </Badge>
            </div>
          </div>
          
          {/* Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpand}
            className="flex-shrink-0"
          >
            <Plus className={cn(
              'h-3 w-3 transition-transform',
              isExpanded && 'rotate-45'
            )} />
          </Button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 space-y-2">
            <Separator />
            {document.relevantChunks.map((chunk, index) => (
              <div
                key={chunk.chunkId}
                className="p-2 bg-muted/50 rounded text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Chunk {index + 1}
                    {chunk.pageNumber && ` (Page ${chunk.pageNumber})`}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(chunk.relevanceScore * 100)}%
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-3">
                  {chunk.content}
                </p>
                {chunk.highlight && (
                  <p className="text-primary font-medium">
                    Highlight: {chunk.highlight}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Document Context Panel Component
 */
export const DocumentContextPanel: React.FC<DocumentContextPanelProps> = ({
  documentContext,
  availableDocuments,
  selectedDocuments,
  onDocumentSelect,
  onDocumentSearch,
  isLoading = false,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [searchResults, setSearchResults] = useState<DocumentContext[]>([]);

  /**
   * Handle document selection toggle
   */
  const handleDocumentToggle = (documentId: string) => {
    const newSelection = selectedDocuments.includes(documentId)
      ? selectedDocuments.filter(id => id !== documentId)
      : [...selectedDocuments, documentId];
    
    onDocumentSelect(newSelection);
  };

  /**
   * Handle search
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      await onDocumentSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  /**
   * Handle search input change
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResults([]);
    }
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * Select all documents
   */
  const selectAllDocuments = () => {
    const allDocIds = showAllDocuments 
      ? availableDocuments 
      : documentContext.map(doc => doc.documentId);
    onDocumentSelect(allDocIds);
  };

  /**
   * Clear all selections
   */
  const clearAllSelections = () => {
    onDocumentSelect([]);
  };

  /**
   * Update search results when document context changes
   */
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(documentContext);
    }
  }, [documentContext, searchQuery]);

  const displayDocuments = searchQuery.trim() ? searchResults : documentContext;
  const hasDocuments = displayDocuments.length > 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Document Context</span>
          {selectedDocuments.length > 0 && (
            <Badge variant="secondary">
              {selectedDocuments.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      {/* Search */}
      <div className="px-6 pb-4 space-y-3">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search documents..."
              className="pr-8"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isLoading}
            size="sm"
            aria-label="Search documents"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllDocuments(!showAllDocuments)}
            >
              <Filter className="h-3 w-3 mr-1" />
              {showAllDocuments ? 'Show Context' : 'Show All'}
            </Button>
          </div>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllDocuments}
              disabled={!hasDocuments}
            >
              <Check className="h-3 w-3 mr-1" />
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllSelections}
              disabled={selectedDocuments.length === 0}
            >
              <X className="h-3 w-3 mr-1" />
              None
            </Button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 px-6 pb-6">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          ) : hasDocuments ? (
            <div className="space-y-3">
              {displayDocuments.map((doc) => (
                <DocumentContextItem
                  key={doc.documentId}
                  document={doc}
                  isSelected={selectedDocuments.includes(doc.documentId)}
                  onToggle={handleDocumentToggle}
                />
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search term or check your document collection.
              </p>
            </div>
          ) : showAllDocuments ? (
            <div className="space-y-2">
              {availableDocuments.map((docId) => (
                <Card key={docId} className="p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedDocuments.includes(docId)}
                      onCheckedChange={() => handleDocumentToggle(docId)}
                    />
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{docId}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium">No document context</h3>
              <p className="text-sm text-muted-foreground">
                Search for documents to see relevant context for your conversation.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer */}
      {selectedDocuments.length > 0 && (
        <div className="border-t p-4 bg-muted/50">
          <div className="text-sm text-muted-foreground">
            {selectedDocuments.length} document(s) will be used for context in your conversation.
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentContextPanel;