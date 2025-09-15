import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }),
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock file reading
Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: class MockFileReader {
    readAsArrayBuffer = vi.fn();
    readAsText = vi.fn();
    result = 'mock file content';
    onload = null;
    onerror = null;
  },
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('End-to-End User Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Document Upload Workflow', () => {
    it('should complete full document upload process', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Navigate to document upload
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await user.click(uploadButton);

      // Create and upload a file
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, file);

      // Verify file is selected
      expect(screen.getByText('test.pdf')).toBeInTheDocument();

      // Submit upload
      const submitButton = screen.getByRole('button', { name: /upload document/i });
      await user.click(submitButton);

      // Verify upload progress is shown
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should handle upload validation errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Try to upload invalid file type
      const invalidFile = new File(['test'], 'test.txt', {
        type: 'text/plain',
      });

      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, invalidFile);

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Chat Workflow', () => {
    it('should perform search and start chat session', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Navigate to search
      const searchInput = screen.getByPlaceholderText(/search documents/i);
      await user.type(searchInput, 'machine learning');

      // Submit search
      await user.keyboard('{Enter}');

      // Verify search results are displayed
      await waitFor(() => {
        expect(screen.getByText(/search results/i)).toBeInTheDocument();
      });

      // Start chat from search results
      const chatButton = screen.getByRole('button', { name: /start chat/i });
      await user.click(chatButton);

      // Verify chat interface is opened
      expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();

      // Send a message
      const chatInput = screen.getByPlaceholderText(/ask a question/i);
      await user.type(chatInput, 'What is machine learning?');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify message is sent
      expect(screen.getByText('What is machine learning?')).toBeInTheDocument();
    });
  });

  describe('Document Management Workflow', () => {
    it('should create folder and organize documents', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Navigate to document management
      const manageButton = screen.getByRole('button', { name: /manage documents/i });
      await user.click(manageButton);

      // Create new folder
      const createFolderButton = screen.getByRole('button', { name: /create folder/i });
      await user.click(createFolderButton);

      const folderNameInput = screen.getByLabelText(/folder name/i);
      await user.type(folderNameInput, 'Research Papers');

      const confirmButton = screen.getByRole('button', { name: /create/i });
      await user.click(confirmButton);

      // Verify folder is created
      await waitFor(() => {
        expect(screen.getByText('Research Papers')).toBeInTheDocument();
      });

      // Move document to folder (if documents exist)
      const documentItem = screen.queryByTestId('document-item');
      if (documentItem) {
        const moveButton = screen.getByRole('button', { name: /move/i });
        await user.click(moveButton);

        const folderOption = screen.getByText('Research Papers');
        await user.click(folderOption);

        const confirmMoveButton = screen.getByRole('button', { name: /move document/i });
        await user.click(confirmMoveButton);
      }
    });
  });

  describe('Permission Management Workflow', () => {
    it('should manage document permissions (admin user)', async () => {
      const user = userEvent.setup();
      
      // Mock admin user
      vi.mocked(require('@/integrations/supabase/client').supabase.auth.getUser)
        .mockResolvedValue({
          data: { 
            user: { 
              id: 'admin-1', 
              email: 'admin@example.com',
              user_metadata: { role: 'admin' }
            } 
          },
          error: null,
        });

      renderWithProviders(<App />);

      // Navigate to admin panel
      const adminButton = screen.getByRole('button', { name: /admin/i });
      await user.click(adminButton);

      // Navigate to permissions
      const permissionsTab = screen.getByRole('tab', { name: /permissions/i });
      await user.click(permissionsTab);

      // Select document for permission management
      const documentCheckbox = screen.getByRole('checkbox', { name: /select document/i });
      await user.click(documentCheckbox);

      // Open permission dialog
      const managePermissionsButton = screen.getByRole('button', { name: /manage permissions/i });
      await user.click(managePermissionsButton);

      // Set permission level
      const permissionSelect = screen.getByRole('combobox', { name: /permission level/i });
      await user.click(permissionSelect);

      const readOnlyOption = screen.getByRole('option', { name: /read only/i });
      await user.click(readOnlyOption);

      // Apply permissions
      const applyButton = screen.getByRole('button', { name: /apply permissions/i });
      await user.click(applyButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/permissions updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsive Workflow', () => {
    it('should work on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      // Mock matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });

      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Verify mobile navigation is present
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();

      // Open mobile menu
      await user.click(mobileMenuButton);

      // Verify mobile menu items are accessible
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      vi.mocked(require('@/integrations/supabase/client').supabase.from)
        .mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        });

      renderWithProviders(<App />);

      // Trigger action that causes network error
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Verify retry button is available
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      await user.click(retryButton);
    });
  });
});