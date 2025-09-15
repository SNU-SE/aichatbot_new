/**
 * Mobile Document List Component
 * Mobile-optimized document list with touch-friendly interactions
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  MoreVertical,
  FileText,
  Calendar,
  HardDrive,
  CheckSquare,
  Square,
  SortAsc,
  SortDesc,
  X,
  Download,
  Trash2,
  Edit,
  FolderOpen,
  Image as ImageIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MobileLayout } from './MobileLayout';
import { Document, DocumentFolder, ProcessingStatus } from '@/types/enhanced-rag';
import { formatFileSize, formatDate } from '@/utils/enhanced-rag-utils';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type SortField = 'title' | 'createdAt' | 'fileSize' | 'processingStatus';
export type SortDirection = 'asc' | 'desc';
export type FilterStatus = 'all' | ProcessingStatus;

export interface MobileDocumentListProps {
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
  onBack?: () => void;
  className?: string;
}

export type DocumentAction = 'view' | 'rename' | 'move' | 'delete' | 'download';
export type BulkAction = 'move' | 'delete' | 'download';

// ============================================================================
// MOBILE DOCUMENT ITEM COMPONENT
// ============================================================================

interface MobileDocumentItemProps {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: DocumentAction) => void;
  showCheckbox?: boolean;
}

const MobileDocumentItem: React.FC<MobileDocumentItemProps> = ({
  document,
  isSelected,
  onSelect,
  onAction,
  showCheckbox = false
}) => {
  const [showActions, setShowActions] = useState(false);
  
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

  const isImage = document.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <Card className={cn(
      "mb-3 transition-colors",
      isSelected && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Checkbox */}
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
          )}

          {/* File Icon */}
          <div className="flex-shrink-0 mt-1">
            {isImage ? (
              <ImageIcon className="h-6 w-6 text-blue-500" />
            ) : (
              <FileText className="h-6 w-6 text-blue-500" />
            )}
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate mb-1">
              {document.title}
            </div>
            <div className="text-xs text-muted-foreground truncate mb-2">
              {document.filename}
            </div>
            
            {/* Status and Metadata */}
            <div className="flex items-center space-x-2 mb-2">
              <Badge 
                variant={getStatusBadgeVariant(document.processingStatus)}
                className="text-xs"
              >
                {document.processingStatus}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(document.fileSize)}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {formatDate(document.createdAt)}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu open={showActions} onOpenChange={setShowActions}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction('view')}>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('rename')}>
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('move')}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('download')}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onAction('delete')}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// FILTER SHEET COMPONENT
// ============================================================================

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  filterStatus: FilterStatus;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onFilterChange: (status: FilterStatus) => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  sortField,
  sortDirection,
  filterStatus,
  onSortChange,
  onFilterChange
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[60vh]">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Filter & Sort</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium mb-3 block">Filter by Status</label>
                <Select value={filterStatus} onValueChange={onFilterChange}>
                  <SelectTrigger>
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

              {/* Sort Options */}
              <div>
                <label className="text-sm font-medium mb-3 block">Sort by</label>
                <div className="space-y-2">
                  {[
                    { value: 'title' as SortField, label: 'Title' },
                    { value: 'createdAt' as SortField, label: 'Date Created' },
                    { value: 'fileSize' as SortField, label: 'File Size' },
                    { value: 'processingStatus' as SortField, label: 'Status' },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center justify-between">
                      <Button
                        variant={sortField === option.value ? "default" : "outline"}
                        onClick={() => onSortChange(option.value, sortDirection)}
                        className="flex-1 justify-start"
                      >
                        {option.label}
                      </Button>
                      {sortField === option.value && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSortChange(option.value, sortDirection === 'asc' ? 'desc' : 'asc')}
                          className="ml-2"
                        >
                          {sortDirection === 'asc' ? (
                            <SortAsc className="h-4 w-4" />
                          ) : (
                            <SortDesc className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MobileDocumentList: React.FC<MobileDocumentListProps> = ({
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
  onBack,
  className = ''
}) => {
  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

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
  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((status: FilterStatus) => {
    setFilterStatus(status);
  }, []);

  // Handle selection mode toggle
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      onDocumentSelectAll(false);
    }
  }, [selectionMode, onDocumentSelectAll]);

  // Check if all visible documents are selected
  const allSelected = filteredAndSortedDocuments.length > 0 && 
    filteredAndSortedDocuments.every(doc => selectedDocuments.includes(doc.id));
  const someSelected = selectedDocuments.length > 0 && !allSelected;

  return (
    <MobileLayout
      title="Documents"
      subtitle={`${filteredAndSortedDocuments.length} document${filteredAndSortedDocuments.length !== 1 ? 's' : ''}`}
      showBackButton={!!onBack}
      onBack={onBack}
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Search and Actions Bar */}
        <div className="p-4 border-b space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
              >
                {selectionMode ? (
                  <CheckSquare className="h-4 w-4 mr-1" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                Select
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedDocuments.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    Actions ({selectedDocuments.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onBulkAction('move', selectedDocuments)}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkAction('download', selectedDocuments)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onBulkAction('delete', selectedDocuments)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Select All (in selection mode) */}
          {selectionMode && filteredAndSortedDocuments.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onCheckedChange={onDocumentSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all visible documents
              </span>
            </div>
          )}
        </div>

        {/* Document List */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  Loading documents...
                </div>
              </div>
            </div>
          ) : filteredAndSortedDocuments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  {searchQuery || filterStatus !== 'all' ? 'No documents match your filters' : 'No documents found'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Upload some documents to get started'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredAndSortedDocuments.map((document) => (
                <MobileDocumentItem
                  key={document.id}
                  document={document}
                  isSelected={selectedDocuments.includes(document.id)}
                  onSelect={() => onDocumentSelect(document.id)}
                  onAction={(action) => onDocumentAction(action, document.id)}
                  showCheckbox={selectionMode}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        sortField={sortField}
        sortDirection={sortDirection}
        filterStatus={filterStatus}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
      />
    </MobileLayout>
  );
};

export default MobileDocumentList;