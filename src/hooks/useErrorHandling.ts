/**
 * Error Handling Hook
 * React hook for managing errors, retries, and recovery
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  errorHandlingService, 
  ErrorSeverity, 
  ErrorLogEntry, 
  RetryConfig 
} from '@/services/errorHandlingService';
import { 
  EnhancedErrorResponse, 
  DocumentErrorCode, 
  SearchErrorCode 
} from '@/types/enhanced-rag';

// ============================================================================
// HOOK OPTIONS
// ============================================================================

export interface UseErrorHandlingOptions {
  showToasts?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryConfig?: Partial<RetryConfig>;
  onError?: (error: EnhancedErrorResponse) => void;
  onRecovery?: (error: EnhancedErrorResponse) => void;
}

export interface ErrorState {
  errors: Map<string, ErrorLogEntry>;
  isLoading: boolean;
  lastError: EnhancedErrorResponse | null;
}

// ============================================================================
// ERROR HANDLING HOOK
// ============================================================================

export const useErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  const {
    showToasts = true,
    autoRetry = true,
    maxRetries = 3,
    retryConfig,
    onError,
    onRecovery
  } = options;

  const { toast } = useToast();
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: new Map(),
    isLoading: false,
    lastError: null
  });

  const retryAttempts = useRef<Map<string, number>>(new Map());

  // ============================================================================
  // ERROR LISTENER
  // ============================================================================

  useEffect(() => {
    const unsubscribe = errorHandlingService.addErrorListener((errorEntry) => {
      setErrorState(prev => {
        const newErrors = new Map(prev.errors);
        newErrors.set(errorEntry.id, errorEntry);
        return {
          ...prev,
          errors: newErrors,
          lastError: errorEntry.error
        };
      });

      // Show toast notification
      if (showToasts) {
        const severity = errorEntry.severity;
        const title = getErrorTitle(errorEntry.error);
        const description = getErrorDescription(errorEntry.error);

        if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
          toast({
            title,
            description,
            variant: 'destructive'
          });
        } else if (severity === ErrorSeverity.MEDIUM) {
          toast({
            title,
            description,
            variant: 'default'
          });
        }
      }

      // Call custom error handler
      if (onError) {
        onError(errorEntry.error);
      }
    });

    return unsubscribe;
  }, [showToasts, onError, toast]);

  // ============================================================================
  // ERROR HANDLING FUNCTIONS
  // ============================================================================

  /**
   * Handle an error with automatic retry and recovery
   */
  const handleError = useCallback(async (
    error: any,
    context: {
      operation: string;
      component?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> => {
    const enhancedError = errorHandlingService.enhanceError(error, {
      ...context,
      timestamp: new Date()
    });

    const errorId = errorHandlingService.logError(
      enhancedError,
      {
        ...context,
        timestamp: new Date()
      },
      getErrorSeverity(enhancedError)
    );

    // Attempt automatic recovery
    if (autoRetry && enhancedError.retryable) {
      const currentAttempts = retryAttempts.current.get(enhancedError.code) || 0;
      
      if (currentAttempts < maxRetries) {
        retryAttempts.current.set(enhancedError.code, currentAttempts + 1);
        
        try {
          const recovered = await errorHandlingService.attemptRecovery(enhancedError, {
            ...context,
            timestamp: new Date()
          });

          if (recovered && onRecovery) {
            onRecovery(enhancedError);
            errorHandlingService.resolveError(errorId, 'Automatic recovery successful');
          }
        } catch (recoveryError) {
          console.warn('Recovery attempt failed:', recoveryError);
        }
      }
    }

    return errorId;
  }, [autoRetry, maxRetries, onRecovery]);

  /**
   * Execute operation with error handling and retry
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: {
      operation: string;
      component?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<T> => {
    setErrorState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await errorHandlingService.executeWithRetry(
        operation,
        {
          ...context,
          timestamp: new Date()
        },
        retryConfig
      );

      setErrorState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      setErrorState(prev => ({ ...prev, isLoading: false }));
      await handleError(error, context);
      throw error;
    }
  }, [handleError, retryConfig]);

  /**
   * Retry a specific error
   */
  const retryError = useCallback(async (
    errorId: string,
    operation: () => Promise<void>
  ): Promise<boolean> => {
    const errorEntry = errorState.errors.get(errorId);
    if (!errorEntry || !errorEntry.error.retryable) {
      return false;
    }

    try {
      setErrorState(prev => ({ ...prev, isLoading: true }));
      await operation();
      
      errorHandlingService.resolveError(errorId, 'Manual retry successful');
      setErrorState(prev => {
        const newErrors = new Map(prev.errors);
        const updatedEntry = { ...errorEntry, resolved: true, resolvedAt: new Date() };
        newErrors.set(errorId, updatedEntry);
        return {
          ...prev,
          errors: newErrors,
          isLoading: false
        };
      });

      if (showToasts) {
        toast({
          title: 'Success',
          description: 'Operation completed successfully',
          variant: 'default'
        });
      }

      return true;
    } catch (error) {
      setErrorState(prev => ({ ...prev, isLoading: false }));
      await handleError(error, {
        operation: 'retry_operation',
        metadata: { originalErrorId: errorId }
      });
      return false;
    }
  }, [errorState.errors, handleError, showToasts, toast]);

  /**
   * Dismiss an error
   */
  const dismissError = useCallback((errorId: string) => {
    setErrorState(prev => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(errorId);
      return {
        ...prev,
        errors: newErrors
      };
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      errors: new Map(),
      lastError: null
    }));
    retryAttempts.current.clear();
  }, []);

  /**
   * Resolve an error manually
   */
  const resolveError = useCallback((errorId: string, resolution: string) => {
    errorHandlingService.resolveError(errorId, resolution);
    
    setErrorState(prev => {
      const newErrors = new Map(prev.errors);
      const errorEntry = newErrors.get(errorId);
      if (errorEntry) {
        newErrors.set(errorId, {
          ...errorEntry,
          resolved: true,
          resolvedAt: new Date(),
          resolution
        });
      }
      return {
        ...prev,
        errors: newErrors
      };
    });
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const errorStats = {
    total: errorState.errors.size,
    unresolved: Array.from(errorState.errors.values()).filter(e => !e.resolved).length,
    critical: Array.from(errorState.errors.values()).filter(e => 
      e.severity === ErrorSeverity.CRITICAL && !e.resolved
    ).length,
    retryable: Array.from(errorState.errors.values()).filter(e => 
      e.error.retryable && !e.resolved
    ).length
  };

  const hasErrors = errorStats.unresolved > 0;
  const hasCriticalErrors = errorStats.critical > 0;

  return {
    // State
    errors: Array.from(errorState.errors.values()),
    isLoading: errorState.isLoading,
    lastError: errorState.lastError,
    hasErrors,
    hasCriticalErrors,
    errorStats,

    // Actions
    handleError,
    executeWithErrorHandling,
    retryError,
    dismissError,
    clearErrors,
    resolveError
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getErrorTitle(error: EnhancedErrorResponse): string {
  const titles: Record<string, string> = {
    [DocumentErrorCode.INVALID_FILE_FORMAT]: 'Invalid File Format',
    [DocumentErrorCode.FILE_TOO_LARGE]: 'File Too Large',
    [DocumentErrorCode.EXTRACTION_FAILED]: 'Text Extraction Failed',
    [DocumentErrorCode.EMBEDDING_FAILED]: 'Processing Failed',
    [DocumentErrorCode.STORAGE_ERROR]: 'Storage Error',
    [DocumentErrorCode.PERMISSION_DENIED]: 'Access Denied',
    [DocumentErrorCode.DOCUMENT_NOT_FOUND]: 'Document Not Found',
    [DocumentErrorCode.PROCESSING_TIMEOUT]: 'Processing Timeout',
    [DocumentErrorCode.NETWORK_ERROR]: 'Connection Error',
    [SearchErrorCode.QUERY_TOO_SHORT]: 'Search Query Too Short',
    [SearchErrorCode.EMBEDDING_GENERATION_FAILED]: 'Search Processing Failed',
    [SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE]: 'Search Unavailable',
    [SearchErrorCode.NO_ACCESSIBLE_DOCUMENTS]: 'No Documents Available'
  };

  return titles[error.code] || 'Error';
}

function getErrorDescription(error: EnhancedErrorResponse): string {
  return error.suggestedAction || error.message || 'An unexpected error occurred';
}

function getErrorSeverity(error: EnhancedErrorResponse): ErrorSeverity {
  const criticalErrors = [
    DocumentErrorCode.STORAGE_ERROR,
    DocumentErrorCode.PROCESSING_TIMEOUT
  ];

  const highErrors = [
    DocumentErrorCode.EXTRACTION_FAILED,
    DocumentErrorCode.EMBEDDING_FAILED,
    DocumentErrorCode.NETWORK_ERROR,
    SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE
  ];

  const mediumErrors = [
    DocumentErrorCode.PERMISSION_DENIED,
    DocumentErrorCode.DOCUMENT_NOT_FOUND,
    SearchErrorCode.NO_ACCESSIBLE_DOCUMENTS
  ];

  if (criticalErrors.includes(error.code as DocumentErrorCode)) {
    return ErrorSeverity.CRITICAL;
  }
  
  if (highErrors.includes(error.code as DocumentErrorCode | SearchErrorCode)) {
    return ErrorSeverity.HIGH;
  }
  
  if (mediumErrors.includes(error.code as DocumentErrorCode | SearchErrorCode)) {
    return ErrorSeverity.MEDIUM;
  }

  return ErrorSeverity.LOW;
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for document upload error handling
 */
export const useDocumentUploadErrorHandling = () => {
  return useErrorHandling({
    showToasts: true,
    autoRetry: true,
    maxRetries: 2,
    retryConfig: {
      retryableErrors: [
        DocumentErrorCode.NETWORK_ERROR,
        DocumentErrorCode.STORAGE_ERROR,
        DocumentErrorCode.PROCESSING_TIMEOUT
      ]
    }
  });
};

/**
 * Hook for search error handling
 */
export const useSearchErrorHandling = () => {
  return useErrorHandling({
    showToasts: true,
    autoRetry: true,
    maxRetries: 3,
    retryConfig: {
      retryableErrors: [
        SearchErrorCode.EMBEDDING_GENERATION_FAILED,
        SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE
      ]
    }
  });
};

/**
 * Hook for chat error handling
 */
export const useChatErrorHandling = () => {
  return useErrorHandling({
    showToasts: true,
    autoRetry: false, // Don't auto-retry chat messages
    maxRetries: 1
  });
};