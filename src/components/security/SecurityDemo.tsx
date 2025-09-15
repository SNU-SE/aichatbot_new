/**
 * Security Demo Component
 * Demonstrates security features and enhancements
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  FileText,
  Activity,
  Users,
  Settings
} from 'lucide-react';
import SecurityDashboard from './SecurityDashboard';
import SecurityMiddleware, { SecurityLevel, useSecurityContext } from './SecurityMiddleware';
import InputValidator from './InputValidator';
import { securityService } from '../../services/securityService';
import { auditService, AuditAction, ResourceType } from '../../services/auditService';

// ============================================================================
// DEMO COMPONENTS
// ============================================================================

const InputValidationDemo: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const testInputs = [
    { label: 'Safe Input', value: 'This is a normal text input' },
    { label: 'XSS Attempt', value: '<script>alert("xss")</script>' },
    { label: 'SQL Injection', value: "'; DROP TABLE users; --" },
    { label: 'Long Input', value: 'A'.repeat(1000) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Input Validation & Sanitization</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Text Input Validation</CardTitle>
              <CardDescription>
                Real-time validation with security checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputValidator
                value={textInput}
                onChange={(value, isValid) => setTextInput(value)}
                placeholder="Enter some text..."
                label="User Input"
                description="Try entering suspicious content to see security validation"
                showValidationStatus={true}
                showSecurityLevel={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Title Validation</CardTitle>
              <CardDescription>
                Specialized validation for document titles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputValidator
                value={titleInput}
                onChange={(value, isValid) => setTitleInput(value)}
                placeholder="Enter document title..."
                validationType="document_title"
                label="Document Title"
                maxLength={255}
                required={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Validation</CardTitle>
              <CardDescription>
                Large text content with security scanning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputValidator
                value={contentInput}
                onChange={(value, isValid) => setContentInput(value)}
                placeholder="Enter document content..."
                type="textarea"
                validationType="document_content"
                label="Document Content"
                rows={4}
                maxLength={1000}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password Input</CardTitle>
              <CardDescription>
                Secure password input with validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputValidator
                value={passwordInput}
                onChange={(value, isValid) => setPasswordInput(value)}
                placeholder="Enter password..."
                type="password"
                label="Password"
                required={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-3">Test Inputs</h4>
        <div className="flex flex-wrap gap-2">
          {testInputs.map((test, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setTextInput(test.value)}
            >
              {test.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

const RateLimitDemo: React.FC = () => {
  const { checkRateLimit } = useSecurityContext();
  const [requests, setRequests] = useState<Array<{ timestamp: Date; blocked: boolean }>>([]);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);

  const makeRequest = async () => {
    const info = checkRateLimit('/api/test');
    setRateLimitInfo(info);
    
    setRequests(prev => [...prev, {
      timestamp: new Date(),
      blocked: info.blocked
    }].slice(-10)); // Keep last 10 requests

    if (!info.blocked) {
      // Simulate API call
      await auditService.logEvent({
        userId: 'demo-user',
        action: AuditAction.SYSTEM_ERROR,
        resource: { type: ResourceType.SYSTEM, name: 'Rate Limit Test' },
        resourceId: 'rate-limit-test',
        success: true
      });
    }
  };

  const makeMultipleRequests = async () => {
    for (let i = 0; i < 10; i++) {
      await makeRequest();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Rate Limiting</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate Limit Status</CardTitle>
              <CardDescription>
                Current rate limit information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rateLimitInfo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={rateLimitInfo.blocked ? 'destructive' : 'default'}>
                      {rateLimitInfo.blocked ? 'Blocked' : 'Active'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Remaining Requests</span>
                    <span className="font-medium">{rateLimitInfo.remaining}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reset Time</span>
                    <span className="text-xs font-mono">
                      {rateLimitInfo.resetTime.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={makeRequest} size="sm">
                  Make Request
                </Button>
                <Button onClick={makeMultipleRequests} variant="outline" size="sm">
                  Make 10 Requests
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request History</CardTitle>
              <CardDescription>
                Recent API requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No requests made yet
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((request, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-mono">
                        {request.timestamp.toLocaleTimeString()}
                      </span>
                      <Badge variant={request.blocked ? 'destructive' : 'default'}>
                        {request.blocked ? 'Blocked' : 'Success'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const AuditLoggingDemo: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const auditLogs = await auditService.getAuditLogs({ limit: 10 });
      setLogs(auditLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTestEvent = async (action: AuditAction) => {
    await auditService.logEvent({
      userId: 'demo-user',
      action,
      resource: { type: ResourceType.DOCUMENT, name: 'Test Document' },
      resourceId: 'test-doc-id',
      success: true,
      details: { demo: true, timestamp: new Date().toISOString() }
    });
    
    // Refresh logs
    await loadAuditLogs();
  };

  React.useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Audit Logging</h3>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Test Events</CardTitle>
              <CardDescription>
                Generate sample audit events for demonstration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  onClick={() => createTestEvent(AuditAction.DOCUMENT_VIEW)}
                >
                  Document View
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => createTestEvent(AuditAction.SEARCH_EXECUTE)}
                >
                  Search Execute
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => createTestEvent(AuditAction.CHAT_MESSAGE)}
                >
                  Chat Message
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => createTestEvent(AuditAction.PERMISSION_GRANT)}
                >
                  Permission Grant
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Audit Logs</CardTitle>
              <CardDescription>
                Latest system audit events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No audit logs available
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{log.action}</div>
                        <div className="text-xs text-muted-foreground">
                          User: {log.userId?.substring(0, 8)}...
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.createdAt?.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SECURITY DEMO COMPONENT
// ============================================================================

export const SecurityDemo: React.FC = () => {
  return (
    <SecurityMiddleware 
      securityLevel={SecurityLevel.MEDIUM}
      enableRateLimit={true}
      enableInputValidation={true}
      enableAuditLogging={true}
    >
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Security Enhancements Demo</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive security features including input validation, rate limiting, 
            audit logging, and real-time security monitoring for the Enhanced RAG system.
          </p>
        </div>

        {/* Security Features Tabs */}
        <Tabs defaultValue="validation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Input Validation
            </TabsTrigger>
            <TabsTrigger value="ratelimit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Rate Limiting
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Audit Logging
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Security Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validation">
            <InputValidationDemo />
          </TabsContent>

          <TabsContent value="ratelimit">
            <RateLimitDemo />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLoggingDemo />
          </TabsContent>

          <TabsContent value="dashboard">
            <SecurityDashboard />
          </TabsContent>
        </Tabs>

        {/* Security Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Security Features Overview</CardTitle>
            <CardDescription>
              Comprehensive security enhancements implemented in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Input Validation</h4>
                  <p className="text-sm text-muted-foreground">
                    Real-time validation and sanitization of all user inputs
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">
                    Prevents abuse with configurable request limits
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Audit Logging</h4>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive logging of all system activities
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Data Encryption</h4>
                  <p className="text-sm text-muted-foreground">
                    Encryption support for sensitive document data
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Threat Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Real-time detection of suspicious activities
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Access Control</h4>
                  <p className="text-sm text-muted-foreground">
                    Enhanced permission management and monitoring
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SecurityMiddleware>
  );
};

export default SecurityDemo;