/**
 * Document List Component
 * Displays documents with sorting, filtering, and management actions
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  MoreVertical,
  FileText,
  Folder,
  Calendar,
  HardDrive,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Document, DocumentFolder, ProcessingStatus } from '../../types/enhanced-rag';
import { formatFileSize, formatDate } from '../../utils/enhanced-rag-utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type SortField = 'title' | 'createdAt' | 'fileSize' | 'processingStatus';
export type SortDirection = 'asc' | 'desc';
export type FilterStatus = 'all' | ProcessingStatus;

export interface DocumentListProps {
  documents: Document[];
  folders: DocumentFolder[];
  selectedDocuments: string[];
  onDocumentSelect: (documentId: string) => void;
  onDocumentSelectAll: (selected: boolean) => void;
  onDocumentAction: (action: DocumentAction, documentId: string) => void;
  onBulkAction: (action: BulkAction, documentIds: string[]) => void;
  onFolderSelect?: (folderId: string | null) => void;
  currentFolderId?: string | null;
  isLoading?: boolean;
  className?: string;
}

export type DocumentAction = 'view' | 'rename' | 'move' | 'delete' | 'download';
export type BulkAction = 'move' | 'delete' | 'download';

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  folders,
  selectedDocuments,
  onDocumentSelect,
  onDocumentSelectAll,
  onDocumentAction,
  onBulkAction,
  onFolderSelect,
  currentFolderId,
  isLoading = false,
  className = ''
}) => {
  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Memoized filtered and sorted documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.filename.toLowerCase().includes(query) ||
        (doc.metadata.language && doc.metadata.language.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.processingStatus === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'processingStatus':
          aValue = a.processingStatus;
          bValue = b.processingStatus;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [documents, searchQuery, sortField, sortDirection, filterStatus]);

  // Handle sort change
  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    onDocumentSelectAll(checked);
  }, [onDocumentSelectAll]);

  // Get processing status badge variant
  const getStatusBadgeVariant = (status: ProcessingStatus) => {
    switch (status) {
      case ProcessingStatus.COMPLETED:
        return 'default';
      case ProcessingStatus.FAILED:
        return 'destructive';
      case ProcessingStatus.UPLOADING:
      case ProcessingStatus.EXTRACTING:
      case ProcessingStatus.CHUNKING:
      case ProcessingStatus.EMBEDDING:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Check if all visible documents are selected
  const allSelected = filteredAndSortedDocuments.length > 0 && 
    filteredAndSortedDocuments.every(doc => selectedDocuments.includes(doc.id));
  const someSelected = selectedDocuments.length > 0 && !allSelected;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          
          {selectedDocuments.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions ({selectedDocuments.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onBulkAction('move', selectedDocuments)}>
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkAction('download', selectedDocuments)}>
                  Download Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onBulkAction('delete', selectedDocuments)}
                  className="text-red-600"
                >
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value={ProcessingStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={ProcessingStatus.UPLOADING}>Uploading</SelectItem>
                    <SelectItem value={ProcessingStatus.EXTRACTING}>Extracting</SelectItem>
                    <SelectItem value={ProcessingStatus.CHUNKING}>Chunking</SelectItem>
                    <SelectItem value={ProcessingStatus.EMBEDDING}>Embedding</SelectItem>
                    <SelectItem value={ProcessingStatus.FAILED}>Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="fileSize">File Size</SelectItem>
                    <SelectItem value="processingStatus">Status</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document List Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onCheckedChange={handleSelectAll}
        />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-medium text-gray-600">
          <button 
            onClick={() => handleSort('title')}
            className="flex items-center gap-1 hover:text-gray-900 text-left"
          >
            Document
            {sortField === 'title' && (
              sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
            )}
          </button>
          <button 
            onClick={() => handleSort('fileSize')}
            className="flex items-center gap-1 hover:text-gray-900 text-left"
          >
            Size
            {sortField === 'fileSize' && (
              sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
            )}
          </button>
          <button 
            onClick={() => handleSort('processingStatus')}
            className="flex items-center gap-1 hover:text-gray-900 text-left"
          >
            Status
            {sortField === 'processingStatus' && (
              sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
            )}
          </button>
          <button 
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-1 hover:text-gray-900 text-left"
          >
            Date
            {sortField === 'createdAt' && (
              sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
            )}
          </button>
        </div>
        <div className="w-10"></div> {/* Space for actions menu */}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading documents...
          </div>
        ) : filteredAndSortedDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery || filterStatus !== 'all' ? 'No documents match your filters' : 'No documents found'}
          </div>
        ) : (
          filteredAndSortedDocuments.map((document) => (
            <DocumentListItem
              key={document.id}
              document={document}
              isSelected={selectedDocuments.includes(document.id)}
              onSelect={() => onDocumentSelect(document.id)}
              onAction={(action) => onDocumentAction(action, document.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// DOCUMENT LIST ITEM COMPONENT
// ============================================================================

interface DocumentListItemProps {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: DocumentAction) => void;
}

const DocumentListItem: React.FC<DocumentListItemProps> = ({
  document,
  isSelected,
  onSelect,
  onAction
}) => {
  const getStatusBadgeVariant = (status: ProcessingStatus) => {
    switch (status) {
      case ProcessingStatus.COMPLETED:
        return 'default';
      case ProcessingStatus.FAILED:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className={`transition-colors ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900 truncate">{document.title}</div>
                <div className="text-sm text-gray-500 truncate">{document.filename}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <HardDrive className="h-4 w-4" />
              {formatFileSize(document.fileSize)}
            </div>
            
            <div>
              <Badge variant={getStatusBadgeVariant(document.processingStatus)}>
                {document.processingStatus}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {formatDate(document.createdAt)}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction('view')}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('rename')}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('move')}>
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('download')}>
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onAction('delete')}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentList;