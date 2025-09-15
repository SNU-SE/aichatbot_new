/**
 * Enhanced Chat Service
 * Service for managing AI chat with document context and streaming
 */

import { supabase } from '@/integrations/supabase/client';
import { vectorSearchService } from './vectorSearchService';
import {
  EnhancedChatMessage,
  MessageRole,
  DocumentReference,
  SearchResult,
} from '@/types/enhanced-rag';
import {
  ChatSession,
  StreamingChatMessage,
  EnhancedAIResponse,
  AIResponseChunk,
  DocumentContext,
  Citation,
  ResponseQuality,
  SendMessageOptions,
} from '@/types/enhanced-chat';
import { AnalyticsService } from './analyticsService';

/**
 * Enhanced Chat Service Class
 */
export class EnhancedChatService {
  private static instance: EnhancedChatService;
  private baseUrl: string;
  private currentSession: ChatSession | null = null;
  private messageCache = new Map<string, EnhancedChatMessage>();

  private constructor() {
    this.baseUrl = `${supabase.supabaseUrl}/functions/v1`;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnhancedChatService {
    if (!EnhancedChatService.instance) {
      EnhancedChatService.instance = new EnhancedChatService();
    }
    return EnhancedChatService.instance;
  }

  /**
   * Get authorization headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session found');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new chat session
   */
  public async createSession(title?: string, documentContext?: string[]): Promise<ChatSession> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sessionData = {
        user_id: user.id,
        title: title || `Chat ${new Date().toLocaleDateString()}`,
        document_context: documentContext || [],
        metadata: {},
      };

      const { data, error } = await supabase
        .from('enhanced_chat_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) throw error;

      const session: ChatSession = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        messageCount: 0,
        lastActivity: new Date(data.created_at),
        documentContext: data.document_context || [],
        metadata: data.metadata || {},
      };

      this.currentSession = session;
      return session;

    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  /**
   * Load an existing chat session
   */
  public async loadSession(sessionId: string): Promise<ChatSession> {
    try {
      const { data, error } = await supabase
        .from('enhanced_chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const session: ChatSession = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        messageCount: data.message_count || 0,
        lastActivity: new Date(data.last_activity || data.updated_at),
        documentContext: data.document_context || [],
        metadata: data.metadata || {},
      };

      this.currentSession = session;
      return session;

    } catch (error) {
      console.error('Error loading chat session:', error);
      throw error;
    }
  }

  /**
   * Get session messages
   */
  public async getSessionMessages(sessionId: string): Promise<EnhancedChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('enhanced_chat_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        sessionId: msg.session_id,
        message: msg.message,
        role: msg.role as MessageRole,
        documentReferences: msg.document_references || [],
        confidenceScore: msg.confidence_score,
        processingTimeMs: msg.processing_time_ms,
        createdAt: new Date(msg.created_at),
      }));

    } catch (error) {
      console.error('Error fetching session messages:', error);
      throw error;
    }
  }

  /**
   * Search for document context based on query
   */
  public async searchDocumentContext(
    query: string,
    documentIds?: string[],
    maxResults: number = 5
  ): Promise<DocumentContext[]> {
    try {
      const searchResults = await vectorSearchService.search(query, {
        documentIds,
        maxResults,
        minSimilarity: 0.7,
        includeMetadata: true,
      });

      // Group results by document
      const documentMap = new Map<string, DocumentContext>();

      for (const result of searchResults.results) {
        if (!documentMap.has(result.documentId)) {
          documentMap.set(result.documentId, {
            documentId: result.documentId,
            documentTitle: result.documentTitle,
            relevantChunks: [],
            totalRelevanceScore: 0,
          });
        }

        const docContext = documentMap.get(result.documentId)!;
        docContext.relevantChunks.push({
          chunkId: result.chunkId,
          content: result.content,
          pageNumber: result.pageNumber,
          relevanceScore: result.similarity,
          highlight: result.highlight,
        });
        docContext.totalRelevanceScore += result.similarity;
      }

      // Sort by total relevance score
      return Array.from(documentMap.values())
        .sort((a, b) => b.totalRelevanceScore - a.totalRelevanceScore);

    } catch (error) {
      console.error('Error searching document context:', error);
      return [];
    }
  }

  /**
   * Generate citations from document references
   */
  private generateCitations(content: string, sources: DocumentReference[]): Citation[] {
    const citations: Citation[] = [];
    let citationId = 1;

    for (const source of sources) {
      // Look for references to the document in the content
      const patterns = [
        new RegExp(`\\b${source.documentTitle}\\b`, 'gi'),
        new RegExp(`\\bpage\\s+${source.pageNumber}\\b`, 'gi'),
        new RegExp(`\\b${source.excerpt.substring(0, 20)}\\b`, 'gi'),
      ];

      for (const pattern of patterns) {
        const matches = Array.from(content.matchAll(pattern));
        for (const match of matches) {
          if (match.index !== undefined) {
            citations.push({
              id: `cite-${citationId++}`,
              documentReference: source,
              citationText: match[0],
              position: {
                start: match.index,
                end: match.index + match[0].length,
              },
            });
          }
        }
      }
    }

    return citations;
  }

  /**
   * Calculate response quality metrics
   */
  private calculateResponseQuality(
    response: string,
    sources: DocumentReference[],
    processingTime: number
  ): ResponseQuality {
    // Simple heuristic-based quality calculation
    const hasRelevantSources = sources.length > 0;
    const avgSourceRelevance = sources.length > 0 
      ? sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length 
      : 0;
    
    const responseLength = response.length;
    const completeness = Math.min(responseLength / 500, 1); // Assume 500 chars is complete
    
    const clarity = response.includes('?') ? 0.8 : 1; // Questions might indicate uncertainty
    
    const confidence = hasRelevantSources ? avgSourceRelevance : 0.5;
    
    const overall = (confidence + avgSourceRelevance + completeness + clarity) / 4;

    return {
      confidence,
      sourceRelevance: avgSourceRelevance,
      completeness,
      clarity,
      overall,
    };
  }

  /**
   * Send a message and get AI response
   */
  public async sendMessage(
    message: string,
    sessionId: string,
    options: SendMessageOptions = {}
  ): Promise<EnhancedAIResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Search for document context if enabled
      let documentContext: DocumentContext[] = [];
      if (options.searchContext !== false) {
        documentContext = await this.searchDocumentContext(
          message,
          options.documentIds,
          5
        );
      }

      // Get conversation history
      const conversationHistory = await this.getSessionMessages(sessionId);
      const recentHistory = conversationHistory
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.role === MessageRole.USER ? 'user' : 'assistant',
          content: msg.message,
        }));

      // Prepare enhanced message with context
      let enhancedMessage = message;
      if (documentContext.length > 0) {
        const contextInfo = documentContext
          .flatMap(doc => doc.relevantChunks)
          .map(chunk => `${chunk.content} (Page ${chunk.pageNumber || 'N/A'})`)
          .join('\n\n');
        
        enhancedMessage = `Context from documents:
${contextInfo}

User question: ${message}`;
      }

      // Call AI service
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/ai-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: enhancedMessage,
          sessionId,
          conversationHistory: recentHistory,
          documentContext: documentContext.length > 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      // Create document references from context
      const sources: DocumentReference[] = documentContext.flatMap(doc =>
        doc.relevantChunks.map(chunk => ({
          documentId: doc.documentId,
          documentTitle: doc.documentTitle,
          chunkId: chunk.chunkId,
          pageNumber: chunk.pageNumber,
          relevanceScore: chunk.relevanceScore,
          excerpt: chunk.content.substring(0, 200),
          confidence: chunk.relevanceScore,
        }))
      );

      // Generate citations
      const citations = this.generateCitations(data.response, sources);

      // Calculate quality metrics
      const quality = this.calculateResponseQuality(data.response, sources, processingTime);

      // Save messages to database
      await this.saveMessage({
        userId: this.currentSession?.userId || '',
        sessionId,
        message,
        role: MessageRole.USER,
        documentReferences: [],
        processingTimeMs: 0,
      });

      await this.saveMessage({
        userId: this.currentSession?.userId || '',
        sessionId,
        message: data.response,
        role: MessageRole.ASSISTANT,
        documentReferences: sources,
        confidenceScore: quality.overall,
        processingTimeMs: processingTime,
      });

      return {
        content: data.response,
        sources,
        citations,
        confidence: quality.overall,
        processingTime,
        sessionId,
        searchQuery: message,
        searchResults: documentContext.length,
        modelUsed: data.modelUsed,
        tokensUsed: data.tokensUsed,
      };

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send message with streaming response
   */
  public async sendMessageStreaming(
    message: string,
    sessionId: string,
    onChunk: (chunk: AIResponseChunk) => void,
    options: SendMessageOptions = {}
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      
      // Search for document context
      const documentContext = await this.searchDocumentContext(
        message,
        options.documentIds,
        5
      );

      // Get conversation history
      const conversationHistory = await this.getSessionMessages(sessionId);
      const recentHistory = conversationHistory
        .slice(-10)
        .map(msg => ({
          role: msg.role === MessageRole.USER ? 'user' : 'assistant',
          content: msg.message,
        }));

      // Prepare enhanced message with context
      let enhancedMessage = message;
      if (documentContext.length > 0) {
        const contextInfo = documentContext
          .flatMap(doc => doc.relevantChunks)
          .map(chunk => `${chunk.content} (Page ${chunk.pageNumber || 'N/A'})`)
          .join('\n\n');
        
        enhancedMessage = `Context from documents:
${contextInfo}

User question: ${message}`;
      }

      // Call streaming AI service
      const response = await fetch(`${this.baseUrl}/ai-chat-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: enhancedMessage,
          sessionId,
          conversationHistory: recentHistory,
          documentContext: documentContext.length > 0,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';
      const sources: DocumentReference[] = documentContext.flatMap(doc =>
        doc.relevantChunks.map(chunk => ({
          documentId: doc.documentId,
          documentTitle: doc.documentTitle,
          chunkId: chunk.chunkId,
          pageNumber: chunk.pageNumber,
          relevanceScore: chunk.relevanceScore,
          excerpt: chunk.content.substring(0, 200),
          confidence: chunk.relevanceScore,
        }))
      );

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Final chunk with complete response
            const citations = this.generateCitations(fullContent, sources);
            const quality = this.calculateResponseQuality(fullContent, sources, 0);
            
            onChunk({
              content: fullContent,
              isComplete: true,
              sources,
              citations,
              confidence: quality.overall,
            });

            // Save complete messages
            await this.saveMessage({
              userId: this.currentSession?.userId || '',
              sessionId,
              message,
              role: MessageRole.USER,
              documentReferences: [],
              processingTimeMs: 0,
            });

            await this.saveMessage({
              userId: this.currentSession?.userId || '',
              sessionId,
              message: fullContent,
              role: MessageRole.ASSISTANT,
              documentReferences: sources,
              confidenceScore: quality.overall,
              processingTimeMs: 0,
            });

            break;
          }

          // Parse streaming chunk
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  onChunk({
                    content: data.content,
                    isComplete: false,
                  });
                }
              } catch (parseError) {
                console.error('Error parsing streaming chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error in streaming message:', error);
      onChunk({
        content: '',
        isComplete: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Save message to database
   */
  private async saveMessage(message: Omit<EnhancedChatMessage, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('enhanced_chat_logs')
        .insert([{
          user_id: message.userId,
          session_id: message.sessionId,
          message: message.message,
          role: message.role,
          document_references: message.documentReferences,
          confidence_score: message.confidenceScore,
          processing_time_ms: message.processingTimeMs,
        }]);

      if (error) throw error;

    } catch (error) {
      console.error('Error saving message:', error);
      // Don't throw here to avoid breaking the chat flow
    }
  }

  /**
   * Delete a chat session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('enhanced_chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }

    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Get user's chat sessions
   */
  public async getUserSessions(): Promise<ChatSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('enhanced_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map(session => ({
        id: session.id,
        userId: session.user_id,
        title: session.title,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
        messageCount: session.message_count || 0,
        lastActivity: new Date(session.last_activity || session.updated_at),
        documentContext: session.document_context || [],
        metadata: session.metadata || {},
      }));

    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }

  /**
   * Update session document context
   */
  public async updateSessionDocumentContext(
    sessionId: string,
    documentIds: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('enhanced_chat_sessions')
        .update({
          document_context: documentIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      if (this.currentSession?.id === sessionId) {
        this.currentSession.documentContext = documentIds;
      }

    } catch (error) {
      console.error('Error updating session document context:', error);
      throw error;
    }
  }

  /**
   * Export session as different formats
   */
  public async exportSession(sessionId: string, format: 'json' | 'markdown' | 'pdf'): Promise<Blob> {
    try {
      const session = await this.loadSession(sessionId);
      const messages = await this.getSessionMessages(sessionId);

      if (format === 'json') {
        const exportData = {
          session,
          messages,
          exportedAt: new Date().toISOString(),
        };
        return new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
      }

      if (format === 'markdown') {
        let markdown = `# ${session.title}\n\n`;
        markdown += `**Created:** ${session.createdAt.toLocaleDateString()}\n`;
        markdown += `**Messages:** ${messages.length}\n\n`;

        for (const message of messages) {
          const role = message.role === MessageRole.USER ? 'User' : 'Assistant';
          markdown += `## ${role}\n\n${message.message}\n\n`;
          
          if (message.documentReferences.length > 0) {
            markdown += `**Sources:**\n`;
            for (const ref of message.documentReferences) {
              markdown += `- ${ref.documentTitle} (Page ${ref.pageNumber || 'N/A'})\n`;
            }
            markdown += '\n';
          }
        }

        return new Blob([markdown], { type: 'text/markdown' });
      }

      throw new Error(`Export format ${format} not implemented`);

    } catch (error) {
      console.error('Error exporting session:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  public getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  /**
   * Clear message cache
   */
  public clearCache(): void {
    this.messageCache.clear();
  }
}

// Export singleton instance
export const enhancedChatService = EnhancedChatService.getInstance();