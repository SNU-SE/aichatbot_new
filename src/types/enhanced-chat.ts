/**
 * Enhanced Chat Interface Types
 * Types specific to the enhanced AI chat interface with document context
 */

import { DocumentReference, EnhancedChatMessage, MessageRole } from './enhanced-rag';

// ============================================================================
// CHAT SESSION TYPES
// ============================================================================

/**
 * Chat session interface for managing conversation state
 */
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastActivity: Date;
  documentContext: string[]; // Document IDs that are part of this session
  metadata: ChatSessionMetadata;
}

/**
 * Chat session metadata
 */
export interface ChatSessionMetadata {
  tags?: string[];
  isArchived?: boolean;
  isPinned?: boolean;
  customFields?: Record<string, any>;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Enhanced chat message with streaming support
 */
export interface StreamingChatMessage extends Omit<EnhancedChatMessage, 'id' | 'createdAt'> {
  id?: string;
  isStreaming?: boolean;
  isComplete?: boolean;
  streamingContent?: string;
  createdAt?: Date;
  error?: string;
}

/**
 * Message with UI state
 */
export interface ChatMessageWithState extends EnhancedChatMessage {
  isLoading?: boolean;
  isError?: boolean;
  isRetrying?: boolean;
  localId?: string; // For optimistic updates
}

// ============================================================================
// DOCUMENT CONTEXT TYPES
// ============================================================================

/**
 * Document context for AI responses
 */
export interface DocumentContext {
  documentId: string;
  documentTitle: string;
  relevantChunks: DocumentContextChunk[];
  totalRelevanceScore: number;
}

/**
 * Document chunk with context information
 */
export interface DocumentContextChunk {
  chunkId: string;
  content: string;
  pageNumber?: number;
  relevanceScore: number;
  highlight?: string;
}

/**
 * Citation information for AI responses
 */
export interface Citation {
  id: string;
  documentReference: DocumentReference;
  citationText: string;
  position: {
    start: number;
    end: number;
  };
}

// ============================================================================
// AI RESPONSE TYPES
// ============================================================================

/**
 * Enhanced AI response with streaming and confidence
 */
export interface EnhancedAIResponse {
  content: string;
  sources: DocumentReference[];
  citations: Citation[];
  confidence: number;
  processingTime: number;
  sessionId: string;
  searchQuery?: string;
  searchResults?: number;
  modelUsed?: string;
  tokensUsed?: number;
}

/**
 * Streaming AI response chunk
 */
export interface AIResponseChunk {
  content: string;
  isComplete: boolean;
  sources?: DocumentReference[];
  citations?: Citation[];
  confidence?: number;
  error?: string;
}

/**
 * AI response quality indicators
 */
export interface ResponseQuality {
  confidence: number;
  sourceRelevance: number;
  completeness: number;
  clarity: number;
  overall: number;
}

// ============================================================================
// CHAT INTERFACE STATE
// ============================================================================

/**
 * Chat interface state
 */
export interface ChatInterfaceState {
  messages: ChatMessageWithState[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  documentContext: DocumentContext[];
  availableDocuments: string[];
  searchQuery: string;
  selectedDocuments: string[];
}

/**
 * Chat input state
 */
export interface ChatInputState {
  message: string;
  isComposing: boolean;
  attachments: File[];
  selectedDocuments: string[];
  searchContext: boolean;
}

// ============================================================================
// CHAT SETTINGS
// ============================================================================

/**
 * Chat configuration settings
 */
export interface ChatSettings {
  maxMessages: number;
  enableStreaming: boolean;
  enableDocumentContext: boolean;
  enableCitations: boolean;
  confidenceThreshold: number;
  maxDocumentContext: number;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Search settings for document context
 */
export interface DocumentSearchSettings {
  maxResults: number;
  minSimilarity: number;
  includeMetadata: boolean;
  searchScope: 'all' | 'selected' | 'folder';
  hybridSearch: boolean;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Chat events for real-time updates
 */
export type ChatEvent = 
  | { type: 'message_received'; payload: EnhancedChatMessage }
  | { type: 'message_streaming'; payload: { messageId: string; chunk: string } }
  | { type: 'message_complete'; payload: { messageId: string } }
  | { type: 'typing_start'; payload: { userId: string } }
  | { type: 'typing_stop'; payload: { userId: string } }
  | { type: 'session_updated'; payload: ChatSession }
  | { type: 'error'; payload: { error: string; messageId?: string } };

// ============================================================================
// HOOK INTERFACES
// ============================================================================

/**
 * Chat hook return type
 */
export interface UseChatReturn {
  // State
  messages: ChatMessageWithState[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (message: string, options?: SendMessageOptions) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  createSession: (title?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  
  // Document context
  setDocumentContext: (documentIds: string[]) => void;
  searchDocuments: (query: string) => Promise<DocumentContext[]>;
  
  // Utilities
  exportSession: (format: 'json' | 'markdown' | 'pdf') => Promise<Blob>;
  getSessionHistory: () => Promise<ChatSession[]>;
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  documentIds?: string[];
  enableStreaming?: boolean;
  searchContext?: boolean;
  retryCount?: number;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Enhanced chat interface props
 */
export interface EnhancedChatInterfaceProps {
  sessionId?: string;
  availableDocuments?: string[];
  initialDocumentContext?: string[];
  settings?: Partial<ChatSettings>;
  onSessionChange?: (session: ChatSession | null) => void;
  onMessageSent?: (message: EnhancedChatMessage) => void;
  onDocumentContextChange?: (documentIds: string[]) => void;
  className?: string;
}

/**
 * Message component props
 */
export interface MessageComponentProps {
  message: ChatMessageWithState;
  onRetry?: (messageId: string) => void;
  onCitationClick?: (citation: Citation) => void;
  showSources?: boolean;
  showConfidence?: boolean;
  className?: string;
}

/**
 * Document context panel props
 */
export interface DocumentContextPanelProps {
  documentContext: DocumentContext[];
  availableDocuments: string[];
  selectedDocuments: string[];
  onDocumentSelect: (documentIds: string[]) => void;
  onDocumentSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Chat input props
 */
export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, options?: SendMessageOptions) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  maxLength?: number;
  enableAttachments?: boolean;
  enableDocumentSelection?: boolean;
  selectedDocuments?: string[];
  onDocumentSelectionChange?: (documentIds: string[]) => void;
  className?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Message export format
 */
export type MessageExportFormat = 'json' | 'markdown' | 'pdf' | 'csv';

/**
 * Chat theme
 */
export type ChatTheme = 'light' | 'dark' | 'auto';

/**
 * Message status
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error' | 'retrying';

/**
 * Confidence level
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very-high';

/**
 * Source type
 */
export type SourceType = 'document' | 'web' | 'knowledge-base' | 'previous-conversation';