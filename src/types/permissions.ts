/**
 * Document Permissions and Access Control Types
 * Types and interfaces for managing document permissions and access control
 */

import { AccessLevel } from './enhanced-rag';

// ============================================================================
// PERMISSION INTERFACES
// ============================================================================

/**
 * Class interface for permission management
 */
export interface Class {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  studentCount?: number;
}

/**
 * User interface for permission management
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'student' | 'teacher';
  classId?: string;
  className?: string;
  createdAt: Date;
}

/**
 * Document permission with expanded details
 */
export interface DocumentPermissionDetails {
  id: string;
  documentId: string;
  documentTitle: string;
  classId?: string;
  className?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  permissionLevel: AccessLevel;
  grantedBy?: string;
  grantedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  inherited?: boolean;
  source?: 'direct' | 'folder' | 'parent';
}

/**
 * Bulk permission assignment request
 */
export interface BulkPermissionRequest {
  documentIds: string[];
  classIds?: string[];
  userIds?: string[];
  permissionLevel: AccessLevel;
  replaceExisting?: boolean;
}

/**
 * Permission inheritance configuration
 */
export interface PermissionInheritance {
  folderId: string;
  folderName: string;
  inheritanceEnabled: boolean;
  defaultPermissionLevel: AccessLevel;
  classIds: string[];
  userIds: string[];
  applyToExisting: boolean;
}

/**
 * Access audit log entry
 */
export interface AccessAuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  documentId: string;
  documentTitle: string;
  action: AccessAction;
  permissionLevel?: AccessLevel;
  targetUserId?: string;
  targetClassName?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Access action types for audit logging
 */
export enum AccessAction {
  DOCUMENT_VIEW = 'document_view',
  DOCUMENT_DOWNLOAD = 'document_download',
  DOCUMENT_SEARCH = 'document_search',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  PERMISSION_UPDATE = 'permission_update',
  BULK_PERMISSION_ASSIGN = 'bulk_permission_assign',
  FOLDER_ACCESS = 'folder_access',
  CHAT_ACCESS = 'chat_access',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt'
}

// ============================================================================
// REQUEST/RESPONSE INTERFACES
// ============================================================================

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  userId: string;
  documentId: string;
  requiredLevel: AccessLevel;
}

/**
 * Permission check response
 */
export interface PermissionCheckResponse {
  hasAccess: boolean;
  actualLevel?: AccessLevel;
  source?: 'direct' | 'folder' | 'class' | 'inherited';
  reason?: string;
}

/**
 * Accessible documents request
 */
export interface AccessibleDocumentsRequest {
  userId: string;
  folderId?: string;
  classId?: string;
  permissionLevel?: AccessLevel;
  includeInherited?: boolean;
}

/**
 * Accessible documents response
 */
export interface AccessibleDocumentsResponse {
  documentIds: string[];
  permissions: Record<string, DocumentPermissionDetails>;
  totalCount: number;
}

/**
 * Permission management stats
 */
export interface PermissionStats {
  totalDocuments: number;
  documentsWithPermissions: number;
  totalPermissions: number;
  permissionsByLevel: Record<AccessLevel, number>;
  classPermissions: number;
  userPermissions: number;
  inheritedPermissions: number;
}

// ============================================================================
// FILTER AND SEARCH INTERFACES
// ============================================================================

/**
 * Permission filter options
 */
export interface PermissionFilter {
  documentId?: string;
  classId?: string;
  userId?: string;
  permissionLevel?: AccessLevel;
  grantedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  inherited?: boolean;
  source?: 'direct' | 'folder' | 'parent';
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
  userId?: string;
  documentId?: string;
  action?: AccessAction;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  isValid: boolean;
  errors: PermissionValidationError[];
  warnings: PermissionValidationWarning[];
}

/**
 * Permission validation error
 */
export interface PermissionValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

/**
 * Permission validation warning
 */
export interface PermissionValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Permission creation input
 */
export type PermissionCreateInput = {
  documentId: string;
  permissionLevel: AccessLevel;
  grantedBy?: string;
} & (
  | { classId: string; userId?: never }
  | { userId: string; classId?: never }
);

/**
 * Permission update input
 */
export type PermissionUpdateInput = Partial<Pick<DocumentPermissionDetails, 'permissionLevel'>>;

/**
 * Audit log creation input
 */
export type AuditLogCreateInput = Omit<AccessAuditLog, 'id' | 'createdAt'>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Permission constraints
 */
export const PERMISSION_CONSTRAINTS = {
  MAX_BULK_DOCUMENTS: 100,
  MAX_BULK_CLASSES: 50,
  MAX_BULK_USERS: 200,
  MAX_AUDIT_LOG_RETENTION_DAYS: 365,
  MAX_PERMISSIONS_PER_DOCUMENT: 1000,
} as const;

/**
 * Default permission levels for different scenarios
 */
export const DEFAULT_PERMISSIONS = {
  FOLDER_INHERITANCE: AccessLevel.READ,
  CLASS_ASSIGNMENT: AccessLevel.READ,
  ADMIN_LEVEL: AccessLevel.ADMIN,
} as const;

/**
 * Permission error codes
 */
export enum PermissionErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_PERMISSION_LEVEL = 'INVALID_PERMISSION_LEVEL',
  DUPLICATE_PERMISSION = 'DUPLICATE_PERMISSION',
  PERMISSION_NOT_FOUND = 'PERMISSION_NOT_FOUND',
  INVALID_TARGET = 'INVALID_TARGET',
  BULK_OPERATION_FAILED = 'BULK_OPERATION_FAILED',
  INHERITANCE_CONFLICT = 'INHERITANCE_CONFLICT',
  AUDIT_LOG_FAILED = 'AUDIT_LOG_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}