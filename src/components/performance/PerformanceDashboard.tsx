/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and optimization status
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Memory
} from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { cacheService } from '@/services/cacheService';
import { queryOptimizationService } from '@/services/queryOptimizationService';

export function PerformanceDashboard() {
  const { metrics, alerts, getPerformanceReport, clearAlerts } = usePerformanceMonitor();
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());
  const [queryStats, setQueryStats] = useState(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      setCacheStats(cacheService.getStats());
      setQueryStats(queryOptimizationService.getQueryStats());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Performance score calculation
  const calculatePerformanceScore = () => {
    let score = 100;
    
    // Deduct points for poor metrics
    if (metrics.lcp && metrics.lcp > 2500) score -= 20;
    if (metrics.fid && metrics.fid > 100) score -= 15;
    if (metrics.cls && metrics.cls > 0.1) score -= 15;
    if (metrics.renderTime > 16) score -= 10;
    if (cacheStats.hitRate < 0.7) score -= 20;
    
    return Math.max(0, score);
  };

  const performanceScore = calculatePerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-gray-600">Monitor application performance and optimization metrics</p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </div>
            <div className="flex-1">
              <Progress value={performanceScore} className="h-3" />
              <p className="text-sm text-gray-600 mt-1">
                {performanceScore >= 90 ? 'Excellent' : 
                 performanceScore >= 70 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Core Metrics</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="queries">Query Optimization</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Core Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Largest Contentful Paint"
              value={metrics.lcp}
              unit="ms"
              threshold={2500}
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              title="First Input Delay"
              value={metrics.fid}
              unit="ms"
              threshold={100}
              icon={<Zap className="h-4 w-4" />}
            />
            <MetricCard
              title="Cumulative Layout Shift"
              value={metrics.cls}
              unit=""
              threshold={0.1}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <MetricCard
              title="Render Time"
              value={metrics.renderTime}
              unit="ms"
              threshold={16}
              icon={<Activity className="h-4 w-4" />}
            />
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Memory className="h-5 w-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Used JS Heap Size</span>
                    <span>{formatBytes(metrics.memoryUsage)}</span>
                  </div>
                  {metrics.jsHeapSize && (
                    <>
                      <Progress 
                        value={(metrics.memoryUsage / metrics.jsHeapSize) * 100} 
                        className="h-2" 
                      />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Total: {formatBytes(metrics.jsHeapSize)}</span>
                        <span>{((metrics.memoryUsage / metrics.jsHeapSize) * 100).toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cache Performance Tab */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {(cacheStats.hitRate * 100).toFixed(1)}%
                </div>
                <Progress value={cacheStats.hitRate * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cache Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {cacheStats.size}
                </div>
                <p className="text-sm text-gray-600">
                  of {cacheStats.maxSize} max
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {cacheStats.hits + cacheStats.misses}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Hits: {cacheStats.hits}</div>
                  <div>Misses: {cacheStats.misses}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cache Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                onClick={() => cacheService.clear()}
                className="mr-2"
              >
                Clear All Cache
              </Button>
              <Button 
                variant="outline" 
                onClick={() => cacheService.clear('search')}
                className="mr-2"
              >
                Clear Search Cache
              </Button>
              <Button 
                variant="outline" 
                onClick={() => cacheService.clear('documents')}
              >
                Clear Document Cache
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Query Optimization Tab */}
        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Performance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {queryStats.size > 0 ? (
                <div className="space-y-4">
                  {Array.from(queryStats.entries()).map(([query, stats]) => (
                    <div key={query} className="border-b pb-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm truncate max-w-md">
                          {query}
                        </span>
                        <div className="flex gap-4 text-sm">
                          <span>Count: {stats.count}</span>
                          <span>Avg: {stats.avgTime.toFixed(2)}ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No query statistics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Performance Alerts</h3>
            <Button variant="outline" onClick={clearAlerts}>
              Clear All Alerts
            </Button>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {alert.type === 'error' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-600">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                        {alert.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No performance alerts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value?: number;
  unit: string;
  threshold: number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, unit, threshold, icon }: MetricCardProps) {
  const isGood = value ? value <= threshold : true;
  const colorClass = isGood ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>
          {value ? `${value.toFixed(value < 1 ? 3 : 0)}${unit}` : 'N/A'}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Threshold: {threshold}{unit}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}