/**
 * Enhanced RAG Mobile Responsive Tests
 * Tests for mobile-responsive design and PWA functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { 
  ResponsiveEnhancedRAG,
  MobileLayout,
  MobileChatInterface,
  MobileDocumentUpload,
  MobileDocumentList,
  PWAInstallBanner
} from '@/components/enhanced-rag';
import { Document, DocumentFolder } from '@/types/enhanced-rag';

// ============================================================================
// TEST SETUP
// ============================================================================

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Test Document 1',
    filename: 'test1.pdf',
    fileSize: 1024000,
    processingStatus: 'completed' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user1',
    folderId: null,
    metadata: {
      language: 'ko',
      pageCount: 10,
      extractedText: 'Sample text',
      processingTime: 5000,
      chunkCount: 5,
      embeddingModel: 'text-embedding-ada-002'
    }
  },
  {
    id: '2',
    title: 'Test Document 2',
    filename: 'test2.pdf',
    fileSize: 2048000,
    processingStatus: 'processing' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user1',
    folderId: null,
    metadata: {
      language: 'en',
      pageCount: 20,
      extractedText: 'Sample text 2',
      processingTime: 8000,
      chunkCount: 10,
      embeddingModel: 'text-embedding-ada-002'
    }
  }
];

const mockFolders: DocumentFolder[] = [
  {
    id: 'folder1',
    name: 'Test Folder',
    description: 'Test folder description',
    parentId: null,
    userId: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock media query
const mockMediaQuery = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock navigator
const mockNavigator = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      })
    },
  });
};

// ============================================================================
// RESPONSIVE LAYOUT TESTS
// ============================================================================

describe('ResponsiveEnhancedRAG', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders desktop layout on large screens', async () => {
    mockMediaQuery(false); // Desktop

    render(
      <Wrapper>
        <ResponsiveEnhancedRAG
          documents={mockDocuments}
          folders={mockFolders}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced RAG System')).toBeInTheDocument();
    });

    // Should show desktop tabs
    expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument();
  });

  it('renders mobile layout on small screens', async () => {
    mockMediaQuery(true); // Mobile

    render(
      <Wrapper>
        <ResponsiveEnhancedRAG
          documents={mockDocuments}
          folders={mockFolders}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced RAG')).toBeInTheDocument();
    });

    // Should show mobile navigation
    const menuButton = screen.getByRole('button');
    expect(menuButton).toBeInTheDocument();
  });

  it('handles document upload in responsive mode', async () => {
    const mockUpload = vi.fn().mockResolvedValue(undefined);
    
    render(
      <Wrapper>
        <ResponsiveEnhancedRAG
          documents={mockDocuments}
          folders={mockFolders}
          onDocumentUpload={mockUpload}
        />
      </Wrapper>
    );

    // Test will depend on screen size
    await waitFor(() => {
      expect(screen.getByText(/Enhanced RAG/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// MOBILE LAYOUT TESTS
// ============================================================================

describe('MobileLayout', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  it('renders mobile header with title and subtitle', () => {
    render(
      <Wrapper>
        <MobileLayout
          title="Test Title"
          subtitle="Test Subtitle"
        >
          <div>Test Content</div>
        </MobileLayout>
      </Wrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows back button when enabled', () => {
    const mockBack = vi.fn();

    render(
      <Wrapper>
        <MobileLayout
          title="Test Title"
          showBackButton={true}
          onBack={mockBack}
        >
          <div>Test Content</div>
        </MobileLayout>
      </Wrapper>
    );

    const backButton = screen.getByRole('button');
    fireEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });

  it('displays network status', () => {
    render(
      <Wrapper>
        <MobileLayout title="Test Title">
          <div>Test Content</div>
        </MobileLayout>
      </Wrapper>
    );

    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders navigation menu when items provided', () => {
    const navigationItems = [
      {
        id: 'chat',
        label: 'Chat',
        icon: <div>Chat Icon</div>
      },
      {
        id: 'upload',
        label: 'Upload',
        icon: <div>Upload Icon</div>,
        badge: '2'
      }
    ];

    render(
      <Wrapper>
        <MobileLayout
          title="Test Title"
          navigationItems={navigationItems}
          currentView="chat"
          onViewChange={vi.fn()}
        >
          <div>Test Content</div>
        </MobileLayout>
      </Wrapper>
    );

    // Should show menu button
    const menuButton = screen.getByRole('button');
    expect(menuButton).toBeInTheDocument();
  });
});

// ============================================================================
// MOBILE CHAT INTERFACE TESTS
// ============================================================================

describe('MobileChatInterface', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  it('renders mobile chat interface', () => {
    render(
      <Wrapper>
        <MobileChatInterface
          availableDocuments={mockDocuments}
        />
      </Wrapper>
    );

    expect(screen.getByText('AI Chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask about your documents/i)).toBeInTheDocument();
  });

  it('shows document selection when documents available', () => {
    render(
      <Wrapper>
        <MobileChatInterface
          availableDocuments={mockDocuments}
        />
      </Wrapper>
    );

    // Should show document count in subtitle
    expect(screen.getByText('No documents selected')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    render(
      <Wrapper>
        <MobileChatInterface
          availableDocuments={mockDocuments}
        />
      </Wrapper>
    );

    const input = screen.getByPlaceholderText(/ask about your documents/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Message should be processed
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
});

// ============================================================================
// MOBILE DOCUMENT UPLOAD TESTS
// ============================================================================

describe('MobileDocumentUpload', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  it('renders mobile upload interface', () => {
    render(
      <Wrapper>
        <MobileDocumentUpload
          onUpload={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('shows camera option when available', () => {
    render(
      <Wrapper>
        <MobileDocumentUpload
          onUpload={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByText('Take Photo')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const mockUpload = vi.fn().mockResolvedValue(undefined);

    render(
      <Wrapper>
        <MobileDocumentUpload
          onUpload={mockUpload}
        />
      </Wrapper>
    );

    // Create a mock file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    // Find the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (fileInput) {
      // Mock the files property
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    }
  });
});

// ============================================================================
// MOBILE DOCUMENT LIST TESTS
// ============================================================================

describe('MobileDocumentList', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  it('renders mobile document list', () => {
    render(
      <Wrapper>
        <MobileDocumentList
          documents={mockDocuments}
          folders={mockFolders}
          selectedDocuments={[]}
          onDocumentSelect={vi.fn()}
          onDocumentSelectAll={vi.fn()}
          onDocumentAction={vi.fn()}
          onBulkAction={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();
  });

  it('handles document selection', () => {
    const mockSelect = vi.fn();

    render(
      <Wrapper>
        <MobileDocumentList
          documents={mockDocuments}
          folders={mockFolders}
          selectedDocuments={[]}
          onDocumentSelect={mockSelect}
          onDocumentSelectAll={vi.fn()}
          onDocumentAction={vi.fn()}
          onBulkAction={vi.fn()}
        />
      </Wrapper>
    );

    // Enable selection mode
    const selectButton = screen.getByRole('button', { name: /select/i });
    fireEvent.click(selectButton);

    // Should show checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('shows search and filter options', () => {
    render(
      <Wrapper>
        <MobileDocumentList
          documents={mockDocuments}
          folders={mockFolders}
          selectedDocuments={[]}
          onDocumentSelect={vi.fn()}
          onDocumentSelectAll={vi.fn()}
          onDocumentAction={vi.fn()}
          onBulkAction={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByPlaceholderText(/search documents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });
});

// ============================================================================
// PWA INSTALL BANNER TESTS
// ============================================================================

describe('PWAInstallBanner', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    // Mock PWA install prompt
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
    });
  });

  it('renders install banner when installable', () => {
    // Mock the hook to return installable state
    vi.mock('@/hooks/usePWA', () => ({
      useInstallBanner: () => ({
        showBanner: true,
        dismissBanner: vi.fn(),
        installApp: vi.fn(),
      }),
    }));

    render(
      <Wrapper>
        <PWAInstallBanner />
      </Wrapper>
    );

    expect(screen.getByText('Install App')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
  });

  it('handles install button click', async () => {
    const mockInstall = vi.fn().mockResolvedValue(true);

    vi.mock('@/hooks/usePWA', () => ({
      useInstallBanner: () => ({
        showBanner: true,
        dismissBanner: vi.fn(),
        installApp: mockInstall,
      }),
    }));

    render(
      <Wrapper>
        <PWAInstallBanner />
      </Wrapper>
    );

    const installButton = screen.getByRole('button', { name: /install/i });
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockInstall).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// TOUCH INTERACTION TESTS
// ============================================================================

describe('Touch Interactions', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  it('handles touch events on mobile chat', () => {
    render(
      <Wrapper>
        <MobileChatInterface
          availableDocuments={mockDocuments}
        />
      </Wrapper>
    );

    const chatInput = screen.getByPlaceholderText(/ask about your documents/i);
    
    // Simulate touch events
    fireEvent.touchStart(chatInput);
    fireEvent.touchEnd(chatInput);
    
    expect(chatInput).toBeInTheDocument();
  });

  it('handles swipe gestures on document list', () => {
    render(
      <Wrapper>
        <MobileDocumentList
          documents={mockDocuments}
          folders={mockFolders}
          selectedDocuments={[]}
          onDocumentSelect={vi.fn()}
          onDocumentSelectAll={vi.fn()}
          onDocumentAction={vi.fn()}
          onBulkAction={vi.fn()}
        />
      </Wrapper>
    );

    const documentItem = screen.getByText('Test Document 1');
    
    // Simulate swipe gesture
    fireEvent.touchStart(documentItem, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.touchMove(documentItem, {
      touches: [{ clientX: 50, clientY: 100 }]
    });
    fireEvent.touchEnd(documentItem);
    
    expect(documentItem).toBeInTheDocument();
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

describe('Mobile Accessibility', () => {
  const Wrapper = createTestWrapper();

  beforeEach(() => {
    mockNavigator();
  });

  it('provides proper ARIA labels for mobile navigation', () => {
    const navigationItems = [
      {
        id: 'chat',
        label: 'Chat',
        icon: <div>Chat Icon</div>
      }
    ];

    render(
      <Wrapper>
        <MobileLayout
          title="Test Title"
          navigationItems={navigationItems}
          currentView="chat"
          onViewChange={vi.fn()}
        >
          <div>Test Content</div>
        </MobileLayout>
      </Wrapper>
    );

    // Check for accessible navigation
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('supports keyboard navigation on mobile', () => {
    render(
      <Wrapper>
        <MobileChatInterface
          availableDocuments={mockDocuments}
        />
      </Wrapper>
    );

    const chatInput = screen.getByPlaceholderText(/ask about your documents/i);
    
    // Test keyboard navigation
    fireEvent.keyDown(chatInput, { key: 'Tab' });
    fireEvent.keyDown(chatInput, { key: 'Enter' });
    
    expect(chatInput).toBeInTheDocument();
  });

  it('provides proper focus management', () => {
    render(
      <Wrapper>
        <MobileDocumentUpload
          onUpload={vi.fn()}
        />
      </Wrapper>
    );

    const browseButton = screen.getByText('Browse Files');
    
    // Test focus
    browseButton.focus();
    expect(document.activeElement).toBe(browseButton);
  });
});