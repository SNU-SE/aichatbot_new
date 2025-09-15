/**
 * Chat Input Component
 * Enhanced input component with document selection and streaming support
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  FileText, 
  X, 
  Loader2,
  Mic,
  MicOff,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInputProps } from '@/types/enhanced-chat';
import { cn } from '@/lib/utils';

/**
 * Chat Input Component
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  value = '',
  onChange,
  onSend,
  isLoading = false,
  isStreaming = false,
  placeholder = 'Type your message...',
  maxLength = 4000,
  enableAttachments = false,
  enableDocumentSelection = true,
  selectedDocuments = [],
  onDocumentSelectionChange,
  availableDocuments = [],
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  /**
   * Handle input change
   */
  const handleInputChange = (newValue: string) => {
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
      onChange?.(newValue);
    }
  };

  /**
   * Handle send message
   */
  const handleSend = () => {
    const message = inputValue.trim();
    if (!message || isLoading || isStreaming) return;

    onSend(message, {
      documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
      enableStreaming: true,
    });

    setInputValue('');
    onChange?.('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /**
   * Handle key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle file attachment
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  /**
   * Remove attachment
   */
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle document selection
   */
  const handleDocumentToggle = (documentId: string) => {
    const newSelection = selectedDocuments.includes(documentId)
      ? selectedDocuments.filter(id => id !== documentId)
      : [...selectedDocuments, documentId];
    
    onDocumentSelectionChange?.(newSelection);
  };

  /**
   * Start voice recording
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        // TODO: Implement speech-to-text conversion
        console.log('Audio recorded:', blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  /**
   * Stop voice recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /**
   * Auto-resize textarea
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  /**
   * Update input value when prop changes
   */
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const canSend = inputValue.trim().length > 0 && !isLoading && !isStreaming;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected Documents */}
      {enableDocumentSelection && selectedDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDocuments.map((docId) => {
            const docName = availableDocuments.find(doc => doc === docId) || docId;
            return (
              <Badge
                key={docId}
                variant="secondary"
                className="flex items-center space-x-1"
              >
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-32">{docName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleDocumentToggle(docId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <Badge
              key={index}
              variant="outline"
              className="flex items-center space-x-1"
            >
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-32">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        {/* Attachment Button */}
        {enableAttachments && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isStreaming}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        )}

        {/* Document Selection Button */}
        {enableDocumentSelection && availableDocuments.length > 0 && (
          <Popover open={showDocumentSelector} onOpenChange={setShowDocumentSelector}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                disabled={isLoading || isStreaming}
                aria-label="Select documents"
              >
                <FileText className="h-4 w-4" />
                {selectedDocuments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedDocuments.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <h4 className="font-medium">Select Documents</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {availableDocuments.map((docId) => (
                      <div key={docId} className="flex items-center space-x-2">
                        <Checkbox
                          id={docId}
                          checked={selectedDocuments.includes(docId)}
                          onCheckedChange={() => handleDocumentToggle(docId)}
                        />
                        <label
                          htmlFor={docId}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                        >
                          {docId}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || isStreaming}
            className="min-h-[44px] max-h-32 resize-none pr-12"
            rows={1}
          />
          
          {/* Character Count */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {inputValue.length}/{maxLength}
          </div>
        </div>

        {/* Voice Recording Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isStreaming}
          className={cn(
            'flex-shrink-0',
            isRecording && 'text-red-500 animate-pulse'
          )}
          aria-label={isRecording ? "Stop recording" : "Start voice recording"}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="sm"
          className="flex-shrink-0"
          aria-label="Send message"
        >
          {isLoading || isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hidden File Input */}
      {enableAttachments && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md"
        />
      )}

      {/* Status Indicator */}
      {(isLoading || isStreaming) && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>
            {isStreaming ? 'AI is responding...' : 'Processing...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;