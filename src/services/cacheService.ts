/**
 * Cache Service
 * Provides multi-layer caching for enhanced RAG system performance
 */

import { supabase } from '@/integrations/supabase/client';

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items
  strategy: 'lru' | 'fifo' | 'lfu'; // Cache eviction strategy
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

/**
 * Multi-layer cache implementation
 */
export class CacheService {
  private static instance: CacheService;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private indexedDBCache: IDBDatabase | null = null;
  private stats = {
    hits: 0,
    misses: 0,
  };

  // Default cache configurations for different data types
  private readonly configs: Record<string, CacheConfig> = {
    search: { ttl: 5 * 60 * 1000, maxSize: 100, strategy: 'lru' }, // 5 minutes
    documents: { ttl: 30 * 60 * 1000, maxSize: 50, strategy: 'lru' }, // 30 minutes
    chat: { ttl: 60 * 60 * 1000, maxSize: 20, strategy: 'lru' }, // 1 hour
    analytics: { ttl: 10 * 60 * 1000, maxSize: 30, strategy: 'lru' }, // 10 minutes
    embeddings: { ttl: 24 * 60 * 60 * 1000, maxSize: 200, strategy: 'lfu' }, // 24 hours
  };

  private constructor() {
    this.initIndexedDB();
    this.startCleanupInterval();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EnhancedRAGCache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for different cache types
        const cacheTypes = ['search', 'documents', 'chat', 'analytics', 'embeddings'];
        
        cacheTypes.forEach(type => {
          if (!db.objectStoreNames.contains(type)) {
            const store = db.createObjectStore(type, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('ttl', 'ttl', { unique: false });
          }
        });
      };
    });
  }

  /**
   * Get data from cache (memory first, then IndexedDB)
   */
  public async get<T>(key: string, type: string = 'default'): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      this.stats.hits++;
      return memoryEntry.data;
    }

    // Check IndexedDB cache
    if (this.indexedDBCache) {
      try {
        const transaction = this.indexedDBCache.transaction([type], 'readonly');
        const store = transaction.objectStore(type);
        const request = store.get(key);

        return new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result && this.isValidIndexedDBEntry(result)) {
              // Move to memory cache for faster access
              this.setMemoryCache(key, result.data, type);
              this.stats.hits++;
              resolve(result.data);
            } else {
              this.stats.misses++;
              resolve(null);
            }
          };

          request.onerror = () => {
            this.stats.misses++;
            resolve(null);
          };
        });
      } catch (error) {
        console.error('IndexedDB cache read error:', error);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set data in cache (both memory and IndexedDB)
   */
  public async set<T>(key: string, data: T, type: string = 'default'): Promise<void> {
    const config = this.configs[type] || this.configs.search;
    
    // Set in memory cache
    this.setMemoryCache(key, data, type);

    // Set in IndexedDB cache
    if (this.indexedDBCache) {
      try {
        const transaction = this.indexedDBCache.transaction([type], 'readwrite');
        const store = transaction.objectStore(type);
        
        const entry = {
          key,
          data,
          timestamp: Date.now(),
          ttl: config.ttl,
          accessCount: 1,
          lastAccessed: Date.now(),
        };

        store.put(entry);
      } catch (error) {
        console.error('IndexedDB cache write error:', error);
      }
    }
  }

  /**
   * Set data in memory cache with eviction
   */
  private setMemoryCache<T>(key: string, data: T, type: string): void {
    const config = this.configs[type] || this.configs.search;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    // Check if we need to evict entries
    if (this.memoryCache.size >= config.maxSize) {
      this.evictMemoryCache(config);
    }

    this.memoryCache.set(key, entry);
  }

  /**
   * Evict entries from memory cache based on strategy
   */
  private evictMemoryCache(config: CacheConfig): void {
    const entries = Array.from(this.memoryCache.entries());
    
    switch (config.strategy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'fifo':
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
    }

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Check if IndexedDB entry is valid
   */
  private isValidIndexedDBEntry(entry: any): boolean {
    return entry && Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Delete specific cache entry
   */
  public async delete(key: string, type: string = 'default'): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from IndexedDB cache
    if (this.indexedDBCache) {
      try {
        const transaction = this.indexedDBCache.transaction([type], 'readwrite');
        const store = transaction.objectStore(type);
        store.delete(key);
      } catch (error) {
        console.error('IndexedDB cache delete error:', error);
      }
    }
  }

  /**
   * Clear all cache entries of a specific type
   */
  public async clear(type?: string): Promise<void> {
    if (type) {
      // Clear specific type
      const keysToDelete: string[] = [];
      for (const [key] of this.memoryCache) {
        if (key.startsWith(`${type}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.memoryCache.delete(key));

      // Clear from IndexedDB
      if (this.indexedDBCache) {
        try {
          const transaction = this.indexedDBCache.transaction([type], 'readwrite');
          const store = transaction.objectStore(type);
          store.clear();
        } catch (error) {
          console.error('IndexedDB cache clear error:', error);
        }
      }
    } else {
      // Clear all caches
      this.memoryCache.clear();
      
      if (this.indexedDBCache) {
        try {
          const cacheTypes = ['search', 'documents', 'chat', 'analytics', 'embeddings'];
          for (const cacheType of cacheTypes) {
            const transaction = this.indexedDBCache.transaction([cacheType], 'readwrite');
            const store = transaction.objectStore(cacheType);
            store.clear();
          }
        } catch (error) {
          console.error('IndexedDB cache clear all error:', error);
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      size: this.memoryCache.size,
      maxSize: Math.max(...Object.values(this.configs).map(c => c.maxSize)),
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));

    // Also cleanup IndexedDB periodically
    this.cleanupIndexedDBExpiredEntries();
  }

  /**
   * Clean up expired entries from IndexedDB
   */
  private async cleanupIndexedDBExpiredEntries(): Promise<void> {
    if (!this.indexedDBCache) return;

    const cacheTypes = ['search', 'documents', 'chat', 'analytics', 'embeddings'];
    const now = Date.now();

    for (const type of cacheTypes) {
      try {
        const transaction = this.indexedDBCache.transaction([type], 'readwrite');
        const store = transaction.objectStore(type);
        const index = store.index('timestamp');
        
        const request = index.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry = cursor.value;
            if (now - entry.timestamp > entry.ttl) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      } catch (error) {
        console.error(`IndexedDB cleanup error for ${type}:`, error);
      }
    }
  }

  /**
   * Preload frequently accessed data
   */
  public async preloadData(keys: string[], type: string): Promise<void> {
    // This could be implemented to preload data based on usage patterns
    console.log(`Preloading ${keys.length} items of type ${type}`);
  }

  /**
   * Get cache key for search queries
   */
  public static getSearchCacheKey(query: string, options: any = {}): string {
    const optionsStr = JSON.stringify(options);
    return `search:${btoa(query + optionsStr)}`;
  }

  /**
   * Get cache key for document data
   */
  public static getDocumentCacheKey(documentId: string, operation: string = 'get'): string {
    return `documents:${documentId}:${operation}`;
  }

  /**
   * Get cache key for chat sessions
   */
  public static getChatCacheKey(sessionId: string, operation: string = 'messages'): string {
    return `chat:${sessionId}:${operation}`;
  }

  /**
   * Get cache key for analytics data
   */
  public static getAnalyticsCacheKey(userId: string, dateRange: string): string {
    return `analytics:${userId}:${dateRange}`;
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

// Cache decorators for service methods
export function cached(type: string, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator ? keyGenerator(...args) : `${type}:${JSON.stringify(args)}`;
      
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey, type);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);
      
      // Cache the result
      await cacheService.set(cacheKey, result, type);
      
      return result;
    };

    return descriptor;
  };
}