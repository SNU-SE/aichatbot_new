/**
 * Document Permission List Component
 * Displays and manages a list of document permissions
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  User,
  Calendar,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { DocumentPermissionDetails, AccessLevel } from '@/types/permissions';
import { formatDistanceToNow } from 'date-fns';

interface DocumentPermissionListProps {
  permissions: DocumentPermissionDetails[];
  loading: boolean;
  onRevoke: (permissionId: string) => void;
  onEdit: (permission: DocumentPermissionDetails) => void;
}

export const DocumentPermissionList: React.FC<DocumentPermissionListProps> = ({
  permissions,
  loading,
  onRevoke,
  onEdit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'document' | 'user' | 'level' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getAccessLevelColor = (level: AccessLevel) => {
    switch (level) {
      case AccessLevel.READ:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case AccessLevel.write:
        return 'bg-green-100 text-green-800 border-green-200';
      case AccessLevel.admin:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccessLevelIcon = (level: AccessLevel) => {
    switch (level) {
      case AccessLevel.read:
        return <Eye className="h-3 w-3" />;
      case AccessLevel.write:
        return <Edit className="h-3 w-3" />;
      case AccessLevel.admin:
        return <MoreHorizontal className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  const filteredAndSortedPermissions = React.useMemo(() => {
    let filtered = permissions.filter(permission => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        permission.documentTitle.toLowerCase().includes(query) ||
        permission.userName?.toLowerCase().includes(query) ||
        permission.userEmail?.toLowerCase().includes(query) ||
        permission.className?.toLowerCase().includes(query)
      );
    });

    // Sort permissions
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'document':
          comparison = a.documentTitle.localeCompare(b.documentTitle);
          break;
        case 'user':
          const aTarget = a.userName || a.className || '';
          const bTarget = b.userName || b.className || '';
          comparison = aTarget.localeCompare(bTarget);
          break;
        case 'level':
          comparison = a.permissionLevel.localeCompare(b.permissionLevel);
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [permissions, searchQuery, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-4 bg-muted rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Document Permissions ({permissions.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAndSortedPermissions.length === 0 ? (
          <div className="text-center py-8">
            {permissions.length === 0 ? (
              <div className="space-y-2">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No permissions found</p>
                <p className="text-sm text-muted-foreground">
                  Start by assigning permissions to documents
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Search className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No permissions match your search</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('document')}
                  >
                    <div className="flex items-center gap-2">
                      Document
                      {sortBy === 'document' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('user')}
                  >
                    <div className="flex items-center gap-2">
                      Target
                      {sortBy === 'user' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('level')}
                  >
                    <div className="flex items-center gap-2">
                      Level
                      {sortBy === 'level' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {sortBy === 'date' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPermissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{permission.documentTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {permission.documentId.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {permission.classId ? (
                          <>
                            <Users className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="font-medium">{permission.className}</div>
                              <div className="text-sm text-muted-foreground">Class</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="font-medium">
                                {permission.userName || 'Unnamed User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {permission.userEmail}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${getAccessLevelColor(permission.permissionLevel)} flex items-center gap-1 w-fit`}
                      >
                        {getAccessLevelIcon(permission.permissionLevel)}
                        {permission.permissionLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {permission.inherited && (
                          <Badge variant="secondary" className="text-xs">
                            Inherited
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {permission.source || 'direct'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(permission.createdAt, { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(permission)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Permission
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onRevoke(permission.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke Permission
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};