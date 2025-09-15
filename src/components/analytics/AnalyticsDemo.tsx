import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { AnalyticsService } from '@/services/analyticsService';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  MessageSquare,
  Database,
  Play,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AnalyticsDemo: React.FC = () => {
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingData();
  }, []);

  const checkExistingData = async () => {
    try {
      // Check if we have any analytics data
      const [documentUsage, searchAnalytics, chatAnalytics] = await Promise.all([
        AnalyticsService.getDocumentUsageAnalytics(),
        AnalyticsService.getSearchAnalytics(),
        AnalyticsService.getChatAnalytics()
      ]);

      const hasAnyData = (documentUsage?.length || 0) > 0 || 
                        (searchAnalytics?.length || 0) > 0 || 
                        (chatAnalytics?.length || 0) > 0;
      
      setHasData(hasAnyData);
      if (hasAnyData) {
        setShowDashboard(true);
      }
    } catch (error) {
      console.error('Error checking existing data:', error);
    }
  };

  const generateSampleData = async () => {
    setIsGeneratingData(true);
    
    try {
      // Generate sample document usage data
      const sampleDocuments = [
        { id: '1', title: 'Introduction to Machine Learning', filename: 'ml-intro.pdf' },
        { id: '2', title: 'Advanced Statistics Guide', filename: 'stats-guide.pdf' },
        { id: '3', title: 'Data Science Fundamentals', filename: 'ds-fundamentals.pdf' },
        { id: '4', title: 'Python Programming Basics', filename: 'python-basics.pdf' },
        { id: '5', title: 'Research Methodology', filename: 'research-methods.pdf' }
      ];

      const sampleUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const actionTypes = ['view', 'chat_reference', 'download'] as const;

      // Generate document usage events
      for (let i = 0; i < 50; i++) {
        const randomDoc = sampleDocuments[Math.floor(Math.random() * sampleDocuments.length)];
        const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
        const randomAction = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        
        await AnalyticsService.trackDocumentUsage({
          document_id: randomDoc.id,
          user_id: randomUser,
          action_type: randomAction,
          session_id: `session-${Math.random().toString(36).substr(2, 9)}`,
          metadata: { document_title: randomDoc.title, filename: randomDoc.filename }
        });
      }

      // Generate search analytics data
      const sampleQueries = [
        'machine learning algorithms',
        'statistical analysis methods',
        'data visualization techniques',
        'python pandas tutorial',
        'research design principles',
        'hypothesis testing',
        'neural networks',
        'data preprocessing',
        'regression analysis',
        'classification models'
      ];

      for (let i = 0; i < 30; i++) {
        const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
        const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
        const resultsCount = Math.floor(Math.random() * 10);
        const responseTime = 500 + Math.floor(Math.random() * 2000);
        
        await AnalyticsService.trackSearch({
          user_id: randomUser,
          query_text: randomQuery,
          query_type: Math.random() > 0.5 ? 'semantic' : 'keyword',
          results_count: resultsCount,
          response_time_ms: responseTime,
          documents_found: resultsCount > 0 ? sampleDocuments.slice(0, resultsCount).map(d => d.id) : [],
          language: 'en',
          session_id: `session-${Math.random().toString(36).substr(2, 9)}`
        });
      }

      // Generate chat analytics data
      for (let i = 0; i < 20; i++) {
        const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
        const sessionId = `session-${Math.random().toString(36).substr(2, 9)}`;
        const messageCount = 3 + Math.floor(Math.random() * 15);
        const duration = 2 + Math.floor(Math.random() * 20);
        const docsReferenced = sampleDocuments.slice(0, Math.floor(Math.random() * 3)).map(d => d.id);
        
        await AnalyticsService.trackChatSession({
          session_id: sessionId,
          user_id: randomUser,
          message_count: messageCount,
          documents_referenced: docsReferenced,
          topics: ['machine learning', 'statistics', 'data analysis'].slice(0, Math.floor(Math.random() * 3) + 1),
          satisfaction_score: Math.floor(Math.random() * 5) + 1,
          session_duration_minutes: duration
        });
      }

      setHasData(true);
      setShowDashboard(true);
      
      toast({
        title: 'Success',
        description: 'Sample analytics data generated successfully!'
      });
      
    } catch (error) {
      console.error('Error generating sample data:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate sample data',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingData(false);
    }
  };

  if (showDashboard) {
    return <AnalyticsDashboard />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Analytics & Insights Dashboard</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Track document usage, search patterns, and user engagement to gain actionable insights 
          about your educational content and platform performance.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <FileText className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle className="text-lg">Document Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track document views, downloads, and engagement patterns to identify popular content.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle className="text-lg">Search Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze search queries, success rates, and performance to optimize content discovery.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <MessageSquare className="h-8 w-8 text-purple-500 mb-2" />
            <CardTitle className="text-lg">Chat Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor conversation patterns, session duration, and user satisfaction scores.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Users className="h-8 w-8 text-orange-500 mb-2" />
            <CardTitle className="text-lg">User Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Understand user engagement patterns and identify areas for improvement.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Features</CardTitle>
          <CardDescription>
            Comprehensive analytics system with privacy-compliant data collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-500" />
                Data Collection
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Document usage tracking (views, downloads, references)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Search analytics (queries, results, performance)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Chat session monitoring (duration, satisfaction, topics)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Privacy-compliant data anonymization
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Insights & Reports
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  AI-generated actionable insights
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Performance trend analysis
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Content gap identification
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Exportable analytics reports
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Alert>
        <AlertDescription>
          <strong>Privacy First:</strong> All analytics data is anonymized and aggregated to protect user privacy. 
          Individual user data is only accessible to the respective users themselves, while administrators 
          can view aggregated insights without personal information.
        </AlertDescription>
      </Alert>

      {/* Demo Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Try the Analytics Dashboard</CardTitle>
          <CardDescription>
            {hasData 
              ? "Analytics data is available. View the dashboard to explore insights."
              : "Generate sample data to explore the analytics features, or start using the system to collect real data."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasData ? (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-800">Analytics Data Available</p>
                  <p className="text-sm text-green-600">Ready to view insights and reports</p>
                </div>
              </div>
              <Button onClick={() => setShowDashboard(true)}>
                View Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-800">No Analytics Data Yet</p>
                  <p className="text-sm text-blue-600">
                    Generate sample data to explore the analytics features
                  </p>
                </div>
                <Button 
                  onClick={generateSampleData} 
                  disabled={isGeneratingData}
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>{isGeneratingData ? 'Generating...' : 'Generate Sample Data'}</span>
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Or start using the document upload, search, and chat features to collect real analytics data.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Implementation */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>
            Built with privacy-first analytics and real-time insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium mb-2">Database Schema</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Document usage analytics</li>
                <li>• Search performance metrics</li>
                <li>• Chat interaction tracking</li>
                <li>• Daily aggregated summaries</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Privacy Features</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Row-level security (RLS)</li>
                <li>• Data anonymization functions</li>
                <li>• User consent management</li>
                <li>• GDPR compliance ready</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Insights Engine</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>• AI-powered analysis</li>
                <li>• Trend detection algorithms</li>
                <li>• Actionable recommendations</li>
                <li>• Performance optimization tips</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};