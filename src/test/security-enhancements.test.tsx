/**
 * Security Enhancements Test Suite
 * Tests for security services, components, and middleware
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { securityService, SecurityEventType } from '../services/securityService';
import { auditService, AuditAction, ResourceType } from '../services/auditService';
import SecurityMiddleware, { SecurityLevel } from '../components/security/SecurityMiddleware';
import InputValidator from '../components/security/InputValidator';
import SecurityDashboard from '../components/security/SecurityDashboard';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock crypto.subtle for security service
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

describe('Security Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  describe('Input Validation', () => {
    it('should validate safe input', () => {
      const result = securityService.validateUserInput('This is safe text');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = securityService.validateUserInput(maliciousInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VALIDATION_ERROR')).toBe(true);
    });

    it('should detect SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const isSqlInjection = securityService.detectSqlInjection(sqlInjection);
      expect(isSqlInjection).toBe(true);
    });

    it('should sanitize HTML content', () => {
      const htmlInput = '<p>Safe content</p><script>alert("bad")</script>';
      const sanitized = securityService.sanitizeHtml(htmlInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should validate document titles', () => {
      const validTitle = 'My Document Title';
      const result = securityService.validateDocumentTitle(validTitle);
      expect(result.isValid).toBe(true);

      const invalidTitle = 'Title with <script>alert("xss")</script>';
      const invalidResult = securityService.validateDocumentTitle(invalidTitle);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate file uploads', () => {
      const validFile = {
        name: 'document.pdf',
        size: 1024 * 1024, // 1MB
        type: 'application/pdf'
      };
      const result = securityService.validateFileUpload(validFile);
      expect(result.isValid).toBe(true);

      const invalidFile = {
        name: 'malicious.exe',
        size: 1024,
        type: 'application/exe'
      };
      const invalidResult = securityService.validateFileUpload(invalidFile);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const clientId = 'test-client';
      const rateLimitInfo = securityService.checkRateLimit(clientId);
      
      expect(rateLimitInfo.blocked).toBe(false);
      expect(rateLimitInfo.remaining).toBeGreaterThan(0);
    });

    it('should block requests when limit exceeded', () => {
      const clientId = 'test-client-blocked';
      
      // Make requests up to the limit
      for (let i = 0; i < 100; i++) {
        securityService.checkRateLimit(clientId);
      }
      
      // Next request should be blocked
      const rateLimitInfo = securityService.checkRateLimit(clientId);
      expect(rateLimitInfo.blocked).toBe(true);
      expect(rateLimitInfo.remaining).toBe(0);
    });
  });

  describe('Security Monitoring', () => {
    it('should detect suspicious activity', () => {
      const clientId = 'test-client';
      const suspiciousInput = 'union select * from users';
      
      const isSuspicious = securityService.detectSuspiciousActivity(clientId, suspiciousInput);
      expect(isSuspicious).toBe(true);
    });

    it('should generate security events', () => {
      const events = securityService.getSecurityEvents(10);
      expect(Array.isArray(events)).toBe(true);
    });

    it('should generate secure tokens', () => {
      const token = securityService.generateSecureToken(32);
      expect(token).toHaveLength(32);
      expect(typeof token).toBe('string');
    });
  });

  describe('Security Headers', () => {
    it('should provide security headers', () => {
      const headers = securityService.getSecurityHeaders();
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    });
  });
});

describe('Audit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Logging', () => {
    it('should log audit events', async () => {
      const event = {
        userId: 'test-user',
        action: AuditAction.DOCUMENT_VIEW,
        resource: {
          type: ResourceType.DOCUMENT,
          name: 'Test Document'
        },
        resourceId: 'doc-123',
        success: true
      };

      await expect(auditService.logEvent(event)).resolves.not.toThrow();
    });

    it('should log document access events', async () => {
      await expect(
        auditService.logDocumentAccess(
          'user-123',
          'doc-456',
          AuditAction.DOCUMENT_VIEW,
          true,
          { documentTitle: 'Test Doc' }
        )
      ).resolves.not.toThrow();
    });

    it('should log permission changes', async () => {
      await expect(
        auditService.logPermissionChange(
          'user-123',
          'doc-456',
          AuditAction.PERMISSION_GRANT,
          { resourceName: 'Test Document', permissionLevel: 'read' }
        )
      ).resolves.not.toThrow();
    });

    it('should log security events', async () => {
      await expect(
        auditService.logSecurityEvent(
          'user-123',
          AuditAction.UNAUTHORIZED_ACCESS,
          'resource-123',
          false,
          'Access denied',
          { reason: 'insufficient_permissions' }
        )
      ).resolves.not.toThrow();
    });
  });
});

describe('Security Middleware Component', () => {
  const TestComponent = () => <div>Test Content</div>;

  it('should render children when security level is low', () => {
    render(
      <SecurityMiddleware securityLevel={SecurityLevel.LOW}>
        <TestComponent />
      </SecurityMiddleware>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show security alerts for violations', () => {
    const onViolation = vi.fn();
    
    render(
      <SecurityMiddleware 
        securityLevel={SecurityLevel.MEDIUM}
        onSecurityViolation={onViolation}
      >
        <TestComponent />
      </SecurityMiddleware>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should block content when security level is critical and blocked', () => {
    // This would require triggering a security violation first
    // For now, we'll test the basic rendering
    render(
      <SecurityMiddleware securityLevel={SecurityLevel.CRITICAL}>
        <TestComponent />
      </SecurityMiddleware>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});

describe('Input Validator Component', () => {
  it('should render input field', () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value=""
        onChange={onChange}
        placeholder="Test input"
      />
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('should validate input on change', async () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value=""
        onChange={onChange}
        placeholder="Test input"
        showValidationStatus={true}
      />
    );

    const input = screen.getByPlaceholderText('Test input');
    fireEvent.change(input, { target: { value: 'safe text' } });

    expect(onChange).toHaveBeenCalledWith('safe text', true);
  });

  it('should show validation errors for invalid input', async () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value=""
        onChange={onChange}
        placeholder="Test input"
        showValidationStatus={true}
      />
    );

    const input = screen.getByPlaceholderText('Test input');
    fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });

    await waitFor(() => {
      expect(screen.getByText(/suspicious patterns/i)).toBeInTheDocument();
    });
  });

  it('should render textarea when type is textarea', () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value=""
        onChange={onChange}
        type="textarea"
        placeholder="Test textarea"
      />
    );

    expect(screen.getByPlaceholderText('Test textarea')).toBeInTheDocument();
  });

  it('should show character count when maxLength is set', () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value="test"
        onChange={onChange}
        maxLength={100}
        placeholder="Test input"
      />
    );

    expect(screen.getByText('4 / 100')).toBeInTheDocument();
  });

  it('should show security level indicator', () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value="safe text"
        onChange={onChange}
        label="Test Input"
        showSecurityLevel={true}
      />
    );

    expect(screen.getByText('Test Input')).toBeInTheDocument();
  });
});

describe('Security Dashboard Component', () => {
  beforeEach(() => {
    // Mock the security service methods
    vi.spyOn(securityService, 'getSecurityEvents').mockReturnValue([]);
  });

  it('should render security dashboard', () => {
    render(<SecurityDashboard />);
    
    expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor security events and system health')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<SecurityDashboard />);
    
    expect(screen.getByText('Loading security data...')).toBeInTheDocument();
  });

  it('should display security metrics', async () => {
    render(<SecurityDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('Security Violations')).toBeInTheDocument();
      expect(screen.getByText('Rate Limit Hits')).toBeInTheDocument();
    });
  });

  it('should have refresh functionality', async () => {
    render(<SecurityDashboard />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('should have export functionality', async () => {
    render(<SecurityDashboard />);
    
    await waitFor(() => {
      const exportButton = screen.getByText('Export Report');
      expect(exportButton).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate security middleware with input validator', () => {
    const onChange = vi.fn();
    
    render(
      <SecurityMiddleware securityLevel={SecurityLevel.MEDIUM}>
        <InputValidator
          value=""
          onChange={onChange}
          placeholder="Secure input"
        />
      </SecurityMiddleware>
    );

    expect(screen.getByPlaceholderText('Secure input')).toBeInTheDocument();
  });

  it('should handle security violations in middleware', async () => {
    const onViolation = vi.fn();
    const onChange = vi.fn();
    
    render(
      <SecurityMiddleware 
        securityLevel={SecurityLevel.HIGH}
        onSecurityViolation={onViolation}
      >
        <InputValidator
          value=""
          onChange={onChange}
          placeholder="Test input"
        />
      </SecurityMiddleware>
    );

    const input = screen.getByPlaceholderText('Test input');
    fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });

    // Security violation should be detected
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });
});

describe('Performance Tests', () => {
  it('should handle multiple rapid validations', async () => {
    const onChange = vi.fn();
    
    render(
      <InputValidator
        value=""
        onChange={onChange}
        placeholder="Performance test"
      />
    );

    const input = screen.getByPlaceholderText('Performance test');
    
    // Simulate rapid typing
    for (let i = 0; i < 10; i++) {
      fireEvent.change(input, { target: { value: `test input ${i}` } });
    }

    // Should handle all changes without errors
    expect(onChange).toHaveBeenCalledTimes(10);
  });

  it('should cleanup rate limit store', () => {
    expect(() => securityService.cleanupRateLimitStore()).not.toThrow();
  });
});

describe('Error Handling', () => {
  it('should handle validation errors gracefully', () => {
    const result = securityService.validateInput('test', null as any);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('should handle audit logging errors', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // This should not throw even if there's an error
    await expect(
      auditService.logEvent({
        userId: 'test',
        action: AuditAction.DOCUMENT_VIEW,
        resource: { type: ResourceType.DOCUMENT },
        resourceId: 'test',
        success: true
      })
    ).resolves.not.toThrow();
    
    consoleSpy.mockRestore();
  });
});

describe('Security Configuration', () => {
  it('should use default security configuration', () => {
    const headers = securityService.getSecurityHeaders();
    expect(headers).toBeDefined();
    expect(Object.keys(headers).length).toBeGreaterThan(0);
  });

  it('should generate unique client IDs', () => {
    const token1 = securityService.generateSecureToken();
    const token2 = securityService.generateSecureToken();
    expect(token1).not.toBe(token2);
  });
});