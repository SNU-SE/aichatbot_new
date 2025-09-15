/**
 * Security Dashboard Component
 * Displays security metrics, events, and monitoring information
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Lock, 
  Eye, 
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import { securityService, SecurityAuditEvent, SecurityEventType } from '../../services/securityService';
import { auditService, AuditStats } from '../../services/auditService';

interface SecurityDashboardProps {
  className?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  securityViolations: number;
  rateLimitHits: number;
  suspiciousActivity: number;
  lastUpdated: Date;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ className }) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load security events
      const events = securityService.getSecurityEvents(50);
      setSecurityEvents(events);

      // Calculate security metrics
      const totalEvents = events.length;
      const securityViolations = events.filter(e => 
        e.type === SecurityEventType.UNAUTHORIZED_ACCESS ||
        e.type === SecurityEventType.DATA_BREACH_ATTEMPT ||
        e.type === SecurityEventType.SECURITY_VIOLATION
      ).length;
      const rateLimitHits = events.filter(e => 
        e.type === SecurityEventType.RATE_LIMIT_EXCEEDED
      ).length;
      const suspiciousActivity = events.filter(e => 
        e.type === SecurityEventType.SUSPICIOUS_ACTIVITY ||
        e.type === SecurityEventType.SQL_INJECTION_ATTEMPT ||
        e.type === SecurityEventType.XSS_ATTEMPT
      ).length;

      setMetrics({
        totalEvents,
        securityViolations,
        rateLimitHits,
        suspiciousActivity,
        lastUpdated: new Date()
      });

      // Load audit statistics
      const stats = await auditService.getAuditStats();
      setAuditStats(stats);

    } catch (err) {
      console.error('Failed to load security data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: SecurityEventType): string => {
    switch (type) {
      case SecurityEventType.UNAUTHORIZED_ACCESS:
      case SecurityEventType.DATA_BREACH_ATTEMPT:
        return 'destructive';
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
        return 'destructive';
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return 'secondary';
      case SecurityEventType.INVALID_INPUT:
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEventTypeIcon = (type: SecurityEventType) => {
    switch (type) {
      case SecurityEventType.UNAUTHORIZED_ACCESS:
        return <Lock className="h-4 w-4" />;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return <Activity className="h-4 w-4" />;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const exportSecurityReport = async () => {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        metrics,
        auditStats,
        recentEvents: securityEvents.slice(0, 20),
        summary: {
          totalSecurityEvents: metrics?.totalEvents || 0,
          criticalEvents: metrics?.securityViolations || 0,
          successRate: auditStats?.successRate || 0
        }
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export security report:', err);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading security data...
      </div>
    );
  }

  if (error) {
    return (
      <Alert className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadSecurityData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor security events and system health
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSecurityData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportSecurityReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics?.securityViolations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical security events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Hits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.rateLimitHits || 0}</div>
            <p className="text-xs text-muted-foreground">
              Blocked requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {auditStats?.successRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              System reliability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Latest security events and violations detected by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No security events recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {securityEvents.slice(0, 10).map((event, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getEventTypeIcon(event.type)}
                        <div>
                          <div className="font-medium">
                            {event.type.replace(/_/g, ' ').toLowerCase()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.resource && `Resource: ${event.resource}`}
                            {event.userId && ` • User: ${event.userId}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getEventTypeColor(event.type)}>
                          {event.success ? 'Handled' : 'Blocked'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Audit Statistics</CardTitle>
                <CardDescription>
                  System-wide audit and activity metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Events</span>
                  <span className="font-medium">{auditStats?.totalEvents || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-medium text-green-600">
                    {auditStats?.successRate.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Security Events</span>
                  <span className="font-medium text-destructive">
                    {auditStats?.securityEvents.length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest system activities and user actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditStats?.recentActivity.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No recent activity
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditStats?.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {activity.action}
                        </Badge>
                        <span className="text-muted-foreground">
                          {activity.timestamp?.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Actions by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(auditStats?.eventsByAction || {}).slice(0, 5).map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between">
                      <span className="text-sm">{action}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(auditStats?.eventsByResource || {}).map(([resource, count]) => (
                    <div key={resource} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{resource}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(auditStats?.eventsByUser || {}).slice(0, 5).map(([userId, count]) => (
                    <div key={userId} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-xs">
                        {userId.substring(0, 8)}...
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;