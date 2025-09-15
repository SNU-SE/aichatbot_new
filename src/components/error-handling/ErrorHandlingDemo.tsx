/**
 * Error Handling Demo Component
 * Demonstrates comprehensive error handling capabilities
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  Upload, 
  Search, 
  MessageSquare, 
  RefreshCw,
  Bug,
  Shield,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary, AsyncErrorBoundary } from './ErrorBoundary';
import { ErrorNotification, ErrorToast } from './ErrorNotification';
import { ErrorMonitoringDashboard } from './ErrorMonitoringDashboard';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { 
  DocumentErrorCode, 
  SearchErrorCode, 
  EnhancedErrorResponse 
} from '@/types/enhanced-rag';
import { errorHandlingService } from '@/services/errorHandlingService';
import { fallbackService } from '@/services/fallbackService';

// ============================================================================
// DEMO ERROR SCENARIOS
// ============================================================================

const ERROR_SCENARIOS = {
  network: {
    title: 'Network Error',
    description: 'Simulate network connection failure',
    icon: Wifi,
    error: {
      code: DocumentErrorCode.NETWORK_ERROR,
      message: 'Failed to connect to server',
      details: { endpoint: '/api/documents', status: 0 },
      retryable: true,
      suggestedAction: 'Check your internet connection and try again',
      timestamp: new Date()
    } as EnhancedErrorResponse
  },
  upload: {
    title: 'Upload Error',
    description: 'Simulate file upload validation error',
    icon: Upload,
    error: {
      code: DocumentErrorCode.INVALID_FILE_FORMAT,
      message: 'Invalid file format detected',
      details: { fileType: 'txt', expectedType: 'pdf' },
      retryable: false,
      suggestedAction: 'Please upload a PDF file instead',
      timestamp: new Date()
    } as EnhancedErrorResponse
  },
  search: {
    title: 'Search Error',
    description: 'Simulate search service failure',
    icon: Search,
    error: {
      code: SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
      message: 'Search service is temporarily unavailable',
      details: { service: 'vector-search', lastHealthCheck: new Date() },
      retryable: true,
      suggestedAction: 'Please try your search again in a few moments',
      timestamp: new Date()
    } as EnhancedErrorResponse
  },
  chat: {
    title: 'Chat Error',
    description: 'Simulate AI chat service timeout',
    icon: MessageSquare,
    error: {
      code: DocumentErrorCode.PROCESSING_TIMEOUT,
      message: 'AI response generation timed out',
      details: { timeout: 30000, model: 'gpt-4' },
      retryable: true,
      suggestedAction: 'Try asking a simpler question or try again later',
      timestamp: new Date()
    } as EnhancedErrorResponse
  }
};

// ============================================================================
// THROWING COMPONENTS FOR TESTING
// ============================================================================

const ComponentErrorDemo: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Component rendering failed - this is a demo error');
  }
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-green-800">✅ Component rendered successfully!</p>
    </div>
  );
};

const AsyncErrorDemo: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      // Simulate async error
      setTimeout(() => {
        Promise.reject(new Error('Async operation failed - this is a demo error'));
      }, 1000);
    }
  }, [shouldThrow]);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-blue-800">🔄 Async component loaded</p>
    </div>
  );
};

// ============================================================================
// MAIN DEMO COMPONENT
// ============================================================================

export const ErrorHandlingDemo: React.FC = () => {
  const [activeToast, setActiveToast] = useState<EnhancedErrorResponse | null>(null);
  const [componentError, setComponentError] = useState(false);
  const [asyncError, setAsyncError] = useState(false);
  const [fallbackDemo, setFallbackDemo] = useState<string | null>(null);

  const { 
    handleError, 
    executeWithErrorHandling, 
    errors, 
    hasErrors, 
    errorStats,
    retryError,
    dismissError,
    clearErrors
  } = useErrorHandling({
    showToasts: false // We'll handle toasts manually for demo
  });

  // ============================================================================
  // ERROR SIMULATION FUNCTIONS
  // ============================================================================

  const simulateError = async (scenarioKey: keyof typeof ERROR_SCENARIOS) => {
    const scenario = ERROR_SCENARIOS[scenarioKey];
    await handleError(scenario.error, {
      operation: `demo_${scenarioKey}`,
      component: 'ErrorHandlingDemo',
      metadata: { scenario: scenarioKey }
    });
  };

  const simulateToastError = (scenarioKey: keyof typeof ERROR_SCENARIOS) => {
    const scenario = ERROR_SCENARIOS[scenarioKey];
    setActiveToast(scenario.error);
  };

  const simulateRetryableOperation = async () => {
    let attempts = 0;
    
    try {
      await executeWithErrorHandling(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error(`Attempt ${attempts} failed - will retry`);
          }
          return 'Operation succeeded after retries';
        },
        {
          operation: 'retry_demo',
          component: 'ErrorHandlingDemo',
          metadata: { demoType: 'retry' }
        }
      );
    } catch (error) {
      console.log('Operation failed after all retries');
    }
  };

  const simulateFallback = async (serviceName: string) => {
    setFallbackDemo(serviceName);
    
    try {
      const result = await fallbackService.executeWithFallback(
        serviceName,
        async () => {
          throw new Error(`${serviceName} service is down`);
        }
      );
      
      console.log('Fallback result:', result);
    } catch (error) {
      console.log('All fallbacks failed:', error);
    } finally {
      setTimeout(() => setFallbackDemo(null), 2000);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Error Handling Demo</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Comprehensive error handling system with automatic retry, fallback mechanisms, 
          and user-friendly error reporting.
        </p>
      </div>

      {/* Error Statistics */}
      {hasErrors && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {errorStats.total} errors logged ({errorStats.unresolved} unresolved)
              </span>
              <Button size="sm" variant="outline" onClick={clearErrors}>
                Clear All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="scenarios" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scenarios">Error Scenarios</TabsTrigger>
          <TabsTrigger value="boundaries">Error Boundaries</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="fallbacks">Fallbacks</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Error Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Error Simulation
              </CardTitle>
              <CardDescription>
                Trigger different types of errors to see how they're handled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(ERROR_SCENARIOS).map(([key, scenario]) => {
                  const IconComponent = scenario.icon;
                  return (
                    <Card key={key} className="border-2 hover:border-blue-200 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{scenario.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {scenario.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={scenario.error.retryable ? 'secondary' : 'outline'}>
                            {scenario.error.retryable ? 'Retryable' : 'Non-retryable'}
                          </Badge>
                          <Badge variant="outline">{scenario.error.code}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => simulateError(key as keyof typeof ERROR_SCENARIOS)}
                            className="flex-1"
                          >
                            Trigger Error
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => simulateToastError(key as keyof typeof ERROR_SCENARIOS)}
                          >
                            Show Toast
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Special Operations */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">Special Operations</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={simulateRetryableOperation}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Test Retry Logic
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => simulateFallback('document-search')}
                    disabled={fallbackDemo === 'document-search'}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Test Search Fallback
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => simulateFallback('ai-chat')}
                    disabled={fallbackDemo === 'ai-chat'}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Test Chat Fallback
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          {errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
                <CardDescription>
                  Errors generated during this demo session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.slice(0, 5).map((errorEntry) => (
                  <ErrorNotification
                    key={errorEntry.id}
                    error={errorEntry.error}
                    onRetry={() => retryError(errorEntry.id, async () => {
                      // Simulate successful retry
                      console.log('Retry successful');
                    })}
                    onDismiss={() => dismissError(errorEntry.id)}
                    showDetails={true}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Error Boundaries Tab */}
        <TabsContent value="boundaries" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>React Error Boundary</CardTitle>
                <CardDescription>
                  Catches JavaScript errors in component tree
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={componentError ? 'destructive' : 'outline'}
                    onClick={() => setComponentError(!componentError)}
                  >
                    {componentError ? 'Fix Component' : 'Break Component'}
                  </Button>
                </div>
                <ErrorBoundary showDetails={true}>
                  <ComponentErrorDemo shouldThrow={componentError} />
                </ErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Async Error Boundary</CardTitle>
                <CardDescription>
                  Catches unhandled promise rejections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={asyncError ? 'destructive' : 'outline'}
                    onClick={() => setAsyncError(!asyncError)}
                  >
                    {asyncError ? 'Fix Async' : 'Break Async'}
                  </Button>
                </div>
                <AsyncErrorBoundary>
                  <AsyncErrorDemo shouldThrow={asyncError} />
                </AsyncErrorBoundary>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Notifications</CardTitle>
              <CardDescription>
                Different ways to display errors to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sample notifications */}
              <div className="space-y-4">
                <h4 className="font-semibold">Sample Error Notifications</h4>
                {Object.entries(ERROR_SCENARIOS).map(([key, scenario]) => (
                  <ErrorNotification
                    key={key}
                    error={scenario.error}
                    onRetry={() => console.log(`Retrying ${key}`)}
                    onDismiss={() => console.log(`Dismissing ${key}`)}
                    showDetails={false}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fallbacks Tab */}
        <TabsContent value="fallbacks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fallback Mechanisms</CardTitle>
              <CardDescription>
                Automatic fallbacks when services fail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Search Service</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Falls back to cached results, then offline search
                    </p>
                    <Button
                      size="sm"
                      onClick={() => simulateFallback('document-search')}
                      disabled={fallbackDemo === 'document-search'}
                    >
                      {fallbackDemo === 'document-search' ? 'Testing...' : 'Test Fallback'}
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Chat Service</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Falls back to cached responses, then offline mode
                    </p>
                    <Button
                      size="sm"
                      onClick={() => simulateFallback('ai-chat')}
                      disabled={fallbackDemo === 'ai-chat'}
                    >
                      {fallbackDemo === 'ai-chat' ? 'Testing...' : 'Test Fallback'}
                    </Button>
                  </div>
                </div>

                {/* Service Health Status */}
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Service Health Status</h4>
                  <div className="space-y-2">
                    {Object.entries(fallbackService.getAllServiceHealth()).map(([service, health]) => (
                      <div key={service} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{service}</span>
                        <Badge variant={health.isHealthy ? 'secondary' : 'destructive'}>
                          {health.isHealthy ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <ErrorMonitoringDashboard 
            refreshInterval={10000}
            showExportOptions={true}
          />
        </TabsContent>
      </Tabs>

      {/* Toast Container */}
      {activeToast && (
        <ErrorToast
          error={activeToast}
          duration={5000}
          position="top-right"
          onDismiss={() => setActiveToast(null)}
          onRetry={() => {
            console.log('Toast retry clicked');
            setActiveToast(null);
          }}
        />
      )}
    </div>
  );
};