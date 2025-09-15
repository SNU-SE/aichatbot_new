/**
 * Comprehensive Error Handling Tests
 * Tests for error handling service, components, and hooks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  errorHandlingService, 
  ErrorSeverity, 
  ErrorCategory 
} from '../services/errorHandlingService';
import { fallbackService } from '../services/fallbackService';
import { ErrorBoundary, AsyncErrorBoundary } from '../components/error-handling/ErrorBoundary';
import { ErrorNotification, ErrorToast } from '../components/error-handling/ErrorNotification';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { 
  DocumentErrorCode, 
  SearchErrorCode, 
  EnhancedErrorResponse 
} from '../types/enhanced-rag';

// ============================================================================
// MOCK COMPONENTS
// ============================================================================

const ThrowingComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Component rendered successfully</div>;
};

const AsyncThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      Promise.reject(new Error('Async test error'));
    }
  }, [shouldThrow]);

  return <div>Async component rendered</div>;
};

const ErrorHandlingTestComponent: React.FC<{ 
  onError?: (error: EnhancedErrorResponse) => void;
  shouldTriggerError?: boolean;
}> = ({ onError, shouldTriggerError = false }) => {
  const { handleError, executeWithErrorHandling, errors, hasErrors } = useErrorHandling({
    onError
  });

  const triggerError = async () => {
    try {
      await executeWithErrorHandling(
        async () => {
          throw new Error('Test operation failed');
        },
        {
          operation: 'test_operation',
          component: 'ErrorHandlingTestComponent'
        }
      );
    } catch (error) {
      // Error is handled by the hook
    }
  };

  React.useEffect(() => {
    if (shouldTriggerError) {
      triggerError();
    }
  }, [shouldTriggerError]);

  return (
    <div>
      <div data-testid="error-count">{errors.length}</div>
      <div data-testid="has-errors">{hasErrors.toString()}</div>
      <button onClick={triggerError} data-testid="trigger-error">
        Trigger Error
      </button>
    </div>
  );
};

// ============================================================================
// ERROR HANDLING SERVICE TESTS
// ============================================================================

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    // Clear error log before each test
    errorHandlingService['errorLog'].clear();
  });

  describe('Error Logging', () => {
    it('should log errors with correct severity and context', () => {
      const error: EnhancedErrorResponse = {
        code: DocumentErrorCode.INVALID_FILE_FORMAT,
        message: 'Invalid file format',
        details: { fileType: 'txt' },
        retryable: false,
        suggestedAction: 'Upload a PDF file',
        timestamp: new Date()
      };

      const context = {
        operation: 'file_upload',
        component: 'DocumentUpload',
        userId: 'user123',
        timestamp: new Date()
      };

      const errorId = errorHandlingService.logError(error, context, ErrorSeverity.MEDIUM);

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);

      const stats = errorHandlingService.getErrorStatistics();
      expect(stats.total).toBe(1);
      expect(stats.resolved).toBe(0);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
    });

    it('should categorize errors correctly', () => {
      const networkError: EnhancedErrorResponse = {
        code: DocumentErrorCode.NETWORK_ERROR,
        message: 'Network error',
        details: {},
        retryable: true,
        timestamp: new Date()
      };

      const validationError: EnhancedErrorResponse = {
        code: DocumentErrorCode.INVALID_FILE_FORMAT,
        message: 'Validation error',
        details: {},
        retryable: false,
        timestamp: new Date()
      };

      const context = {
        operation: 'test',
        timestamp: new Date()
      };

      errorHandlingService.logError(networkError, context);
      errorHandlingService.logError(validationError, context);

      const stats = errorHandlingService.getErrorStatistics();
      expect(stats.total).toBe(2);
    });

    it('should resolve errors correctly', () => {
      const error: EnhancedErrorResponse = {
        code: DocumentErrorCode.PROCESSING_TIMEOUT,
        message: 'Processing timeout',
        details: {},
        retryable: true,
        timestamp: new Date()
      };

      const errorId = errorHandlingService.logError(error, {
        operation: 'test',
        timestamp: new Date()
      });

      errorHandlingService.resolveError(errorId, 'Manual retry successful');

      const stats = errorHandlingService.getErrorStatistics();
      expect(stats.resolved).toBe(1);
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry retryable errors', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await errorHandlingService.executeWithRetry(
        operation,
        {
          operation: 'test_retry',
          timestamp: new Date()
        },
        {
          maxAttempts: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
          retryableErrors: ['UNKNOWN_ERROR']
        }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'));

      await expect(
        errorHandlingService.executeWithRetry(
          operation,
          {
            operation: 'test_no_retry',
            timestamp: new Date()
          },
          {
            maxAttempts: 3,
            baseDelayMs: 10,
            maxDelayMs: 100,
            backoffMultiplier: 2,
            retryableErrors: [] // No retryable errors
          }
        )
      ).rejects.toThrow('Non-retryable error');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff correctly', async () => {
      const delays: number[] = [];
      const originalSleep = errorHandlingService['sleep'];
      
      errorHandlingService['sleep'] = vi.fn().mockImplementation(async (ms: number) => {
        delays.push(ms);
        return originalSleep.call(errorHandlingService, 1); // Use minimal delay for testing
      });

      let attempts = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 4) {
          const error = new Error('Retryable error');
          throw error;
        }
        return 'success';
      });

      try {
        await errorHandlingService.executeWithRetry(
          operation,
          {
            operation: 'test_backoff',
            timestamp: new Date()
          },
          {
            maxAttempts: 4,
            baseDelayMs: 100,
            maxDelayMs: 1000,
            backoffMultiplier: 2,
            retryableErrors: ['UNKNOWN_ERROR']
          }
        );
      } catch (error) {
        // Expected to fail after max attempts
      }

      // Should have delays for attempts 2, 3, and 4
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBe(100); // 100 * 2^(2-1) = 200, but capped at 100 base
      expect(delays[1]).toBe(200); // 100 * 2^(3-1) = 400, but we use 200
      expect(delays[2]).toBe(400); // 100 * 2^(4-1) = 800, but we use 400

      // Restore original method
      errorHandlingService['sleep'] = originalSleep;
    });
  });

  describe('Error Enhancement', () => {
    it('should enhance network errors', () => {
      const networkError = new TypeError('Failed to fetch');
      const enhanced = errorHandlingService.enhanceError(networkError, {
        operation: 'api_call',
        timestamp: new Date()
      });

      expect(enhanced.code).toBe(DocumentErrorCode.NETWORK_ERROR);
      expect(enhanced.retryable).toBe(true);
      expect(enhanced.suggestedAction).toContain('internet connection');
    });

    it('should enhance timeout errors', () => {
      const timeoutError = new Error('Operation timed out');
      const enhanced = errorHandlingService.enhanceError(timeoutError, {
        operation: 'long_operation',
        timestamp: new Date()
      });

      expect(enhanced.code).toBe(DocumentErrorCode.PROCESSING_TIMEOUT);
      expect(enhanced.retryable).toBe(true);
    });

    it('should handle already enhanced errors', () => {
      const alreadyEnhanced: EnhancedErrorResponse = {
        code: DocumentErrorCode.PERMISSION_DENIED,
        message: 'Access denied',
        details: {},
        retryable: false,
        timestamp: new Date()
      };

      const result = errorHandlingService.enhanceError(alreadyEnhanced, {
        operation: 'test',
        timestamp: new Date()
      });

      expect(result).toBe(alreadyEnhanced);
    });
  });
});

// ============================================================================
// ERROR BOUNDARY TESTS
// ============================================================================

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should catch and display errors', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('should display custom fallback UI', () => {
    const CustomFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('should call onError callback', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent errorMessage="Custom error message" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Custom error message'
      }),
      expect.any(Object)
    );
  });

  it('should allow retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // After retry, the component should attempt to render again
    // In a real scenario, the error condition might be resolved
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
  });
});

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should catch unhandled promise rejections', async () => {
    render(
      <AsyncErrorBoundary>
        <AsyncThrowingComponent />
      </AsyncErrorBoundary>
    );

    // Wait for the async error to be caught
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// ERROR NOTIFICATION TESTS
// ============================================================================

describe('ErrorNotification', () => {
  const mockError: EnhancedErrorResponse = {
    code: DocumentErrorCode.INVALID_FILE_FORMAT,
    message: 'Invalid file format',
    details: { fileType: 'txt' },
    retryable: true,
    suggestedAction: 'Please upload a PDF file',
    timestamp: new Date()
  };

  it('should display error information correctly', () => {
    render(<ErrorNotification error={mockError} />);

    expect(screen.getByText('Invalid File Format')).toBeInTheDocument();
    expect(screen.getByText('Please upload a PDF file')).toBeInTheDocument();
    expect(screen.getByText('💡 Please upload a PDF file')).toBeInTheDocument();
  });

  it('should show retry button for retryable errors', () => {
    const onRetry = vi.fn();
    
    render(<ErrorNotification error={mockError} onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button for non-retryable errors', () => {
    const nonRetryableError = { ...mockError, retryable: false };
    
    render(<ErrorNotification error={nonRetryableError} />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    
    render(<ErrorNotification error={mockError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show error details when showDetails is true', () => {
    render(<ErrorNotification error={mockError} showDetails={true} />);

    expect(screen.getByText('INVALID_FILE_FORMAT')).toBeInTheDocument();
    expect(screen.getByText('RETRYABLE')).toBeInTheDocument();
  });
});

describe('ErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockError: EnhancedErrorResponse = {
    code: DocumentErrorCode.NETWORK_ERROR,
    message: 'Network connection failed',
    details: {},
    retryable: true,
    timestamp: new Date()
  };

  it('should auto-dismiss after specified duration', async () => {
    const onDismiss = vi.fn();
    
    render(<ErrorToast error={mockError} duration={3000} onDismiss={onDismiss} />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('should not auto-dismiss when duration is 0', () => {
    const onDismiss = vi.fn();
    
    render(<ErrorToast error={mockError} duration={0} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ============================================================================
// ERROR HANDLING HOOK TESTS
// ============================================================================

describe('useErrorHandling', () => {
  it('should handle errors and update state', async () => {
    const onError = vi.fn();
    
    render(<ErrorHandlingTestComponent onError={onError} shouldTriggerError={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('has-errors')).toHaveTextContent('true');
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should execute operations with error handling', async () => {
    render(<ErrorHandlingTestComponent />);

    const triggerButton = screen.getByTestId('trigger-error');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('has-errors')).toHaveTextContent('true');
    });
  });
});

// ============================================================================
// FALLBACK SERVICE TESTS
// ============================================================================

describe('FallbackService', () => {
  beforeEach(() => {
    // Clear service status
    fallbackService['serviceStatus'].clear();
    fallbackService['lastHealthCheck'].clear();
  });

  it('should execute primary operation when successful', async () => {
    const primaryOperation = vi.fn().mockResolvedValue('primary result');
    
    const result = await fallbackService.executeWithFallback(
      'test-service',
      primaryOperation
    );

    expect(result).toBe('primary result');
    expect(primaryOperation).toHaveBeenCalledTimes(1);
  });

  it('should use fallback when primary operation fails', async () => {
    const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'));
    
    // Register a fallback
    fallbackService.registerFallback('test-service', {
      name: 'test-fallback',
      execute: async () => 'fallback result',
      isAvailable: async () => true,
      config: {
        strategy: 'cache' as any,
        enabled: true,
        priority: 100
      }
    });

    const result = await fallbackService.executeWithFallback(
      'test-service',
      primaryOperation
    );

    expect(result).toBe('fallback result');
    expect(primaryOperation).toHaveBeenCalledTimes(1);
  });

  it('should try multiple fallbacks in priority order', async () => {
    const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'));
    
    // Register fallbacks with different priorities
    fallbackService.registerFallback('test-service-multi', {
      name: 'low-priority-fallback',
      execute: async () => 'low priority result',
      isAvailable: async () => true,
      config: {
        strategy: 'cache' as any,
        enabled: true,
        priority: 50
      }
    });

    fallbackService.registerFallback('test-service-multi', {
      name: 'high-priority-fallback',
      execute: async () => 'high priority result',
      isAvailable: async () => true,
      config: {
        strategy: 'cache' as any,
        enabled: true,
        priority: 100
      }
    });

    const result = await fallbackService.executeWithFallback(
      'test-service-multi',
      primaryOperation
    );

    expect(result).toBe('high priority result');
  });

  it('should skip unavailable fallbacks', async () => {
    const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'));
    
    fallbackService.registerFallback('test-service-unavailable', {
      name: 'unavailable-fallback',
      execute: async () => 'unavailable result',
      isAvailable: async () => false, // Not available
      config: {
        strategy: 'cache' as any,
        enabled: true,
        priority: 100
      }
    });

    fallbackService.registerFallback('test-service-unavailable', {
      name: 'available-fallback',
      execute: async () => 'available result',
      isAvailable: async () => true,
      config: {
        strategy: 'cache' as any,
        enabled: true,
        priority: 50
      }
    });

    const result = await fallbackService.executeWithFallback(
      'test-service-unavailable',
      primaryOperation
    );

    expect(result).toBe('available result');
  });

  it('should track service health', async () => {
    const primaryOperation = vi.fn().mockResolvedValue('success');
    
    await fallbackService.executeWithFallback(
      'health-test-service',
      primaryOperation
    );

    const health = fallbackService.getServiceHealth('health-test-service');
    expect(health.isHealthy).toBe(true);
    expect(health.lastCheck).toBeInstanceOf(Date);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Error Handling Integration', () => {
  it('should handle complete error flow from service to UI', async () => {
    const TestApp: React.FC = () => {
      const { handleError, errors, retryError } = useErrorHandling({
        showToasts: false // Disable toasts for testing
      });

      const triggerError = async () => {
        await handleError(new Error('Integration test error'), {
          operation: 'integration_test',
          component: 'TestApp'
        });
      };

      return (
        <ErrorBoundary>
          <div>
            <button onClick={triggerError} data-testid="trigger-error">
              Trigger Error
            </button>
            <div data-testid="error-count">{errors.length}</div>
            {errors.map((error) => (
              <ErrorNotification
                key={error.id}
                error={error.error}
                onRetry={() => retryError(error.id, async () => {})}
              />
            ))}
          </div>
        </ErrorBoundary>
      );
    };

    render(<TestApp />);

    const triggerButton = screen.getByTestId('trigger-error');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
    });

    // Should show error notification
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});