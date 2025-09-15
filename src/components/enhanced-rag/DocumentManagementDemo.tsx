/**
 * Document Management Demo Component
 * Demonstrates the document management interface with mock data
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import DocumentManagement from './DocumentManagement';
import DocumentList from './DocumentList';
import FolderManager from './FolderManager';
import DocumentActions from './DocumentActions';

import { Document, DocumentFolder, ProcessingStatus } from '../../types/enhanced-rag';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    userId: 'demo-user',
    title: 'Introduction to Machine Learning',
    filename: 'ml-intro.pdf',
    filePath: 'documents/ml-intro.pdf',
    fileSize: 2048000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.COMPLETED,
    folderId: 'folder-1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    processedAt: new Date('2024-01-15'),
    metadata: { pageCount: 45, wordCount: 12000 }
  },
  {
    id: 'doc-2',
    userId: 'demo-user',
    title: 'Deep Learning Fundamentals',
    filename: 'deep-learning.pdf',
    filePath: 'documents/deep-learning.pdf',
    fileSize: 3072000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.COMPLETED,
    folderId: 'folder-1',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    processedAt: new Date('2024-01-16'),
    metadata: { pageCount: 67, wordCount: 18500 }
  },
  {
    id: 'doc-3',
    userId: 'demo-user',
    title: 'Natural Language Processing',
    filename: 'nlp-guide.pdf',
    filePath: 'documents/nlp-guide.pdf',
    fileSize: 1536000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.EMBEDDING,
    folderId: 'folder-2',
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
    metadata: { pageCount: 32 }
  },
  {
    id: 'doc-4',
    userId: 'demo-user',
    title: 'Computer Vision Basics',
    filename: 'cv-basics.pdf',
    filePath: 'documents/cv-basics.pdf',
    fileSize: 2560000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.FAILED,
    folderId: null,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
    metadata: { errorDetails: 'Text extraction failed' }
  },
  {
    id: 'doc-5',
    userId: 'demo-user',
    title: 'Research Methodology',
    filename: 'research-methods.pdf',
    filePath: 'documents/research-methods.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.UPLOADING,
    folderId: 'folder-3',
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19'),
    metadata: {}
  }
];

const mockFolders: DocumentFolder[] = [
  {
    id: 'folder-1',
    userId: 'demo-user',
    name: 'AI & Machine Learning',
    parentId: null,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    documentCount: 2
  },
  {
    id: 'folder-2',
    userId: 'demo-user',
    name: 'Natural Language Processing',
    parentId: 'folder-1',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-17'),
    documentCount: 1
  },
  {
    id: 'folder-3',
    userId: 'demo-user',
    name: 'Research Papers',
    parentId: null,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-19'),
    documentCount: 1
  },
  {
    id: 'folder-4',
    userId: 'demo-user',
    name: 'Course Materials',
    parentId: null,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    documentCount: 0
  }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentManagementDemo: React.FC = () => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    action: any;
    document: Document | null;
  }>({
    isOpen: false,
    action: null,
    document: null
  });

  // Filter documents by current folder
  const filteredDocuments = mockDocuments.filter(doc => {
    if (currentFolderId === null) {
      return doc.folderId === null;
    }
    return doc.folderId === currentFolderId;
  });

  // Mock handlers
  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleDocumentSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleDocumentAction = (action: any, documentId: string) => {
    const document = mockDocuments.find(doc => doc.id === documentId);
    setActionDialog({
      isOpen: true,
      action,
      document: document || null
    });
  };

  const handleBulkAction = (action: any, documentIds: string[]) => {
    setActionDialog({
      isOpen: true,
      action: `bulk-${action}`,
      document: null
    });
  };

  const handleFolderSelect = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedDocuments([]);
  };

  // Mock async operations
  const mockAsyncOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // Get statistics
  const stats = {
    totalDocuments: mockDocuments.length,
    completedDocuments: mockDocuments.filter(doc => doc.processingStatus === ProcessingStatus.COMPLETED).length,
    processingDocuments: mockDocuments.filter(doc => 
      [ProcessingStatus.UPLOADING, ProcessingStatus.EXTRACTING, ProcessingStatus.CHUNKING, ProcessingStatus.EMBEDDING].includes(doc.processingStatus)
    ).length,
    failedDocuments: mockDocuments.filter(doc => doc.processingStatus === ProcessingStatus.FAILED).length,
    totalFolders: mockFolders.length
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Document Management System</h1>
        <p className="text-gray-600">
          Comprehensive document management with folder organization, search, and bulk operations.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedDocuments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processingDocuments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedDocuments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalFolders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Tabs */}
      <Tabs defaultValue="full-interface" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="full-interface">Full Interface</TabsTrigger>
          <TabsTrigger value="document-list">Document List</TabsTrigger>
          <TabsTrigger value="folder-manager">Folder Manager</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* Full Interface Tab */}
        <TabsContent value="full-interface" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Document Management Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Folder Sidebar */}
                <div className="lg:col-span-1">
                  <FolderManager
                    folders={mockFolders}
                    currentFolderId={currentFolderId}
                    onFolderSelect={handleFolderSelect}
                    onFolderCreate={mockAsyncOperation}
                    onFolderRename={mockAsyncOperation}
                    onFolderDelete={mockAsyncOperation}
                    onFolderMove={mockAsyncOperation}
                  />
                </div>

                {/* Document List */}
                <div className="lg:col-span-3">
                  <DocumentList
                    documents={filteredDocuments}
                    folders={mockFolders}
                    selectedDocuments={selectedDocuments}
                    onDocumentSelect={handleDocumentSelect}
                    onDocumentSelectAll={handleDocumentSelectAll}
                    onDocumentAction={handleDocumentAction}
                    onBulkAction={handleBulkAction}
                    onFolderSelect={handleFolderSelect}
                    currentFolderId={currentFolderId}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document List Tab */}
        <TabsContent value="document-list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document List Component</CardTitle>
              <p className="text-sm text-gray-600">
                Displays documents with sorting, filtering, search, and bulk operations.
              </p>
            </CardHeader>
            <CardContent>
              <DocumentList
                documents={mockDocuments}
                folders={mockFolders}
                selectedDocuments={selectedDocuments}
                onDocumentSelect={handleDocumentSelect}
                onDocumentSelectAll={handleDocumentSelectAll}
                onDocumentAction={handleDocumentAction}
                onBulkAction={handleBulkAction}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Folder Manager Tab */}
        <TabsContent value="folder-manager" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Folder Manager Component</CardTitle>
              <p className="text-sm text-gray-600">
                Hierarchical folder organization with create, rename, delete, and move operations.
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <FolderManager
                  folders={mockFolders}
                  currentFolderId={currentFolderId}
                  onFolderSelect={handleFolderSelect}
                  onFolderCreate={mockAsyncOperation}
                  onFolderRename={mockAsyncOperation}
                  onFolderDelete={mockAsyncOperation}
                  onFolderMove={mockAsyncOperation}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Management Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Document upload with drag-and-drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Real-time processing status</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Search across titles and metadata</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Sort by title, date, size, status</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Filter by processing status</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Bulk operations (move, delete, download)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Individual document actions</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Folder Management Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Hierarchical folder structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Create folders and subfolders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Rename and delete folders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Move folders between parents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Breadcrumb navigation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Expandable folder tree</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✓</Badge>
                  <span>Document count indicators</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Status Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Uploading</Badge>
                  <span>File is being uploaded</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Extracting</Badge>
                  <span>Text extraction in progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Chunking</Badge>
                  <span>Document being split into chunks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Embedding</Badge>
                  <span>Generating vector embeddings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Completed</Badge>
                  <span>Ready for AI chat queries</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Failed</Badge>
                  <span>Processing error occurred</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Experience Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">📱</Badge>
                  <span>Mobile-responsive design</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">⚡</Badge>
                  <span>Fast search and filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">🔄</Badge>
                  <span>Real-time status updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">💾</Badge>
                  <span>Persistent selection state</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">🎯</Badge>
                  <span>Contextual action menus</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">⚠️</Badge>
                  <span>Confirmation dialogs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">🔍</Badge>
                  <span>Advanced search options</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialogs */}
      <DocumentActions
        document={actionDialog.document}
        documents={mockDocuments}
        folders={mockFolders}
        isOpen={actionDialog.isOpen}
        action={actionDialog.action}
        onClose={() => setActionDialog({ isOpen: false, action: null, document: null })}
        onRename={mockAsyncOperation}
        onDelete={mockAsyncOperation}
        onMove={mockAsyncOperation}
        onDownload={mockAsyncOperation}
        onBulkDelete={mockAsyncOperation}
        onBulkMove={mockAsyncOperation}
        onBulkDownload={mockAsyncOperation}
        selectedDocuments={selectedDocuments}
      />
    </div>
  );
};

export default DocumentManagementDemo;