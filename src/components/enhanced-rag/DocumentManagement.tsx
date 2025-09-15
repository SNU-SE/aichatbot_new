/**
 * Document Management Interface
 * Main component that combines document list, folder management, and actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../ui/use-toast';

import DocumentList, { DocumentAction, BulkAction } from './DocumentList';
import FolderManager, { FolderAction } from './FolderManager';
import DocumentActions, { DocumentActionType } from './DocumentActions';
import DocumentUploadManager from './DocumentUploadManager';

import { Document, DocumentFolder } from '../../types/enhanced-rag';
import { supabase } from '../../integrations/supabase/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DocumentManagementProps {
  className?: string;
  onDocumentSelect?: (document: Document) => void;
  showUpload?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  className = '',
  onDocumentSelect,
  showUpload = true
}) => {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    action: DocumentActionType | null;
    document: Document | null;
  }>({
    isOpen: false,
    action: null,
    document: null
  });

  const { toast } = useToast();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (currentFolderId) {
        query = query.eq('folder_id', currentFolderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    }
  }, [currentFolderId, toast]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load folders',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchDocuments(), fetchFolders()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchDocuments, fetchFolders]);

  // ============================================================================
  // DOCUMENT ACTIONS
  // ============================================================================

  // Handle document selection
  const handleDocumentSelect = useCallback((documentId: string) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  }, []);

  // Handle select all documents
  const handleDocumentSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedDocuments(documents.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  }, [documents]);

  // Handle individual document actions
  const handleDocumentAction = useCallback((action: DocumentAction, documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;

    switch (action) {
      case 'view':
        onDocumentSelect?.(document);
        break;
      case 'rename':
        setActionDialog({
          isOpen: true,
          action: 'rename',
          document
        });
        break;
      case 'move':
        setActionDialog({
          isOpen: true,
          action: 'move',
          document
        });
        break;
      case 'delete':
        setActionDialog({
          isOpen: true,
          action: 'delete',
          document
        });
        break;
      case 'download':
        handleDownloadDocument(documentId);
        break;
    }
  }, [documents, onDocumentSelect]);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: BulkAction, documentIds: string[]) => {
    switch (action) {
      case 'move':
        setActionDialog({
          isOpen: true,
          action: 'bulk-move',
          document: null
        });
        break;
      case 'delete':
        setActionDialog({
          isOpen: true,
          action: 'bulk-delete',
          document: null
        });
        break;
      case 'download':
        setActionDialog({
          isOpen: true,
          action: 'bulk-download',
          document: null
        });
        break;
    }
  }, []);

  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================

  // Rename document
  const handleRenameDocument = useCallback(async (documentId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocuments();
      toast({
        title: 'Success',
        description: 'Document renamed successfully'
      });
    } catch (error) {
      console.error('Error renaming document:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename document',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchDocuments, toast]);

  // Delete document
  const handleDeleteDocument = useCallback(async (documentId: string) => {
    try {
      // Delete document chunks first
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

      // Delete the document
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocuments();
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
      
      toast({
        title: 'Success',
        description: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchDocuments, toast]);

  // Move document
  const handleMoveDocument = useCallback(async (documentId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          folder_id: folderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocuments();
      toast({
        title: 'Success',
        description: 'Document moved successfully'
      });
    } catch (error) {
      console.error('Error moving document:', error);
      toast({
        title: 'Error',
        description: 'Failed to move document',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchDocuments, toast]);

  // Download document
  const handleDownloadDocument = useCallback(async (documentId: string) => {
    try {
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return;

      // Get the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Document downloaded successfully'
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      });
      throw error;
    }
  }, [documents, toast]);

  // Bulk delete documents
  const handleBulkDeleteDocuments = useCallback(async (documentIds: string[]) => {
    try {
      // Delete document chunks first
      await supabase
        .from('document_chunks')
        .delete()
        .in('document_id', documentIds);

      // Delete the documents
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', documentIds);

      if (error) throw error;

      await fetchDocuments();
      setSelectedDocuments([]);
      
      toast({
        title: 'Success',
        description: `${documentIds.length} documents deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete documents',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchDocuments, toast]);

  // Bulk move documents
  const handleBulkMoveDocuments = useCallback(async (documentIds: string[], folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          folder_id: folderId,
          updated_at: new Date().toISOString()
        })
        .in('id', documentIds);

      if (error) throw error;

      await fetchDocuments();
      setSelectedDocuments([]);
      
      toast({
        title: 'Success',
        description: `${documentIds.length} documents moved successfully`
      });
    } catch (error) {
      console.error('Error moving documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to move documents',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchDocuments, toast]);

  // Bulk download documents
  const handleBulkDownloadDocuments = useCallback(async (documentIds: string[]) => {
    try {
      // For now, download each document individually
      // In a real implementation, you might want to create a ZIP file
      for (const documentId of documentIds) {
        await handleDownloadDocument(documentId);
      }
      
      toast({
        title: 'Success',
        description: `${documentIds.length} documents downloaded successfully`
      });
    } catch (error) {
      console.error('Error downloading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to download documents',
        variant: 'destructive'
      });
      throw error;
    }
  }, [handleDownloadDocument, toast]);

  // ============================================================================
  // FOLDER OPERATIONS
  // ============================================================================

  // Create folder
  const handleCreateFolder = useCallback(async (name: string, parentId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('document_folders')
        .insert({
          user_id: user.id,
          name,
          parent_id: parentId || null
        });

      if (error) throw error;

      await fetchFolders();
      toast({
        title: 'Success',
        description: 'Folder created successfully'
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchFolders, toast]);

  // Rename folder
  const handleRenameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('document_folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;

      await fetchFolders();
      toast({
        title: 'Success',
        description: 'Folder renamed successfully'
      });
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename folder',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchFolders, toast]);

  // Delete folder
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      // Move documents in this folder to root
      await supabase
        .from('documents')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      // Delete the folder
      const { error } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      await Promise.all([fetchFolders(), fetchDocuments()]);
      toast({
        title: 'Success',
        description: 'Folder deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchFolders, fetchDocuments, toast]);

  // Move folder (placeholder - would need more complex logic)
  const handleMoveFolder = useCallback(async (folderId: string, newParentId?: string) => {
    try {
      const { error } = await supabase
        .from('document_folders')
        .update({ parent_id: newParentId || null })
        .eq('id', folderId);

      if (error) throw error;

      await fetchFolders();
      toast({
        title: 'Success',
        description: 'Folder moved successfully'
      });
    } catch (error) {
      console.error('Error moving folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to move folder',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchFolders, toast]);

  // Handle folder selection
  const handleFolderSelect = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedDocuments([]); // Clear selection when changing folders
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchDocuments(), fetchFolders()]);
    setIsLoading(false);
  }, [fetchDocuments, fetchFolders]);

  // Handle upload success
  const handleUploadSuccess = useCallback(() => {
    fetchDocuments();
    setShowUploadDialog(false);
  }, [fetchDocuments]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Document Management</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {showUpload && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Documents
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Sidebar */}
        <div className="lg:col-span-1">
          <FolderManager
            folders={folders}
            currentFolderId={currentFolderId}
            onFolderSelect={handleFolderSelect}
            onFolderCreate={handleCreateFolder}
            onFolderRename={handleRenameFolder}
            onFolderDelete={handleDeleteFolder}
            onFolderMove={handleMoveFolder}
            isLoading={isLoading}
          />
        </div>

        {/* Document List */}
        <div className="lg:col-span-3">
          <DocumentList
            documents={documents}
            folders={folders}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={handleDocumentSelect}
            onDocumentSelectAll={handleDocumentSelectAll}
            onDocumentAction={handleDocumentAction}
            onBulkAction={handleBulkAction}
            onFolderSelect={handleFolderSelect}
            currentFolderId={currentFolderId}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <DocumentUploadManager
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
          defaultFolderId={currentFolderId}
        />
      )}

      {/* Action Dialogs */}
      <DocumentActions
        document={actionDialog.document}
        documents={documents}
        folders={folders}
        isOpen={actionDialog.isOpen}
        action={actionDialog.action}
        onClose={() => setActionDialog({ isOpen: false, action: null, document: null })}
        onRename={handleRenameDocument}
        onDelete={handleDeleteDocument}
        onMove={handleMoveDocument}
        onDownload={handleDownloadDocument}
        onBulkDelete={handleBulkDeleteDocuments}
        onBulkMove={handleBulkMoveDocuments}
        onBulkDownload={handleBulkDownloadDocuments}
        selectedDocuments={selectedDocuments}
      />
    </div>
  );
};

export default DocumentManagement;