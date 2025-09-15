/**
 * Error Handling Components Export
 * Centralized exports for all error handling components
 */

// Core Error Handling Components
export { ErrorBoundary, AsyncErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { 
  ErrorNotification, 
  ErrorToast, 
  ErrorList,
  type ErrorNotificationProps,
  type ErrorToastProps,
  type ErrorListProps
} from './ErrorNotification';

// Monitoring and Dashboard
export { ErrorMonitoringDashboard } from './ErrorMonitoringDashboard';

// Demo Component
export { ErrorHandlingDemo } from './ErrorHandlingDemo';

// Services
export { 
  errorHandlingService,
  ErrorSeverity,
  ErrorCategory,
  type RetryConfig,
  type ErrorContext,
  type ErrorLogEntry,
  type RecoveryStrategy
} from '../../services/errorHandlingService';

export {
  fallbackService,
  FallbackStrategy,
  type FallbackConfig,
  type ServiceFallback
} from '../../services/fallbackService';

// Hooks
export { 
  useErrorHandling,
  useDocumentUploadErrorHandling,
  useSearchErrorHandling,
  useChatErrorHandling,
  type UseErrorHandlingOptions
} from '../../hooks/useErrorHandling';