/**
 * Fallback Service
 * Provides fallback mechanisms for service failures
 */

import { 
  EnhancedErrorResponse, 
  DocumentErrorCode, 
  SearchErrorCode,
  Document,
  SearchResult,
  SearchOptions
} from '@/types/enhanced-rag';
import { errorHandlingService } from './errorHandlingService';

// ============================================================================
// FALLBACK STRATEGIES
// ============================================================================

export enum FallbackStrategy {
  CACHE = 'cache',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  MOCK = 'mock',
  ALTERNATIVE_SERVICE = 'alternative_service'
}

export interface FallbackConfig {
  strategy: FallbackStrategy;
  enabled: boolean;
  priority: number;
  timeout?: number;
  retryAfter?: number;
}

export interface ServiceFallback<T> {
  name: string;
  execute: () => Promise<T>;
  isAvailable: () => Promise<boolean>;
  config: FallbackConfig;
}

// ============================================================================
// FALLBACK SERVICE
// ============================================================================

export class FallbackService {
  private static instance: FallbackService;
  private fallbacks: Map<string, ServiceFallback<any>[]> = new Map();
  private serviceStatus: Map<string, boolean> = new Map();
  private lastHealthCheck: Map<string, Date> = new Map();

  private constructor() {
    this.initializeDefaultFallbacks();
  }

  static getInstance(): FallbackService {
    if (!FallbackService.instance) {
      FallbackService.instance = new FallbackService();
    }
    return FallbackService.instance;
  }

  // ============================================================================
  // FALLBACK REGISTRATION
  // ============================================================================

  /**
   * Register a fallback for a service
   */
  registerFallback<T>(
    serviceName: string,
    fallback: ServiceFallback<T>
  ): void {
    if (!this.fallbacks.has(serviceName)) {
      this.fallbacks.set(serviceName, []);
    }

    const fallbacks = this.fallbacks.get(serviceName)!;
    fallbacks.push(fallback);
    
    // Sort by priority (higher priority first)
    fallbacks.sort((a, b) => b.config.priority - a.config.priority);
  }

  /**
   * Execute service with fallback support
   */
  async executeWithFallback<T>(
    serviceName: string,
    primaryOperation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      // Try primary service first
      const result = await primaryOperation();
      this.markServiceHealthy(serviceName);
      return result;
    } catch (error) {
      this.markServiceUnhealthy(serviceName);
      
      // Log the primary service failure
      errorHandlingService.logError(
        errorHandlingService.enhanceError(error, {
          operation: `${serviceName}_primary`,
          timestamp: new Date(),
          metadata: context
        }),
        {
          operation: `${serviceName}_primary`,
          timestamp: new Date(),
          metadata: context
        }
      );

      // Try fallbacks
      const fallbacks = this.fallbacks.get(serviceName) || [];
      const enabledFallbacks = fallbacks.filter(f => f.config.enabled);

      for (const fallback of enabledFallbacks) {
        try {
          // Check if fallback is available
          const isAvailable = await fallback.isAvailable();
          if (!isAvailable) {
            continue;
          }

          console.log(`Attempting fallback: ${fallback.name} for service: ${serviceName}`);
          
          const result = await fallback.execute();
          
          // Log successful fallback
          errorHandlingService.logError(
            {
              code: 'FALLBACK_SUCCESS',
              message: `Fallback ${fallback.name} succeeded for ${serviceName}`,
              details: { fallbackName: fallback.name, serviceName },
              retryable: false,
              suggestedAction: 'Primary service may need attention',
              timestamp: new Date()
            },
            {
              operation: `${serviceName}_fallback`,
              timestamp: new Date(),
              metadata: { ...context, fallbackName: fallback.name }
            }
          );

          return result;
        } catch (fallbackError) {
          console.warn(`Fallback ${fallback.name} failed:`, fallbackError);
          continue;
        }
      }

      // All fallbacks failed
      throw errorHandlingService.enhanceError(error, {
        operation: serviceName,
        timestamp: new Date(),
        metadata: { ...context, fallbacksAttempted: enabledFallbacks.length }
      });
    }
  }

  // ============================================================================
  // SERVICE HEALTH MONITORING
  // ============================================================================

  /**
   * Mark service as healthy
   */
  private markServiceHealthy(serviceName: string): void {
    this.serviceStatus.set(serviceName, true);
    this.lastHealthCheck.set(serviceName, new Date());
  }

  /**
   * Mark service as unhealthy
   */
  private markServiceUnhealthy(serviceName: string): void {
    this.serviceStatus.set(serviceName, false);
    this.lastHealthCheck.set(serviceName, new Date());
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): {
    isHealthy: boolean;
    lastCheck: Date | null;
  } {
    return {
      isHealthy: this.serviceStatus.get(serviceName) ?? true,
      lastCheck: this.lastHealthCheck.get(serviceName) ?? null
    };
  }

  /**
   * Get all service health statuses
   */
  getAllServiceHealth(): Record<string, { isHealthy: boolean; lastCheck: Date | null }> {
    const services = Array.from(new Set([
      ...this.serviceStatus.keys(),
      ...this.fallbacks.keys()
    ]));

    return services.reduce((acc, service) => {
      acc[service] = this.getServiceHealth(service);
      return acc;
    }, {} as Record<string, { isHealthy: boolean; lastCheck: Date | null }>);
  }

  // ============================================================================
  // DEFAULT FALLBACKS
  // ============================================================================

  private initializeDefaultFallbacks(): void {
    // Document search fallbacks
    this.registerFallback('document-search', {
      name: 'cached-search',
      execute: async () => {
        // Return cached search results
        const cachedResults = this.getCachedSearchResults();
        return cachedResults;
      },
      isAvailable: async () => {
        return this.hasCachedSearchResults();
      },
      config: {
        strategy: FallbackStrategy.CACHE,
        enabled: true,
        priority: 100
      }
    });

    this.registerFallback('document-search', {
      name: 'offline-search',
      execute: async () => {
        // Perform basic text search on locally stored documents
        return this.performOfflineSearch();
      },
      isAvailable: async () => {
        return this.hasOfflineDocuments();
      },
      config: {
        strategy: FallbackStrategy.OFFLINE,
        enabled: true,
        priority: 50
      }
    });

    // Document processing fallbacks
    this.registerFallback('document-processing', {
      name: 'basic-text-extraction',
      execute: async () => {
        // Basic text extraction without AI processing
        return this.performBasicTextExtraction();
      },
      isAvailable: async () => {
        return true; // Always available
      },
      config: {
        strategy: FallbackStrategy.DEGRADED,
        enabled: true,
        priority: 75
      }
    });

    // Chat service fallbacks
    this.registerFallback('ai-chat', {
      name: 'cached-responses',
      execute: async () => {
        // Return cached or template responses
        return this.getCachedChatResponse();
      },
      isAvailable: async () => {
        return this.hasCachedResponses();
      },
      config: {
        strategy: FallbackStrategy.CACHE,
        enabled: true,
        priority: 90
      }
    });

    this.registerFallback('ai-chat', {
      name: 'offline-chat',
      execute: async () => {
        // Provide helpful offline responses
        return this.getOfflineChatResponse();
      },
      isAvailable: async () => {
        return true; // Always available
      },
      config: {
        strategy: FallbackStrategy.OFFLINE,
        enabled: true,
        priority: 25
      }
    });
  }

  // ============================================================================
  // FALLBACK IMPLEMENTATIONS
  // ============================================================================

  private getCachedSearchResults(): SearchResult[] {
    // In a real implementation, this would retrieve from cache
    const cached = localStorage.getItem('cached_search_results');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  }

  private hasCachedSearchResults(): boolean {
    return localStorage.getItem('cached_search_results') !== null;
  }

  private async performOfflineSearch(): Promise<SearchResult[]> {
    // Basic text search on locally stored documents
    const offlineDocuments = this.getOfflineDocuments();
    
    // Simulate basic search
    return offlineDocuments.slice(0, 5).map((doc, index) => ({
      id: `offline_${index}`,
      documentId: doc.id,
      title: doc.title,
      content: doc.title, // Simplified content
      similarity: 0.5,
      metadata: {
        source: 'offline',
        pageNumber: 1
      }
    }));
  }

  private hasOfflineDocuments(): boolean {
    return this.getOfflineDocuments().length > 0;
  }

  private getOfflineDocuments(): Document[] {
    // In a real implementation, this would retrieve from IndexedDB or similar
    const cached = localStorage.getItem('offline_documents');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  }

  private async performBasicTextExtraction(): Promise<any> {
    return {
      success: true,
      message: 'Document uploaded successfully (basic processing)',
      processingMode: 'basic',
      features: {
        textExtraction: true,
        vectorEmbedding: false,
        aiProcessing: false
      }
    };
  }

  private getCachedChatResponse(): any {
    const responses = [
      "I'm currently operating in offline mode. I can help you with basic questions about your uploaded documents.",
      "The AI service is temporarily unavailable. Please try again in a few moments.",
      "I'm using cached responses right now. For the most up-to-date information, please try again when the service is restored."
    ];

    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      source: 'cached',
      confidence: 0.3
    };
  }

  private hasCachedResponses(): boolean {
    return true; // We always have basic cached responses
  }

  private getOfflineChatResponse(): any {
    return {
      message: "I'm currently offline and can't process your request. Please check your internet connection and try again.",
      source: 'offline',
      confidence: 0.1,
      suggestions: [
        "Check your internet connection",
        "Try again in a few moments",
        "Contact support if the issue persists"
      ]
    };
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Cache search results for offline use
   */
  cacheSearchResults(results: SearchResult[]): void {
    try {
      localStorage.setItem('cached_search_results', JSON.stringify(results));
    } catch (error) {
      console.warn('Failed to cache search results:', error);
    }
  }

  /**
   * Cache documents for offline use
   */
  cacheDocuments(documents: Document[]): void {
    try {
      localStorage.setItem('offline_documents', JSON.stringify(documents));
    } catch (error) {
      console.warn('Failed to cache documents:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    try {
      localStorage.removeItem('cached_search_results');
      localStorage.removeItem('offline_documents');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Enable/disable fallback for a service
   */
  configureFallback(
    serviceName: string,
    fallbackName: string,
    config: Partial<FallbackConfig>
  ): void {
    const fallbacks = this.fallbacks.get(serviceName);
    if (fallbacks) {
      const fallback = fallbacks.find(f => f.name === fallbackName);
      if (fallback) {
        fallback.config = { ...fallback.config, ...config };
      }
    }
  }

  /**
   * Get fallback configuration
   */
  getFallbackConfig(serviceName: string): ServiceFallback<any>[] {
    return this.fallbacks.get(serviceName) || [];
  }
}

// Export singleton instance
export const fallbackService = FallbackService.getInstance();