/**
 * Comprehensive Error Handling Service
 * Centralized error handling, logging, and recovery mechanisms
 */

import { 
  DocumentErrorCode, 
  SearchErrorCode, 
  EnhancedErrorResponse 
} from '@/types/enhanced-rag';

// ============================================================================
// ERROR SEVERITY LEVELS
// ============================================================================

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  PROCESSING = 'processing',
  STORAGE = 'storage',
  SYSTEM = 'system'
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: (DocumentErrorCode | SearchErrorCode | string)[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    DocumentErrorCode.NETWORK_ERROR,
    DocumentErrorCode.PROCESSING_TIMEOUT,
    DocumentErrorCode.STORAGE_ERROR,
    SearchErrorCode.SEARCH_SERVICE_UNAVAILABLE,
    SearchErrorCode.EMBEDDING_GENERATION_FAILED
  ]
};

// ============================================================================
// ERROR CONTEXT
// ============================================================================

export interface ErrorContext {
  userId?: string;
  documentId?: string;
  sessionId?: string;
  operation: string;
  component?: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  timestamp: Date;
}

export interface ErrorLogEntry {
  id: string;
  error: EnhancedErrorResponse;
  context: ErrorContext;
  severity: ErrorSeverity;
  category: ErrorCategory;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

// ============================================================================
// ERROR RECOVERY STRATEGIES
// ============================================================================

export interface RecoveryStrategy {
  name: string;
  description: string;
  execute: (error: EnhancedErrorResponse, context: ErrorContext) => Promise<boolean>;
  applicableErrors: (DocumentErrorCode | SearchErrorCode | string)[];
}

// ============================================================================
// ERROR HANDLING SERVICE
// ============================================================================

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLog: Map<string, ErrorLogEntry> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;
  private listeners: Set<(error: ErrorLogEntry) => void> = new Set();

  private constructor() {
    this.initializeRecoveryStrategies();
  }

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  // ============================================================================
  // ERROR LOGGING AND TRACKING
  // ============================================================================

  /**
   * Log an error with context and severity
   */
  logError(
    error: EnhancedErrorResponse, 
    context: ErrorContext, 
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): string {
    const errorId = this.generateErrorId();
    const category = this.categorizeError(error);

    const logEntry: ErrorLogEntry = {
      id: errorId,
      error,
      context,
      severity,
      category,
      resolved: false
    };

    this.errorLog.set(errorId, logEntry);
    
    // Notify listeners
    this.listeners.forEach(listener => listener(logEntry));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}] ${category.toUpperCase()}:`, {
        error,
        context
      });
    }

    return errorId;
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string, resolution: string): void {
    const logEntry = this.errorLog.get(errorId);
    if (logEntry) {
      logEntry.resolved = true;
      logEntry.resolvedAt = new Date();
      logEntry.resolution = resolution;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    resolved: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
  } {
    const entries = Array.from(this.errorLog.values());
    
    return {
      total: entries.length,
      resolved: entries.filter(e => e.resolved).length,
      bySeverity: entries.reduce((acc, entry) => {
        acc[entry.severity] = (acc[entry.severity] || 0) + 1;
        return acc;
      }, {} as Record<ErrorSeverity, number>),
      byCategory: entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {} as Record<ErrorCategory, number>)
    };
  }

  // ============================================================================
  // RETRY MECHANISMS
  // ============================================================================

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: EnhancedErrorResponse | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const enhancedError = this.enhanceError(error, context);
        lastError = enhancedError;

        // Check if error is retryable
        if (!this.isRetryableError(enhancedError, config)) {
          this.logError(enhancedError, context, ErrorSeverity.HIGH);
          throw enhancedError;
        }

        // Log retry attempt
        this.logError(enhancedError, {
          ...context,
          metadata: { ...context.metadata, attempt, maxAttempts: config.maxAttempts }
        }, ErrorSeverity.LOW);

        // Wait before retry (except on last attempt)
        if (attempt < config.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, config);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      this.logError(lastError, {
        ...context,
        metadata: { ...context.metadata, retriesExhausted: true }
      }, ErrorSeverity.CRITICAL);
      throw lastError;
    }

    throw new Error('Unexpected error in retry logic');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: EnhancedErrorResponse, config: RetryConfig): boolean {
    return error.retryable && config.retryableErrors.includes(error.code);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // ERROR RECOVERY
  // ============================================================================

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error: EnhancedErrorResponse, context: ErrorContext): Promise<boolean> {
    const applicableStrategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.applicableErrors.includes(error.code));

    for (const strategy of applicableStrategies) {
      try {
        const recovered = await strategy.execute(error, context);
        if (recovered) {
          this.logError(error, {
            ...context,
            metadata: { ...context.metadata, recoveryStrategy: strategy.name, recovered: true }
          }, ErrorSeverity.LOW);
          return true;
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    return false;
  }

  /**
   * Register a recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.name, strategy);
  }

  // ============================================================================
  // ERROR ENHANCEMENT
  // ============================================================================

  /**
   * Enhance a raw error with additional context
   */
  enhanceError(error: any, context: ErrorContext): EnhancedErrorResponse {
    if (this.isEnhancedError(error)) {
      return error;
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: DocumentErrorCode.NETWORK_ERROR,
        message: 'Network connection failed',
        details: error.message,
        retryable: true,
        suggestedAction: 'Please check your internet connection and try again',
        timestamp: new Date()
      };
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        code: DocumentErrorCode.PROCESSING_TIMEOUT,
        message: 'Operation timed out',
        details: error.message,
        retryable: true,
        suggestedAction: 'Please try again in a moment',
        timestamp: new Date()
      };
    }

    // Generic error enhancement
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error,
      retryable: false,
      suggestedAction: 'Please contact support if this issue persists',
      timestamp: new Date()
    };
  }

  /**
   * Check if error is already enhanced
   */
  private isEnhancedError(error: any): error is EnhancedErrorResponse {
    return error && typeof error === 'object' && 'code' in error && 'timestamp' in error;
  }

  /**
   * Categorize error by type
   */
  private categorizeError(error: EnhancedErrorResponse): ErrorCategory {
    const networkErrors = [DocumentErrorCode.NETWORK_ERROR];
    const validationErrors = [DocumentErrorCode.INVALID_FILE_FORMAT, DocumentErrorCode.FILE_TOO_LARGE];
    const authErrors = [DocumentErrorCode.PERMISSION_DENIED];
    const processingErrors = [
      DocumentErrorCode.EXTRACTION_FAILED,
      DocumentErrorCode.EMBEDDING_FAILED,
      DocumentErrorCode.PROCESSING_TIMEOUT
    ];
    const storageErrors = [DocumentErrorCode.STORAGE_ERROR, DocumentErrorCode.DOCUMENT_NOT_FOUND];

    if (networkErrors.includes(error.code as DocumentErrorCode)) return ErrorCategory.NETWORK;
    if (validationErrors.includes(error.code as DocumentErrorCode)) return ErrorCategory.VALIDATION;
    if (authErrors.includes(error.code as DocumentErrorCode)) return ErrorCategory.AUTHORIZATION;
    if (processingErrors.includes(error.code as DocumentErrorCode)) return ErrorCategory.PROCESSING;
    if (storageErrors.includes(error.code as DocumentErrorCode)) return ErrorCategory.STORAGE;

    return ErrorCategory.SYSTEM;
  }

  // ============================================================================
  // LISTENERS
  // ============================================================================

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: ErrorLogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Network retry strategy
    this.registerRecoveryStrategy({
      name: 'network_retry',
      description: 'Retry network operations after brief delay',
      applicableErrors: [DocumentErrorCode.NETWORK_ERROR],
      execute: async () => {
        await this.sleep(2000);
        return true; // Allow retry
      }
    });

    // Storage retry strategy
    this.registerRecoveryStrategy({
      name: 'storage_retry',
      description: 'Retry storage operations with exponential backoff',
      applicableErrors: [DocumentErrorCode.STORAGE_ERROR],
      execute: async () => {
        await this.sleep(1000);
        return true; // Allow retry
      }
    });
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();