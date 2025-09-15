/**
 * Enhanced RAG Document Management Simple Tests
 * Basic functionality tests for document management components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import DocumentList from '../components/enhanced-rag/DocumentList';
import FolderManager from '../components/enhanced-rag/FolderManager';
import DocumentActions from '../components/enhanced-rag/DocumentActions';

import { Document, DocumentFolder, ProcessingStatus } from '../types/enhanced-rag';

// Mock utils
vi.mock('../utils/enhanced-rag-utils', () => ({
  formatFileSize: (size: number) => `${size} bytes`,
  formatDate: (date: Date) => date.toLocaleDateString()
}));

// ============================================================================
// TEST DATA
// ============================================================================

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    userId: 'user-1',
    title: 'Test Document 1',
    filename: 'test1.pdf',
    filePath: 'documents/test1.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.COMPLETED,
    folderId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    processedAt: new Date('2024-01-01'),
    metadata: { pageCount: 10 }
  },
  {
    id: 'doc-2',
    userId: 'user-1',
    title: 'Test Document 2',
    filename: 'test2.pdf',
    filePath: 'documents/test2.pdf',
    fileSize: 2048000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.UPLOADING,
    folderId: 'folder-1',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    metadata: { pageCount: 20 }
  }
];

const mockFolders: DocumentFolder[] = [
  {
    id: 'folder-1',
    userId: 'user-1',
    name: 'Research Papers',
    parentId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    documentCount: 1
  }
];

// ============================================================================
// DOCUMENT LIST TESTS
// ============================================================================

describe('DocumentList Component - Basic Functionality', () => {
  const defaultProps = {
    documents: mockDocuments,
    folders: mockFolders,
    selectedDocuments: [],
    onDocumentSelect: vi.fn(),
    onDocumentSelectAll: vi.fn(),
    onDocumentAction: vi.fn(),
    onBulkAction: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders document list with basic information', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();
    expect(screen.getByText('1024000 bytes')).toBeInTheDocument();
    expect(screen.getByText('2048000 bytes')).toBeInTheDocument();
  });

  it('displays processing status badges', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('uploading')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Search documents...')).toBeInTheDocument();
  });

  it('shows filters button', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows bulk actions when documents are selected', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedDocuments: ['doc-1', 'doc-2']
    };
    
    render(<DocumentList {...propsWithSelection} />);
    
    expect(screen.getByText('Bulk Actions (2)')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DocumentList {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    const emptyProps = {
      ...defaultProps,
      documents: []
    };
    
    render(<DocumentList {...emptyProps} />);
    
    expect(screen.getByText('No documents found')).toBeInTheDocument();
  });
});

// ============================================================================
// FOLDER MANAGER TESTS
// ============================================================================

describe('FolderManager Component - Basic Functionality', () => {
  const defaultProps = {
    folders: mockFolders,
    currentFolderId: null,
    onFolderSelect: vi.fn(),
    onFolderCreate: vi.fn().mockResolvedValue(undefined),
    onFolderRename: vi.fn().mockResolvedValue(undefined),
    onFolderDelete: vi.fn().mockResolvedValue(undefined),
    onFolderMove: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders folder manager header', () => {
    render(<FolderManager {...defaultProps} />);
    
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByText('New Folder')).toBeInTheDocument();
  });

  it('shows all documents option', () => {
    render(<FolderManager {...defaultProps} />);
    
    expect(screen.getByText('All Documents')).toBeInTheDocument();
  });

  it('shows empty state when no folders', () => {
    const emptyProps = {
      ...defaultProps,
      folders: []
    };
    
    render(<FolderManager {...emptyProps} />);
    
    expect(screen.getByText('No folders created yet')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<FolderManager {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
  });
});

// ============================================================================
// DOCUMENT ACTIONS TESTS
// ============================================================================

describe('DocumentActions Component - Basic Functionality', () => {
  const defaultProps = {
    document: mockDocuments[0],
    documents: mockDocuments,
    folders: mockFolders,
    isOpen: true,
    action: 'rename' as const,
    onClose: vi.fn(),
    onRename: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onMove: vi.fn().mockResolvedValue(undefined),
    onDownload: vi.fn().mockResolvedValue(undefined),
    onBulkDelete: vi.fn().mockResolvedValue(undefined),
    onBulkMove: vi.fn().mockResolvedValue(undefined),
    onBulkDownload: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rename dialog', () => {
    render(<DocumentActions {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: /Rename Document/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Document 1')).toBeInTheDocument();
  });

  it('renders delete dialog', () => {
    const deleteProps = { ...defaultProps, action: 'delete' as const };
    render(<DocumentActions {...deleteProps} />);
    
    expect(screen.getByRole('heading', { name: /Delete Document/ })).toBeInTheDocument();
    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument();
  });

  it('renders move dialog', () => {
    const moveProps = { ...defaultProps, action: 'move' as const };
    render(<DocumentActions {...moveProps} />);
    
    expect(screen.getByRole('heading', { name: /Move Document/ })).toBeInTheDocument();
    expect(screen.getByText('Destination Folder')).toBeInTheDocument();
  });

  it('renders bulk delete dialog', () => {
    const bulkProps = {
      ...defaultProps,
      action: 'bulk-delete' as const,
      selectedDocuments: ['doc-1', 'doc-2']
    };
    render(<DocumentActions {...bulkProps} />);
    
    expect(screen.getByText('Delete Multiple Documents')).toBeInTheDocument();
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();
  });

  it('renders bulk move dialog', () => {
    const bulkProps = {
      ...defaultProps,
      action: 'bulk-move' as const,
      selectedDocuments: ['doc-1', 'doc-2']
    };
    render(<DocumentActions {...bulkProps} />);
    
    expect(screen.getByText('Move Multiple Documents')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const closedProps = { ...defaultProps, isOpen: false };
    render(<DocumentActions {...closedProps} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ============================================================================
// COMPONENT INTEGRATION TESTS
// ============================================================================

describe('Component Integration', () => {
  it('components can be rendered together without conflicts', () => {
    const documentListProps = {
      documents: mockDocuments,
      folders: mockFolders,
      selectedDocuments: [],
      onDocumentSelect: vi.fn(),
      onDocumentSelectAll: vi.fn(),
      onDocumentAction: vi.fn(),
      onBulkAction: vi.fn()
    };

    const folderManagerProps = {
      folders: mockFolders,
      currentFolderId: null,
      onFolderSelect: vi.fn(),
      onFolderCreate: vi.fn().mockResolvedValue(undefined),
      onFolderRename: vi.fn().mockResolvedValue(undefined),
      onFolderDelete: vi.fn().mockResolvedValue(undefined),
      onFolderMove: vi.fn().mockResolvedValue(undefined)
    };

    render(
      <div>
        <FolderManager {...folderManagerProps} />
        <DocumentList {...documentListProps} />
      </div>
    );

    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyProps = {
      documents: [],
      folders: [],
      selectedDocuments: [],
      onDocumentSelect: vi.fn(),
      onDocumentSelectAll: vi.fn(),
      onDocumentAction: vi.fn(),
      onBulkAction: vi.fn()
    };

    render(<DocumentList {...emptyProps} />);
    
    expect(screen.getByText('No documents found')).toBeInTheDocument();
  });
});

// ============================================================================
// PROP VALIDATION TESTS
// ============================================================================

describe('Prop Validation', () => {
  it('handles missing optional props gracefully', () => {
    const minimalProps = {
      documents: mockDocuments,
      folders: mockFolders,
      selectedDocuments: [],
      onDocumentSelect: vi.fn(),
      onDocumentSelectAll: vi.fn(),
      onDocumentAction: vi.fn(),
      onBulkAction: vi.fn()
    };

    expect(() => render(<DocumentList {...minimalProps} />)).not.toThrow();
  });

  it('handles null/undefined values in document data', () => {
    const documentsWithNulls: Document[] = [
      {
        ...mockDocuments[0],
        folderId: null,
        processedAt: undefined
      }
    ];

    const props = {
      documents: documentsWithNulls,
      folders: mockFolders,
      selectedDocuments: [],
      onDocumentSelect: vi.fn(),
      onDocumentSelectAll: vi.fn(),
      onDocumentAction: vi.fn(),
      onBulkAction: vi.fn()
    };

    expect(() => render(<DocumentList {...props} />)).not.toThrow();
  });
});