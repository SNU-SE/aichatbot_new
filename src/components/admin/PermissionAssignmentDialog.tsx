/**
 * Permission Assignment Dialog Component
 * Dialog for assigning permissions to individual documents
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Users, User, AlertTriangle } from 'lucide-react';
import { permissionService } from '@/services/permissionService';
import { 
  AccessLevel, 
  PermissionCreateInput,
  Class,
  User as UserType,
  Document
} from '@/types/permissions';

interface PermissionAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string | null;
  onSuccess: () => void;
}

export const PermissionAssignmentDialog: React.FC<PermissionAssignmentDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  onSuccess
}) => {
  const [step, setStep] = useState<'document' | 'target' | 'permission'>('document');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [targetType, setTargetType] = useState<'class' | 'user'>('class');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [permissionLevel, setPermissionLevel] = useState<AccessLevel>(AccessLevel.READ);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Load initial data
  useEffect(() => {
    if (open) {
      loadClasses();
      if (!documentId) {
        loadDocuments();
      } else {
        // If documentId is provided, skip to target selection
        setStep('target');
      }
    }
  }, [open, documentId]);

  // Load users when class is selected
  useEffect(() => {
    if (targetType === 'user' && selectedClass) {
      loadUsers(selectedClass);
    } else if (targetType === 'user' && !selectedClass) {
      loadUsers();
    }
  }, [targetType, selectedClass]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setStep(documentId ? 'target' : 'document');
    setSelectedDocument(null);
    setTargetType('class');
    setSelectedClass('');
    setSelectedUser('');
    setPermissionLevel(AccessLevel.READ);
    setError(null);
    setDocumentSearch('');
    setUserSearch('');
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in the service
      // For now, we'll use a placeholder
      setDocuments([]);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const classData = await permissionService.getAvailableClasses();
      setClasses(classData);
    } catch (err) {
      setError('Failed to load classes');
    }
  };

  const loadUsers = async (classId?: string) => {
    try {
      setLoading(true);
      const userData = await permissionService.getAvailableUsers(classId);
      setUsers(userData);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPermission = async () => {
    try {
      setLoading(true);
      setError(null);

      const permission: PermissionCreateInput = {
        documentId: documentId || selectedDocument?.id || '',
        permissionLevel,
        ...(targetType === 'class' 
          ? { classId: selectedClass }
          : { userId: selectedUser }
        )
      };

      await permissionService.grantPermission(permission);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign permission');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToNext = () => {
    switch (step) {
      case 'document':
        return selectedDocument !== null;
      case 'target':
        return targetType === 'class' ? selectedClass !== '' : selectedUser !== '';
      case 'permission':
        return permissionLevel !== null;
      default:
        return false;
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(documentSearch.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Document Permission</DialogTitle>
          <DialogDescription>
            Grant access to a document for users or classes
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            {['document', 'target', 'permission'].map((stepName, index) => (
              <React.Fragment key={stepName}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step === stepName 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ['document', 'target', 'permission'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-0.5 ${
                    index < ['document', 'target', 'permission'].indexOf(step)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Document Selection */}
          {step === 'document' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Select Document
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

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredDocuments.map((document) => (
                    <div
                      key={document.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDocument?.id === document.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedDocument(document)}
                    >
                      <div className="font-medium">{document.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {document.filename} • {(document.fileSize / 1024 / 1024).toFixed(1)} MB
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
          {step === 'target' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Target
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Permission Target</Label>
                  <RadioGroup
                    value={targetType}
                    onValueChange={(value: 'class' | 'user') => setTargetType(value)}
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="class" id="class" />
                      <Label htmlFor="class">Entire Class</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label htmlFor="user">Individual User</Label>
                    </div>
                  </RadioGroup>
                </div>

                {targetType === 'class' && (
                  <div>
                    <Label htmlFor="class-select">Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                            {cls.studentCount && (
                              <span className="text-muted-foreground ml-2">
                                ({cls.studentCount} students)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {targetType === 'user' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="class-filter">Filter by Class (Optional)</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
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

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedUser === user.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedUser(user.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{user.name || 'Unnamed User'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                            {user.className && (
                              <Badge variant="secondary">{user.className}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredUsers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Permission Level */}
          {step === 'permission' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Permission Level
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={permissionLevel}
                  onValueChange={(value: AccessLevel) => setPermissionLevel(value)}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value={AccessLevel.READ} id="read" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="read" className="font-medium">Read Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Can view and search the document content in chat
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value={AccessLevel.write} id="write" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="write" className="font-medium">Write Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Can view, search, and modify document metadata
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value={AccessLevel.admin} id="admin" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="admin" className="font-medium">Admin Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Full control including permission management
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Summary */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Permission Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Document:</span>{' '}
                      {documentId ? 'Selected Document' : selectedDocument?.title}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target:</span>{' '}
                      {targetType === 'class' 
                        ? `Class: ${classes.find(c => c.id === selectedClass)?.name}`
                        : `User: ${users.find(u => u.id === selectedUser)?.name}`
                      }
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level:</span>{' '}
                      <Badge variant="outline">{permissionLevel}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'document') {
                onOpenChange(false);
              } else if (step === 'target') {
                setStep('document');
              } else {
                setStep('target');
              }
            }}
          >
            {step === 'document' ? 'Cancel' : 'Back'}
          </Button>
          
          {step === 'permission' ? (
            <Button
              onClick={handleAssignPermission}
              disabled={loading || !canProceedToNext()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Permission
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (step === 'document') {
                  setStep('target');
                } else {
                  setStep('permission');
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