/**
 * Security Service
 * Comprehensive security enhancements including input validation, sanitization, and rate limiting
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  inputValidation: {
    maxStringLength: number;
    allowedHtmlTags: string[];
    allowedFileTypes: string[];
    maxFileSize: number;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  blocked: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface SecurityAuditEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  success: boolean;
  details?: Record<string, any>;
  timestamp: Date;
}

export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_INPUT = 'invalid_input',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  MALICIOUS_FILE_UPLOAD = 'malicious_file_upload',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt'
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const DocumentTitleSchema = z.string()
  .min(1, 'Title is required')
  .max(255, 'Title must be less than 255 characters')
  .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Title contains invalid characters');

const DocumentContentSchema = z.string()
  .min(1, 'Content is required')
  .max(1000000, 'Content is too large'); // 1MB text limit

const UserInputSchema = z.string()
  .max(10000, 'Input is too long')
  .refine(
    (value) => !/<script|javascript:|data:|vbscript:/i.test(value),
    'Input contains potentially malicious content'
  );

const FileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(52428800), // 50MB
  type: z.enum(['application/pdf']),
});

// ============================================================================
// SECURITY SERVICE CLASS
// ============================================================================

class SecurityService {
  private config: SecurityConfig;
  private rateLimitStore: Map<string, { count: number; resetTime: Date }>;
  private suspiciousActivityStore: Map<string, number>;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
        ...config?.rateLimiting
      },
      inputValidation: {
        maxStringLength: 10000,
        allowedHtmlTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedFileTypes: ['application/pdf'],
        maxFileSize: 52428800, // 50MB
        ...config?.inputValidation
      },
      encryption: {
        algorithm: 'AES-GCM',
        keyLength: 256,
        ...config?.encryption
      }
    };

    this.rateLimitStore = new Map();
    this.suspiciousActivityStore = new Map();
  }

  // ============================================================================
  // INPUT VALIDATION AND SANITIZATION
  // ============================================================================

  /**
   * Validate and sanitize user input
   */
  validateInput(input: any, schema: z.ZodSchema): ValidationResult {
    try {
      const result = schema.safeParse(input);
      
      if (!result.success) {
        return {
          isValid: false,
          errors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            code: err.code,
            message: err.message
          }))
        };
      }

      return {
        isValid: true,
        sanitizedValue: result.data,
        errors: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'input',
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed'
        }]
      };
    }
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: this.config.inputValidation.allowedHtmlTags,
      ALLOWED_ATTR: ['href', 'title', 'alt'],
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
  }

  /**
   * Validate document title
   */
  validateDocumentTitle(title: string): ValidationResult {
    return this.validateInput(title, DocumentTitleSchema);
  }

  /**
   * Validate document content
   */
  validateDocumentContent(content: string): ValidationResult {
    return this.validateInput(content, DocumentContentSchema);
  }

  /**
   * Validate user input (chat messages, search queries)
   */
  validateUserInput(input: string): ValidationResult {
    const result = this.validateInput(input, UserInputSchema);
    
    if (result.isValid && result.sanitizedValue) {
      result.sanitizedValue = this.sanitizeHtml(result.sanitizedValue);
    }
    
    return result;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: { name: string; size: number; type: string }): ValidationResult {
    const result = this.validateInput(file, FileUploadSchema);
    
    // Additional security checks
    if (result.isValid) {
      // Check for suspicious file extensions
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
      const fileName = file.name.toLowerCase();
      
      if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
        return {
          isValid: false,
          errors: [{
            field: 'name',
            code: 'SUSPICIOUS_FILE_TYPE',
            message: 'File type is not allowed for security reasons'
          }]
        };
      }

      // Check for double extensions
      const extensionCount = (fileName.match(/\./g) || []).length;
      if (extensionCount > 1) {
        return {
          isValid: false,
          errors: [{
            field: 'name',
            code: 'MULTIPLE_EXTENSIONS',
            message: 'Files with multiple extensions are not allowed'
          }]
        };
      }
    }
    
    return result;
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Check rate limit for a client
   */
  checkRateLimit(clientId: string): RateLimitInfo {
    if (!this.config.rateLimiting.enabled) {
      return {
        remaining: this.config.rateLimiting.maxRequests,
        resetTime: new Date(Date.now() + this.config.rateLimiting.windowMs),
        blocked: false
      };
    }

    const now = new Date();
    const clientData = this.rateLimitStore.get(clientId);

    // Initialize or reset if window expired
    if (!clientData || now >= clientData.resetTime) {
      const resetTime = new Date(now.getTime() + this.config.rateLimiting.windowMs);
      this.rateLimitStore.set(clientId, { count: 1, resetTime });
      
      return {
        remaining: this.config.rateLimiting.maxRequests - 1,
        resetTime,
        blocked: false
      };
    }

    // Check if limit exceeded
    if (clientData.count >= this.config.rateLimiting.maxRequests) {
      this.recordSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        resource: clientId,
        success: false,
        details: { count: clientData.count, limit: this.config.rateLimiting.maxRequests },
        timestamp: now
      });

      return {
        remaining: 0,
        resetTime: clientData.resetTime,
        blocked: true
      };
    }

    // Increment count
    clientData.count++;
    this.rateLimitStore.set(clientId, clientData);

    return {
      remaining: this.config.rateLimiting.maxRequests - clientData.count,
      resetTime: clientData.resetTime,
      blocked: false
    };
  }

  // ============================================================================
  // SECURITY MONITORING
  // ============================================================================

  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity(clientId: string, activity: string): boolean {
    const suspiciousPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /<script/i,
      /javascript:/i,
      /eval\s*\(/i,
      /document\.cookie/i,
      /window\.location/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(activity));
    
    if (isSuspicious) {
      const currentCount = this.suspiciousActivityStore.get(clientId) || 0;
      this.suspiciousActivityStore.set(clientId, currentCount + 1);

      this.recordSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        resource: clientId,
        action: activity,
        success: false,
        details: { pattern: 'malicious_input', count: currentCount + 1 },
        timestamp: new Date()
      });

      return true;
    }

    return false;
  }

  /**
   * Check for SQL injection attempts
   */
  detectSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /(--|\/\*|\*\/|;)/,
      /(\b(or|and)\b\s*\d+\s*=\s*\d+)/i,
      /(\b(or|and)\b\s*['"].*['"])/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS attempts
   */
  detectXss(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // ============================================================================
  // SECURITY HEADERS
  // ============================================================================

  /**
   * Get security headers for HTTP responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://*.supabase.co https://api.openai.com",
        "frame-ancestors 'none'"
      ].join('; '),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  /**
   * Record security event for audit trail
   */
  private recordSecurityEvent(event: SecurityAuditEvent): void {
    // In a real implementation, this would send to a logging service
    console.warn('🚨 Security Event:', {
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      userId: event.userId || 'anonymous',
      resource: event.resource,
      action: event.action,
      success: event.success,
      details: event.details
    });

    // Store in local storage for demo purposes
    try {
      const existingEvents = JSON.parse(localStorage.getItem('security_events') || '[]');
      existingEvents.push(event);
      
      // Keep only last 100 events
      if (existingEvents.length > 100) {
        existingEvents.splice(0, existingEvents.length - 100);
      }
      
      localStorage.setItem('security_events', JSON.stringify(existingEvents));
    } catch (error) {
      console.error('Failed to store security event:', error);
    }
  }

  /**
   * Get security audit events
   */
  getSecurityEvents(limit: number = 50): SecurityAuditEvent[] {
    try {
      const events = JSON.parse(localStorage.getItem('security_events') || '[]');
      return events.slice(-limit).reverse();
    } catch (error) {
      console.error('Failed to retrieve security events:', error);
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate secure random string
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(array);
      let out = '';
      for (let i = 0; i < length; i++) {
        out += chars[array[i] % chars.length];
      }
      return out;
    }
    // Fallback (less secure)
    let fallback = '';
    for (let i = 0; i < length; i++) {
      fallback += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return fallback;
  }

  /**
   * Hash sensitive data (client-side hashing for additional security)
   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimitStore(): void {
    const now = new Date();
    
    for (const [clientId, data] of this.rateLimitStore.entries()) {
      if (now >= data.resetTime) {
        this.rateLimitStore.delete(clientId);
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const securityService = new SecurityService();

// Export validation schemas for use in other modules
export {
  DocumentTitleSchema,
  DocumentContentSchema,
  UserInputSchema,
  FileUploadSchema
};
