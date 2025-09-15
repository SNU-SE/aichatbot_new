/**
 * Security Middleware Component
 * Provides security validation and monitoring for child components
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { securityService, ValidationResult, RateLimitInfo } from '../../services/securityService';
import { auditService, AuditAction, ResourceType } from '../../services/auditService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface SecurityContextType {
  validateInput: (input: string) => ValidationResult;
  checkRateLimit: (endpoint: string) => RateLimitInfo;
  logSecurityEvent: (action: AuditAction, resource: string, details?: any) => Promise<void>;
  isBlocked: boolean;
  securityLevel: SecurityLevel;
}

export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface SecurityMiddlewareProps {
  children: React.ReactNode;
  securityLevel?: SecurityLevel;
  enableRateLimit?: boolean;
  enableInputValidation?: boolean;
  enableAuditLogging?: boolean;
  rateLimitConfig?: {
    maxRequests: number;
    windowMs: number;
  };
  onSecurityViolation?: (violation: SecurityViolation) => void;
}

interface SecurityViolation {
  type: 'rate_limit' | 'invalid_input' | 'suspicious_activity';
  message: string;
  details?: any;
  timestamp: Date;
}

// ============================================================================
// SECURITY CONTEXT
// ============================================================================

const SecurityContext = createContext<SecurityContextType | null>(null);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityMiddleware');
  }
  return context;
};

// ============================================================================
// SECURITY MIDDLEWARE COMPONENT
// ============================================================================

export const SecurityMiddleware: React.FC<SecurityMiddlewareProps> = ({
  children,
  securityLevel = SecurityLevel.MEDIUM,
  enableRateLimit = true,
  enableInputValidation = true,
  enableAuditLogging = true,
  rateLimitConfig = { maxRequests: 100, windowMs: 15 * 60 * 1000 },
  onSecurityViolation
}) => {
  // Helper function to generate client ID
  const generateClientId = (): string => {
    // Generate a unique client ID based on session and browser fingerprint
    const sessionId = sessionStorage.getItem('security_session_id') || 
      securityService.generateSecureToken(16);
    
    if (!sessionStorage.getItem('security_session_id')) {
      sessionStorage.setItem('security_session_id', sessionId);
    }
    
    return sessionId;
  };

  const [isBlocked, setIsBlocked] = useState(false);
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [clientId] = useState(() => generateClientId());

  useEffect(() => {
    // Initialize security monitoring
    initializeSecurityMonitoring();
    
    // Cleanup rate limit store periodically
    const cleanupInterval = setInterval(() => {
      securityService.cleanupRateLimitStore();
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  const initializeSecurityMonitoring = () => {
    // Set up security event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Monitor for suspicious DOM manipulation
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(handleDOMChanges);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['onclick', 'onload', 'onerror']
      });
    }
  };

  const handleGlobalError = (event: ErrorEvent) => {
    if (enableAuditLogging) {
      auditService.logSecurityEvent(
        null,
        AuditAction.SYSTEM_ERROR,
        'global_error',
        false,
        event.message,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (enableAuditLogging) {
      auditService.logSecurityEvent(
        null,
        AuditAction.SYSTEM_ERROR,
        'unhandled_promise_rejection',
        false,
        event.reason?.toString(),
        { reason: event.reason }
      );
    }
  };

  const handleDOMChanges = (mutations: MutationRecord[]) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes') {
        const target = mutation.target as Element;
        const attributeName = mutation.attributeName;
        
        // Check for suspicious script injection
        if (attributeName && ['onclick', 'onload', 'onerror'].includes(attributeName)) {
          const attributeValue = target.getAttribute(attributeName);
          if (attributeValue && securityService.detectXss(attributeValue)) {
            handleSecurityViolation({
              type: 'suspicious_activity',
              message: 'Suspicious DOM attribute detected',
              details: { attribute: attributeName, value: attributeValue },
              timestamp: new Date()
            });
          }
        }
      }
    });
  };

  const validateInput = (input: string): ValidationResult => {
    if (!enableInputValidation) {
      return { isValid: true, sanitizedValue: input, errors: [] };
    }

    // Basic input validation
    const result = securityService.validateUserInput(input);
    
    // Check for suspicious patterns
    if (result.isValid) {
      const isSuspicious = securityService.detectSuspiciousActivity(clientId, input);
      if (isSuspicious) {
        handleSecurityViolation({
          type: 'suspicious_activity',
          message: 'Suspicious input pattern detected',
          details: { input: input.substring(0, 100) },
          timestamp: new Date()
        });
        
        return {
          isValid: false,
          errors: [{
            field: 'input',
            code: 'SUSPICIOUS_PATTERN',
            message: 'Input contains suspicious patterns'
          }]
        };
      }
    }

    return result;
  };

  const checkRateLimit = (endpoint: string): RateLimitInfo => {
    if (!enableRateLimit) {
      return {
        remaining: rateLimitConfig.maxRequests,
        resetTime: new Date(Date.now() + rateLimitConfig.windowMs),
        blocked: false
      };
    }

    const rateLimitInfo = securityService.checkRateLimit(clientId);
    
    if (rateLimitInfo.blocked) {
      setIsBlocked(true);
      handleSecurityViolation({
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        details: { endpoint, clientId },
        timestamp: new Date()
      });
      
      // Auto-unblock after reset time
      setTimeout(() => {
        setIsBlocked(false);
      }, rateLimitInfo.resetTime.getTime() - Date.now());
    }

    return rateLimitInfo;
  };

  const logSecurityEvent = async (
    action: AuditAction, 
    resource: string, 
    details?: any
  ): Promise<void> => {
    if (!enableAuditLogging) return;

    try {
      await auditService.logEvent({
        userId: 'current-user', // This would come from auth context
        action,
        resource: {
          type: ResourceType.SYSTEM,
          name: resource
        },
        resourceId: resource,
        success: true,
        details,
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const handleSecurityViolation = (violation: SecurityViolation) => {
    setViolations(prev => [...prev.slice(-9), violation]); // Keep last 10 violations
    
    if (onSecurityViolation) {
      onSecurityViolation(violation);
    }

    // Log to audit service
    if (enableAuditLogging) {
      auditService.logSecurityEvent(
        null,
        AuditAction.SECURITY_VIOLATION,
        violation.type,
        false,
        violation.message,
        violation.details
      );
    }
  };

  const getClientIP = async (): Promise<string | undefined> => {
    // In a real application, this would be handled by the server
    return 'client-ip';
  };

  const securityContextValue: SecurityContextType = {
    validateInput,
    checkRateLimit,
    logSecurityEvent,
    isBlocked,
    securityLevel
  };

  // Render security alerts if there are violations
  const renderSecurityAlerts = () => {
    if (violations.length === 0) return null;

    const recentViolations = violations.slice(-3); // Show last 3 violations

    return (
      <div className="space-y-2 mb-4">
        {recentViolations.map((violation, index) => (
          <Alert key={index} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Alert:</strong> {violation.message}
              <span className="text-xs block mt-1">
                {violation.timestamp.toLocaleTimeString()}
              </span>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  // Block rendering if security level is critical and there are violations
  if (isBlocked && securityLevel === SecurityLevel.CRITICAL) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-8">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Access Temporarily Blocked</h3>
          <p className="text-muted-foreground mb-4">
            Your access has been temporarily restricted due to security concerns.
          </p>
          <p className="text-sm text-muted-foreground">
            Please wait a few minutes before trying again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SecurityContext.Provider value={securityContextValue}>
      <div className="security-middleware">
        {renderSecurityAlerts()}
        {children}
      </div>
    </SecurityContext.Provider>
  );
};

// ============================================================================
// SECURITY HOC
// ============================================================================

export const withSecurity = <P extends object>(
  Component: React.ComponentType<P>,
  securityConfig?: Partial<SecurityMiddlewareProps>
) => {
  return (props: P) => (
    <SecurityMiddleware {...securityConfig}>
      <Component {...props} />
    </SecurityMiddleware>
  );
};

// ============================================================================
// SECURITY HOOKS
// ============================================================================

export const useSecureInput = () => {
  const { validateInput } = useSecurityContext();
  
  return {
    validateAndSanitize: (input: string) => {
      const result = validateInput(input);
      return {
        isValid: result.isValid,
        value: result.sanitizedValue || input,
        errors: result.errors
      };
    }
  };
};

export const useRateLimit = (endpoint: string) => {
  const { checkRateLimit } = useSecurityContext();
  
  return {
    checkLimit: () => checkRateLimit(endpoint),
    isAllowed: () => !checkRateLimit(endpoint).blocked
  };
};

export const useSecurityAudit = () => {
  const { logSecurityEvent } = useSecurityContext();
  
  return {
    logAction: logSecurityEvent
  };
};

export default SecurityMiddleware;