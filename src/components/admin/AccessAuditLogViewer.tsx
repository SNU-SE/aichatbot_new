/**
 * Access Audit Log Viewer Component
 * Displays and filters access audit logs for security monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Calendar,
  User,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock
} from 'lucide-react';
import { permissionService } from '@/services/permissionService';
import { 
  AccessAuditLog, 
  AccessAction, 
  AuditLogFilter 
} from '@/types/permissions';
import { formatDistanceToNow, format } from 'date-fns';

export const AccessAuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AccessAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AuditLogFilter>({
    limit: 50,
    offset: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<AccessAction | ''>('');
  const [selectedSuccess, setSelectedSuccess] = useState<boolean | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [filter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const auditFilter: AuditLogFilter = {
        ...filter,
        action: selectedAction || undefined,
        success: selectedSuccess !== '' ? selectedSuccess : undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined
      };

      const auditLogs = await permissionService.getAuditLogs(auditFilter);
      setLogs(auditLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setFilter(prev => ({ ...prev, offset: 0 }));
    loadAuditLogs();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAction('');
    setSelectedSuccess('');
    setDateFrom('');
    setDateTo('');
    setFilter({ limit: 50, offset: 0 });
  };

  const getActionIcon = (action: AccessAction) => {
    switch (action) {
      case AccessAction.DOCUMENT_VIEW:
        return <Eye className="h-4 w-4 text-blue-500" />;
      case AccessAction.DOCUMENT_DOWNLOAD:
        return <Download className="h-4 w-4 text-green-500" />;
      case AccessAction.PERMISSION_GRANT:
        return <Shield className="h-4 w-4 text-green-600" />;
      case AccessAction.PERMISSION_REVOKE:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case AccessAction.UNAUTHORIZED_ACCESS_ATTEMPT:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: AccessAction) => {
    switch (action) {
      case AccessAction.DOCUMENT_VIEW:
      case AccessAction.DOCUMENT_SEARCH:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case AccessAction.DOCUMENT_DOWNLOAD:
        return 'bg-green-100 text-green-800 border-green-200';
      case AccessAction.PERMISSION_GRANT:
      case AccessAction.PERMISSION_UPDATE:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case AccessAction.PERMISSION_REVOKE:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case AccessAction.UNAUTHORIZED_ACCESS_ATTEMPT:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(query) ||
      log.userEmail?.toLowerCase().includes(query) ||
      log.documentTitle?.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Audit Log Filters
          </CardTitle>
          <CardDescription>
            Filter and search access audit logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="User, document, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {Object.values(AccessAction).map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ').toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="success">Status</Label>
              <Select 
                value={selectedSuccess.toString()} 
                onValueChange={(value) => setSelectedSuccess(value === '' ? '' : value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} disabled={loading}>
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <Button variant="outline" onClick={loadAuditLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Audit Logs ({filteredLogs.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-1/6"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/6"></div>
                  <div className="h-4 bg-muted rounded w-1/6"></div>
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No audit logs found</p>
              <p className="text-sm text-muted-foreground">
                Audit logs will appear here as users access documents
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div>{format(log.createdAt, 'MMM dd, HH:mm:ss')}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {log.userName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.userEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getActionColor(log.action)} flex items-center gap-1 w-fit`}
                        >
                          {getActionIcon(log.action)}
                          {log.action.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {log.documentTitle || 'Unknown Document'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.documentId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={log.success ? 'text-green-700' : 'text-red-700'}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {log.permissionLevel && (
                            <Badge variant="secondary" className="text-xs">
                              {log.permissionLevel}
                            </Badge>
                          )}
                          {log.errorMessage && (
                            <div className="text-xs text-red-600">
                              {log.errorMessage}
                            </div>
                          )}
                          {log.ipAddress && (
                            <div className="text-xs text-muted-foreground">
                              IP: {log.ipAddress}
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {Object.entries(log.metadata).map(([key, value]) => (
                                <div key={key}>
                                  {key}: {JSON.stringify(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};