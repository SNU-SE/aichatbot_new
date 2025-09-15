import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AnalyticsEvent = {
  document_id?: string;
  user_id?: string;
  action_type: 'view' | 'search' | 'chat_reference' | 'download';
  session_id?: string;
  metadata?: Record<string, any>;
};

type SearchAnalyticsEvent = {
  user_id?: string;
  query_text: string;
  query_type: 'semantic' | 'keyword' | 'hybrid';
  results_count: number;
  response_time_ms?: number;
  documents_found?: string[];
  language?: string;
  session_id?: string;
  metadata?: Record<string, any>;
};

type ChatAnalyticsEvent = {
  session_id: string;
  user_id?: string;
  message_count?: number;
  documents_referenced?: string[];
  topics?: string[];
  satisfaction_score?: number;
  session_duration_minutes?: number;
  metadata?: Record<string, any>;
};

export class AnalyticsService {
  // Track document usage events
  static async trackDocumentUsage(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_usage_analytics')
        .insert({
          document_id: event.document_id,
          user_id: event.user_id,
          action_type: event.action_type,
          session_id: event.session_id,
          metadata: event.metadata || {}
        });

      if (error) {
        console.error('Error tracking document usage:', error);
      }
    } catch (error) {
      console.error('Failed to track document usage:', error);
    }
  }

  // Track search analytics
  static async trackSearch(event: SearchAnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('search_analytics')
        .insert({
          user_id: event.user_id,
          query_text: event.query_text,
          query_type: event.query_type,
          results_count: event.results_count,
          response_time_ms: event.response_time_ms,
          documents_found: event.documents_found || [],
          language: event.language,
          session_id: event.session_id,
          metadata: event.metadata || {}
        });

      if (error) {
        console.error('Error tracking search:', error);
      }
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }

  // Track chat analytics
  static async trackChatSession(event: ChatAnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_analytics')
        .insert({
          session_id: event.session_id,
          user_id: event.user_id,
          message_count: event.message_count || 1,
          documents_referenced: event.documents_referenced || [],
          topics: event.topics || [],
          satisfaction_score: event.satisfaction_score,
          session_duration_minutes: event.session_duration_minutes,
          metadata: event.metadata || {}
        });

      if (error) {
        console.error('Error tracking chat session:', error);
      }
    } catch (error) {
      console.error('Failed to track chat session:', error);
    }
  }

  // Get document usage analytics
  static async getDocumentUsageAnalytics(
    documentId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      let query = supabase
        .from('document_usage_analytics')
        .select(`
          *,
          documents:document_id (
            title,
            filename
          )
        `);

      if (documentId) {
        query = query.eq('document_id', documentId);
      }

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document usage analytics:', error);
      throw error;
    }
  }

  // Get search analytics
  static async getSearchAnalytics(startDate?: Date, endDate?: Date) {
    try {
      let query = supabase
        .from('search_analytics')
        .select('*');

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      throw error;
    }
  }

  // Get chat analytics
  static async getChatAnalytics(startDate?: Date, endDate?: Date) {
    try {
      let query = supabase
        .from('chat_analytics')
        .select(`
          *,
          enhanced_chat_sessions:session_id (
            title,
            message_count,
            created_at
          )
        `);

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching chat analytics:', error);
      throw error;
    }
  }

  // Get daily analytics summary
  static async getDailyAnalyticsSummary(startDate?: Date, endDate?: Date) {
    try {
      let query = supabase
        .from('daily_analytics_summary')
        .select('*');

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching daily analytics summary:', error);
      throw error;
    }
  }

  // Get popular documents
  static async getPopularDocuments(limit: number = 10, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .rpc('get_popular_documents', {
          start_date: startDate.toISOString(),
          result_limit: limit
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching popular documents:', error);
      throw error;
    }
  }

  // Get search trends
  static async getSearchTrends(limit: number = 20, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .rpc('get_search_trends', {
          start_date: startDate.toISOString(),
          result_limit: limit
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching search trends:', error);
      throw error;
    }
  }

  // Generate insights report
  static async generateInsightsReport(days: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        documentUsage,
        searchAnalytics,
        chatAnalytics,
        dailySummary,
        popularDocs,
        searchTrends
      ] = await Promise.all([
        this.getDocumentUsageAnalytics(undefined, startDate, endDate),
        this.getSearchAnalytics(startDate, endDate),
        this.getChatAnalytics(startDate, endDate),
        this.getDailyAnalyticsSummary(startDate, endDate),
        this.getPopularDocuments(10, days),
        this.getSearchTrends(20, days)
      ]);

      return {
        period: { startDate, endDate, days },
        summary: {
          totalDocumentViews: documentUsage?.length || 0,
          totalSearches: searchAnalytics?.length || 0,
          totalChatSessions: chatAnalytics?.length || 0,
          avgResponseTime: searchAnalytics?.reduce((acc, s) => acc + (s.response_time_ms || 0), 0) / (searchAnalytics?.length || 1),
        },
        documentUsage,
        searchAnalytics,
        chatAnalytics,
        dailySummary,
        popularDocuments: popularDocs,
        searchTrends,
        insights: this.generateInsights({
          documentUsage,
          searchAnalytics,
          chatAnalytics,
          popularDocs,
          searchTrends
        })
      };
    } catch (error) {
      console.error('Error generating insights report:', error);
      throw error;
    }
  }

  // Generate actionable insights
  private static generateInsights(data: any) {
    const insights = [];

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
          title: 'Most Popular Documents',
          description: `Top ${mostViewed.length} documents are getting the most attention`,
          actionable: 'Consider creating similar content or updating these documents',
          data: mostViewed
        });
      }
    }

    // Search pattern insights
    if (data.searchAnalytics?.length > 0) {
      const avgResponseTime = data.searchAnalytics.reduce((acc: any, s: any) => acc + (s.response_time_ms || 0), 0) / data.searchAnalytics.length;
      
      if (avgResponseTime > 2000) {
        insights.push({
          type: 'performance',
          title: 'Search Performance Issue',
          description: `Average search response time is ${Math.round(avgResponseTime)}ms`,
          actionable: 'Consider optimizing search indexes or document chunking',
          severity: 'warning'
        });
      }

      const failedSearches = data.searchAnalytics.filter((s: any) => s.results_count === 0);
      if (failedSearches.length > data.searchAnalytics.length * 0.2) {
        insights.push({
          type: 'content_gap',
          title: 'High No-Results Rate',
          description: `${Math.round(failedSearches.length / data.searchAnalytics.length * 100)}% of searches return no results`,
          actionable: 'Review failed search queries to identify content gaps',
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
          title: 'Short Chat Sessions',
          description: `Average chat session is only ${avgSessionDuration.toFixed(1)} minutes`,
          actionable: 'Consider improving chat interface or document quality',
          severity: 'info'
        });
      }
    }

    return insights;
  }
}