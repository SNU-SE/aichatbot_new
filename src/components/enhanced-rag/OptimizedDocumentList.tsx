/**
 * Optimized Document List Component
 * Uses virtualization and caching for large document collections
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { LazyLoadWrapper } from '@/components/performance/LazyLoadWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Calendar, 
  User, 
  Search,
  Filter,
  SortAsc,
  SortDesc 
} from 'lucide-react';
import { Document } from '@/types/enhanced-rag';

interface OptimizedDocumentListProps {
  documents: Document[];
  onDocumentSelect?: (document: Document) => void;
  onDocumentAction?: (action: string, document: Document) => void;
  isLoading?: boolean;
  className?: string;
}

interface DocumentListItem {
  id: string;
  data: Document;
  height?: number;
}

export function OptimizedDocumentList({
  documents,
  onDocumentSelect,
  onDocumentAction,
  isLoading = false,
  className,
}: OptimizedDocumentListProps) {
  const { measureRender } = usePerformanceMonitor();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'size'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Memoized filtered and sorted documents
  const processedDocuments = useMemo(() => {
    const endRender = measureRender();
    
    let filtered = documents;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.processingStatus === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    endRender();
    return filtered;
  }, [documents, searchQuery, sortBy, sortOrder, filterStatus, measureRender]);

  // Convert to virtualized items
  const virtualizedItems: DocumentListItem[] = useMemo(() => {
    return processedDocuments.map(doc => ({
      id: doc.id,
      data: doc,
      height: 120, // Fixed height for better performance
    }));
  }, [processedDocuments]);

  // Virtualized list configuration
  const {
    visibleItems,
    totalHeight,
    containerProps,
    innerProps,
    getItemStyle,
  } = useVirtualizedList(virtualizedItems, {
    itemHeight: 120,
    containerHeight: 600,
    overscan: 5,
  });

  // Handle document click
  const handleDocumentClick = useCallback((document: Document) => {
    onDocumentSelect?.(document);
  }, [onDocumentSelect]);

  // Handle document action
  const handleAction = useCallback((action: string, document: Document) => {
    onDocumentAction?.(action, document);
  }, [onDocumentAction]);

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="createdAt">Date</option>
            <option value="title">Title</option>
            <option value="size">Size</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {processedDocuments.length} of {documents.length} documents
      </div>

      {/* Virtualized Document List */}
      <div {...containerProps} className="border rounded-lg">
        <div {...innerProps}>
          {visibleItems.map((item, index) => (
            <div key={item.id} style={getItemStyle(index)}>
              <LazyLoadWrapper
                minHeight={120}
                fallback={<DocumentItemSkeleton />}
              >
                <DocumentItem
                  document={item.data}
                  onClick={() => handleDocumentClick(item.data)}
                  onAction={(action) => handleAction(action, item.data)}
                />
              </LazyLoadWrapper>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {processedDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search criteria' : 'Upload your first document to get started'}
          </p>
        </div>
      )}
    </div>
  );
}/*
*
 * Individual Document Item Component
 */
interface DocumentItemProps {
  document: Document;
  onClick: () => void;
  onAction: (action: string) => void;
}

function DocumentItem({ document, onClick, onAction }: DocumentItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="m-2 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4" onClick={onClick}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {document.title}
              </h3>
              <Badge className={`text-xs ${getStatusColor(document.processingStatus)}`}>
                {document.processingStatus}
              </Badge>
            </div>
            
            {document.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {document.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(document.createdAt).toLocaleDateString()}
              </div>
              
              {document.fileSize && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {formatFileSize(document.fileSize)}
                </div>
              )}
              
              {document.userId && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  User
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction('view');
              }}
            >
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction('edit');
              }}
            >
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for document item
 */
function DocumentItemSkeleton() {
  return (
    <Card className="m-2">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <div className="flex gap-1 ml-4">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for entire document list
 */
function DocumentListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <DocumentItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}