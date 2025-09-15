/**
 * Bulk Permission Dialog Component
 * Dialog for assigning permissions to multiple documents at once
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Search, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { permissionService } from '@/services/permissionService';
import { 
  AccessLevel, 
  BulkPermissionRequest,
  Class,
  User,
  Document,
  PERMISSION_CONSTRAINTS
} from '@/types/permissions';

interface BulkPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkPermissionDialog: React.FC<BulkPermissionDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [step, setStep] = useState<'documents' | 'targets' | 'settings' | 'confirm'>('documents');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<AccessLevel>(AccessLevel.READ);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('');

  // Load initial data
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setStep('documents');
    setSelectedDocuments([]);
    setSelectedClasses([]);
    setSelectedUsers([]);
    setPermissionLevel(AccessLevel.READ);
    setReplaceExisting(false);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setDocumentSearch('');
    setUserSearch('');
    setClassFilter('');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [classData, userData] = await Promise.all([
        permissionService.getAvailableClasses(),
        permissionService.getAvailableUsers()
      ]);
      
      setClasses(classData);
      setUsers(userData);
      
      // Load documents - placeholder for now
      setDocuments([]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignment = async () => {
    try {
      setProcessing(true);
      setError(null);
      setProgress(0);

      // Validate constraints
      if (selectedDocuments.length > PERMISSION_CONSTRAINTS.MAX_BULK_DOCUMENTS) {
        throw new Error(`Cannot assign permissions to more than ${PERMISSION_CONSTRAINTS.MAX_BULK_DOCUMENTS} documents at once`);
      }

      if (selectedClasses.length > PERMISSION_CONSTRAINTS.MAX_BULK_CLASSES) {
        throw new Error(`Cannot assign permissions to more than ${PERMISSION_CONSTRAINTS.MAX_BULK_CLASSES} classes at once`);
      }

      if (selectedUsers.length > PERMISSION_CONSTRAINTS.MAX_BULK_USERS) {
        throw new Error(`Cannot assign permissions to more than ${PERMISSION_CONSTRAINTS.MAX_BULK_USERS} users at once`);
      }

      const request: BulkPermissionRequest = {
        documentIds: selectedDocuments,
        classIds: selectedClasses.length > 0 ? selectedClasses : undefined,
        userIds: selectedUsers.length > 0 ? selectedUsers : undefined,
        permissionLevel,
        replaceExisting
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await permissionService.bulkAssignPermissions(request);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      const totalAssignments = selectedDocuments.length * (selectedClasses.length + selectedUsers.length);
      setSuccess(`Successfully assigned ${totalAssignments} permissions`);
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign permissions');
    } finally {
      setProcessing(false);
    }
  };

  const canProceedToNext = () => {
    switch (step) {
      case 'documents':
        return selectedDocuments.length > 0;
      case 'targets':
        return selectedClasses.length > 0 || selectedUsers.length > 0;
      case 'settings':
        return permissionLevel !== null;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(documentSearch.toLowerCase())
  );

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesClass = !classFilter || user.classId === classFilter;
    return matchesSearch && matchesClass;
  });

  const getTotalAssignments = () => {
    return selectedDocuments.length * (selectedClasses.length + selectedUsers.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Permission Assignment</DialogTitle>
          <DialogDescription>
            Assign permissions to multiple documents and targets at once
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing permissions...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            {['documents', 'targets', 'settings', 'confirm'].map((stepName, index) => (
              <React.Fragment key={stepName}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step === stepName 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ['documents', 'targets', 'settings', 'confirm'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-0.5 ${
                    index < ['documents', 'targets', 'settings', 'confirm'].indexOf(step)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Document Selection */}
          {step === 'documents' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Select Documents ({selectedDocuments.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="document-search">Search Documents</Label>
                  <Input
                    id="document-search"
                    placeholder="Search by document title..."
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDocuments(filteredDocuments.map(d => d.id))}
                  >
                    Select All ({filteredDocuments.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDocuments([])}
                  >
                    Clear Selection
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        checked={selectedDocuments.includes(document.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDocuments(prev => [...prev, document.id]);
                          } else {
                            setSelectedDocuments(prev => prev.filter(id => id !== document.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{document.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {document.filename} • {(document.fileSize / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredDocuments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents found
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Target Selection */}
          {step === 'targets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Classes ({selectedClasses.length} selected)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClasses(classes.map(c => c.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClasses([])}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center space-x-3 p-2 border rounded"
                      >
                        <Checkbox
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClasses(prev => [...prev, cls.id]);
                            } else {
                              setSelectedClasses(prev => prev.filter(id => id !== cls.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{cls.name}</div>
                          {cls.studentCount && (
                            <div className="text-sm text-muted-foreground">
                              {cls.studentCount} students
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Individual Users ({selectedUsers.length} selected)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="class-filter">Filter by Class</Label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All classes..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="user-search">Search Users</Label>
                    <Input
                      id="user-search"
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(filteredUsers.map(u => u.id))}
                    >
                      Select All ({filteredUsers.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 border rounded"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{user.name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        {user.className && (
                          <Badge variant="secondary" className="text-xs">
                            {user.className}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Permission Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Permission Level</Label>
                  <Select 
                    value={permissionLevel} 
                    onValueChange={(value: AccessLevel) => setPermissionLevel(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AccessLevel.READ}>
                        Read Access - View and search documents
                      </SelectItem>
                      <SelectItem value={AccessLevel.write}>
                        Write Access - View, search, and modify metadata
                      </SelectItem>
                      <SelectItem value={AccessLevel.admin}>
                        Admin Access - Full control including permissions
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={setReplaceExisting}
                  />
                  <Label htmlFor="replace-existing">
                    Replace existing permissions
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  If checked, existing permissions will be replaced. Otherwise, only new permissions will be added.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Bulk Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Documents</Label>
                    <div className="text-2xl font-bold">{selectedDocuments.length}</div>
                  </div>
                  <div>
                    <Label>Targets</Label>
                    <div className="text-2xl font-bold">
                      {selectedClasses.length + selectedUsers.length}
                    </div>
                  </div>
                  <div>
                    <Label>Permission Level</Label>
                    <Badge variant="outline" className="text-sm">
                      {permissionLevel}
                    </Badge>
                  </div>
                  <div>
                    <Label>Total Assignments</Label>
                    <div className="text-2xl font-bold text-primary">
                      {getTotalAssignments()}
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will create {getTotalAssignments()} permission assignments. 
                    {replaceExisting && ' Existing permissions will be replaced.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'documents') {
                onOpenChange(false);
              } else if (step === 'targets') {
                setStep('documents');
              } else if (step === 'settings') {
                setStep('targets');
              } else {
                setStep('settings');
              }
            }}
            disabled={processing}
          >
            {step === 'documents' ? 'Cancel' : 'Back'}
          </Button>
          
          {step === 'confirm' ? (
            <Button
              onClick={handleBulkAssignment}
              disabled={processing || !canProceedToNext()}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Permissions
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (step === 'documents') {
                  setStep('targets');
                } else if (step === 'targets') {
                  setStep('settings');
                } else {
                  setStep('confirm');
                }
              }}
              disabled={!canProceedToNext()}
            >
              Next
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};