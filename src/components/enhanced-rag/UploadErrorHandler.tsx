/**
 * Upload Error Handler Component
 * Provides error handling and retry mechanisms for failed uploads
 */

import React, { useState, useCallback } from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  X, 
  Clock, 
  Wifi, 
  FileX, 
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  DocumentErrorCode, 
  EnhancedErrorResponse 
} from '../../types/enhanced-rag';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // in milliseconds
  backoffMultiplier: number;
}

export interface UploadError extends EnhancedErrorResponse {
  documentId?: string;
  filename?: string;
  retryCount?: number;
  canRetry?: boolean;
}

export interface UploadErrorHandlerProps {
  errors: UploadError[];
  onRetry: (documentId: string) => Promise<void>;
  onDismiss: (documentId: string) => void;
  onDismissAll: () => void;
  retryConfig?: RetryConfig;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
};

const ERROR_ICONS: Record<DocumentErrorCode, React.ComponentType<{ className?: string }>> = {
  [DocumentErrorCode.INVALID_FILE_FORMAT]: FileX,
  [DocumentErrorCode.FILE_TOO_LARGE]: FileX,
  [DocumentErrorCode.EXTRACTION_FAILED]: FileX,
  [DocumentErrorCode.EMBEDDING_FAILED]: AlertCircle,
  [DocumentErrorCode.STORAGE_ERROR]: AlertCircle,
  [DocumentErrorCode.PERMISSION_DENIED]: Shield,
  [DocumentErrorCode.DOCUMENT_NOT_FOUND]: FileX,
  [DocumentErrorCode.PROCESSING_TIMEOUT]: Clock,
  [DocumentErrorCode.INVALID_DOCUMENT_STATE]: AlertCircle,
  [DocumentErrorCode.NETWORK_ERROR]: Wifi
};

const ERROR_CATEGORIES = {
  USER_ERROR: [
    DocumentErrorCode.INVALID_FILE_FORMAT,
    DocumentErrorCode.FILE_TOO_LARGE,
    DocumentErrorCode.PERMISSION_DENIED
  ],
  SYSTEM_ERROR: [
    DocumentErrorCode.STORAGE_ERROR,
    DocumentErrorCode.PROCESSING_TIMEOUT,
    DocumentErrorCode.NETWORK_ERROR
  ],
  PROCESSING_ERROR: [
    DocumentErrorCode.EXTRACTION_FAILED,
    DocumentErrorCode.EMBEDDING_FAILED,
    DocumentErrorCode.INVALID_DOCUMENT_STATE
  ]
};

// ============================================================================
// COMPONENT
// ============================================================================

export const UploadErrorHandler: React.FC<UploadErrorHandlerProps> = ({
  errors,
  onRetry,
  onDismiss,
  onDismissAll,
  retryConfig = DEFAULT_RETRY_CONFIG,
  className = ''
}) => {
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getErrorIcon = (code: string) => {
    const IconComponent = ERROR_ICONS[code as DocumentErrorCode] || AlertCircle;
    return IconComponent;
  };

  const getErrorCategory = (code: string): 'user' | 'system' | 'processing' | 'unknown' => {
    if (ERROR_CATEGORIES.USER_ERROR.includes(code as DocumentErrorCode)) return 'user';
    if (ERROR_CATEGORIES.SYSTEM_ERROR.includes(code as DocumentErrorCode)) return 'system';
    if (ERROR_CATEGORIES.PROCESSING_ERROR.includes(code as DocumentErrorCode)) return 'processing';
    return 'unknown';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'system': return 'bg-red-50 border-red-200 text-red-800';
      case 'processing': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'user': return 'User Error';
      case 'system': return 'System Error';
      case 'processing': return 'Processing Error';
      default: return 'Unknown Error';
    }
  };

  const canRetryError = (error: UploadError): boolean => {
    if (!error.retryable) return false;
    if (!error.documentId) return false;
    
    const retryCount = error.retryCount || 0;
    return retryCount < retryConfig.maxRetries;
  };

  const getNextRetryDelay = (retryCount: number): number => {
    return retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, retryCount);
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleRetry = useCallback(async (error: UploadError) => {
    if (!error.documentId || !canRetryError(error)) return;

    const documentId = error.documentId;
    setRetryingIds(prev => new Set(prev).add(documentId));

    try {
      // Calculate delay for exponential backoff
      const retryCount = error.retryCount || 0;
      const delay = getNextRetryDelay(retryCount);
      
      // Wait for the calculated delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await onRetry(documentId);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  }, [onRetry, retryConfig]);

  const toggleErrorExpansion = useCallback((errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderErrorSummary = () => {
    if (errors.length === 0) return null;

    const userErrors = errors.filter(e => getErrorCategory(e.code) === 'user').length;
    const systemErrors = errors.filter(e => getErrorCategory(e.code) === 'system').length;
    const processingErrors = errors.filter(e => getErrorCategory(e.code) === 'processing').length;
    const retryableErrors = errors.filter(canRetryError).length;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-red-700">Upload Errors Summary</CardTitle>
            <div className="flex space-x-2">
              {retryableErrors > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    errors.filter(canRetryError).forEach(error => {
                      if (error.documentId) handleRetry(error);
                    });
                  }}
                  disabled={retryingIds.size > 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry All ({retryableErrors})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onDismissAll}
              >
                Dismiss All
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-600">{errors.length}</p>
              <p className="text-sm text-gray-600">Total Errors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{userErrors}</p>
              <p className="text-sm text-gray-600">User Errors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{systemErrors}</p>
              <p className="text-sm text-gray-600">System Errors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{processingErrors}</p>
              <p className="text-sm text-gray-600">Processing Errors</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSingleError = (error: UploadError, index: number) => {
    const errorId = error.documentId || `error-${index}`;
    const category = getErrorCategory(error.code);
    const IconComponent = getErrorIcon(error.code);
    const isRetrying = error.documentId ? retryingIds.has(error.documentId) : false;
    const isExpanded = expandedErrors.has(errorId);
    const canRetry = canRetryError(error);

    return (
      <Card key={errorId} className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <IconComponent className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {error.filename || 'Unknown File'}
                  </h3>
                  <Badge className={getCategoryColor(category)}>
                    {getCategoryLabel(category)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{error.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Error Code: {error.code} • {new Date(error.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetry(error)}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry ({(error.retryCount || 0) + 1}/{retryConfig.maxRetries})
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => error.documentId && onDismiss(error.documentId)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Suggested Action */}
          {error.suggestedAction && (
            <Alert className="mb-3">
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Suggested Action:</strong> {error.suggestedAction}
              </AlertDescription>
            </Alert>
          )}

          {/* Retry Information */}
          {canRetry && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Clock className="h-4 w-4" />
                <span>
                  Next retry in {Math.round(getNextRetryDelay(error.retryCount || 0) / 1000)}s
                  ({retryConfig.maxRetries - (error.retryCount || 0)} attempts remaining)
                </span>
              </div>
            </div>
          )}

          {/* Expandable Details */}
          {error.details && (
            <Collapsible open={isExpanded} onOpenChange={() => toggleErrorExpansion(errorId)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span>Technical Details</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-gray-50 border rounded-lg">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {typeof error.details === 'string' 
                      ? error.details 
                      : JSON.stringify(error.details, null, 2)
                    }
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {renderErrorSummary()}
      
      <div className="space-y-3">
        {errors.map(renderSingleError)}
      </div>
    </div>
  );
};

export default UploadErrorHandler;