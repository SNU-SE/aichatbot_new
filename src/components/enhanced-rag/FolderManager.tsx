/**
 * Folder Manager Component
 * Handles folder creation, organization, and navigation
 */

import React, { useState, useCallback } from 'react';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  MoreVertical,
  Edit2,
  Trash2,
  Move,
  ChevronRight,
  ChevronDown,
  Home
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { DocumentFolder } from '../../types/enhanced-rag';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FolderManagerProps {
  folders: DocumentFolder[];
  currentFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderCreate: (name: string, parentId?: string) => Promise<void>;
  onFolderRename: (folderId: string, newName: string) => Promise<void>;
  onFolderDelete: (folderId: string) => Promise<void>;
  onFolderMove: (folderId: string, newParentId?: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export type FolderAction = 'rename' | 'delete' | 'move' | 'create-subfolder';

interface FolderTreeNode extends DocumentFolder {
  children: FolderTreeNode[];
  level: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FolderManager: React.FC<FolderManagerProps> = ({
  folders,
  currentFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  onFolderMove,
  isLoading = false,
  className = ''
}) => {
  // State for dialogs and forms
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState<string | undefined>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder tree structure
  const folderTree = React.useMemo(() => {
    const buildTree = (parentId?: string, level = 0): FolderTreeNode[] => {
      return folders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id, level + 1),
          level
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };
    
    return buildTree();
  }, [folders]);

  // Get breadcrumb path for current folder
  const getBreadcrumbPath = useCallback((folderId: string | null): DocumentFolder[] => {
    if (!folderId) return [];
    
    const path: DocumentFolder[] = [];
    let currentId: string | undefined = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    
    return path;
  }, [folders]);

  // Handle folder expansion/collapse
  const toggleFolderExpansion = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  // Handle folder actions
  const handleFolderAction = useCallback((action: FolderAction, folder: DocumentFolder) => {
    setSelectedFolder(folder);
    
    switch (action) {
      case 'rename':
        setNewFolderName(folder.name);
        setShowRenameDialog(true);
        break;
      case 'delete':
        setShowDeleteDialog(true);
        break;
      case 'move':
        setShowMoveDialog(true);
        break;
      case 'create-subfolder':
        setNewFolderName('');
        setNewFolderParent(folder.id);
        setShowCreateDialog(true);
        break;
    }
  }, []);

  // Handle create folder
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await onFolderCreate(newFolderName.trim(), newFolderParent);
      setShowCreateDialog(false);
      setNewFolderName('');
      setNewFolderParent(undefined);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }, [newFolderName, newFolderParent, onFolderCreate]);

  // Handle rename folder
  const handleRenameFolder = useCallback(async () => {
    if (!selectedFolder || !newFolderName.trim()) return;
    
    try {
      await onFolderRename(selectedFolder.id, newFolderName.trim());
      setShowRenameDialog(false);
      setNewFolderName('');
      setSelectedFolder(null);
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
  }, [selectedFolder, newFolderName, onFolderRename]);

  // Handle delete folder
  const handleDeleteFolder = useCallback(async () => {
    if (!selectedFolder) return;
    
    try {
      await onFolderDelete(selectedFolder.id);
      setShowDeleteDialog(false);
      setSelectedFolder(null);
      
      // Navigate to parent if current folder is being deleted
      if (currentFolderId === selectedFolder.id) {
        onFolderSelect(selectedFolder.parentId || null);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }, [selectedFolder, currentFolderId, onFolderDelete, onFolderSelect]);

  const breadcrumbPath = getBreadcrumbPath(currentFolderId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Create Folder Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Folders</h3>
        <Button
          onClick={() => {
            setNewFolderName('');
            setNewFolderParent(currentFolderId || undefined);
            setShowCreateDialog(true);
          }}
          size="sm"
          className="flex items-center gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumbPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFolderSelect(null)}
            className="flex items-center gap-1 h-auto p-1"
          >
            <Home className="h-4 w-4" />
            Root
          </Button>
          
          {breadcrumbPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="h-4 w-4" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFolderSelect(folder.id)}
                className="h-auto p-1"
                disabled={index === breadcrumbPath.length - 1}
              >
                {folder.name}
              </Button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Folder Tree */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">
              Loading folders...
            </div>
          ) : (
            <div className="space-y-1">
              {/* Root folder option */}
              <FolderTreeItem
                folder={{
                  id: '',
                  userId: '',
                  name: 'All Documents',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  children: [],
                  level: 0
                } as FolderTreeNode}
                isSelected={currentFolderId === null}
                isExpanded={true}
                onSelect={() => onFolderSelect(null)}
                onToggleExpansion={() => {}}
                onAction={() => {}}
                isRoot={true}
              />
              
              {folderTree.map(folder => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  isSelected={currentFolderId === folder.id}
                  isExpanded={expandedFolders.has(folder.id)}
                  onSelect={() => onFolderSelect(folder.id)}
                  onToggleExpansion={() => toggleFolderExpansion(folder.id)}
                  onAction={(action) => handleFolderAction(action, folder)}
                />
              ))}
              
              {folderTree.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No folders created yet
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for "{selectedFolder?.name}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-folder-name">Folder Name</Label>
              <Input
                id="rename-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter new folder name..."
                onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!newFolderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFolder?.name}"? This action cannot be undone.
              All documents in this folder will be moved to the root folder.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// FOLDER TREE ITEM COMPONENT
// ============================================================================

interface FolderTreeItemProps {
  folder: FolderTreeNode;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpansion: () => void;
  onAction: (action: FolderAction) => void;
  isRoot?: boolean;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpansion,
  onAction,
  isRoot = false
}) => {
  const hasChildren = folder.children && folder.children.length > 0;
  const paddingLeft = folder.level * 20;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpansion}
            className="h-auto w-auto p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-4" />
        )}
        
        <div className="flex items-center gap-2 flex-1" onClick={onSelect}>
          {isRoot ? (
            <Home className="h-4 w-4" />
          ) : isSelected ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
          
          <span className="text-sm font-medium truncate">{folder.name}</span>
          
          {folder.documentCount !== undefined && (
            <span className="text-xs text-gray-500">({folder.documentCount})</span>
          )}
        </div>
        
        {!isRoot && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto w-auto p-1">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction('create-subfolder')}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('rename')}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('move')}>
                <Move className="h-4 w-4 mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onAction('delete')}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Render children if expanded */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              isSelected={false}
              isExpanded={false}
              onSelect={() => {}}
              onToggleExpansion={() => {}}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderManager;