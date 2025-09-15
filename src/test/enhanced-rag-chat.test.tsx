/**
 * Enhanced RAG Chat System Tests
 * Comprehensive tests for the enhanced AI chat interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedChatInterface } from '@/components/enhanced-rag/EnhancedChatInterface';
import { ChatMessageList } from '@/components/enhanced-rag/ChatMessageList';
import { ChatInput } from '@/components/enhanced-rag/ChatInput';
import { DocumentContextPanel } from '@/components/enhanced-rag/DocumentContextPanel';
import { SessionList } from '@/components/enhanced-rag/SessionList';
import { useEnhancedChat } from '@/hooks/useEnhancedChat';
import { enhancedChatService } from '@/services/enhancedChatService';
import { vectorSearchService } from '@/services/vectorSearchService';
import { MessageRole } from '@/types/enhanced-rag';
import { ChatMessageWithState, ChatSession, DocumentContext } from '@/types/enhanced-chat';

// Mock dependencies
vi.mock('@/hooks/useEnhancedChat');
vi.mock('@/services/enhancedChatService');
vi.mock('@/services/vectorSearchService');
vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/use-toast');

const mockUseEnhancedChat = vi.mocked(useEnhancedChat);
const mockEnhancedChatService = vi.mocked(enhancedChatService);
const mockVectorSearchService = vi.mocked(vectorSearchService);

// Test data
const mockSession: ChatSession = {
  id: 'session-1',
  userId: 'user-1',
  title: 'Test Chat Session',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  messageCount: 2,
  lastActivity: new Date('2024-01-01'),
  documentContext: ['doc-1', 'doc-2'],
  metadata: {},
};

const mockMessages: ChatMessageWithState[] = [
  {
    id: 'msg-1',
    userId: 'user-1',
    sessionId: 'session-1',
    message: 'Hello, can you help me with document analysis?',
    role: MessageRole.USER,
    documentReferences: [],
    createdAt: new Date('2024-01-01T10:00:00Z'),
    isLoading: false,
  },
  {
    id: 'msg-2',
    userId: 'user-1',
    sessionId: 'session-1',
    message: 'I can help you analyze documents. What specific information are you looking for?',
    role: MessageRole.ASSISTANT,
    documentReferences: [
      {
        documentId: 'doc-1',
        documentTitle: 'Sample Document',
        chunkId: 'chunk-1',
        pageNumber: 1,
        relevanceScore: 0.85,
        excerpt: 'This document contains information about...',
        confidence: 0.9,
      },
    ],
    confidenceScore: 0.85,
    processingTimeMs: 1500,
    createdAt: new Date('2024-01-01T10:00:30Z'),
    isLoading: false,
  },
];

const mockDocumentContext: DocumentContext[] = [
  {
    documentId: 'doc-1',
    documentTitle: 'Sample Document',
    relevantChunks: [
      {
        chunkId: 'chunk-1',
        content: 'This is sample content from the document...',
        pageNumber: 1,
        relevanceScore: 0.85,
        highlight: 'sample content',
      },
    ],
    totalRelevanceScore: 0.85,
  },
];

describe('Enhanced Chat Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useEnhancedChat hook
    mockUseEnhancedChat.mockReturnValue({
      messages: mockMessages,
      currentSession: mockSession,
      isLoading: false,
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      retryMessage: vi.fn(),
      clearMessages: vi.fn(),
      createSession: vi.fn(),
      loadSession: vi.fn(),
      deleteSession: vi.fn(),
      setDocumentContext: vi.fn(),
      searchDocuments: vi.fn().mockResolvedValue(mockDocumentContext),
      exportSession: vi.fn(),
      getSessionHistory: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EnhancedChatInterface Component', () => {
    it('renders chat interface with messages', () => {
      render(
        <EnhancedChatInterface
          availableDocuments={['doc-1', 'doc-2']}
          initialDocumentContext={['doc-1']}
        />
      );

      expect(screen.getByText('Enhanced AI Chat')).toBeInTheDocument();
      expect(screen.getByText('Hello, can you help me with document analysis?')).toBeInTheDocument();
      expect(screen.getByText(/I can help you analyze documents/)).toBeInTheDocument();
    });

    it('shows document context when documents are selected', () => {
      render(
        <EnhancedChatInterface
          availableDocuments={['doc-1', 'doc-2']}
          initialDocumentContext={['doc-1']}
        />
      );

      expect(screen.getByText('1 document(s) selected')).toBeInTheDocument();
    });

    it('handles message sending', async () => {
      const mockSendMessage = vi.fn();
      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        sendMessage: mockSendMessage,
      });

      const user = userEvent.setup();
      render(<EnhancedChatInterface />);

      const input = screen.getByPlaceholderText('Ask a question about your documents...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'What is the main topic?');
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith('What is the main topic?', {
        documentIds: undefined,
        enableStreaming: true,
        searchContext: true,
      });
    });

    it('toggles document panel', async () => {
      const user = userEvent.setup();
      render(<EnhancedChatInterface availableDocuments={['doc-1', 'doc-2']} />);

      const documentButton = screen.getByRole('button', { name: /documents/i });
      await user.click(documentButton);

      expect(screen.getByText('Document Context')).toBeInTheDocument();
    });

    it('handles session creation', async () => {
      const mockCreateSession = vi.fn().mockResolvedValue(mockSession);
      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        createSession: mockCreateSession,
      });

      const user = userEvent.setup();
      render(<EnhancedChatInterface />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      const newSessionButton = screen.getByText('New Session');
      await user.click(newSessionButton);

      expect(mockCreateSession).toHaveBeenCalled();
    });

    it('handles session export', async () => {
      const mockExportSession = vi.fn().mockResolvedValue(new Blob(['test'], { type: 'text/markdown' }));
      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        exportSession: mockExportSession,
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
      global.URL.revokeObjectURL = vi.fn();

      const user = userEvent.setup();
      render(<EnhancedChatInterface />);

      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      const exportButton = screen.getByText('Export as Markdown');
      await user.click(exportButton);

      expect(mockExportSession).toHaveBeenCalledWith('markdown');
    });
  });

  describe('ChatMessageList Component', () => {
    it('renders messages correctly', () => {
      render(
        <ChatMessageList
          messages={mockMessages}
          showSources={true}
          showConfidence={true}
        />
      );

      expect(screen.getByText('Hello, can you help me with document analysis?')).toBeInTheDocument();
      expect(screen.getByText(/I can help you analyze documents/)).toBeInTheDocument();
    });

    it('shows confidence scores for AI messages', () => {
      render(
        <ChatMessageList
          messages={mockMessages}
          showConfidence={true}
        />
      );

      expect(screen.getByText('High (85%)')).toBeInTheDocument();
    });

    it('shows document sources', () => {
      render(
        <ChatMessageList
          messages={mockMessages}
          showSources={true}
        />
      );

      expect(screen.getByText('Sources')).toBeInTheDocument();
      expect(screen.getByText('Sample Document')).toBeInTheDocument();
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    it('handles retry for failed messages', async () => {
      const failedMessage: ChatMessageWithState = {
        ...mockMessages[0],
        isError: true,
      };

      const mockRetry = vi.fn();
      const user = userEvent.setup();

      render(
        <ChatMessageList
          messages={[failedMessage]}
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalledWith(failedMessage.id);
    });

    it('shows loading state', () => {
      render(
        <ChatMessageList
          messages={[]}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('shows empty state', () => {
      render(
        <ChatMessageList
          messages={[]}
          isLoading={false}
        />
      );

      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    });
  });

  describe('ChatInput Component', () => {
    it('renders input field and send button', () => {
      render(<ChatInput onSend={vi.fn()} />);

      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('handles message input and sending', async () => {
      const mockOnSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Test message', {
        documentIds: undefined,
        enableStreaming: true,
      });
    });

    it('handles Enter key to send message', async () => {
      const mockOnSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message{enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Test message', {
        documentIds: undefined,
        enableStreaming: true,
      });
    });

    it('prevents sending empty messages', async () => {
      const mockOnSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      await user.click(sendButton);
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('shows character count', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={vi.fn()} maxLength={100} />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      expect(screen.getByText('4/100')).toBeInTheDocument();
    });

    it('handles document selection', async () => {
      const mockOnDocumentSelectionChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ChatInput
          onSend={vi.fn()}
          enableDocumentSelection={true}
          availableDocuments={['doc-1', 'doc-2']}
          onDocumentSelectionChange={mockOnDocumentSelectionChange}
        />
      );

      const documentButton = screen.getByRole('button', { name: /file/i });
      await user.click(documentButton);

      expect(screen.getByText('Select Documents')).toBeInTheDocument();
    });

    it('disables input when loading', () => {
      render(<ChatInput onSend={vi.fn()} isLoading={true} />);

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('DocumentContextPanel Component', () => {
    it('renders document context', () => {
      render(
        <DocumentContextPanel
          documentContext={mockDocumentContext}
          availableDocuments={['doc-1', 'doc-2']}
          selectedDocuments={['doc-1']}
          onDocumentSelect={vi.fn()}
          onDocumentSearch={vi.fn()}
        />
      );

      expect(screen.getByText('Document Context')).toBeInTheDocument();
      expect(screen.getByText('Sample Document')).toBeInTheDocument();
    });

    it('handles document selection', async () => {
      const mockOnDocumentSelect = vi.fn();
      const user = userEvent.setup();

      render(
        <DocumentContextPanel
          documentContext={mockDocumentContext}
          availableDocuments={['doc-1', 'doc-2']}
          selectedDocuments={[]}
          onDocumentSelect={mockOnDocumentSelect}
          onDocumentSearch={vi.fn()}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnDocumentSelect).toHaveBeenCalledWith(['doc-1']);
    });

    it('handles document search', async () => {
      const mockOnDocumentSearch = vi.fn();
      const user = userEvent.setup();

      render(
        <DocumentContextPanel
          documentContext={[]}
          availableDocuments={['doc-1', 'doc-2']}
          selectedDocuments={[]}
          onDocumentSelect={vi.fn()}
          onDocumentSearch={mockOnDocumentSearch}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search documents...');
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'test query');
      await user.click(searchButton);

      expect(mockOnDocumentSearch).toHaveBeenCalledWith('test query');
    });

    it('shows empty state when no documents', () => {
      render(
        <DocumentContextPanel
          documentContext={[]}
          availableDocuments={[]}
          selectedDocuments={[]}
          onDocumentSelect={vi.fn()}
          onDocumentSearch={vi.fn()}
        />
      );

      expect(screen.getByText('No document context')).toBeInTheDocument();
    });
  });

  describe('SessionList Component', () => {
    const mockSessions: ChatSession[] = [
      mockSession,
      {
        ...mockSession,
        id: 'session-2',
        title: 'Another Chat',
        messageCount: 5,
      },
    ];

    beforeEach(() => {
      mockEnhancedChatService.getUserSessions.mockResolvedValue(mockSessions);
    });

    it('renders session list', async () => {
      render(
        <SessionList
          onSessionSelect={vi.fn()}
          onSessionDelete={vi.fn()}
          onCreateSession={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chat Session')).toBeInTheDocument();
        expect(screen.getByText('Another Chat')).toBeInTheDocument();
      });
    });

    it('handles session selection', async () => {
      const mockOnSessionSelect = vi.fn();
      const user = userEvent.setup();

      render(
        <SessionList
          onSessionSelect={mockOnSessionSelect}
          onSessionDelete={vi.fn()}
          onCreateSession={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chat Session')).toBeInTheDocument();
      });

      const sessionCard = screen.getByText('Test Chat Session').closest('div');
      await user.click(sessionCard!);

      expect(mockOnSessionSelect).toHaveBeenCalledWith('session-1');
    });

    it('handles new session creation', async () => {
      const mockOnCreateSession = vi.fn();
      const user = userEvent.setup();

      render(
        <SessionList
          onSessionSelect={vi.fn()}
          onSessionDelete={vi.fn()}
          onCreateSession={mockOnCreateSession}
        />
      );

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      expect(mockOnCreateSession).toHaveBeenCalled();
    });

    it('handles session search', async () => {
      const user = userEvent.setup();

      render(
        <SessionList
          onSessionSelect={vi.fn()}
          onSessionDelete={vi.fn()}
          onCreateSession={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chat Session')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'Another');

      expect(screen.getByText('Another Chat')).toBeInTheDocument();
      expect(screen.queryByText('Test Chat Session')).not.toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('handles complete chat flow', async () => {
      const mockSendMessage = vi.fn();
      const mockSearchDocuments = vi.fn().mockResolvedValue(mockDocumentContext);

      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        sendMessage: mockSendMessage,
        searchDocuments: mockSearchDocuments,
      });

      const user = userEvent.setup();
      render(
        <EnhancedChatInterface
          availableDocuments={['doc-1', 'doc-2']}
          initialDocumentContext={['doc-1']}
        />
      );

      // Send a message
      const input = screen.getByPlaceholderText('Ask a question about your documents...');
      await user.type(input, 'What is the main topic?');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith('What is the main topic?', {
        documentIds: ['doc-1'],
        enableStreaming: true,
        searchContext: true,
      });
    });

    it('handles streaming responses', async () => {
      const streamingMessage: ChatMessageWithState = {
        ...mockMessages[1],
        isStreaming: true,
        message: 'I am currently typing...',
      };

      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        messages: [mockMessages[0], streamingMessage],
        isStreaming: true,
      });

      render(<EnhancedChatInterface />);

      expect(screen.getByText('AI is typing...')).toBeInTheDocument();
      expect(screen.getByText('I am currently typing...')).toBeInTheDocument();
    });

    it('handles error states', () => {
      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        error: 'Failed to connect to AI service',
      });

      render(<EnhancedChatInterface />);

      expect(screen.getByText('Failed to connect to AI service')).toBeInTheDocument();
    });

    it('handles document context updates', async () => {
      const mockSetDocumentContext = vi.fn();
      const mockSearchDocuments = vi.fn().mockResolvedValue(mockDocumentContext);

      mockUseEnhancedChat.mockReturnValue({
        ...mockUseEnhancedChat(),
        setDocumentContext: mockSetDocumentContext,
        searchDocuments: mockSearchDocuments,
      });

      const user = userEvent.setup();
      render(
        <EnhancedChatInterface
          availableDocuments={['doc-1', 'doc-2', 'doc-3']}
          initialDocumentContext={['doc-1']}
        />
      );

      // Open document panel
      const documentButton = screen.getByRole('button', { name: /documents/i });
      await user.click(documentButton);

      // Select additional document
      const showAllButton = screen.getByRole('button', { name: /show all/i });
      await user.click(showAllButton);

      // This would trigger document context update
      expect(mockSetDocumentContext).toHaveBeenCalled();
    });
  });
});