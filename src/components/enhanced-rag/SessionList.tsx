/**
 * Session List Component
 * Component for managing chat sessions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  Edit, 
  X,
  Calendar,
  FileText,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChatSession } from '@/types/enhanced-chat';
import { enhancedChatService } from '@/services/enhancedChatService';
import { cn } from '@/lib/utils';

/**
 * Session List Props
 */
interface SessionListProps {
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onCreateSession: () => void;
  currentSessionId?: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Session Item Component
 */
interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onEdit,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  return (
    <>
      <Card 
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/50',
          isActive && 'ring-2 ring-primary bg-muted/50'
        )}
        onClick={onSelect}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h4 className="font-medium text-sm truncate">
                  {session.title}
                </h4>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(session.lastActivity)}</span>
                {session.messageCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{session.messageCount} messages</span>
                  </>
                )}
              </div>

              {session.documentContext.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    {session.documentContext.length} doc(s)
                  </Badge>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <>
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{session.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/**
 * Session List Component
 */
export const SessionList: React.FC<SessionListProps> = ({
  onSessionSelect,
  onSessionDelete,
  onCreateSession,
  currentSessionId,
  onClose,
  className = '',
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load sessions
   */
  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userSessions = await enhancedChatService.getUserSessions();
      setSessions(userSessions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(errorMessage);
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filter sessions based on search query
   */
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Group sessions by date
   */
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const now = new Date();
    const sessionDate = new Date(session.lastActivity);
    const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

    let groupKey: string;
    if (diffDays === 0) {
      groupKey = 'Today';
    } else if (diffDays === 1) {
      groupKey = 'Yesterday';
    } else if (diffDays < 7) {
      groupKey = 'This Week';
    } else if (diffDays < 30) {
      groupKey = 'This Month';
    } else {
      groupKey = 'Older';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  /**
   * Handle session selection
   */
  const handleSessionSelect = (sessionId: string) => {
    onSessionSelect(sessionId);
  };

  /**
   * Handle session deletion
   */
  const handleSessionDelete = async (sessionId: string) => {
    try {
      await onSessionDelete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  /**
   * Load sessions on mount
   */
  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Chat Sessions</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Controls */}
      <div className="px-6 pb-4 space-y-3">
        {/* New Session Button */}
        <Button onClick={onCreateSession} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 px-6 pb-6">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading sessions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-destructive mb-2">Error loading sessions</div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadSessions}>
                Try Again
              </Button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium mb-1">
                {searchQuery ? 'No matching sessions' : 'No chat sessions'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Create your first chat session to get started'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                <div key={groupName}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
                    {groupName}
                  </h3>
                  <div className="space-y-2">
                    {groupSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === currentSessionId}
                        onSelect={() => handleSessionSelect(session.id)}
                        onDelete={() => handleSessionDelete(session.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default SessionList;