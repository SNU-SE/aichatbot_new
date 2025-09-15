import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface SearchAnalyticsProps {
  data: any;
  dateRange: { from: Date; to: Date };
}

export const SearchAnalytics: React.FC<SearchAnalyticsProps> = ({ data, dateRange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'successful' | 'failed'>('all');

  if (!data) {
    return <div>Loading search analytics...</div>;
  }

  const searchData = data.searchAnalytics || [];
  
  // Process search analytics
  const searchStats = {
    total: searchData.length,
    successful: searchData.filter((s: any) => s.results_count > 0).length,
    failed: searchData.filter((s: any) => s.results_count === 0).length,
    avgResponseTime: searchData.reduce((acc: number, s: any) => acc + (s.response_time_ms || 0), 0) / (searchData.length || 1),
    avgResults: searchData.reduce((acc: number, s: any) => acc + (s.results_count || 0), 0) / (searchData.length || 1)
  };

  // Group searches by query text
  const queryGroups = searchData.reduce((acc: any, search: any) => {
    const query = search.query_text.toLowerCase();
    if (!acc[query]) {
      acc[query] = {
        query_text: search.query_text,
        searches: [],
        total_count: 0,
        successful_count: 0,
        avg_results: 0,
        avg_response_time: 0,
        languages: new Set()
      };
    }
    
    acc[query].searches.push(search);
    acc[query].total_count++;
    if (search.results_count > 0) {
      acc[query].successful_count++;
    }
    if (search.language) {
      acc[query].languages.add(search.language);
    }
    
    return acc;
  }, {});

  // Calculate averages for each query group
  Object.values(queryGroups).forEach((group: any) => {
    group.avg_results = group.searches.reduce((acc: number, s: any) => acc + s.results_count, 0) / group.searches.length;
    group.avg_response_time = group.searches.reduce((acc: number, s: any) => acc + (s.response_time_ms || 0), 0) / group.searches.length;
    group.success_rate = (group.successful_count / group.total_count) * 100;
    group.languages = Array.from(group.languages);
  });

  // Filter and sort queries
  const filteredQueries = Object.values(queryGroups)
    .filter((group: any) => {
      const matchesSearch = group.query_text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'successful' && group.successful_count > 0) ||
        (filterType === 'failed' && group.successful_count === 0);
      return matchesSearch && matchesFilter;
    })
    .sort((a: any, b: any) => b.total_count - a.total_count);

  // Performance categories
  const getPerformanceCategory = (responseTime: number) => {
    if (responseTime < 1000) return { label: 'Excellent', color: 'text-green-500', variant: 'default' as const };
    if (responseTime < 2000) return { label: 'Good', color: 'text-blue-500', variant: 'secondary' as const };
    if (responseTime < 5000) return { label: 'Fair', color: 'text-yellow-500', variant: 'outline' as const };
    return { label: 'Poor', color: 'text-red-500', variant: 'destructive' as const };
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Search Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Search Performance</h3>
          <p className="text-sm text-muted-foreground">
            Analyze search patterns, success rates, and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Searches</option>
            <option value="successful">Successful Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searchStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Search queries performed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((searchStats.successful / (searchStats.total || 1)) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {searchStats.successful} successful searches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(searchStats.avgResponseTime)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average search latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Results</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(searchStats.avgResults * 10) / 10}
            </div>
            <p className="text-xs text-muted-foreground">
              Results per search
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Success Distribution</CardTitle>
            <CardDescription>Breakdown of successful vs failed searches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Successful Searches
                </span>
                <span>{searchStats.successful}</span>
              </div>
              <Progress 
                value={(searchStats.successful / (searchStats.total || 1)) * 100} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center">
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  Failed Searches
                </span>
                <span>{searchStats.failed}</span>
              </div>
              <Progress 
                value={(searchStats.failed / (searchStats.total || 1)) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Distribution</CardTitle>
            <CardDescription>Performance categories for search responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Excellent (<1s)', range: [0, 1000], color: 'text-green-500' },
              { label: 'Good (1-2s)', range: [1000, 2000], color: 'text-blue-500' },
              { label: 'Fair (2-5s)', range: [2000, 5000], color: 'text-yellow-500' },
              { label: 'Poor (>5s)', range: [5000, Infinity], color: 'text-red-500' }
            ].map((category) => {
              const count = searchData.filter((s: any) => 
                s.response_time_ms >= category.range[0] && s.response_time_ms < category.range[1]
              ).length;
              const percentage = (count / (searchStats.total || 1)) * 100;
              
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
      </div>

      {/* Query Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Search Query Analysis</CardTitle>
          <CardDescription>
            Detailed breakdown of search queries and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQueries.length > 0 ? (
              filteredQueries.map((query: any, index: number) => {
                const performance = getPerformanceCategory(query.avg_response_time);
                
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{query.query_text}</h4>
                        <p className="text-sm text-muted-foreground">
                          Searched {query.total_count} times
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={performance.variant}>
                          {performance.label}
                        </Badge>
                        <Badge 
                          variant={query.success_rate >= 80 ? "default" : query.success_rate >= 60 ? "secondary" : "destructive"}
                        >
                          {Math.round(query.success_rate)}% success
                        </Badge>
                      </div>
                    </div>

                    {/* Success Rate Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span className={getSuccessRateColor(query.success_rate)}>
                          {Math.round(query.success_rate)}%
                        </span>
                      </div>
                      <Progress 
                        value={query.success_rate} 
                        className="h-2"
                      />
                    </div>

                    {/* Detailed Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Searches:</span>
                        <div className="font-medium">{query.total_count}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Results:</span>
                        <div className="font-medium">{Math.round(query.avg_results * 10) / 10}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Time:</span>
                        <div className="font-medium">{Math.round(query.avg_response_time)}ms</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Languages:</span>
                        <div className="font-medium">
                          {query.languages.length > 0 ? query.languages.join(', ') : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Failed Search Indicator */}
                    {query.success_rate === 0 && (
                      <div className="flex items-center space-x-2 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>This query never returned results - consider content gaps</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No search queries found</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? `No queries match "${searchTerm}"`
                    : "No search activity data available for this period"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Failed Searches Analysis */}
      {searchStats.failed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Failed Searches Analysis
            </CardTitle>
            <CardDescription>
              Queries that returned no results - potential content gaps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.values(queryGroups)
                .filter((group: any) => group.successful_count === 0)
                .sort((a: any, b: any) => b.total_count - a.total_count)
                .slice(0, 10)
                .map((query: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="font-medium">{query.query_text}</span>
                      <p className="text-sm text-muted-foreground">
                        Failed {query.total_count} times
                      </p>
                    </div>
                    <Badge variant="destructive">
                      0 results
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