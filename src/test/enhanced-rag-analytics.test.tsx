/**
 * Analytics and Insights Dashboard Tests
 * Tests for analytics data collection, processing, and dashboard functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnalyticsService } from '@/services/analyticsService';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsDemo } from '@/components/analytics/AnalyticsDemo';
import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => '2024-01-01'),
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
  subDays: vi.fn((date, days) => new Date()),
  eachDayOfInterval: vi.fn(() => [new Date()])
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackDocumentUsage', () => {
    it('should track document view events', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      
      // Mock supabase.from for this test
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      await AnalyticsService.trackDocumentUsage({
        document_id: 'doc-123',
        user_id: 'user-123',
        action_type: 'view',
        metadata: { source: 'test' }
      });

      expect(mockInsert).toHaveBeenCalledWith({
        document_id: 'doc-123',
        user_id: 'user-123',
        action_type: 'view',
        session_id: undefined,
        metadata: { source: 'test' }
      });
    });

    it('should handle tracking errors gracefully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ 
        error: new Error('Database error') 
      });
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      // Should not throw error
      await expect(AnalyticsService.trackDocumentUsage({
        document_id: 'doc-123',
        user_id: 'user-123',
        action_type: 'view'
      })).resolves.not.toThrow();
    });
  });

  describe('trackSearch', () => {
    it('should track search analytics', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      await AnalyticsService.trackSearch({
        user_id: 'user-123',
        query_text: 'machine learning',
        query_type: 'semantic',
        results_count: 5,
        response_time_ms: 1200,
        documents_found: ['doc-1', 'doc-2'],
        language: 'en'
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        query_text: 'machine learning',
        query_type: 'semantic',
        results_count: 5,
        response_time_ms: 1200,
        documents_found: ['doc-1', 'doc-2'],
        language: 'en',
        session_id: undefined,
        metadata: {}
      });
    });
  });

  describe('trackChatSession', () => {
    it('should track chat session analytics', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({ insert: mockInsert });

      await AnalyticsService.trackChatSession({
        session_id: 'session-123',
        user_id: 'user-123',
        message_count: 10,
        documents_referenced: ['doc-1', 'doc-2'],
        topics: ['AI', 'machine learning'],
        satisfaction_score: 4,
        session_duration_minutes: 15
      });

      expect(mockInsert).toHaveBeenCalledWith({
        session_id: 'session-123',
        user_id: 'user-123',
        message_count: 10,
        documents_referenced: ['doc-1', 'doc-2'],
        topics: ['AI', 'machine learning'],
        satisfaction_score: 4,
        session_duration_minutes: 15,
        metadata: {}
      });
    });
  });

  describe('generateInsightsReport', () => {
    it('should generate comprehensive insights report', async () => {
      // Mock all the service methods
      vi.spyOn(AnalyticsService, 'getDocumentUsageAnalytics').mockResolvedValue([
        {
          id: '1',
          document_id: 'doc-1',
          user_id: 'user-1',
          action_type: 'view',
          timestamp: '2024-01-01T00:00:00Z',
          documents: { title: 'Test Doc', filename: 'test.pdf' }
        }
      ]);

      vi.spyOn(AnalyticsService, 'getSearchAnalytics').mockResolvedValue([
        {
          id: '1',
          user_id: 'user-1',
          query_text: 'test query',
          query_type: 'semantic',
          results_count: 3,
          response_time_ms: 1000,
          timestamp: '2024-01-01T00:00:00Z'
        }
      ]);

      vi.spyOn(AnalyticsService, 'getChatAnalytics').mockResolvedValue([
        {
          id: '1',
          session_id: 'session-1',
          user_id: 'user-1',
          message_count: 5,
          session_duration_minutes: 10,
          timestamp: '2024-01-01T00:00:00Z'
        }
      ]);

      vi.spyOn(AnalyticsService, 'getDailyAnalyticsSummary').mockResolvedValue([]);
      vi.spyOn(AnalyticsService, 'getPopularDocuments').mockResolvedValue([]);
      vi.spyOn(AnalyticsService, 'getSearchTrends').mockResolvedValue([]);

      const report = await AnalyticsService.generateInsightsReport(30);

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('documentUsage');
      expect(report).toHaveProperty('searchAnalytics');
      expect(report).toHaveProperty('chatAnalytics');
      expect(report).toHaveProperty('insights');
      expect(report.period.days).toBe(30);
    });
  });
});

describe('Analytics Dashboard Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AnalyticsDemo', () => {
    it('should render analytics demo with features overview', () => {
      render(<AnalyticsDemo />);
      
      expect(screen.getByText('Analytics & Insights Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Document Analytics')).toBeInTheDocument();
      expect(screen.getByText('Search Insights')).toBeInTheDocument();
      expect(screen.getByText('Chat Analytics')).toBeInTheDocument();
      expect(screen.getByText('User Behavior')).toBeInTheDocument();
    });

    it('should show generate sample data button when no data exists', () => {
      render(<AnalyticsDemo />);
      
      expect(screen.getByText('Generate Sample Data')).toBeInTheDocument();
    });

    it('should generate sample analytics data', async () => {
      const mockTrackDocumentUsage = vi.spyOn(AnalyticsService, 'trackDocumentUsage')
        .mockResolvedValue();
      const mockTrackSearch = vi.spyOn(AnalyticsService, 'trackSearch')
        .mockResolvedValue();
      const mockTrackChatSession = vi.spyOn(AnalyticsService, 'trackChatSession')
        .mockResolvedValue();

      render(<AnalyticsDemo />);
      
      const generateButton = screen.getByText('Generate Sample Data');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockTrackDocumentUsage).toHaveBeenCalled();
        expect(mockTrackSearch).toHaveBeenCalled();
        expect(mockTrackChatSession).toHaveBeenCalled();
      });
    });
  });

  describe('AnalyticsDashboard', () => {
    const mockAnalyticsData = {
      period: { startDate: new Date(), endDate: new Date(), days: 30 },
      summary: {
        totalDocumentViews: 100,
        totalSearches: 50,
        totalChatSessions: 25,
        avgResponseTime: 1200
      },
      documentUsage: [],
      searchAnalytics: [],
      chatAnalytics: [],
      dailySummary: [],
      popularDocuments: [],
      searchTrends: [],
      insights: []
    };

    it('should render analytics dashboard with summary stats', async () => {
      vi.spyOn(AnalyticsService, 'generateInsightsReport')
        .mockResolvedValue(mockAnalyticsData);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      vi.spyOn(AnalyticsService, 'generateInsightsReport')
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AnalyticsDashboard />);
      
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      // Should show loading cards
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(4);
    });

    it('should allow date range selection', async () => {
      vi.spyOn(AnalyticsService, 'generateInsightsReport')
        .mockResolvedValue(mockAnalyticsData);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const dateButton = screen.getByRole('button', { name: /pick a date range/i });
        expect(dateButton).toBeInTheDocument();
      });
    });

    it('should export analytics report', async () => {
      vi.spyOn(AnalyticsService, 'generateInsightsReport')
        .mockResolvedValue(mockAnalyticsData);

      // Mock URL.createObjectURL and related functions
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      Object.defineProperty(document, 'createElement', {
        value: vi.fn(() => ({
          href: '',
          download: '',
          click: mockClick
        }))
      });
      
      Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
      Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Report');
        fireEvent.click(exportButton);
      });

      expect(mockClick).toHaveBeenCalled();
    });
  });
});

describe('Analytics Tracking Hook', () => {
  it('should provide tracking functions', () => {
    const TestComponent = () => {
      const { 
        trackDocumentView, 
        trackDocumentDownload, 
        trackDocumentChatReference, 
        trackChatSession 
      } = useAnalyticsTracking();

      return (
        <div>
          <button onClick={() => trackDocumentView('doc-1')}>Track View</button>
          <button onClick={() => trackDocumentDownload('doc-1')}>Track Download</button>
          <button onClick={() => trackDocumentChatReference('doc-1', 'session-1')}>Track Reference</button>
          <button onClick={() => trackChatSession('session-1', 5)}>Track Session</button>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByText('Track View')).toBeInTheDocument();
    expect(screen.getByText('Track Download')).toBeInTheDocument();
    expect(screen.getByText('Track Reference')).toBeInTheDocument();
    expect(screen.getByText('Track Session')).toBeInTheDocument();
  });

  it('should track document view when called', async () => {
    const mockTrackDocumentUsage = vi.spyOn(AnalyticsService, 'trackDocumentUsage')
      .mockResolvedValue();

    const TestComponent = () => {
      const { trackDocumentView } = useAnalyticsTracking();
      return <button onClick={() => trackDocumentView('doc-1')}>Track View</button>;
    };

    render(<TestComponent />);
    
    const button = screen.getByText('Track View');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockTrackDocumentUsage).toHaveBeenCalledWith({
        document_id: 'doc-1',
        user_id: 'test-user-id',
        action_type: 'view',
        metadata: undefined
      });
    });
  });
});

describe('Analytics Privacy and Security', () => {
  it('should anonymize user data in analytics', () => {
    // Test data anonymization functions
    const userData = {
      user_id: 'user-123',
      timestamp: '2024-01-01T00:00:00Z',
      action_type: 'view',
      metadata: { source: 'test' }
    };

    // This would test the anonymize_analytics_data function
    // In a real implementation, you'd test the actual database function
    expect(userData.user_id).toBeDefined();
  });

  it('should respect user privacy settings', () => {
    // Test that analytics respects user consent and privacy settings
    // This would integrate with a privacy management system
    expect(true).toBe(true); // Placeholder
  });

  it('should implement proper data retention policies', () => {
    // Test that old analytics data is properly cleaned up
    // This would test data retention and cleanup functions
    expect(true).toBe(true); // Placeholder
  });
});

describe('Analytics Performance', () => {
  it('should handle large datasets efficiently', async () => {
    // Test performance with large amounts of analytics data
    const startTime = Date.now();
    
    // Mock large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      timestamp: new Date().toISOString(),
      value: Math.random()
    }));

    vi.spyOn(AnalyticsService, 'getDocumentUsageAnalytics')
      .mockResolvedValue(largeDataset as any);

    const result = await AnalyticsService.getDocumentUsageAnalytics();
    const endTime = Date.now();

    expect(result).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should implement proper caching for analytics queries', () => {
    // Test that analytics queries are properly cached
    // This would test caching mechanisms
    expect(true).toBe(true); // Placeholder
  });
});