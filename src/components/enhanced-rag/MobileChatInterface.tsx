/**
 * Mobile Chat Interface Component
 * Mobile-optimized chat interface with touch-friendly interactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Send, 
  Paperclip, 
  FileText, 
  Mic, 
  MicOff,
  MoreVertical,
  Copy,
  Share,
  Bookmark,
  ChevronDown,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileLayout, useMobileNavigation } from './MobileLayout';
import { useEnhancedChat } from '@/hooks/useEnhancedChat';
import { EnhancedChatMessage } from '@/types/enhanced-chat';
import { cn } from '@/lib/utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MobileChatInterfaceProps {
  sessionId?: string;
  availableDocuments?: any[];
  onBack?: () => void;
  className?: string;
}

interface MobileChatMessageProps {
  message: EnhancedChatMessage;
  isStreaming?: boolean;
  onRetry?: () => void;
  onCopy?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
}

// ============================================================================
// MOBILE CHAT MESSAGE COMPONENT
// ============================================================================

const MobileChatMessage: React.FC<MobileChatMessageProps> = ({
  message,
  isStreaming = false,
  onRetry,
  onCopy,
  onShare,
  onBookmark
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const isUser = message.role === 'user';
  const hasDocumentReferences = message.documentReferences && message.documentReferences.length > 0;

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 relative",
        isUser 
          ? "bg-primary text-primary-foreground ml-4" 
          : "bg-muted mr-4"
      )}>
        {/* Message Content */}
        <div className="whitespace-pre-wrap break-words">
          {message.message}
          {isStreaming && (
            <span className="inline-block w-2 h-5 bg-current animate-pulse ml-1" />
          )}
        </div>

        {/* Document References */}
        {hasDocumentReferences && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSources(!showSources)}
              className={cn(
                "text-xs p-1 h-auto",
                isUser ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-3 w-3 mr-1" />
              {message.documentReferences!.length} source{message.documentReferences!.length !== 1 ? 's' : ''}
              <ChevronDown className={cn(
                "h-3 w-3 ml-1 transition-transform",
                showSources && "rotate-180"
              )} />
            </Button>
            
            {showSources && (
              <div className="mt-2 space-y-1">
                {message.documentReferences!.map((ref, index) => (
                  <div key={index} className={cn(
                    "text-xs p-2 rounded border",
                    isUser 
                      ? "bg-primary-foreground/10 border-primary-foreground/20" 
                      : "bg-background border-border"
                  )}>
                    <div className="font-medium truncate">{ref.documentTitle}</div>
                    {ref.pageNumber && (
                      <div className="text-xs opacity-70">Page {ref.pageNumber}</div>
                    )}
                    {ref.relevanceScore && (
                      <div className="text-xs opacity-70">
                        Relevance: {Math.round(ref.relevanceScore * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Actions */}
        {!isUser && (
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-current/20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs p-1 h-auto text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBookmark}>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Bookmark
                </DropdownMenuItem>
                {onRetry && (
                  <DropdownMenuItem onClick={onRetry}>
                    Retry
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          "text-xs mt-1 opacity-70",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MOBILE CHAT INPUT COMPONENT
// ============================================================================

interface MobileChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  selectedDocuments?: string[];
  onDocumentSelect?: () => void;
  placeholder?: string;
}

const MobileChatInput: React.FC<MobileChatInputProps> = ({
  onSend,
  isLoading = false,
  selectedDocuments = [],
  onDocumentSelect,
  placeholder = "Type a message..."
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording functionality
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      {/* Document Selection */}
      {selectedDocuments.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Documents:
          </span>
          {selectedDocuments.map((docId, index) => (
            <Badge key={docId} variant="secondary" className="text-xs whitespace-nowrap">
              Document {index + 1}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDocumentSelect}
            className="text-xs whitespace-nowrap"
          >
            Change
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAttachments(!showAttachments)}
          className="p-2 flex-shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
            disabled={isLoading}
          />
          
          {/* Voice Recording Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRecording}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-2",
              isRecording && "text-red-500"
            )}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          size="sm"
          className="p-3 rounded-full flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Attachment Options */}
      {showAttachments && (
        <div className="flex space-x-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onDocumentSelect}
            className="text-xs"
          >
            <FileText className="h-4 w-4 mr-1" />
            Documents
          </Button>
          {/* Add more attachment options here */}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MobileChatInterface: React.FC<MobileChatInterfaceProps> = ({
  sessionId,
  availableDocuments = [],
  onBack,
  className = ''
}) => {
  const {
    messages,
    currentSession,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    retryMessage,
  } = useEnhancedChat(sessionId);

  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message, {
        documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        enableStreaming: true,
        searchContext: true,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCopyMessage = (message: EnhancedChatMessage) => {
    navigator.clipboard.writeText(message.message);
  };

  const handleShareMessage = (message: EnhancedChatMessage) => {
    if (navigator.share) {
      navigator.share({
        title: 'AI Chat Message',
        text: message.message,
      });
    }
  };

  const handleBookmarkMessage = (message: EnhancedChatMessage) => {
    // TODO: Implement bookmark functionality
    console.log('Bookmark message:', message.id);
  };

  return (
    <MobileLayout
      title={currentSession?.title || 'AI Chat'}
      subtitle={selectedDocuments.length > 0 ? `${selectedDocuments.length} documents selected` : 'No documents selected'}
      showBackButton={!!onBack}
      onBack={onBack}
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border-b">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-1">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center py-12">
                <div className="space-y-2">
                  <div className="text-lg font-medium text-muted-foreground">
                    Start a conversation
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ask questions about your documents
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MobileChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming && message.id === messages[messages.length - 1]?.id}
                  onRetry={() => retryMessage(message.id)}
                  onCopy={() => handleCopyMessage(message)}
                  onShare={() => handleShareMessage(message)}
                  onBookmark={() => handleBookmarkMessage(message)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <MobileChatInput
          onSend={handleSendMessage}
          isLoading={isLoading || isStreaming}
          selectedDocuments={selectedDocuments}
          onDocumentSelect={() => setShowDocumentSelector(true)}
          placeholder="Ask about your documents..."
        />
      </div>

      {/* Document Selector Sheet */}
      <Sheet open={showDocumentSelector} onOpenChange={setShowDocumentSelector}>
        <SheetContent side="bottom" className="h-[80vh]">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select Documents</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDocumentSelector(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {availableDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedDocuments.includes(doc.id) 
                        ? "bg-primary/10 border-primary" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => {
                      setSelectedDocuments(prev => 
                        prev.includes(doc.id)
                          ? prev.filter(id => id !== doc.id)
                          : [...prev, doc.id]
                      );
                    }}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {doc.filename}
                      </div>
                    </div>
                    {selectedDocuments.includes(doc.id) && (
                      <Badge variant="default" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <Button
                onClick={() => setShowDocumentSelector(false)}
                className="w-full"
              >
                Done ({selectedDocuments.length} selected)
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
};

export default MobileChatInterface;