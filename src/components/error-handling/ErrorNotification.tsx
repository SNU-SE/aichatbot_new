/**
 * Error Notification Components
 * User-friendly error messages and notifications
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Info, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Bug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  EnhancedErrorResponse, 
  DocumentErrorCode, 
  SearchErrorCode 
} from '@/types/enhanced-rag';
import { 
  errorHandlingService, 
  ErrorSeverity, 
  ErrorLogEntry 
} from '@/services/errorHandlingService';

// ============================================================================
// ERROR NOTIFICATION PROPS
// ============================================================================

export interface ErrorNotificationProps {
  error: EnhancedErrorResponse;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export interface ErrorToastProps extends ErrorNotificationProps {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// ============================================================================
// ERROR SEVERITY STYLING
// ============================================================================

const getSeverityConfig = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.LOW:
      return {
        icon: Info,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeVariant: 'secondary' as const
      };
    case ErrorSeverity.MEDIUM:
      return {
        icon: AlertCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        badgeVariant: 'outline' as const
      };
    case ErrorSeverity.HIGH:
      return {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        badgeVariant: 'destructive' as const
      };
    case ErrorSeverity.CRITICAL:
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeVariant: 'destructive' as const
      };
    default:
      return {
        icon: AlertTriangle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeVariant: 'outline' as const
      };
  }
};

// ============================================================================
// ERROR MESSAGE MAPPING
// ============================================================================

const getErrorDisplayInfo = (error: EnhancedErrorResponse) => {
  const errorMessages: Record<string, { title: string; description: string; severity: ErrorSeverity }> = {
    [DocumentErrorCode.INVALID_FILE_FORMAT]: {
      title: 'Invalid File Format',
      description: 'Please upload a PDF file',
      severity: ErrorSeverity.MEDIUM
    },
    [DocumentErrorCode.FILE_TOO_LARGE]: {
      title: 'File Too Large',
      description: 'Please upload a file smaller than 10MB',
      severity: ErrorSeverity.MEDIUM
    },
    [DocumentErrorCode.EXTRACTION_FAILED]: {
      title: 'Text Extraction Failed',
      description: 'Unable to extract text from the document',
      severity: ErrorSeverity.HIGH
    },
    [DocumentErrorCode.EMBEDDING_FAILED]: {
      title: 'Processing Failed',
      description: 'Unable to process document for search',
      severity: ErrorSeverity.HIGH
    },
    [DocumentErrorCode.STORAGE_ERROR]: {
      title: 'Storage Error',
      description: 'Unable to save the document',
      severity: ErrorSeverity.HIGH
    },
    [DocumentErrorCode.PERMISSION_DENIED]: {
      title: 'Access Denied',
      description: 'You don\'t have permission to perform this action',
      severity: ErrorSeverity.MEDIUM
    },
    [DocumentErrorCode.DOCUMENT_NOT_FOUND]: {
      title: 'Document Not Found',
      description: 'The requested document could not be found',
      severity: ErrorSeverity.MEDIUM
    },
    [DocumentErrorCode.PROCESSING_TIMEOUT]: {
      title: 'Processing Timeout',
      description: 'Document processing took too long',
      severity: ErrorSeverity.HIGH
    },
    [DocumentErrorCode.NETWORK_ERROR]: {
      title: 'Connection Error',
      description: 'Please check your internet connection',
      severity: ErrorSeverity.HIGH
    },
    [SearchErrorCode.QUERY_TOO_SHORT]: {
      title: 'Search Query Too Short',
      description: 'Please enter at least 3 characters',
      severity: ErrorSeverity.LOW
    },
    [SearchErrorCode.EMBEDDING_GENERATION_FAILED]: {
      title: 'Search Processing Failed',
      description: 'Unable to process your search query',
      severity: ErrorSeverity.HIGH
    },
    [SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE]: {
      title: 'Search Unavailable',
      description: 'Search service is temporarily unavailable',
      severity: ErrorSeverity.HIGH
    },
    [SearchErrorCode.NO_ACCESSIBLE_DOCUMENTS]: {
      title: 'No Documents Available',
      description: 'You don\'t have access to any documents',
      severity: ErrorSeverity.MEDIUM
    }
  };

  const info = errorMessages[error.code];
  if (info) {
    return info;
  }

  // Default error info
  return {
    title: 'Error',
    description: error.message || 'An unexpected error occurred',
    severity: ErrorSeverity.MEDIUM
  };
};

// ============================================================================
// ERROR NOTIFICATION COMPONENT
// ============================================================================

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const errorInfo = getErrorDisplayInfo(error);
  const severityConfig = getSeverityConfig(errorInfo.severity);
  const IconComponent = severityConfig.icon;

  return (
    <Alert className={`${severityConfig.bgColor} ${severityConfig.borderColor} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <IconComponent className={`h-5 w-5 ${severityConfig.color} mt-0.5`} />
          <div className="flex-1">
            <AlertTitle className="text-gray-900 font-semibold">
              {errorInfo.title}
            </AlertTitle>
            <AlertDescription className="text-gray-700 mt-1">
              {errorInfo.description}
              {error.suggestedAction && (
                <div className="mt-2 text-sm font-medium">
                  💡 {error.suggestedAction}
                </div>
              )}
            </AlertDescription>

            {/* Error details */}
            {showDetails && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={severityConfig.badgeVariant} className="text-xs">
                    {error.code}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {errorInfo.severity.toUpperCase()}
                  </Badge>
                  {error.retryable && (
                    <Badge variant="secondary" className="text-xs">
                      RETRYABLE
                    </Badge>
                  )}
                </div>
                {error.details && (
                  <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">
                      Technical Details
                    </summary>
                    <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-auto">
                      {typeof error.details === 'string' 
                        ? error.details 
                        : JSON.stringify(error.details, null, 2)
                      }
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {onRetry && error.retryable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-8 px-3 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
};

// ============================================================================
// ERROR TOAST COMPONENT
// ============================================================================

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onRetry,
  onDismiss,
  duration = 5000,
  position = 'top-right',
  showDetails = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50'
  };

  return (
    <div className={`${positionClasses[position]} max-w-md animate-in slide-in-from-right-full ${className}`}>
      <ErrorNotification
        error={error}
        onRetry={onRetry}
        onDismiss={handleDismiss}
        showDetails={showDetails}
        className="shadow-lg"
      />
    </div>
  );
};

// ============================================================================
// ERROR LIST COMPONENT
// ============================================================================

export interface ErrorListProps {
  errors: ErrorLogEntry[];
  onRetry?: (errorId: string) => void;
  onDismiss?: (errorId: string) => void;
  onResolve?: (errorId: string, resolution: string) => void;
  showResolved?: boolean;
  className?: string;
}

export const ErrorList: React.FC<ErrorListProps> = ({
  errors,
  onRetry,
  onDismiss,
  onResolve,
  showResolved = false,
  className = ''
}) => {
  const filteredErrors = showResolved ? errors : errors.filter(e => !e.resolved);

  if (filteredErrors.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <p className="text-lg font-medium">No errors to display</p>
        <p className="text-sm">Everything is working smoothly!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {filteredErrors.map((errorEntry) => (
        <Card key={errorEntry.id} className={errorEntry.resolved ? 'opacity-60' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {getErrorDisplayInfo(errorEntry.error).title}
                </CardTitle>
                <Badge variant={getSeverityConfig(errorEntry.severity).badgeVariant}>
                  {errorEntry.severity.toUpperCase()}
                </Badge>
                {errorEntry.resolved && (
                  <Badge variant="outline" className="text-green-600">
                    RESOLVED
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 font-mono">
                  {errorEntry.id}
                </span>
              </div>
            </div>
            <CardDescription>
              {getErrorDisplayInfo(errorEntry.error).description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Error context */}
            <div className="text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Operation:</span> {errorEntry.context.operation}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {errorEntry.context.timestamp.toLocaleString()}
                </div>
                {errorEntry.context.component && (
                  <div>
                    <span className="font-medium">Component:</span> {errorEntry.context.component}
                  </div>
                )}
                {errorEntry.context.userId && (
                  <div>
                    <span className="font-medium">User:</span> {errorEntry.context.userId}
                  </div>
                )}
              </div>
            </div>

            {/* Resolution info */}
            {errorEntry.resolved && errorEntry.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Resolution:</span>
                </div>
                <p className="text-green-700 text-sm mt-1">{errorEntry.resolution}</p>
                {errorEntry.resolvedAt && (
                  <p className="text-green-600 text-xs mt-1">
                    Resolved at {errorEntry.resolvedAt.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            {!errorEntry.resolved && (
              <div className="flex items-center gap-2 pt-2">
                {onRetry && errorEntry.error.retryable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetry(errorEntry.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                )}
                {onResolve && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(errorEntry.id, 'Manually resolved')}
                  >
                    Mark Resolved
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismiss(errorEntry.id)}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};