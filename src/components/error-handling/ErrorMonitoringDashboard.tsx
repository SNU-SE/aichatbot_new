/**
 * Error Monitoring Dashboard
 * Administrative interface for monitoring and managing errors
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  errorHandlingService, 
  ErrorSeverity, 
  ErrorCategory, 
  ErrorLogEntry 
} from '@/services/errorHandlingService';
import { ErrorList } from './ErrorNotification';

// ============================================================================
// DASHBOARD PROPS
// ============================================================================

export interface ErrorMonitoringDashboardProps {
  className?: string;
  refreshInterval?: number;
  showExportOptions?: boolean;
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

interface ErrorFilters {
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  resolved?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// ============================================================================
// ERROR MONITORING DASHBOARD
// ============================================================================

export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({
  className = '',
  refreshInterval = 30000,
  showExportOptions = true
}) => {
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLogEntry[]>([]);
  const [filters, setFilters] = useState<ErrorFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadErrors = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll use the error handling service's in-memory store
      const errorStats = errorHandlingService.getErrorStatistics();
      
      // Simulate loading errors (in real app, this would be an API call)
      const mockErrors: ErrorLogEntry[] = [];
      setErrors(mockErrors);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load errors:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadErrors();
    
    // Set up auto-refresh
    const interval = setInterval(loadErrors, refreshInterval);
    return () => clearInterval(interval);
  }, [loadErrors, refreshInterval]);

  // Listen for new errors
  useEffect(() => {
    const unsubscribe = errorHandlingService.addErrorListener((errorEntry) => {
      setErrors(prev => [errorEntry, ...prev]);
    });

    return unsubscribe;
  }, []);

  // ============================================================================
  // FILTERING
  // ============================================================================

  useEffect(() => {
    let filtered = [...errors];

    // Apply filters
    if (filters.severity) {
      filtered = filtered.filter(error => error.severity === filters.severity);
    }

    if (filters.category) {
      filtered = filtered.filter(error => error.category === filters.category);
    }

    if (filters.resolved !== undefined) {
      filtered = filtered.filter(error => error.resolved === filters.resolved);
    }

    if (filters.dateRange) {
      filtered = filtered.filter(error => 
        error.context.timestamp >= filters.dateRange!.start &&
        error.context.timestamp <= filters.dateRange!.end
      );
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(error =>
        error.error.message.toLowerCase().includes(query) ||
        error.error.code.toLowerCase().includes(query) ||
        error.context.operation.toLowerCase().includes(query)
      );
    }

    setFilteredErrors(filtered);
  }, [errors, filters]);

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const stats = React.useMemo(() => {
    const total = errors.length;
    const resolved = errors.filter(e => e.resolved).length;
    const unresolved = total - resolved;
    
    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const byCategory = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const recentErrors = errors.filter(error => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return error.context.timestamp > hourAgo;
    }).length;

    return {
      total,
      resolved,
      unresolved,
      bySeverity,
      byCategory,
      recentErrors,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    };
  }, [errors]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleRetryError = async (errorId: string) => {
    // In a real implementation, this would trigger the retry mechanism
    console.log('Retrying error:', errorId);
  };

  const handleResolveError = (errorId: string, resolution: string) => {
    errorHandlingService.resolveError(errorId, resolution);
    setErrors(prev => prev.map(error => 
      error.id === errorId 
        ? { ...error, resolved: true, resolvedAt: new Date(), resolution }
        : error
    ));
  };

  const handleDismissError = (errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  };

  const exportErrors = () => {
    const dataStr = JSON.stringify(filteredErrors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Error Monitoring</h2>
          <p className="text-gray-600">
            Monitor and manage system errors and failures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadErrors}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {showExportOptions && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportErrors}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentErrors} in the last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unresolved}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Successfully handled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Of all errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search errors..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select
                value={filters.severity || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  severity: value === 'all' ? undefined : value as ErrorSeverity 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value={ErrorSeverity.LOW}>Low</SelectItem>
                  <SelectItem value={ErrorSeverity.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={ErrorSeverity.HIGH}>High</SelectItem>
                  <SelectItem value={ErrorSeverity.CRITICAL}>Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  category: value === 'all' ? undefined : value as ErrorCategory 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value={ErrorCategory.NETWORK}>Network</SelectItem>
                  <SelectItem value={ErrorCategory.VALIDATION}>Validation</SelectItem>
                  <SelectItem value={ErrorCategory.AUTHENTICATION}>Authentication</SelectItem>
                  <SelectItem value={ErrorCategory.AUTHORIZATION}>Authorization</SelectItem>
                  <SelectItem value={ErrorCategory.PROCESSING}>Processing</SelectItem>
                  <SelectItem value={ErrorCategory.STORAGE}>Storage</SelectItem>
                  <SelectItem value={ErrorCategory.SYSTEM}>System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.resolved === undefined ? 'all' : filters.resolved ? 'resolved' : 'unresolved'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  resolved: value === 'all' ? undefined : value === 'resolved' 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Errors by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        severity === ErrorSeverity.CRITICAL ? 'destructive' :
                        severity === ErrorSeverity.HIGH ? 'destructive' :
                        severity === ErrorSeverity.MEDIUM ? 'outline' : 'secondary'
                      }
                    >
                      {severity.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Errors by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="capitalize">{category}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>
                Showing {filteredErrors.length} of {errors.length} errors
                {lastRefresh && (
                  <span className="ml-2 text-xs">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ErrorList
            errors={filteredErrors}
            onRetry={handleRetryError}
            onDismiss={handleDismissError}
            onResolve={handleResolveError}
            showResolved={filters.resolved !== false}
          />
        </CardContent>
      </Card>
    </div>
  );
};