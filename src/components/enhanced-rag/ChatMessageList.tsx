/**
 * Chat Message List Component
 * Displays chat messages with document references and streaming support
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Bot, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { MessageComponentProps } from '@/types/enhanced-chat';
import { ChatMessageWithState } from '@/types/enhanced-chat';
import { MessageRole } from '@/types/enhanced-rag';
import { cn } from '@/lib/utils';

/**
 * Individual message component
 */
export const ChatMessage: React.FC<MessageComponentProps> = ({
  message,
  onRetry,
  onCitationClick,
  showSources = true,
  showConfidence = true,
  className = '',
}) => {
  const isUser = message.role === MessageRole.USER;
  const isAssistant = message.role === MessageRole.ASSISTANT;
  const hasError = message.isError;
  const isLoading = message.isLoading;
  const isStreaming = message.isStreaming;

  /**
   * Get confidence level color
   */
  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get confidence level text
   */
  const getConfidenceText = (confidence?: number): string => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  /**
   * Format processing time
   */
  const formatProcessingTime = (timeMs?: number): string => {
    if (!timeMs) return '';
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        'max-w-[80%] space-y-2',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message Bubble */}
        <Card className={cn(
          'relative',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : hasError 
              ? 'bg-destructive/10 border-destructive/20'
              : 'bg-card',
          hasError && 'border-destructive'
        )}>
          <CardContent className="p-3">
            {/* Loading/Streaming Indicator */}
            {(isLoading || isStreaming) && (
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin">
                  <RefreshCw className="h-3 w-3" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {isStreaming ? 'AI is typing...' : 'Processing...'}
                </span>
              </div>
            )}

            {/* Error Indicator */}
            {hasError && (
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Failed to send message
                </span>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(message.id)}
                    className="ml-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            )}

            {/* Message Text */}
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap break-words">
                {message.message}
              </p>
            </div>

            {/* Confidence Score */}
            {showConfidence && isAssistant && message.confidenceScore && (
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-border/50">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">Confidence:</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    getConfidenceColor(message.confidenceScore)
                  )}
                >
                  {getConfidenceText(message.confidenceScore)} 
                  ({Math.round((message.confidenceScore || 0) * 100)}%)
                </Badge>
              </div>
            )}

            {/* Processing Time */}
            {message.processingTimeMs && (
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatProcessingTime(message.processingTimeMs)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Sources */}
        {showSources && isAssistant && message.documentReferences && message.documentReferences.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sources</span>
                <Badge variant="secondary" className="text-xs">
                  {message.documentReferences.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {message.documentReferences.map((ref, index) => (
                  <div
                    key={`${ref.documentId}-${ref.chunkId}-${index}`}
                    className="flex items-start space-x-2 p-2 bg-background rounded border"
                  >
                    <FileText className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium truncate">
                          {ref.documentTitle}
                        </span>
                        {ref.pageNumber && (
                          <Badge variant="outline" className="text-xs">
                            Page {ref.pageNumber}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {Math.round(ref.relevanceScore * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ref.excerpt}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCitationClick?.({
                        id: `cite-${index}`,
                        documentReference: ref,
                        citationText: ref.excerpt,
                        position: { start: 0, end: ref.excerpt.length },
                      })}
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamp */}
        <div className={cn(
          'text-xs text-muted-foreground',
          isUser ? 'text-right' : 'text-left'
        )}>
          {message.createdAt.toLocaleTimeString()}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Chat message list component props
 */
interface ChatMessageListProps {
  messages: ChatMessageWithState[];
  isLoading?: boolean;
  isStreaming?: boolean;
  onRetry?: (messageId: string) => void;
  onCitationClick?: (citation: any) => void;
  showSources?: boolean;
  showConfidence?: boolean;
  className?: string;
}

/**
 * Chat message list component
 */
export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading = false,
  isStreaming = false,
  onRetry,
  onCitationClick,
  showSources = true,
  showConfidence = true,
  className = '',
}) => {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-full text-center space-y-4',
        className
      )}>
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Start a conversation</h3>
          <p className="text-muted-foreground max-w-md">
            Ask questions about your documents and get AI-powered answers with source citations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onRetry={onRetry}
          onCitationClick={onCitationClick}
          showSources={showSources}
          showConfidence={showConfidence}
        />
      ))}
      
      {/* Loading indicator for initial load */}
      {isLoading && messages.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin">
            <RefreshCw className="h-6 w-6 text-muted-foreground" />
          </div>
          <span className="ml-2 text-muted-foreground">Loading messages...</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;