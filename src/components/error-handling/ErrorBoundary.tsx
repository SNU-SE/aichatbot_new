/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorHandlingService, ErrorSeverity, ErrorCategory } from '@/services/errorHandlingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our error handling service
    const errorId = errorHandlingService.logError(
      {
        code: 'REACT_ERROR_BOUNDARY',
        message: error.message,
        details: {
          stack: error.stack,
          componentStack: errorInfo.componentStack
        },
        retryable: false,
        suggestedAction: 'Please refresh the page or contact support',
        timestamp: new Date()
      },
      {
        operation: 'component_render',
        component: 'ErrorBoundary',
        metadata: {
          errorName: error.name,
          componentStack: errorInfo.componentStack
        },
        timestamp: new Date()
      },
      ErrorSeverity.HIGH
    );

    this.setState({
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-lg">
                We encountered an unexpected error. Don't worry, we've been notified.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error ID for support */}
              {this.state.errorId && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    Error ID: <code className="font-mono text-sm">{this.state.errorId}</code>
                    <br />
                    Please include this ID when contacting support.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error details (development only) */}
              {this.props.showDetails && process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Error Details (Development)</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div>
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleReload} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {/* Support information */}
              <div className="text-center text-sm text-gray-600">
                <p>
                  If this problem persists, please{' '}
                  <a 
                    href="mailto:support@example.com" 
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    contact support
                  </a>
                  {' '}with the error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Async error boundary for handling async errors
export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.handleError(error, errorInfo);
  }

  componentDidMount() {
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = new Error(event.reason?.message || 'Unhandled promise rejection');
    error.stack = event.reason?.stack;
    
    this.handleError(error, { componentStack: 'Async operation' });
    event.preventDefault();
  };

  handleError = (error: Error, errorInfo: ErrorInfo) => {
    const errorId = errorHandlingService.logError(
      {
        code: 'ASYNC_ERROR',
        message: error.message,
        details: {
          stack: error.stack,
          componentStack: errorInfo.componentStack
        },
        retryable: false,
        suggestedAction: 'Please refresh the page or contact support',
        timestamp: new Date()
      },
      {
        operation: 'async_operation',
        component: 'AsyncErrorBoundary',
        metadata: {
          errorName: error.name,
          componentStack: errorInfo.componentStack
        },
        timestamp: new Date()
      },
      ErrorSeverity.HIGH
    );

    this.setState({
      hasError: true,
      error,
      errorInfo,
      errorId
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorBoundary {...this.props}>
          {this.props.children}
        </ErrorBoundary>
      );
    }

    return this.props.children;
  }
}