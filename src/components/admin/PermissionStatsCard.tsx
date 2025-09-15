/**
 * Permission Statistics Card Component
 * Displays overview statistics for document permissions
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  FileText, 
  Users, 
  RefreshCw, 
  TrendingUp,
  Eye,
  Edit,
  Settings
} from 'lucide-react';
import { PermissionStats, AccessLevel } from '@/types/permissions';

interface PermissionStatsCardProps {
  stats: PermissionStats | null;
  loading: boolean;
  onRefresh: () => void;
}

export const PermissionStatsCard: React.FC<PermissionStatsCardProps> = ({
  stats,
  loading,
  onRefresh
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No statistics available
          </div>
        </CardContent>
      </Card>
    );
  }

  const permissionCoverage = stats.totalDocuments > 0 
    ? (stats.documentsWithPermissions / stats.totalDocuments) * 100 
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Statistics
          </CardTitle>
          <CardDescription>
            Overview of document permissions and access control
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Total Documents
            </div>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              With Permissions
            </div>
            <div className="text-2xl font-bold">{stats.documentsWithPermissions}</div>
            <div className="text-xs text-muted-foreground">
              {permissionCoverage.toFixed(1)}% coverage
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Permissions
            </div>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Avg per Document
            </div>
            <div className="text-2xl font-bold">
              {stats.documentsWithPermissions > 0 
                ? (stats.totalPermissions / stats.documentsWithPermissions).toFixed(1)
                : '0'
              }
            </div>
          </div>
        </div>

        {/* Permission Level Breakdown */}
        <div>
          <h4 className="font-medium mb-3">Permission Levels</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Read</span>
              </div>
              <Badge variant="secondary">
                {stats.permissionsByLevel[AccessLevel.READ] || 0}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-green-500" />
                <span className="text-sm">Write</span>
              </div>
              <Badge variant="secondary">
                {stats.permissionsByLevel[AccessLevel.write] || 0}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Admin</span>
              </div>
              <Badge variant="secondary">
                {stats.permissionsByLevel[AccessLevel.admin] || 0}
              </Badge>
            </div>
          </div>
        </div>

        {/* Assignment Types */}
        <div>
          <h4 className="font-medium mb-3">Assignment Types</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.classPermissions}
              </div>
              <div className="text-sm text-muted-foreground">Class Permissions</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.userPermissions}
              </div>
              <div className="text-sm text-muted-foreground">User Permissions</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.inheritedPermissions}
              </div>
              <div className="text-sm text-muted-foreground">Inherited</div>
            </div>
          </div>
        </div>

        {/* Coverage Indicator */}
        {permissionCoverage < 100 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Permission Coverage</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {stats.totalDocuments - stats.documentsWithPermissions} documents don't have any permissions assigned.
              Consider setting up default permissions or folder inheritance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};