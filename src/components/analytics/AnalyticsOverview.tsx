import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, FileText, Search, MessageSquare } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface AnalyticsOverviewProps {
  data: any;
  dateRange: { from: Date; to: Date };
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ data, dateRange }) => {
  if (!data) {
    return <div>Loading overview...</div>;
  }

  // Calculate daily activity for the chart
  const dailyActivity = eachDayOfInterval({
    start: dateRange.from,
    end: dateRange.to
  }).map(date => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const dayData = data.dailySummary?.find((d: any) => d.date === dayStr);
    
    return {
      date: dayStr,
      documents: dayData?.total_document_views || 0,
      searches: dayData?.total_searches || 0,
      chats: dayData?.total_chat_sessions || 0
    };
  });

  // Calculate trends (compare with previous period)
  const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const previousPeriodStart = subDays(dateRange.from, periodDays);
  
  // Mock trend calculations (in real implementation, you'd fetch previous period data)
  const trends = {
    documents: { value: 12, direction: 'up' as const },
    searches: { value: -5, direction: 'down' as const },
    chats: { value: 8, direction: 'up' as const }
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Activity</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalDocumentViews || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(trends.documents.direction)}
              <span className={getTrendColor(trends.documents.direction)}>
                {Math.abs(trends.documents.value)}% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Activity</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalSearches || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(trends.searches.direction)}
              <span className={getTrendColor(trends.searches.direction)}>
                {Math.abs(trends.searches.value)}% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Activity</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalChatSessions || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(trends.chats.direction)}
              <span className={getTrendColor(trends.chats.direction)}>
                {Math.abs(trends.chats.value)}% from last period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Documents</CardTitle>
          <CardDescription>
            Documents with the highest engagement in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.popularDocuments?.slice(0, 5).map((doc: any, index: number) => (
              <div key={doc.document_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{doc.document_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.view_count} views
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {doc.view_count} interactions
                </Badge>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">
                No document data available for this period
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Top Search Queries</CardTitle>
          <CardDescription>
            Most frequently searched terms and their success rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.searchTrends?.slice(0, 8).map((search: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{search.query_text}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {search.search_count} searches
                    </Badge>
                    <Badge variant={search.avg_results_count > 0 ? "default" : "destructive"}>
                      {Math.round(search.avg_results_count)} avg results
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={Math.min((search.search_count / (data.searchTrends[0]?.search_count || 1)) * 100, 100)} 
                  className="h-2"
                />
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">
                No search data available for this period
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Performance</CardTitle>
            <CardDescription>Average response times and success rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Response Time</span>
              <span className="text-2xl font-bold">
                {Math.round(data.summary?.avgResponseTime || 0)}ms
              </span>
            </div>
            <Progress 
              value={Math.min((data.summary?.avgResponseTime || 0) / 50, 100)} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Target: &lt;2000ms for optimal user experience
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>Session duration and interaction quality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Avg Session Duration</span>
              <span className="text-2xl font-bold">
                {Math.round((data.chatAnalytics?.reduce((acc: number, chat: any) => 
                  acc + (chat.session_duration_minutes || 0), 0) || 0) / 
                  (data.chatAnalytics?.length || 1))}min
              </span>
            </div>
            <Progress 
              value={Math.min(((data.chatAnalytics?.reduce((acc: number, chat: any) => 
                acc + (chat.session_duration_minutes || 0), 0) || 0) / 
                (data.chatAnalytics?.length || 1)) / 10 * 100, 100)} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Longer sessions indicate better engagement
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};