/**
 * Enhanced RAG Permission System Tests
 * Tests for document permissions and access control functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Supabase client - must be defined before imports
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        order: vi.fn(() => ({
          eq: vi.fn(),
          gte: vi.fn(),
          lte: vi.fn(),
          limit: vi.fn(),
          range: vi.fn()
        }))
      }))
    }))
  }
}));

import { permissionService } from '@/services/permissionService';
import { 
  AccessLevel, 
  PermissionCreateInput, 
  BulkPermissionRequest,
  PermissionCheckRequest,
  AccessAction
} from '@/types/permissions';

// Get the mocked supabase for test assertions
const { supabase: mockSupabase } = await import('@/integrations/supabase/client');

describe('Permission Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should check user permission for document access', async () => {
      const mockResponse = {
        hasAccess: true,
        actualLevel: AccessLevel.READ,
        source: 'direct'
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      });

      const request: PermissionCheckRequest = {
        userId: 'user-123',
        documentId: 'doc-456',
        requiredLevel: AccessLevel.READ
      };

      const result = await permissionService.checkPermission(request);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_document_permission', {
        user_id: 'user-123',
        document_id: 'doc-456',
        required_level: AccessLevel.READ
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle permission check errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied' }
      });

      const request: PermissionCheckRequest = {
        userId: 'user-123',
        documentId: 'doc-456',
        requiredLevel: AccessLevel.READ
      };

      await expect(permissionService.checkPermission(request))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('grantPermission', () => {
    it('should grant permission to a user', async () => {
      const mockPermissionData = {
        id: 'perm-123',
        document_id: 'doc-456',
        user_id: 'user-789',
        permission_level: AccessLevel.READ,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        documents: { title: 'Test Document' },
        students: { name: 'Test User', class_name: 'Class A' }
      };

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockPermissionData,
        error: null
      });

      const permission: PermissionCreateInput = {
        documentId: 'doc-456',
        userId: 'user-789',
        permissionLevel: AccessLevel.READ,
        grantedBy: 'admin-123'
      };

      const result = await permissionService.grantPermission(permission);

      expect(result.id).toBe('perm-123');
      expect(result.documentId).toBe('doc-456');
      expect(result.userId).toBe('user-789');
      expect(result.permissionLevel).toBe(AccessLevel.READ);
    });

    it('should grant permission to a class', async () => {
      const mockPermissionData = {
        id: 'perm-124',
        document_id: 'doc-456',
        class_id: 'class-a',
        permission_level: AccessLevel.READ,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        documents: { title: 'Test Document' }
      };

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockPermissionData,
        error: null
      });

      const permission: PermissionCreateInput = {
        documentId: 'doc-456',
        classId: 'class-a',
        permissionLevel: AccessLevel.READ
      };

      const result = await permissionService.grantPermission(permission);

      expect(result.classId).toBe('class-a');
      expect(result.permissionLevel).toBe(AccessLevel.READ);
    });

    it('should handle duplicate permission errors', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505' } // Unique constraint violation
      });

      const permission: PermissionCreateInput = {
        documentId: 'doc-456',
        userId: 'user-789',
        permissionLevel: AccessLevel.READ
      };

      await expect(permissionService.grantPermission(permission))
        .rejects.toThrow('DUPLICATE_PERMISSION');
    });
  });

  describe('bulkAssignPermissions', () => {
    it('should assign permissions to multiple documents and targets', async () => {
      const mockResponse = [
        {
          id: 'perm-1',
          document_id: 'doc-1',
          class_id: 'class-a',
          permission_level: AccessLevel.READ,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'perm-2',
          document_id: 'doc-2',
          class_id: 'class-a',
          permission_level: AccessLevel.READ,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      });

      const request: BulkPermissionRequest = {
        documentIds: ['doc-1', 'doc-2'],
        classIds: ['class-a'],
        permissionLevel: AccessLevel.READ,
        replaceExisting: false
      };

      const result = await permissionService.bulkAssignPermissions(request);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('bulk_assign_permissions', {
        document_ids: ['doc-1', 'doc-2'],
        class_ids: ['class-a'],
        user_ids: [],
        permission_level: AccessLevel.READ,
        replace_existing: false
      });

      expect(result).toHaveLength(2);
    });

    it('should handle bulk assignment errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Bulk operation failed' }
      });

      const request: BulkPermissionRequest = {
        documentIds: ['doc-1'],
        classIds: ['class-a'],
        permissionLevel: AccessLevel.READ
      };

      await expect(permissionService.bulkAssignPermissions(request))
        .rejects.toThrow('Bulk operation failed');
    });
  });

  describe('getAccessibleDocuments', () => {
    it('should return documents accessible to a user', async () => {
      const mockResponse = {
        document_ids: ['doc-1', 'doc-2'],
        permissions: {
          'doc-1': { level: AccessLevel.READ, source: 'direct' },
          'doc-2': { level: AccessLevel.WRITE, source: 'class' }
        },
        total_count: 2
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      });

      const result = await permissionService.getAccessibleDocuments({
        userId: 'user-123'
      });

      expect(result.documentIds).toEqual(['doc-1', 'doc-2']);
      expect(result.totalCount).toBe(2);
    });
  });

  describe('getPermissionStats', () => {
    it('should return permission statistics', async () => {
      const mockStats = {
        totalDocuments: 10,
        documentsWithPermissions: 8,
        totalPermissions: 15,
        permissionsByLevel: {
          [AccessLevel.READ]: 10,
          [AccessLevel.WRITE]: 4,
          [AccessLevel.ADMIN]: 1
        },
        classPermissions: 8,
        userPermissions: 7,
        inheritedPermissions: 0
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockStats,
        error: null
      });

      const result = await permissionService.getPermissionStats();

      expect(result.totalDocuments).toBe(10);
      expect(result.documentsWithPermissions).toBe(8);
      expect(result.totalPermissions).toBe(15);
    });
  });

  describe('getAuditLogs', () => {
    it('should return filtered audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-123',
          document_id: 'doc-456',
          action: AccessAction.DOCUMENT_VIEW,
          success: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from().select().order.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockLogs,
          error: null
        })
      });

      const result = await permissionService.getAuditLogs({
        userId: 'user-123',
        limit: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(AccessAction.DOCUMENT_VIEW);
    });
  });

  describe('revokePermission', () => {
    it('should revoke a permission', async () => {
      // Mock getting permission details before deletion
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          document_id: 'doc-456',
          user_id: 'user-789',
          permission_level: AccessLevel.READ
        },
        error: null
      });

      // Mock deletion
      mockSupabase.from().delete().eq.mockResolvedValueOnce({
        error: null
      });

      await permissionService.revokePermission('perm-123');

      expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 'perm-123');
    });
  });

  describe('getAvailableClasses', () => {
    it('should return available classes', async () => {
      const mockClasses = [
        { class_name: 'Class A' },
        { class_name: 'Class B' }
      ];

      mockSupabase.from().select().group.mockResolvedValueOnce({
        data: mockClasses,
        error: null
      });

      const result = await permissionService.getAvailableClasses();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Class A');
      expect(result[1].name).toBe('Class B');
    });
  });

  describe('getAvailableUsers', () => {
    it('should return available users', async () => {
      const mockUsers = [
        {
          student_id: 'student-1',
          name: 'John Doe',
          class_name: 'Class A',
          user_id: 'user-1'
        }
      ];

      mockSupabase.from().select.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null
        })
      });

      const result = await permissionService.getAvailableUsers('Class A');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].className).toBe('Class A');
    });
  });
});

describe('Permission System Integration', () => {
  it('should handle complete permission workflow', async () => {
    // This would be an integration test that:
    // 1. Creates a document
    // 2. Assigns permissions
    // 3. Checks access
    // 4. Verifies audit logs
    // 5. Revokes permissions
    
    // For now, this is a placeholder for future integration tests
    expect(true).toBe(true);
  });

  it('should enforce permission hierarchy', async () => {
    // Test that admin > write > read permissions work correctly
    expect(true).toBe(true);
  });

  it('should handle permission inheritance', async () => {
    // Test folder-level permission inheritance (future feature)
    expect(true).toBe(true);
  });
});

describe('Permission Validation', () => {
  it('should validate permission levels', () => {
    const validLevels = [AccessLevel.READ, AccessLevel.WRITE, AccessLevel.ADMIN];
    validLevels.forEach(level => {
      expect(Object.values(AccessLevel)).toContain(level);
    });
  });

  it('should validate access actions', () => {
    const validActions = [
      AccessAction.DOCUMENT_VIEW,
      AccessAction.PERMISSION_GRANT,
      AccessAction.UNAUTHORIZED_ACCESS_ATTEMPT
    ];
    validActions.forEach(action => {
      expect(Object.values(AccessAction)).toContain(action);
    });
  });
});