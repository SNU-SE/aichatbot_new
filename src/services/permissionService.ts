/**
 * Document Permission Service
 * Handles all document permission and access control operations
 */

import { supabase } from '@/integrations/supabase/client';
import { AccessLevel } from '@/types/enhanced-rag';
import {
  DocumentPermissionDetails,
  BulkPermissionRequest,
  PermissionCheckRequest,
  PermissionCheckResponse,
  AccessibleDocumentsRequest,
  AccessibleDocumentsResponse,
  PermissionFilter,
  AuditLogFilter,
  AccessAuditLog,
  AccessAction,
  PermissionCreateInput,
  PermissionUpdateInput,
  AuditLogCreateInput,
  PermissionStats,
  PermissionInheritance,
  PermissionErrorCode,
  Class,
  User
} from '@/types/permissions';

export class PermissionService {
  /**
   * Check if a user has permission to access a document
   */
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResponse> {
    try {
      const { data, error } = await supabase.rpc('check_document_permission', {
        user_id: request.userId,
        document_id: request.documentId,
        required_level: request.requiredLevel
      });

      if (error) {
        await this.logAccess({
          userId: request.userId,
          documentId: request.documentId,
          action: AccessAction.UNAUTHORIZED_ACCESS_ATTEMPT,
          success: false,
          errorMessage: error.message
        });
        throw error;
      }

      // Log successful permission check
      if (data?.hasAccess) {
        await this.logAccess({
          userId: request.userId,
          documentId: request.documentId,
          action: AccessAction.DOCUMENT_VIEW,
          permissionLevel: data.actualLevel,
          success: true
        });
      }

      return data;
    } catch (error) {
      console.error('Permission check failed:', error);
      throw new Error(`Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all documents accessible to a user
   */
  async getAccessibleDocuments(request: AccessibleDocumentsRequest): Promise<AccessibleDocumentsResponse> {
    try {
      const { data, error } = await supabase.rpc('get_user_accessible_documents_detailed', {
        user_id: request.userId,
        folder_id: request.folderId,
        class_id: request.classId,
        permission_level: request.permissionLevel,
        include_inherited: request.includeInherited ?? true
      });

      if (error) throw error;

      return {
        documentIds: data?.document_ids || [],
        permissions: data?.permissions || {},
        totalCount: data?.total_count || 0
      };
    } catch (error) {
      console.error('Failed to get accessible documents:', error);
      throw new Error(`Failed to get accessible documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Grant permission to a document
   */
  async grantPermission(permission: PermissionCreateInput): Promise<DocumentPermissionDetails> {
    try {
      const { data, error } = await supabase
        .from('document_permissions')
        .insert({
          document_id: permission.documentId,
          class_id: permission.classId,
          user_id: permission.userId,
          permission_level: permission.permissionLevel,
          granted_by: permission.grantedBy
        })
        .select(`
          *,
          documents!inner(title),
          students(name, class_name)
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(PermissionErrorCode.DUPLICATE_PERMISSION);
        }
        throw error;
      }

      // Log permission grant
      await this.logAccess({
        userId: permission.grantedBy || 'system',
        documentId: permission.documentId,
        action: AccessAction.PERMISSION_GRANT,
        permissionLevel: permission.permissionLevel,
        targetUserId: permission.userId,
        targetClassName: permission.classId,
        success: true
      });

      return this.mapPermissionData(data);
    } catch (error) {
      console.error('Failed to grant permission:', error);
      throw new Error(`Failed to grant permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Synchronize permissions for documents linked to an activity
   */
  async syncActivityDocumentPermissions(activityId: string, grantedBy?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('sync_activity_document_permissions', {
        p_activity_id: activityId,
        p_granted_by: grantedBy ?? null
      });

      if (error) {
        console.error('Failed to sync activity document permissions:', error);
        throw new Error('문서 권한을 동기화하지 못했습니다.');
      }
    } catch (error) {
      console.error('Sync activity document permissions error:', error);
      throw new Error(`권한을 동기화하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing permission
   */
  async updatePermission(permissionId: string, updates: PermissionUpdateInput): Promise<DocumentPermissionDetails> {
    try {
      const { data, error } = await supabase
        .from('document_permissions')
        .update(updates)
        .eq('id', permissionId)
        .select(`
          *,
          documents!inner(title),
          students(name, class_name)
        `)
        .single();

      if (error) throw error;

      // Log permission update
      await this.logAccess({
        userId: 'system', // Should be current user
        documentId: data.document_id,
        action: AccessAction.PERMISSION_UPDATE,
        permissionLevel: data.permission_level,
        success: true
      });

      return this.mapPermissionData(data);
    } catch (error) {
      console.error('Failed to update permission:', error);
      throw new Error(`Failed to update permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke a permission
   */
  async revokePermission(permissionId: string): Promise<void> {
    try {
      // Get permission details before deletion for logging
      const { data: permissionData } = await supabase
        .from('document_permissions')
        .select('document_id, user_id, class_id, permission_level')
        .eq('id', permissionId)
        .single();

      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      // Log permission revocation
      if (permissionData) {
        await this.logAccess({
          userId: 'system', // Should be current user
          documentId: permissionData.document_id,
          action: AccessAction.PERMISSION_REVOKE,
          permissionLevel: permissionData.permission_level,
          targetUserId: permissionData.user_id,
          targetClassName: permissionData.class_id,
          success: true
        });
      }
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      throw new Error(`Failed to revoke permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk assign permissions to multiple documents
   */
  async bulkAssignPermissions(request: BulkPermissionRequest): Promise<DocumentPermissionDetails[]> {
    try {
      const { data, error } = await supabase.rpc('bulk_assign_permissions', {
        document_ids: request.documentIds,
        class_ids: request.classIds || [],
        user_ids: request.userIds || [],
        permission_level: request.permissionLevel,
        replace_existing: request.replaceExisting || false
      });

      if (error) throw error;

      // Log bulk permission assignment
      await this.logAccess({
        userId: 'system', // Should be current user
        documentId: request.documentIds[0], // Log first document as representative
        action: AccessAction.BULK_PERMISSION_ASSIGN,
        permissionLevel: request.permissionLevel,
        success: true,
        metadata: {
          documentCount: request.documentIds.length,
          classCount: request.classIds?.length || 0,
          userCount: request.userIds?.length || 0
        }
      });

      return data?.map(this.mapPermissionData) || [];
    } catch (error) {
      console.error('Bulk permission assignment failed:', error);
      throw new Error(`Bulk permission assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get permissions for a document
   */
  async getDocumentPermissions(documentId: string, filter?: PermissionFilter): Promise<DocumentPermissionDetails[]> {
    try {
      let query = supabase
        .from('document_permissions')
        .select(`
          *,
          documents!inner(title),
          students(name, class_name)
        `)
        .eq('document_id', documentId);

      // Apply filters
      if (filter?.classId) query = query.eq('class_id', filter.classId);
      if (filter?.userId) query = query.eq('user_id', filter.userId);
      if (filter?.permissionLevel) query = query.eq('permission_level', filter.permissionLevel);
      if (filter?.grantedBy) query = query.eq('granted_by', filter.grantedBy);
      if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom.toISOString());
      if (filter?.dateTo) query = query.lte('created_at', filter.dateTo.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(this.mapPermissionData) || [];
    } catch (error) {
      console.error('Failed to get document permissions:', error);
      throw new Error(`Failed to get document permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up folder permission inheritance
   */
  async setupFolderInheritance(inheritance: PermissionInheritance): Promise<void> {
    try {
      const { error } = await supabase.rpc('setup_folder_inheritance', {
        folder_id: inheritance.folderId,
        inheritance_enabled: inheritance.inheritanceEnabled,
        default_permission_level: inheritance.defaultPermissionLevel,
        class_ids: inheritance.classIds,
        user_ids: inheritance.userIds,
        apply_to_existing: inheritance.applyToExisting
      });

      if (error) throw error;

      // Log inheritance setup
      await this.logAccess({
        userId: 'system', // Should be current user
        documentId: inheritance.folderId, // Use folder ID as document ID for logging
        action: AccessAction.PERMISSION_GRANT,
        permissionLevel: inheritance.defaultPermissionLevel,
        success: true,
        metadata: {
          type: 'folder_inheritance',
          inheritanceEnabled: inheritance.inheritanceEnabled,
          applyToExisting: inheritance.applyToExisting
        }
      });
    } catch (error) {
      console.error('Failed to setup folder inheritance:', error);
      throw new Error(`Failed to setup folder inheritance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(): Promise<PermissionStats> {
    try {
      const { data, error } = await supabase.rpc('get_permission_statistics');

      if (error) throw error;

      return data || {
        totalDocuments: 0,
        documentsWithPermissions: 0,
        totalPermissions: 0,
        permissionsByLevel: {
          [AccessLevel.READ]: 0,
          [AccessLevel.WRITE]: 0,
          [AccessLevel.ADMIN]: 0
        },
        classPermissions: 0,
        userPermissions: 0,
        inheritedPermissions: 0
      };
    } catch (error) {
      console.error('Failed to get permission stats:', error);
      throw new Error(`Failed to get permission stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get access audit logs
   */
  async getAuditLogs(filter?: AuditLogFilter): Promise<AccessAuditLog[]> {
    try {
      let query = supabase
        .from('access_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter?.userId) query = query.eq('user_id', filter.userId);
      if (filter?.documentId) query = query.eq('document_id', filter.documentId);
      if (filter?.action) query = query.eq('action', filter.action);
      if (filter?.success !== undefined) query = query.eq('success', filter.success);
      if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom.toISOString());
      if (filter?.dateTo) query = query.lte('created_at', filter.dateTo.toISOString());
      if (filter?.ipAddress) query = query.eq('ip_address', filter.ipAddress);

      // Apply pagination
      if (filter?.limit) query = query.limit(filter.limit);
      if (filter?.offset) query = query.range(filter.offset, (filter.offset + (filter.limit || 50)) - 1);

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(log => ({
        ...log,
        createdAt: new Date(log.created_at)
      })) || [];
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw new Error(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available classes for permission assignment
   */
  async getAvailableClasses(): Promise<Class[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class_name')
        .group('class_name');

      if (error) throw error;

      return data?.map(item => ({
        id: item.class_name,
        name: item.class_name,
        createdAt: new Date(),
        updatedAt: new Date()
      })) || [];
    } catch (error) {
      console.error('Failed to get available classes:', error);
      throw new Error(`Failed to get available classes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users for permission assignment
   */
  async getAvailableUsers(classId?: string): Promise<User[]> {
    try {
      let query = supabase
        .from('students')
        .select('student_id, name, class_name, user_id');

      if (classId) {
        query = query.eq('class_name', classId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(student => ({
        id: student.user_id || student.student_id,
        email: `${student.student_id}@student.local`, // Placeholder email
        name: student.name,
        role: 'student' as const,
        classId: student.class_name,
        className: student.class_name,
        createdAt: new Date()
      })) || [];
    } catch (error) {
      console.error('Failed to get available users:', error);
      throw new Error(`Failed to get available users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log access attempt for audit trail
   */
  private async logAccess(logEntry: AuditLogCreateInput): Promise<void> {
    try {
      const { error } = await supabase
        .from('access_audit_logs')
        .insert({
          user_id: logEntry.userId,
          user_name: logEntry.userName,
          user_email: logEntry.userEmail,
          document_id: logEntry.documentId,
          document_title: logEntry.documentTitle,
          action: logEntry.action,
          permission_level: logEntry.permissionLevel,
          target_user_id: logEntry.targetUserId,
          target_class_name: logEntry.targetClassName,
          ip_address: logEntry.ipAddress,
          user_agent: logEntry.userAgent,
          success: logEntry.success,
          error_message: logEntry.errorMessage,
          metadata: logEntry.metadata
        });

      if (error) {
        console.error('Failed to log access:', error);
        // Don't throw error for logging failures to avoid breaking main operations
      }
    } catch (error) {
      console.error('Failed to log access:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Map database permission data to interface
   */
  private mapPermissionData(data: any): DocumentPermissionDetails {
    return {
      id: data.id,
      documentId: data.document_id,
      documentTitle: data.documents?.title || 'Unknown Document',
      classId: data.class_id,
      className: data.class_id, // Assuming class_id is the class name
      userId: data.user_id,
      userName: data.students?.name,
      userEmail: `${data.user_id}@student.local`, // Placeholder
      permissionLevel: data.permission_level,
      grantedBy: data.granted_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      inherited: false, // Will be determined by inheritance logic
      source: 'direct'
    };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
