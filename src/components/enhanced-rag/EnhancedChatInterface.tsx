/**
 * Enhanced Chat Interface Component
 * Main chat interface with document context and streaming support
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  FileText, 
  Settings, 
  Download,
  Trash2,
  Plus,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useEnhancedChat } from '@/hooks/useEnhancedChat';
import { EnhancedChatInterfaceProps, ChatSettings } from '@/types/enhanced-chat';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { DocumentContextPanel } from './DocumentContextPanel';
import { SessionList } from './SessionList';
import { useToast } from '@/hooks/use-toast';

/**
 * Enhanced Chat Interface Component
 */
export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  sessionId: initialSessionId,
  availableDocuments = [],
  initialDocumentContext = [],
  settings: initialSettings,
  onSessionChange,
  onMessageSent,
  onDocumentContextChange,
  className = '',
}) => {
  const {
    messages,
    currentSession,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    retryMessage,
    clearMessages,
    createSession,
    loadSession,
    deleteSession,
    setDocumentContext,
    searchDocuments,
    exportSession,
    getSessionHistory,
  } = useEnhancedChat(initialSessionId);

  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(initialDocumentContext);
  const [documentContextData, setDocumentContextData] = useState<any[]>([]);
  const [settings, setSettings] = useState<ChatSettings>({
    maxMessages: 100,
    enableStreaming: true,
    enableDocumentContext: true,
    enableCitations: true,
    confidenceThreshold: 0.7,
    maxDocumentContext: 5,
    autoSave: true,
    theme: 'light',
    ...initialSettings,
  });

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Handle new session creation
   */
  const handleCreateSession = async () => {
    try {
      const session = await createSession();
      onSessionChange?.(session);
      setShowSessionList(false);
      toast({
        title: 'Success',
        description: 'New chat session created',
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  /**
   * Handle session selection
   */
  const handleSessionSelect = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      setShowSessionList(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  /**
   * Handle session deletion
   */
  const handleSessionDelete = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast({
        title: 'Success',
        description: 'Session deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  /**
   * Handle message sending
   */
  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message, {
        documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        enableStreaming: settings.enableStreaming,
        searchContext: settings.enableDocumentContext,
      });

      // Notify parent component
      if (onMessageSent && currentSession) {
        onMessageSent({
          id: `temp-${Date.now()}`,
          userId: currentSession.userId,
          sessionId: currentSession.id,
          message,
          role: 'user' as any,
          documentReferences: [],
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  /**
   * Handle document selection change
   */
  const handleDocumentSelectionChange = async (documentIds: string[]) => {
    setSelectedDocuments(documentIds);
    await setDocumentContext(documentIds);
    onDocumentContextChange?.(documentIds);

    // Update document context data
    if (documentIds.length > 0) {
      try {
        const contextData = await searchDocuments('');
        setDocumentContextData(contextData);
      } catch (error) {
        console.error('Failed to update document context:', error);
      }
    } else {
      setDocumentContextData([]);
    }
  };

  /**
   * Handle document search
   */
  const handleDocumentSearch = async (query: string) => {
    try {
      const results = await searchDocuments(query);
      setDocumentContextData(results);
    } catch (error) {
      console.error('Failed to search documents:', error);
    }
  };

  /**
   * Handle session export
   */
  const handleExportSession = async (format: 'json' | 'markdown' | 'pdf') => {
    if (!currentSession) return;

    try {
      const blob = await exportSession(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSession.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Session exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Failed to export session:', error);
      toast({
        title: 'Error',
        description: 'Failed to export session',
        variant: 'destructive',
      });
    }
  };

  /**
   * Scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Update document context when session changes
   */
  useEffect(() => {
    if (currentSession) {
      setSelectedDocuments(currentSession.documentContext);
      onSessionChange?.(currentSession);
    }
  }, [currentSession, onSessionChange]);

  /**
   * Create initial session if none exists
   */
  useEffect(() => {
    if (!currentSession && !initialSessionId) {
      handleCreateSession();
    }
  }, [currentSession, initialSessionId]);

  return (
    <div className={`flex h-full bg-background ${className}`}>
      {/* Session List Sidebar */}
      {showSessionList && (
        <div className="w-80 border-r bg-card">
          <SessionList
            onSessionSelect={handleSessionSelect}
            onSessionDelete={handleSessionDelete}
            onCreateSession={handleCreateSession}
            currentSessionId={currentSession?.id}
            onClose={() => setShowSessionList(false)}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSessionList(!showSessionList)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-semibold">
                {currentSession?.title || 'Enhanced AI Chat'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedDocuments.length > 0 
                  ? `${selectedDocuments.length} document(s) selected`
                  : 'No documents selected'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Document Context Toggle */}
            <Button
              variant={showDocumentPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDocumentPanel(!showDocumentPanel)}
            >
              <FileText className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Documents</span>
              {selectedDocuments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedDocuments.length}
                </Badge>
              )}
            </Button>

            {/* Session Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateSession}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportSession('markdown')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportSession('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearMessages}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border-b">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 flex min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <ChatMessageList
                messages={messages}
                isLoading={isLoading}
                isStreaming={isStreaming}
                onRetry={retryMessage}
                showSources={settings.enableCitations}
                showConfidence={true}
              />
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Chat Input */}
            <div className="border-t bg-card p-4">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isLoading || isStreaming}
                placeholder="Ask a question about your documents..."
                enableDocumentSelection={settings.enableDocumentContext}
                selectedDocuments={selectedDocuments}
                onDocumentSelectionChange={handleDocumentSelectionChange}
                availableDocuments={availableDocuments}
              />
            </div>
          </div>

          {/* Document Context Panel */}
          {showDocumentPanel && (
            <div className="w-80 border-l bg-card">
              <DocumentContextPanel
                documentContext={documentContextData}
                availableDocuments={availableDocuments}
                selectedDocuments={selectedDocuments}
                onDocumentSelect={handleDocumentSelectionChange}
                onDocumentSearch={handleDocumentSearch}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatInterface;