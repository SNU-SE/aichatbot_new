/**
 * Enhanced Chat Hook
 * React hook for managing enhanced AI chat with document context
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedChatService } from '@/services/enhancedChatService';
import { supabase } from '@/integrations/supabase/client';
import {
  ChatSession,
  ChatMessageWithState,
  DocumentContext,
  SendMessageOptions,
  UseChatReturn,
  AIResponseChunk,
} from '@/types/enhanced-chat';
import {
  EnhancedChatMessage,
  MessageRole,
} from '@/types/enhanced-rag';
import { useToast } from '@/hooks/use-toast';

/**
 * Enhanced chat hook
 */
export function useEnhancedChat(initialSessionId?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageWithState[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentContext, setDocumentContextState] = useState<string[]>([]);
  
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageRef = useRef<string>('');

  /**
   * Load session and messages
   */
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const session = await enhancedChatService.loadSession(sessionId);
      const sessionMessages = await enhancedChatService.getSessionMessages(sessionId);

      setCurrentSession(session);
      setMessages(sessionMessages.map(msg => ({ ...msg, isLoading: false })));
      setDocumentContextState(session.documentContext);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Create new session
   */
  const createSession = useCallback(async (title?: string): Promise<ChatSession> => {
    try {
      setIsLoading(true);
      setError(null);

      const session = await enhancedChatService.createSession(title, documentContext);
      setCurrentSession(session);
      setMessages([]);

      return session;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [documentContext, toast]);

  /**
   * Send message with streaming support
   */
  const sendMessage = useCallback(async (
    message: string,
    options: SendMessageOptions = {}
  ) => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setError(null);
      
      // Add user message immediately (optimistic update)
      const userMessage: ChatMessageWithState = {
        id: `temp-${Date.now()}`,
        userId: currentSession.userId,
        sessionId: currentSession.id,
        message,
        role: MessageRole.USER,
        documentReferences: [],
        createdAt: new Date(),
        isLoading: false,
      };

      setMessages(prev => [...prev, userMessage]);

      // Add placeholder for AI response
      const aiMessageId = `temp-ai-${Date.now()}`;
      const aiMessage: ChatMessageWithState = {
        id: aiMessageId,
        userId: currentSession.userId,
        sessionId: currentSession.id,
        message: '',
        role: MessageRole.ASSISTANT,
        documentReferences: [],
        createdAt: new Date(),
        isLoading: true,
        isStreaming: true,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsStreaming(true);
      streamingMessageRef.current = '';

      // Handle streaming response
      const handleChunk = (chunk: AIResponseChunk) => {
        if (chunk.error) {
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, isLoading: false, isStreaming: false, isError: true }
              : msg
          ));
          setError(chunk.error);
          return;
        }

        if (!chunk.isComplete) {
          // Update streaming content
          streamingMessageRef.current += chunk.content;
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, message: streamingMessageRef.current }
              : msg
          ));
        } else {
          // Complete response
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? {
                  ...msg,
                  message: streamingMessageRef.current,
                  documentReferences: chunk.sources || [],
                  confidenceScore: chunk.confidence,
                  isLoading: false,
                  isStreaming: false,
                }
              : msg
          ));
          setIsStreaming(false);
        }
      };

      // Send message with streaming
      if (options.enableStreaming !== false) {
        await enhancedChatService.sendMessageStreaming(
          message,
          currentSession.id,
          handleChunk,
          options
        );
      } else {
        // Non-streaming response
        const response = await enhancedChatService.sendMessage(
          message,
          currentSession.id,
          options
        );

        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? {
                ...msg,
                message: response.content,
                documentReferences: response.sources,
                confidenceScore: response.confidence,
                processingTimeMs: response.processingTime,
                isLoading: false,
                isStreaming: false,
              }
            : msg
        ));
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsStreaming(false);
      
      // Update AI message to show error
      setMessages(prev => prev.map(msg => 
        msg.role === MessageRole.ASSISTANT && msg.isLoading
          ? { ...msg, isLoading: false, isStreaming: false, isError: true }
          : msg
      ));

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [currentSession, toast]);

  /**
   * Retry failed message
   */
  const retryMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.role !== MessageRole.USER) return;

    // Find and remove the failed AI response
    const nextMessage = messages[messageIndex + 1];
    if (nextMessage && nextMessage.role === MessageRole.ASSISTANT) {
      setMessages(prev => prev.filter(msg => msg.id !== nextMessage.id));
    }

    // Resend the message
    await sendMessage(message.message);
  }, [messages, sendMessage]);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Delete session
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await enhancedChatService.deleteSession(sessionId);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        setDocumentContextState([]);
      }

      toast({
        title: 'Success',
        description: 'Session deleted successfully',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [currentSession, toast]);

  /**
   * Set document context
   */
  const setDocumentContext = useCallback(async (documentIds: string[]) => {
    setDocumentContextState(documentIds);
    
    if (currentSession) {
      try {
        await enhancedChatService.updateSessionDocumentContext(
          currentSession.id,
          documentIds
        );
        setCurrentSession(prev => prev ? { ...prev, documentContext: documentIds } : null);
      } catch (err) {
        console.error('Failed to update session document context:', err);
      }
    }
  }, [currentSession]);

  /**
   * Search documents for context
   */
  const searchDocuments = useCallback(async (query: string): Promise<DocumentContext[]> => {
    try {
      return await enhancedChatService.searchDocumentContext(
        query,
        documentContext.length > 0 ? documentContext : undefined
      );
    } catch (err) {
      console.error('Failed to search documents:', err);
      return [];
    }
  }, [documentContext]);

  /**
   * Export session
   */
  const exportSession = useCallback(async (format: 'json' | 'markdown' | 'pdf'): Promise<Blob> => {
    if (!currentSession) {
      throw new Error('No active session to export');
    }

    return await enhancedChatService.exportSession(currentSession.id, format);
  }, [currentSession]);

  /**
   * Get session history
   */
  const getSessionHistory = useCallback(async (): Promise<ChatSession[]> => {
    return await enhancedChatService.getUserSessions();
  }, []);

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    if (!currentSession) return;

    const channel = supabase
      .channel(`enhanced_chat_${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'enhanced_chat_logs',
          filter: `session_id=eq.${currentSession.id}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Avoid duplicates from our own messages
          const messageExists = messages.some(msg => 
            msg.message === newMessage.message && 
            msg.role === newMessage.role &&
            Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.created_at).getTime()) < 5000
          );

          if (!messageExists) {
            const chatMessage: ChatMessageWithState = {
              id: newMessage.id,
              userId: newMessage.user_id,
              sessionId: newMessage.session_id,
              message: newMessage.message,
              role: newMessage.role as MessageRole,
              documentReferences: newMessage.document_references || [],
              confidenceScore: newMessage.confidence_score,
              processingTimeMs: newMessage.processing_time_ms,
              createdAt: new Date(newMessage.created_at),
              isLoading: false,
            };

            setMessages(prev => [...prev, chatMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession, messages]);

  /**
   * Load initial session
   */
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    }
  }, [initialSessionId, loadSession]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    messages,
    currentSession,
    isLoading,
    isStreaming,
    error,
    
    // Actions
    sendMessage,
    retryMessage,
    clearMessages,
    createSession,
    loadSession,
    deleteSession,
    
    // Document context
    setDocumentContext,
    searchDocuments,
    
    // Utilities
    exportSession,
    getSessionHistory,
  };
}