/**
 * Document Permission Demo Component
 * Demonstrates the document permission and access control system
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  FileText, 
  Eye, 
  Edit, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  Play
} from 'lucide-react';
import { DocumentPermissionManager } from './DocumentPermissionManager';
import { AccessLevel } from '@/types/permissions';

export const DocumentPermissionDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [demoResults, setDemoResults] = useState<string[]>([]);

  const addDemoResult = (message: string) => {
    setDemoResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runPermissionDemo = async (demoType: string) => {
    setActiveDemo(demoType);
    setDemoResults([]);
    
    try {
      switch (demoType) {
        case 'basic':
          await runBasicPermissionDemo();
          break;
        case 'bulk':
          await runBulkPermissionDemo();
          break;
        case 'audit':
          await runAuditDemo();
          break;
        default:
          addDemoResult('Unknown demo type');
      }
    } catch (error) {
      addDemoResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActiveDemo(null);
    }
  };

  const runBasicPermissionDemo = async () => {
    addDemoResult('Starting basic permission demo...');
    
    // Simulate permission operations
    addDemoResult('✓ Created mock document: "Advanced Mathematics Guide"');
    addDemoResult('✓ Assigned READ permission to Class A');
    addDemoResult('✓ Assigned WRITE permission to user john.doe@school.edu');
    addDemoResult('✓ Verified permissions are active');
    addDemoResult('✓ Logged all permission changes to audit trail');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addDemoResult('Basic permission demo completed successfully!');
  };

  const runBulkPermissionDemo = async () => {
    addDemoResult('Starting bulk permission demo...');
    
    addDemoResult('✓ Selected 5 documents for bulk assignment');
    addDemoResult('✓ Selected 3 classes as targets');
    addDemoResult('✓ Assigning READ permissions to all combinations...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addDemoResult('✓ Created 15 permission assignments (5 docs × 3 classes)');
    addDemoResult('✓ All assignments completed successfully');
    addDemoResult('✓ Audit logs updated with bulk operation details');
    
    addDemoResult('Bulk permission demo completed successfully!');
  };

  const runAuditDemo = async () => {
    addDemoResult('Starting audit trail demo...');
    
    addDemoResult('✓ Simulating document access by student user');
    addDemoResult('✓ Recording successful document view');
    addDemoResult('✓ Simulating unauthorized access attempt');
    addDemoResult('✓ Recording failed access with details');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addDemoResult('✓ Generated comprehensive audit log entries');
    addDemoResult('✓ All security events properly logged');
    
    addDemoResult('Audit trail demo completed successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Permission System Demo</h1>
        <p className="text-muted-foreground">
          Explore the comprehensive document access control and permission management system
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Access Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Granular permission system with three access levels
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <Badge variant="outline" className="text-xs">READ</Badge>
                <span className="text-xs text-muted-foreground">View & search</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="text-xs">WRITE</Badge>
                <span className="text-xs text-muted-foreground">Modify metadata</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-500" />
                <Badge variant="outline" className="text-xs">ADMIN</Badge>
                <span className="text-xs text-muted-foreground">Full control</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Flexible Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Assign permissions to individuals or entire classes
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Individual users</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Entire classes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Bulk operations</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Complete logging of all access and permission changes
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Access attempts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Permission changes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Security events</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Demos */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Demos</CardTitle>
          <CardDescription>
            Try out different permission scenarios to see how the system works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Button
              onClick={() => runPermissionDemo('basic')}
              disabled={activeDemo !== null}
              className="flex items-center gap-2 h-auto p-4"
            >
              <Play className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Basic Permissions</div>
                <div className="text-sm opacity-80">
                  Assign individual permissions
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => runPermissionDemo('bulk')}
              disabled={activeDemo !== null}
              className="flex items-center gap-2 h-auto p-4"
            >
              <Play className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Bulk Assignment</div>
                <div className="text-sm opacity-80">
                  Assign to multiple targets
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => runPermissionDemo('audit')}
              disabled={activeDemo !== null}
              className="flex items-center gap-2 h-auto p-4"
            >
              <Play className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Audit Trail</div>
                <div className="text-sm opacity-80">
                  View security logging
                </div>
              </div>
            </Button>
          </div>

          {/* Demo Results */}
          {demoResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Demo Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {demoResults.map((result, index) => (
                    <div
                      key={index}
                      className="text-sm font-mono bg-muted p-2 rounded"
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Row Level Security (RLS)</div>
                <div className="text-sm text-muted-foreground">
                  Database-level access control ensures data isolation
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Comprehensive Audit Logging</div>
                <div className="text-sm text-muted-foreground">
                  All access attempts and changes are logged with metadata
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Permission Validation</div>
                <div className="text-sm text-muted-foreground">
                  Real-time permission checks before document access
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Bulk Operations</div>
                <div className="text-sm text-muted-foreground">
                  Efficiently manage permissions for multiple documents
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Class-based Assignment</div>
                <div className="text-sm text-muted-foreground">
                  Assign permissions to entire classes at once
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Permission Statistics</div>
                <div className="text-sm text-muted-foreground">
                  Monitor permission coverage and usage patterns
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Implementation Notes */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Implementation Status:</strong> The permission system is fully implemented with 
          database functions, RLS policies, audit logging, and a comprehensive management interface. 
          Future enhancements will include folder-level inheritance and advanced reporting features.
        </AlertDescription>
      </Alert>

      {/* Full Permission Manager */}
      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demo">Demo Overview</TabsTrigger>
          <TabsTrigger value="manager">Full Manager</TabsTrigger>
        </TabsList>
        
        <TabsContent value="demo">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a demonstration of the permission system. In a production environment, 
              this would be integrated with your authentication system and real document data.
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="manager">
          <DocumentPermissionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};