/**
 * Document Actions Component
 * Handles document operations like rename, delete, move with confirmation dialogs
 */

import React, { useState, useCallback } from 'react';
import {
  Trash2,
  Edit2,
  Move,
  Download,
  AlertTriangle,
  Folder,
  FolderOpen
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Document, DocumentFolder } from '../../types/enhanced-rag';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DocumentActionsProps {
  document: Document | null;
  documents: Document[];
  folders: DocumentFolder[];
  isOpen: boolean;
  action: DocumentActionType | null;
  onClose: () => void;
  onRename: (documentId: string, newTitle: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onMove: (documentId: string, folderId: string | null) => Promise<void>;
  onDownload: (documentId: string) => Promise<void>;
  onBulkDelete: (documentIds: string[]) => Promise<void>;
  onBulkMove: (documentIds: string[], folderId: string | null) => Promise<void>;
  onBulkDownload: (documentIds: string[]) => Promise<void>;
  selectedDocuments?: string[];
}

export type DocumentActionType = 'rename' | 'delete' | 'move' | 'download' | 'bulk-delete' | 'bulk-move' | 'bulk-download';

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  document,
  documents,
  folders,
  isOpen,
  action,
  onClose,
  onRename,
  onDelete,
  onMove,
  onDownload,
  onBulkDelete,
  onBulkMove,
  onBulkDownload,
  selectedDocuments = []
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize form data when dialog opens
  React.useEffect(() => {
    if (isOpen && document) {
      setNewTitle(document.title);
      setSelectedFolderId(document.folderId || null);
    }
  }, [isOpen, document]);

  // Handle rename action
  const handleRename = useCallback(async () => {
    if (!document || !newTitle.trim()) return;
    
    setIsProcessing(true);
    try {
      await onRename(document.id, newTitle.trim());
      onClose();
    } catch (error) {
      console.error('Failed to rename document:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [document, newTitle, onRename, onClose]);

  // Handle delete action
  const handleDelete = useCallback(async () => {
    if (!document) return;
    
    setIsProcessing(true);
    try {
      await onDelete(document.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [document, onDelete, onClose]);

  // Handle move action
  const handleMove = useCallback(async () => {
    if (!document) return;
    
    setIsProcessing(true);
    try {
      await onMove(document.id, selectedFolderId);
      onClose();
    } catch (error) {
      console.error('Failed to move document:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [document, selectedFolderId, onMove, onClose]);

  // Handle download action
  const handleDownload = useCallback(async () => {
    if (!document) return;
    
    setIsProcessing(true);
    try {
      await onDownload(document.id);
      onClose();
    } catch (error) {
      console.error('Failed to download document:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [document, onDownload, onClose]);

  // Handle bulk delete action
  const handleBulkDelete = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete(selectedDocuments);
      onClose();
    } catch (error) {
      console.error('Failed to delete documents:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocuments, onBulkDelete, onClose]);

  // Handle bulk move action
  const handleBulkMove = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onBulkMove(selectedDocuments, selectedFolderId);
      onClose();
    } catch (error) {
      console.error('Failed to move documents:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocuments, selectedFolderId, onBulkMove, onClose]);

  // Handle bulk download action
  const handleBulkDownload = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onBulkDownload(selectedDocuments);
      onClose();
    } catch (error) {
      console.error('Failed to download documents:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocuments, onBulkDownload, onClose]);

  // Get selected documents for bulk operations
  const selectedDocumentsList = documents.filter(doc => selectedDocuments.includes(doc.id));

  // Build folder options for select
  const folderOptions = React.useMemo(() => {
    const buildOptions = (folders: DocumentFolder[], level = 0): Array<{ value: string; label: string }> => {
      const options: Array<{ value: string; label: string }> = [];
      
      folders
        .filter(folder => !folder.parentId || level > 0)
        .forEach(folder => {
          const indent = '  '.repeat(level);
          options.push({
            value: folder.id,
            label: `${indent}${folder.name}`
          });
          
          // Add child folders
          const children = folders.filter(f => f.parentId === folder.id);
          if (children.length > 0) {
            options.push(...buildOptions(children, level + 1));
          }
        });
      
      return options;
    };
    
    return buildOptions(folders);
  }, [folders]);

  // Render dialog content based on action type
  const renderDialogContent = () => {
    switch (action) {
      case 'rename':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Rename Document
              </DialogTitle>
              <DialogDescription>
                Enter a new title for "{document?.title}".
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="document-title">Document Title</Label>
                <Input
                  id="document-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter new title..."
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={!newTitle.trim() || isProcessing}>
                {isProcessing ? 'Renaming...' : 'Rename'}
              </Button>
            </DialogFooter>
          </>
        );

      case 'delete':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Document
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{document?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">This will permanently delete:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>The document file and all its content</li>
                      <li>All processed chunks and embeddings</li>
                      <li>Any chat references to this document</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                {isProcessing ? 'Deleting...' : 'Delete Document'}
              </Button>
            </DialogFooter>
          </>
        );

      case 'move':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Move className="h-5 w-5" />
                Move Document
              </DialogTitle>
              <DialogDescription>
                Select a folder to move "{document?.title}" to.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="folder-select">Destination Folder</Label>
                <Select value={selectedFolderId || 'root'} onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Root Folder
                      </div>
                    </SelectItem>
                    {folderOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleMove} disabled={isProcessing}>
                {isProcessing ? 'Moving...' : 'Move Document'}
              </Button>
            </DialogFooter>
          </>
        );

      case 'bulk-delete':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Multiple Documents
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedDocuments.length} documents? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">This will permanently delete:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>{selectedDocuments.length} document files and all their content</li>
                        <li>All processed chunks and embeddings</li>
                        <li>Any chat references to these documents</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="max-h-40 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Documents to be deleted:</p>
                <ul className="text-sm space-y-1">
                  {selectedDocumentsList.map(doc => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <Trash2 className="h-3 w-3 text-red-500" />
                      {doc.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={isProcessing}>
                {isProcessing ? 'Deleting...' : `Delete ${selectedDocuments.length} Documents`}
              </Button>
            </DialogFooter>
          </>
        );

      case 'bulk-move':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Move className="h-5 w-5" />
                Move Multiple Documents
              </DialogTitle>
              <DialogDescription>
                Select a folder to move {selectedDocuments.length} documents to.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-folder-select">Destination Folder</Label>
                <Select value={selectedFolderId || 'root'} onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Root Folder
                      </div>
                    </SelectItem>
                    {folderOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="max-h-40 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Documents to be moved:</p>
                <ul className="text-sm space-y-1">
                  {selectedDocumentsList.map(doc => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <Move className="h-3 w-3 text-blue-500" />
                      {doc.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleBulkMove} disabled={isProcessing}>
                {isProcessing ? 'Moving...' : `Move ${selectedDocuments.length} Documents`}
              </Button>
            </DialogFooter>
          </>
        );

      case 'bulk-download':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Multiple Documents
              </DialogTitle>
              <DialogDescription>
                Download {selectedDocuments.length} documents as a ZIP file.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="max-h-40 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Documents to be downloaded:</p>
                <ul className="text-sm space-y-1">
                  {selectedDocumentsList.map(doc => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <Download className="h-3 w-3 text-green-500" />
                      {doc.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleBulkDownload} disabled={isProcessing}>
                {isProcessing ? 'Preparing Download...' : `Download ${selectedDocuments.length} Documents`}
              </Button>
            </DialogFooter>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentActions;