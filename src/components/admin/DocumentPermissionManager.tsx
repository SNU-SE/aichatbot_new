/**
 * Document Permission Manager Component
 * Main interface for managing document permissions and access control
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Shield, 
  Users, 
  FileText, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { permissionService } from '@/services/permissionService';
import { 
  DocumentPermissionDetails, 
  PermissionStats, 
  AccessLevel,
  PermissionFilter 
} from '@/types/permissions';
import { PermissionAssignmentDialog } from './PermissionAssignmentDialog';
import { BulkPermissionDialog } from './BulkPermissionDialog';
import { PermissionStatsCard } from './PermissionStatsCard';
import { DocumentPermissionList } from './DocumentPermissionList';
import { AccessAuditLogViewer } from './AccessAuditLogViewer';

interface DocumentPermissionManagerProps {
  className?: string;
}

export const DocumentPermissionManager: React.FC<DocumentPermissionManagerProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [permissions, setPermissions] = useState<DocumentPermissionDetails[]>([]);
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PermissionFilter>({});
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadPermissionStats();
  }, []);

  // Load permissions when filter changes
  useEffect(() => {
    if (activeTab === 'permissions') {
      loadPermissions();
    }
  }, [activeTab, filter, searchQuery]);

  const loadPermissionStats = async () => {
    try {
      setLoading(true);
      const statsData = await permissionService.getPermissionStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permission statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      // For now, load all permissions - in a real app, you'd implement pagination
      const allPermissions: DocumentPermissionDetails[] = [];
      
      // This is a simplified approach - in practice, you'd need to get all documents
      // and then get permissions for each, or implement a more efficient query
      setPermissions(allPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionAssigned = () => {
    loadPermissionStats();
    if (activeTab === 'permissions') {
      loadPermissions();
    }
    setShowAssignDialog(false);
  };

  const handleBulkAssignment = () => {
    loadPermissionStats();
    if (activeTab === 'permissions') {
      loadPermissions();
    }
    setShowBulkDialog(false);
  };

  const handlePermissionRevoked = async (permissionId: string) => {
    try {
      await permissionService.revokePermission(permissionId);
      loadPermissionStats();
      loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke permission');
    }
  };

  const filteredPermissions = permissions.filter(permission => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        permission.documentTitle.toLowerCase().includes(query) ||
        permission.userName?.toLowerCase().includes(query) ||
        permission.className?.toLowerCase().includes(query) ||
        permission.userEmail?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Permissions</h1>
          <p className="text-muted-foreground">
            Manage document access control and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAssignDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Permission
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkDialog(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Bulk Assignment
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <PermissionStatsCard 
            stats={stats} 
            loading={loading}
            onRefresh={loadPermissionStats}
          />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common permission management tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => setShowAssignDialog(true)}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Plus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Assign Permission</div>
                  <div className="text-sm text-muted-foreground">
                    Grant access to a document
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowBulkDialog(true)}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Bulk Assignment</div>
                  <div className="text-sm text-muted-foreground">
                    Assign multiple permissions
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setActiveTab('audit')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Search className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">View Audit Log</div>
                  <div className="text-sm text-muted-foreground">
                    Review access history
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search and Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search documents, users, or classes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Filter badges */}
              <div className="flex flex-wrap gap-2">
                {filter.permissionLevel && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Level: {filter.permissionLevel}
                    <XCircle 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilter(prev => ({ ...prev, permissionLevel: undefined }))}
                    />
                  </Badge>
                )}
                {filter.classId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Class: {filter.classId}
                    <XCircle 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilter(prev => ({ ...prev, classId: undefined }))}
                    />
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions List */}
          <DocumentPermissionList
            permissions={filteredPermissions}
            loading={loading}
            onRevoke={handlePermissionRevoked}
            onEdit={(permission) => {
              setSelectedDocumentId(permission.documentId);
              setShowAssignDialog(true);
            }}
          />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <AccessAuditLogViewer />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Permission Settings</CardTitle>
              <CardDescription>
                Configure permission management settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Permission settings and folder inheritance features will be available in a future update.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PermissionAssignmentDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        documentId={selectedDocumentId}
        onSuccess={handlePermissionAssigned}
      />

      <BulkPermissionDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        onSuccess={handleBulkAssignment}
      />
    </div>
  );
};