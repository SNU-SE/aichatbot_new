/**
 * Monitoring Dashboard Component
 * Displays system health, performance metrics, and deployment information
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Server, 
  Zap,
  RefreshCw,
  TrendingUp,
  Info
} from 'lucide-react';
import { monitoringService, SystemHealth, PerformanceMetrics } from '@/services/monitoringService';

interface MonitoringDashboardProps {
  className?: string;
}

export function MonitoringDashboard({ className }: MonitoringDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [health, avgMetrics] = await Promise.all([
        monitoringService.getSystemHealth(),
        Promise.resolve(monitoringService.getAveragePerformanceMetrics())
      ]);
      
      setSystemHealth(health);
      setPerformanceMetrics(avgMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (uptime: number) => {
    const minutes = Math.floor(uptime / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const formatResponseTime = (time: number) => {
    return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const deploymentInfo = monitoringService.getDeploymentInfo();

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <Button 
          onClick={loadData} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {systemHealth && (
        <Alert className="mb-6">
          <div className="flex items-center">
            {getStatusIcon(systemHealth.overall)}
            <AlertTitle className="ml-2">
              System Status: {systemHealth.overall.toUpperCase()}
            </AlertTitle>
          </div>
          <AlertDescription className="mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()} | 
            Uptime: {formatUptime(systemHealth.uptime)}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList>
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="deployment">Deployment Info</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {systemHealth ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemHealth.services.map((service) => (
                <Card key={service.service}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize">
                      {service.service}
                    </CardTitle>
                    {getStatusIcon(service.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge 
                        variant={service.status === 'healthy' ? 'default' : 'destructive'}
                        className={getStatusColor(service.status)}
                      >
                        {service.status}
                      </Badge>
                      
                      <div className="text-sm text-muted-foreground">
                        Response: {formatResponseTime(service.responseTime)}
                      </div>
                      
                      {service.error && (
                        <div className="text-xs text-red-500 mt-1">
                          {service.error}
                        </div>
                      )}
                      
                      {service.details && (
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(service.details).map(([key, value]) => (
                            <div key={key}>
                              {key}: {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading health status...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceMetrics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Response Times
                  </CardTitle>
                  <CardDescription>Average response times across services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Page Load</span>
                      <span>{formatResponseTime(performanceMetrics.pageLoadTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMetrics.pageLoadTime / 3000) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>API Response</span>
                      <span>{formatResponseTime(performanceMetrics.apiResponseTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMetrics.apiResponseTime / 2000) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Search Response</span>
                      <span>{formatResponseTime(performanceMetrics.searchResponseTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMetrics.searchResponseTime / 5000) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Server className="h-4 w-4 mr-2" />
                    System Resources
                  </CardTitle>
                  <CardDescription>Current system resource usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>{performanceMetrics.memoryUsage.toFixed(1)} MB</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMetrics.memoryUsage / 100) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Document Processing</span>
                      <span>{formatResponseTime(performanceMetrics.documentProcessingTime)}</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMetrics.documentProcessingTime / 30000) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No performance data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Deployment Information
                </CardTitle>
                <CardDescription>Current deployment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Environment:</span>
                  <Badge variant="outline">{deploymentInfo.environment}</Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Build Mode:</span>
                  <span className="text-sm">{deploymentInfo.buildMode}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Version:</span>
                  <span className="text-sm">{deploymentInfo.version}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Build Time:</span>
                  <span className="text-sm">{deploymentInfo.buildTime}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Commit:</span>
                  <span className="text-sm font-mono">{deploymentInfo.commitHash}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Netlify Context:</span>
                  <span className="text-sm">{deploymentInfo.netlifyContext}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  System Information
                </CardTitle>
                <CardDescription>Runtime and browser information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">User Agent:</span>
                  <span className="text-sm truncate max-w-48" title={navigator.userAgent}>
                    {navigator.userAgent.split(' ')[0]}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Platform:</span>
                  <span className="text-sm">{navigator.platform}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Language:</span>
                  <span className="text-sm">{navigator.language}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Online:</span>
                  <Badge variant={navigator.onLine ? 'default' : 'destructive'}>
                    {navigator.onLine ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Connection:</span>
                  <span className="text-sm">
                    {(navigator as any).connection?.effectiveType || 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MonitoringDashboard;