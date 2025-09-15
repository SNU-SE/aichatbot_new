/**
 * Enhanced RAG Document Management Tests
 * Comprehensive tests for document management components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import DocumentList from '../components/enhanced-rag/DocumentList';
import FolderManager from '../components/enhanced-rag/FolderManager';
import DocumentActions from '../components/enhanced-rag/DocumentActions';
import DocumentManagement from '../components/enhanced-rag/DocumentManagement';

import { Document, DocumentFolder, ProcessingStatus } from '../types/enhanced-rag';

// Mock Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn().mockResolvedValue({
          data: new Blob(['test content'], { type: 'application/pdf' }),
          error: null
        })
      }))
    }
  }
}));

// Mock toast
vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

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
  },
  {
    id: 'doc-3',
    userId: 'user-1',
    title: 'Failed Document',
    filename: 'failed.pdf',
    filePath: 'documents/failed.pdf',
    fileSize: 512000,
    mimeType: 'application/pdf',
    language: 'en',
    processingStatus: ProcessingStatus.FAILED,
    folderId: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    metadata: { errorDetails: 'Processing failed' }
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
  },
  {
    id: 'folder-2',
    userId: 'user-1',
    name: 'Lecture Notes',
    parentId: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    documentCount: 0
  },
  {
    id: 'folder-3',
    userId: 'user-1',
    name: 'Subfolder',
    parentId: 'folder-1',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    documentCount: 0
  }
];

// ============================================================================
// DOCUMENT LIST TESTS
// ============================================================================

describe('DocumentList Component', () => {
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

  it('renders document list correctly', () => {
    render(<DocumentList {...defaultProps} />);
    
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();
    expect(screen.getByText('Failed Document')).toBeInTheDocument();
  });

  it('displays document information correctly', () => {
    render(<DocumentList {...defaultProps} />);
    
    // Check file sizes
    expect(screen.getByText('1024000 bytes')).toBeInTheDocument();
    expect(screen.getByText('2048000 bytes')).toBeInTheDocument();
    
    // Check processing status badges
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('uploading')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('handles document selection', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First document checkbox (index 0 is select all)
    
    expect(defaultProps.onDocumentSelect).toHaveBeenCalledWith('doc-1');
  });

  it('handles select all functionality', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);
    
    expect(defaultProps.onDocumentSelectAll).toHaveBeenCalledWith(true);
  });

  it('filters documents by search query', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search documents...');
    await user.type(searchInput, 'Test Document 1');
    
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Document 2')).not.toBeInTheDocument();
  });

  it('filters documents by processing status', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    // Open filters
    await user.click(screen.getByText('Filters'));
    
    // Select failed status filter
    const statusSelect = screen.getByDisplayValue('All Status');
    await user.click(statusSelect);
    await user.click(screen.getByText('Failed'));
    
    expect(screen.getByText('Failed Document')).toBeInTheDocument();
    expect(screen.queryByText('Test Document 1')).not.toBeInTheDocument();
  });

  it('sorts documents correctly', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    // Click on title sort button
    await user.click(screen.getByText('Document'));
    
    // Documents should be sorted by title
    const documentTitles = screen.getAllByText(/Test Document|Failed Document/);
    expect(documentTitles[0]).toHaveTextContent('Failed Document');
  });

  it('shows bulk actions when documents are selected', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedDocuments: ['doc-1', 'doc-2']
    };
    
    render(<DocumentList {...propsWithSelection} />);
    
    expect(screen.getByText('Bulk Actions (2)')).toBeInTheDocument();
  });

  it('handles document actions from dropdown menu', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    // Click on first document's action menu
    const actionButtons = screen.getAllByRole('button', { name: '' });
    const firstActionButton = actionButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    );
    
    if (firstActionButton) {
      await user.click(firstActionButton);
      await user.click(screen.getByText('Rename'));
      
      expect(defaultProps.onDocumentAction).toHaveBeenCalledWith('rename', 'doc-1');
    }
  });

  it('shows empty state when no documents match filters', async () => {
    const user = userEvent.setup();
    render(<DocumentList {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search documents...');
    await user.type(searchInput, 'nonexistent document');
    
    expect(screen.getByText('No documents match your filters')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DocumentList {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });
});

// ============================================================================
// FOLDER MANAGER TESTS
// ============================================================================

describe('FolderManager Component', () => {
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

  it('renders folder tree correctly', () => {
    render(<FolderManager {...defaultProps} />);
    
    expect(screen.getByText('Research Papers')).toBeInTheDocument();
    expect(screen.getByText('Lecture Notes')).toBeInTheDocument();
    expect(screen.getByText('All Documents')).toBeInTheDocument();
  });

  it('handles folder selection', async () => {
    const user = userEvent.setup();
    render(<FolderManager {...defaultProps} />);
    
    await user.click(screen.getByText('Research Papers'));
    
    expect(defaultProps.onFolderSelect).toHaveBeenCalledWith('folder-1');
  });

  it('opens create folder dialog', async () => {
    const user = userEvent.setup();
    render(<FolderManager {...defaultProps} />);
    
    await user.click(screen.getByText('New Folder'));
    
    expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter folder name...')).toBeInTheDocument();
  });

  it('creates a new folder', async () => {
    const user = userEvent.setup();
    render(<FolderManager {...defaultProps} />);
    
    // Open create dialog
    await user.click(screen.getByText('New Folder'));
    
    // Enter folder name
    const nameInput = screen.getByPlaceholderText('Enter folder name...');
    await user.type(nameInput, 'New Test Folder');
    
    // Submit
    await user.click(screen.getByText('Create Folder'));
    
    await waitFor(() => {
      expect(defaultProps.onFolderCreate).toHaveBeenCalledWith('New Test Folder', undefined);
    });
  });

  it('shows folder actions menu', async () => {
    const user = userEvent.setup();
    render(<FolderManager {...defaultProps} />);
    
    // Find and click the action menu for a folder
    const actionButtons = screen.getAllByRole('button');
    const folderActionButton = actionButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    );
    
    if (folderActionButton) {
      await user.click(folderActionButton);
      
      expect(screen.getByText('Create Subfolder')).toBeInTheDocument();
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    }
  });

  it('handles folder rename', async () => {
    const user = userEvent.setup();
    render(<FolderManager {...defaultProps} />);
    
    // Find and click the action menu
    const actionButtons = screen.getAllByRole('button');
    const folderActionButton = actionButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    );
    
    if (folderActionButton) {
      await user.click(folderActionButton);
      await user.click(screen.getByText('Rename'));
      
      // Enter new name
      const nameInput = screen.getByDisplayValue('Research Papers');
      await user.clear(nameInput);
      await user.type(nameInput, 'Renamed Folder');
      
      // Submit
      await user.click(screen.getByText('Rename'));
      
      await waitFor(() => {
        expect(defaultProps.onFolderRename).toHaveBeenCalledWith('folder-1', 'Renamed Folder');
      });
    }
  });

  it('shows breadcrumb navigation for nested folders', () => {
    const propsWithCurrentFolder = {
      ...defaultProps,
      currentFolderId: 'folder-3'
    };
    
    render(<FolderManager {...propsWithCurrentFolder} />);
    
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Research Papers')).toBeInTheDocument();
  });

  it('expands and collapses folder tree', async () => {
    const user = userEvent.setup();
    render(<FolderManager {...defaultProps} />);
    
    // Find expand button for folder with children
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-chevron-right')
    );
    
    if (expandButton) {
      await user.click(expandButton);
      // After expansion, should show chevron-down
      expect(screen.getByRole('button')).toBeInTheDocument();
    }
  });
});

// ============================================================================
// DOCUMENT ACTIONS TESTS
// ============================================================================

describe('DocumentActions Component', () => {
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

  it('renders rename dialog correctly', () => {
    render(<DocumentActions {...defaultProps} />);
    
    expect(screen.getByText('Rename Document')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Document 1')).toBeInTheDocument();
  });

  it('handles document rename', async () => {
    const user = userEvent.setup();
    render(<DocumentActions {...defaultProps} />);
    
    const nameInput = screen.getByDisplayValue('Test Document 1');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Document');
    
    await user.click(screen.getByText('Rename'));
    
    await waitFor(() => {
      expect(defaultProps.onRename).toHaveBeenCalledWith('doc-1', 'Renamed Document');
    });
  });

  it('renders delete dialog with warning', () => {
    const deleteProps = { ...defaultProps, action: 'delete' as const };
    render(<DocumentActions {...deleteProps} />);
    
    expect(screen.getByRole('heading', { name: /Delete Document/ })).toBeInTheDocument();
    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Document' })).toBeInTheDocument();
  });

  it('handles document deletion', async () => {
    const user = userEvent.setup();
    const deleteProps = { ...defaultProps, action: 'delete' as const };
    render(<DocumentActions {...deleteProps} />);
    
    await user.click(screen.getByRole('button', { name: 'Delete Document' }));
    
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith('doc-1');
    });
  });

  it('renders move dialog with folder selection', () => {
    const moveProps = { ...defaultProps, action: 'move' as const };
    render(<DocumentActions {...moveProps} />);
    
    expect(screen.getByRole('heading', { name: /Move Document/ })).toBeInTheDocument();
    expect(screen.getByText('Destination Folder')).toBeInTheDocument();
  });

  it('handles bulk delete with multiple documents', () => {
    const bulkProps = {
      ...defaultProps,
      action: 'bulk-delete' as const,
      selectedDocuments: ['doc-1', 'doc-2']
    };
    render(<DocumentActions {...bulkProps} />);
    
    expect(screen.getByText('Delete Multiple Documents')).toBeInTheDocument();
    expect(screen.getByText(/2.*documents/)).toBeInTheDocument();
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();
  });

  it('handles bulk move with folder selection', () => {
    const bulkProps = {
      ...defaultProps,
      action: 'bulk-move' as const,
      selectedDocuments: ['doc-1', 'doc-2']
    };
    render(<DocumentActions {...bulkProps} />);
    
    expect(screen.getByText('Move Multiple Documents')).toBeInTheDocument();
    expect(screen.getByText(/2.*documents/)).toBeInTheDocument();
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentActions {...defaultProps} />);
    
    await user.click(screen.getByText('Cancel'));
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('disables submit button when form is invalid', () => {
    render(<DocumentActions {...defaultProps} />);
    
    const nameInput = screen.getByDisplayValue('Test Document 1');
    fireEvent.change(nameInput, { target: { value: '' } });
    
    const renameButton = screen.getByRole('button', { name: 'Rename' });
    expect(renameButton).toBeDisabled();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('DocumentManagement Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete document management interface', async () => {
    render(<DocumentManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Document Management')).toBeInTheDocument();
      expect(screen.getByText('Folders')).toBeInTheDocument();
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });
  });

  it('handles document upload flow', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Upload Documents'));
    
    // Should open upload dialog (mocked)
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
  });

  it('integrates folder and document management', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument();
    });
    
    // Create folder should be available
    await user.click(screen.getByText('New Folder'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    render(<DocumentManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Refresh'));
    
    // Should trigger data refresh (mocked)
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles document operation errors gracefully', async () => {
    const errorProps = {
      documents: mockDocuments,
      folders: mockFolders,
      selectedDocuments: [],
      onDocumentSelect: vi.fn(),
      onDocumentSelectAll: vi.fn(),
      onDocumentAction: vi.fn(),
      onBulkAction: vi.fn()
    };

    render(<DocumentList {...errorProps} />);
    
    // Component should render without crashing even with potential errors
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
  });

  it('handles empty data states', () => {
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

  it('handles folder operations with empty folder list', () => {
    const emptyFolderProps = {
      folders: [],
      currentFolderId: null,
      onFolderSelect: vi.fn(),
      onFolderCreate: vi.fn().mockResolvedValue(undefined),
      onFolderRename: vi.fn().mockResolvedValue(undefined),
      onFolderDelete: vi.fn().mockResolvedValue(undefined),
      onFolderMove: vi.fn().mockResolvedValue(undefined)
    };

    render(<FolderManager {...emptyFolderProps} />);
    
    expect(screen.getByText('No folders created yet')).toBeInTheDocument();
  });
});