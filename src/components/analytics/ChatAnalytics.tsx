import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Clock, 
  Users, 
  TrendingUp,
  FileText,
  Star,
  BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatAnalyticsProps {
  data: any;
  dateRange: { from: Date; to: Date };
}

export const ChatAnalytics: React.FC<ChatAnalyticsProps> = ({ data, dateRange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'duration' | 'messages' | 'recent'>('duration');

  if (!data) {
    return <div>Loading chat analytics...</div>;
  }

  const chatData = data.chatAnalytics || [];
  
  // Process chat analytics
  const chatStats = {
    totalSessions: chatData.length,
    totalMessages: chatData.reduce((acc: number, chat: any) => acc + (chat.message_count || 0), 0),
    avgDuration: chatData.reduce((acc: number, chat: any) => acc + (chat.session_duration_minutes || 0), 0) / (chatData.length || 1),
    avgMessages: chatData.reduce((acc: number, chat: any) => acc + (chat.message_count || 0), 0) / (chatData.length || 1),
    avgSatisfaction: chatData.filter((c: any) => c.satisfaction_score).reduce((acc: number, chat: any) => acc + (chat.satisfaction_score || 0), 0) / (chatData.filter((c: any) => c.satisfaction_score).length || 1),
    documentsReferenced: new Set(chatData.flatMap((chat: any) => chat.documents_referenced || [])).size
  };

  // Process session data with enhanced chat sessions info
  const sessionData = chatData.map((chat: any) => ({
    ...chat,
    session_title: chat.enhanced_chat_sessions?.title || `Session ${chat.session_id.slice(0, 8)}`,
    session_created: chat.enhanced_chat_sessions?.created_at || chat.timestamp,
    total_messages: chat.enhanced_chat_sessions?.message_count || chat.message_count || 0,
    documents_count: (chat.documents_referenced || []).length,
    topics_count: (chat.topics || []).length,
    engagement_score: calculateEngagementScore(chat)
  }));

  function calculateEngagementScore(chat: any): number {
    let score = 0;
    
    // Duration factor (longer sessions = higher engagement)
    const duration = chat.session_duration_minutes || 0;
    score += Math.min(duration / 10, 5); // Max 5 points for 10+ minutes
    
    // Message count factor
    const messages = chat.message_count || 0;
    score += Math.min(messages / 5, 3); // Max 3 points for 5+ messages
    
    // Document references factor
    const docRefs = (chat.documents_referenced || []).length;
    score += Math.min(docRefs, 2); // Max 2 points for document usage
    
    // Satisfaction factor
    if (chat.satisfaction_score) {
      score += chat.satisfaction_score; // 1-5 points
    }
    
    return Math.round(score * 10) / 10;
  }

  // Filter and sort sessions
  const filteredSessions = sessionData
    .filter((session: any) => 
      session.session_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.topics || []).some((topic: string) => 
        topic.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'duration':
          return (b.session_duration_minutes || 0) - (a.session_duration_minutes || 0);
        case 'messages':
          return (b.total_messages || 0) - (a.total_messages || 0);
        case 'recent':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        default:
          return 0;
      }
    });

  // Topic analysis
  const topicAnalysis = chatData.reduce((acc: any, chat: any) => {
    (chat.topics || []).forEach((topic: string) => {
      if (!acc[topic]) {
        acc[topic] = {
          topic,
          count: 0,
          sessions: new Set(),
          avgDuration: 0,
          totalDuration: 0
        };
      }
      acc[topic].count++;
      acc[topic].sessions.add(chat.session_id);
      acc[topic].totalDuration += (chat.session_duration_minutes || 0);
      acc[topic].avgDuration = acc[topic].totalDuration / acc[topic].count;
    });
    return acc;
  }, {});

  const topTopics = Object.values(topicAnalysis)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  const getEngagementLevel = (score: number) => {
    if (score >= 8) return { label: 'Excellent', color: 'text-green-500', variant: 'default' as const };
    if (score >= 6) return { label: 'Good', color: 'text-blue-500', variant: 'secondary' as const };
    if (score >= 4) return { label: 'Fair', color: 'text-yellow-500', variant: 'outline' as const };
    return { label: 'Low', color: 'text-red-500', variant: 'destructive' as const };
  };

  const getSatisfactionColor = (score: number) => {
    if (score >= 4) return 'text-green-500';
    if (score >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Chat Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chat Performance</h3>
          <p className="text-sm text-muted-foreground">
            Analyze conversation patterns, engagement, and user satisfaction
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <MessageSquare className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="duration">Sort by Duration</option>
            <option value="messages">Sort by Messages</option>
            <option value="recent">Sort by Recent</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatStats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Chat conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(chatStats.avgDuration * 10) / 10}min
            </div>
            <p className="text-xs text-muted-foreground">
              Average session length
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(chatStats.avgMessages * 10) / 10}
            </div>
            <p className="text-xs text-muted-foreground">
              Messages per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(chatStats.avgSatisfaction * 10) / 10}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Average user rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Session Duration Distribution</CardTitle>
            <CardDescription>How long users spend in conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Quick (0-2 min)', range: [0, 2], color: 'text-red-500' },
              { label: 'Short (2-5 min)', range: [2, 5], color: 'text-yellow-500' },
              { label: 'Medium (5-15 min)', range: [5, 15], color: 'text-blue-500' },
              { label: 'Long (15+ min)', range: [15, Infinity], color: 'text-green-500' }
            ].map((category) => {
              const count = chatData.filter((c: any) => {
                const duration = c.session_duration_minutes || 0;
                return duration >= category.range[0] && duration < category.range[1];
              }).length;
              const percentage = (count / (chatStats.totalSessions || 1)) * 100;
              
              return (
                <div key={category.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={category.color}>{category.label}</span>
                    <span>{count} ({Math.round(percentage)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Usage in Chats</CardTitle>
            <CardDescription>How often documents are referenced</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {chatStats.documentsReferenced}
              </div>
              <p className="text-sm text-muted-foreground">
                Unique documents referenced
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sessions with Documents</span>
                <span>
                  {chatData.filter((c: any) => (c.documents_referenced || []).length > 0).length}
                </span>
              </div>
              <Progress 
                value={(chatData.filter((c: any) => (c.documents_referenced || []).length > 0).length / (chatStats.totalSessions || 1)) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Analysis</CardTitle>
          <CardDescription>
            Detailed breakdown of individual chat sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session: any) => {
                const engagement = getEngagementLevel(session.engagement_score);
                
                return (
                  <div key={session.session_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{session.session_title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(session.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={engagement.variant}>
                          {engagement.label}
                        </Badge>
                        {session.satisfaction_score && (
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            {session.satisfaction_score}/5
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Engagement Score Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Engagement Score</span>
                        <span className={engagement.color}>
                          {session.engagement_score}/10
                        </span>
                      </div>
                      <Progress 
                        value={(session.engagement_score / 10) * 100} 
                        className="h-2"
                      />
                    </div>

                    {/* Session Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{Math.round((session.session_duration_minutes || 0) * 10) / 10} min</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{session.total_messages} messages</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{session.documents_count} docs</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{session.topics_count} topics</span>
                      </div>
                    </div>

                    {/* Topics */}
                    {session.topics && session.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {session.topics.slice(0, 5).map((topic: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {session.topics.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{session.topics.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No chat sessions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? `No sessions match "${searchTerm}"`
                    : "No chat activity data available for this period"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topic Analysis */}
      {topTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Topics</CardTitle>
            <CardDescription>
              Most discussed topics in chat sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTopics.map((topic: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium">{topic.topic}</span>
                      <p className="text-sm text-muted-foreground">
                        {topic.sessions.size} sessions, avg {Math.round(topic.avgDuration * 10) / 10} min
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {topic.count} mentions
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};