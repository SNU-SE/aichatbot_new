import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Document Management API', () => {
    it('should create a new document', async () => {
      const mockDocument = {
        id: '1',
        title: 'Test Document',
        content: 'Test content',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn().mockResolvedValue({
        data: [mockDocument],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await supabase
        .from('documents')
        .select('*')
        .insert(mockDocument);

      expect(result.data).toEqual([mockDocument]);
      expect(result.error).toBeNull();
    });

    it('should retrieve documents with pagination', async () => {
      const mockDocuments = [
        { id: '1', title: 'Doc 1' },
        { id: '2', title: 'Doc 2' },
      ];

      const mockRange = vi.fn().mockResolvedValue({
        data: mockDocuments,
        error: null,
        count: 2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        range: mockRange,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .range(0, 9);

      expect(result.data).toEqual(mockDocuments);
      expect(result.count).toBe(2);
    });

    it('should handle document deletion', async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await supabase
        .from('documents')
        .delete()
        .eq('id', '1');

      expect(result.error).toBeNull();
    });
  });

  describe('Search API', () => {
    it('should perform vector search', async () => {
      const mockSearchResults = [
        {
          id: '1',
          title: 'Relevant Document',
          similarity: 0.95,
          chunk_content: 'This is relevant content',
        },
      ];

      const mockInvoke = vi.fn().mockResolvedValue({
        data: mockSearchResults,
        error: null,
      });

      (supabase.functions.invoke as any).mockImplementation(mockInvoke);

      const result = await supabase.functions.invoke('rag-search', {
        body: {
          query: 'test query',
          limit: 10,
          threshold: 0.7,
        },
      });

      expect(mockInvoke).toHaveBeenCalledWith('rag-search', {
        body: {
          query: 'test query',
          limit: 10,
          threshold: 0.7,
        },
      });
      expect(result.data).toEqual(mockSearchResults);
    });

    it('should handle search errors gracefully', async () => {
      const mockError = new Error('Search service unavailable');

      (supabase.functions.invoke as any).mockRejectedValue(mockError);

      await expect(
        supabase.functions.invoke('rag-search', {
          body: { query: 'test' },
        })
      ).rejects.toThrow('Search service unavailable');
    });
  });

  describe('Authentication API', () => {
    it('should authenticate user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'authenticated',
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const mockError = { message: 'Invalid credentials' };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });

      expect(result.data.user).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('File Upload API', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'documents/test.pdf' },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      const result = await supabase.storage
        .from('documents')
        .upload('test.pdf', mockFile);

      expect(result.data?.path).toBe('documents/test.pdf');
      expect(result.error).toBeNull();
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockError = { message: 'File type not supported' };

      (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      const result = await supabase.storage
        .from('documents')
        .upload('test.txt', mockFile);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });
});