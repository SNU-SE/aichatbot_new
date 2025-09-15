import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Lightbulb,
  Target,
  Users,
  FileText,
  Search,
  MessageSquare,
  Clock,
  Zap
} from 'lucide-react';

interface InsightsPanelProps {
  data: any;
  dateRange: { from: Date; to: Date };
}

interface Insight {
  type: string;
  title: string;
  description: string;
  actionable: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  data?: any;
  impact?: 'high' | 'medium' | 'low';
  category?: 'performance' | 'content' | 'engagement' | 'usage';
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ data, dateRange }) => {
  if (!data) {
    return <div>Loading insights...</div>;
  }

  // Generate comprehensive insights
  const insights = generateInsights(data);
  
  // Categorize insights
  const insightsByCategory = insights.reduce((acc: any, insight: Insight) => {
    const category = insight.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(insight);
    return acc;
  }, {});

  // Get icon for insight type
  const getInsightIcon = (type: string, severity?: string) => {
    const iconClass = "h-5 w-5";
    
    switch (type) {
      case 'performance':
        return severity === 'warning' ? 
          <AlertTriangle className={`${iconClass} text-yellow-500`} /> :
          <Zap className={`${iconClass} text-blue-500`} />;
      case 'content_gap':
        return <FileText className={`${iconClass} text-red-500`} />;
      case 'engagement':
        return <Users className={`${iconClass} text-green-500`} />;
      case 'document_popularity':
        return <TrendingUp className={`${iconClass} text-blue-500`} />;
      case 'search_trends':
        return <Search className={`${iconClass} text-purple-500`} />;
      case 'chat_patterns':
        return <MessageSquare className={`${iconClass} text-indigo-500`} />;
      default:
        return <Info className={`${iconClass} text-gray-500`} />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  // Get impact badge
  const getImpactBadge = (impact?: string) => {
    switch (impact) {
      case 'high':
        return <Badge variant="destructive">High Impact</Badge>;
      case 'medium':
        return <Badge variant="outline">Medium Impact</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Impact</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Insights Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            AI-Generated Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            Actionable recommendations based on your analytics data
          </p>
        </div>
        
        <Badge variant="outline" className="text-xs">
          {insights.length} insights found
        </Badge>
      </div>

      {/* Quick Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Executive Summary
          </CardTitle>
          <CardDescription>
            Key findings and recommendations for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">
                {insights.filter(i => i.severity === 'success').length}
              </div>
              <p className="text-sm text-green-600">Positive Trends</p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">
                {insights.filter(i => i.severity === 'warning').length}
              </div>
              <p className="text-sm text-yellow-600">Areas for Improvement</p>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">
                {insights.filter(i => i.severity === 'error').length}
              </div>
              <p className="text-sm text-red-600">Critical Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights by Category */}
      {Object.entries(insightsByCategory).map(([category, categoryInsights]: [string, any]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="capitalize flex items-center">
              {getCategoryIcon(category)}
              {category.replace('_', ' ')} Insights
            </CardTitle>
            <CardDescription>
              {getCategoryDescription(category)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryInsights.map((insight: Insight, index: number) => (
                <Alert key={index} className={getSeverityColor(insight.severity)}>
                  <div className="flex items-start space-x-3">
                    {getInsightIcon(insight.type, insight.severity)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <AlertTitle className="text-base">{insight.title}</AlertTitle>
                        {getImpactBadge(insight.impact)}
                      </div>
                      
                      <AlertDescription className="text-sm">
                        {insight.description}
                      </AlertDescription>
                      
                      <div className="bg-white/50 p-3 rounded border-l-4 border-blue-400">
                        <p className="text-sm font-medium text-blue-800 mb-1">
                          💡 Recommended Action:
                        </p>
                        <p className="text-sm text-blue-700">
                          {insight.actionable}
                        </p>
                      </div>
                      
                      {/* Additional data visualization */}
                      {insight.data && renderInsightData(insight)}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* No Insights State */}
      {insights.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
            <p className="text-muted-foreground mb-4">
              Not enough data to generate meaningful insights for this period.
            </p>
            <p className="text-sm text-muted-foreground">
              Try selecting a longer date range or wait for more user activity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper function to get category icon
function getCategoryIcon(category: string) {
  const iconClass = "h-5 w-5 mr-2";
  
  switch (category) {
    case 'performance':
      return <Zap className={`${iconClass} text-blue-500`} />;
    case 'content':
      return <FileText className={`${iconClass} text-green-500`} />;
    case 'engagement':
      return <Users className={`${iconClass} text-purple-500`} />;
    case 'usage':
      return <TrendingUp className={`${iconClass} text-orange-500`} />;
    default:
      return <Info className={`${iconClass} text-gray-500`} />;
  }
}

// Helper function to get category description
function getCategoryDescription(category: string) {
  switch (category) {
    case 'performance':
      return 'System performance and response time analysis';
    case 'content':
      return 'Content gaps and document effectiveness';
    case 'engagement':
      return 'User engagement and interaction patterns';
    case 'usage':
      return 'Usage patterns and feature adoption';
    default:
      return 'General insights and recommendations';
  }
}

// Helper function to render additional insight data
function renderInsightData(insight: Insight) {
  if (!insight.data) return null;
  
  switch (insight.type) {
    case 'document_popularity':
      return (
        <div className="mt-3 p-3 bg-white rounded border">
          <p className="text-xs font-medium text-gray-600 mb-2">Top Documents:</p>
          <div className="space-y-1">
            {insight.data.slice(0, 3).map(([docId, views]: [string, number], index: number) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="truncate">Document {docId.slice(0, 8)}...</span>
                <span className="font-medium">{views} views</span>
              </div>
            ))}
          </div>
        </div>
      );
      
    case 'content_gap':
      return (
        <div className="mt-3 p-3 bg-white rounded border">
          <p className="text-xs font-medium text-gray-600 mb-2">Failed Queries:</p>
          <div className="space-y-1">
            {insight.data.slice(0, 3).map((query: string, index: number) => (
              <div key={index} className="text-xs bg-red-50 px-2 py-1 rounded">
                "{query}"
              </div>
            ))}
          </div>
        </div>
      );
      
    default:
      return null;
  }
}

// Main insights generation function
function generateInsights(data: any): Insight[] {
  const insights: Insight[] = [];
  
  // Document usage insights
  if (data.documentUsage?.length > 0) {
    const viewCounts = data.documentUsage.reduce((acc: any, usage: any) => {
      acc[usage.document_id] = (acc[usage.document_id] || 0) + 1;
      return acc;
    }, {});

    const mostViewed = Object.entries(viewCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 3);

    if (mostViewed.length > 0) {
      insights.push({
        type: 'document_popularity',
        title: 'Document Engagement Leaders',
        description: `${mostViewed.length} documents are driving most of your user engagement`,
        actionable: 'Consider creating similar content or promoting these high-performing documents',
        severity: 'success',
        impact: 'medium',
        category: 'content',
        data: mostViewed
      });
    }
  }

  // Search performance insights
  if (data.searchAnalytics?.length > 0) {
    const avgResponseTime = data.searchAnalytics.reduce((acc: any, s: any) => acc + (s.response_time_ms || 0), 0) / data.searchAnalytics.length;
    
    if (avgResponseTime > 2000) {
      insights.push({
        type: 'performance',
        title: 'Search Performance Needs Attention',
        description: `Average search response time is ${Math.round(avgResponseTime)}ms, which may impact user experience`,
        actionable: 'Optimize search indexes, consider caching frequently searched content, or review document chunking strategy',
        severity: 'warning',
        impact: 'high',
        category: 'performance'
      });
    } else if (avgResponseTime < 1000) {
      insights.push({
        type: 'performance',
        title: 'Excellent Search Performance',
        description: `Search response time averages ${Math.round(avgResponseTime)}ms - users are getting fast results`,
        actionable: 'Maintain current optimization strategies and monitor for any performance degradation',
        severity: 'success',
        impact: 'low',
        category: 'performance'
      });
    }

    const failedSearches = data.searchAnalytics.filter((s: any) => s.results_count === 0);
    if (failedSearches.length > data.searchAnalytics.length * 0.2) {
      insights.push({
        type: 'content_gap',
        title: 'High No-Results Search Rate',
        description: `${Math.round(failedSearches.length / data.searchAnalytics.length * 100)}% of searches return no results`,
        actionable: 'Review failed search queries to identify content gaps and consider adding relevant documents',
        severity: 'error',
        impact: 'high',
        category: 'content',
        data: failedSearches.slice(0, 10).map((s: any) => s.query_text)
      });
    }
  }

  // Chat engagement insights
  if (data.chatAnalytics?.length > 0) {
    const avgSessionDuration = data.chatAnalytics.reduce((acc: any, c: any) => acc + (c.session_duration_minutes || 0), 0) / data.chatAnalytics.length;
    
    if (avgSessionDuration < 2) {
      insights.push({
        type: 'engagement',
        title: 'Short Chat Sessions Detected',
        description: `Average chat session duration is only ${avgSessionDuration.toFixed(1)} minutes`,
        actionable: 'Improve chat interface usability, enhance document quality, or provide better conversation starters',
        severity: 'warning',
        impact: 'medium',
        category: 'engagement'
      });
    } else if (avgSessionDuration > 10) {
      insights.push({
        type: 'engagement',
        title: 'High User Engagement',
        description: `Users spend an average of ${avgSessionDuration.toFixed(1)} minutes in chat sessions`,
        actionable: 'Leverage this high engagement by gathering user feedback and expanding successful content areas',
        severity: 'success',
        impact: 'medium',
        category: 'engagement'
      });
    }

    // Document reference patterns
    const sessionsWithDocs = data.chatAnalytics.filter((c: any) => (c.documents_referenced || []).length > 0);
    const docUsageRate = sessionsWithDocs.length / data.chatAnalytics.length;
    
    if (docUsageRate < 0.3) {
      insights.push({
        type: 'chat_patterns',
        title: 'Low Document Integration in Chats',
        description: `Only ${Math.round(docUsageRate * 100)}% of chat sessions reference uploaded documents`,
        actionable: 'Improve document discovery, enhance search relevance, or provide better document recommendations',
        severity: 'warning',
        impact: 'medium',
        category: 'usage'
      });
    }
  }

  // Usage pattern insights
  const totalActivity = (data.summary?.totalDocumentViews || 0) + (data.summary?.totalSearches || 0) + (data.summary?.totalChatSessions || 0);
  
  if (totalActivity < 10) {
    insights.push({
      type: 'usage',
      title: 'Low Overall Activity',
      description: 'System usage is below expected levels for meaningful insights',
      actionable: 'Focus on user onboarding, feature promotion, or content quality improvements',
      severity: 'info',
      impact: 'low',
      category: 'usage'
    });
  }

  // Language diversity insights
  if (data.searchAnalytics?.some((s: any) => s.language && s.language !== 'en')) {
    const languages = new Set(data.searchAnalytics.map((s: any) => s.language).filter(Boolean));
    insights.push({
      type: 'usage',
      title: 'Multi-Language Usage Detected',
      description: `Users are searching in ${languages.size} different languages`,
      actionable: 'Consider expanding multi-language support and document translation capabilities',
      severity: 'info',
      impact: 'medium',
      category: 'usage'
    });
  }

  return insights;
}