/**
 * Audit Service
 * Comprehensive audit logging for all document and permission operations
 */

import { supabase } from '../integrations/supabase/client';
import { AccessAction, AccessAuditLog, AuditLogFilter } from '../types/permissions';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AuditEvent {
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditResource {
  type: ResourceType;
  name?: string;
  path?: string;
}

export enum ResourceType {
  DOCUMENT = 'document',
  FOLDER = 'folder',
  PERMISSION = 'permission',
  CHAT = 'chat',
  SEARCH = 'search',
  USER = 'user',
  SYSTEM = 'system'
}

export enum AuditAction {
  // Document actions
  DOCUMENT_CREATE = 'document_create',
  DOCUMENT_VIEW = 'document_view',
  DOCUMENT_UPDATE = 'document_update',
  DOCUMENT_DELETE = 'document_delete',
  DOCUMENT_DOWNLOAD = 'document_download',
  DOCUMENT_UPLOAD = 'document_upload',
  DOCUMENT_PROCESS = 'document_process',
  
  // Folder actions
  FOLDER_CREATE = 'folder_create',
  FOLDER_VIEW = 'folder_view',
  FOLDER_UPDATE = 'folder_update',
  FOLDER_DELETE = 'folder_delete',
  FOLDER_MOVE = 'folder_move',
  
  // Permission actions
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  PERMISSION_UPDATE = 'permission_update',
  PERMISSION_CHECK = 'permission_check',
  BULK_PERMISSION_ASSIGN = 'bulk_permission_assign',
  
  // Chat actions
  CHAT_START = 'chat_start',
  CHAT_MESSAGE = 'chat_message',
  CHAT_SEARCH = 'chat_search',
  CHAT_EXPORT = 'chat_export',
  
  // Search actions
  SEARCH_EXECUTE = 'search_execute',
  SEARCH_FILTER = 'search_filter',
  
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATE = 'user_profile_update',
  
  // System actions
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_ERROR = 'system_error',
  
  // Security actions
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation'
}

export interface AuditStats {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByResource: Record<string, number>;
  eventsByUser: Record<string, number>;
  successRate: number;
  recentActivity: AuditEvent[];
  securityEvents: AuditEvent[];
}

export interface AuditExportOptions {
  format: 'json' | 'csv';
  dateFrom?: Date;
  dateTo?: Date;
  actions?: AuditAction[];
  resources?: ResourceType[];
  userIds?: string[];
  includeMetadata?: boolean;
}

// ============================================================================
// AUDIT SERVICE CLASS
// ============================================================================

class AuditService {
  private eventQueue: AuditEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private isProcessing = false;

  constructor() {
    // Start batch processing
    this.startBatchProcessing();
  }

  // ============================================================================
  // EVENT LOGGING
  // ============================================================================

  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Add timestamp and generate ID
      const auditEvent: AuditEvent & { id?: string; timestamp?: Date } = {
        ...event,
        timestamp: new Date()
      };

      // Add to queue for batch processing
      this.eventQueue.push(auditEvent);

      // If queue is full, process immediately
      if (this.eventQueue.length >= this.batchSize) {
        await this.processBatch();
      }

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Store in local storage as fallback
      this.storeEventLocally(event);
    }
  }

  /**
   * Log document access event
   */
  async logDocumentAccess(
    userId: string,
    documentId: string,
    action: AuditAction,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: {
        type: ResourceType.DOCUMENT,
        name: details?.documentTitle
      },
      resourceId: documentId,
      success,
      details,
      ipAddress: await this.getClientIpAddress(),
      userAgent: navigator.userAgent
    });
  }

  /**
   * Log permission change event
   */
  async logPermissionChange(
    userId: string,
    targetResourceId: string,
    action: AuditAction,
    details: Record<string, any>,
    success: boolean = true
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: {
        type: ResourceType.PERMISSION,
        name: details.resourceName
      },
      resourceId: targetResourceId,
      success,
      details,
      ipAddress: await this.getClientIpAddress(),
      userAgent: navigator.userAgent
    });
  }

  /**
   * Log chat interaction event
   */
  async logChatInteraction(
    userId: string,
    sessionId: string,
    action: AuditAction,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: {
        type: ResourceType.CHAT,
        name: `Session ${sessionId}`
      },
      resourceId: sessionId,
      success: true,
      details,
      ipAddress: await this.getClientIpAddress(),
      userAgent: navigator.userAgent
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string | null,
    action: AuditAction,
    resourceId: string,
    success: boolean = false,
    errorMessage?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId: userId || 'anonymous',
      action,
      resource: {
        type: ResourceType.SYSTEM,
        name: 'Security Event'
      },
      resourceId,
      success,
      errorMessage,
      details,
      ipAddress: await this.getClientIpAddress(),
      userAgent: navigator.userAgent
    });
  }

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  /**
   * Start batch processing of audit events
   */
  private startBatchProcessing(): void {
    setInterval(async () => {
      if (this.eventQueue.length > 0 && !this.isProcessing) {
        await this.processBatch();
      }
    }, this.flushInterval);
  }

  /**
   * Process batch of audit events
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.eventQueue.splice(0, this.batchSize);
      
      // Transform events for database storage
      const dbEvents = batch.map(event => ({
        user_id: event.userId,
        action: event.action,
        resource_type: event.resource.type,
        resource_id: event.resourceId,
        resource_name: event.resource.name,
        success: event.success,
        error_message: event.errorMessage,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        details: event.details || {},
        metadata: event.metadata || {},
        created_at: new Date().toISOString()
      }));

      // Insert into database
      const { error } = await supabase
        .from('audit_logs')
        .insert(dbEvents);

      if (error) {
        console.error('Failed to insert audit events:', error);
        // Store failed events locally
        batch.forEach(event => this.storeEventLocally(event));
      }

    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // ============================================================================
  // AUDIT LOG RETRIEVAL
  // ============================================================================

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filter?: AuditLogFilter): Promise<AccessAuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          user_id,
          action,
          resource_type,
          resource_id,
          resource_name,
          success,
          error_message,
          ip_address,
          user_agent,
          details,
          metadata,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter?.action) {
        query = query.eq('action', filter.action);
      }

      if (filter?.success !== undefined) {
        query = query.eq('success', filter.success);
      }

      if (filter?.dateFrom) {
        query = query.gte('created_at', filter.dateFrom.toISOString());
      }

      if (filter?.dateTo) {
        query = query.lte('created_at', filter.dateTo.toISOString());
      }

      if (filter?.limit) {
        query = query.limit(filter.limit);
      }

      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      // Transform database records to AccessAuditLog format
      return (data || []).map(record => ({
        id: record.id,
        userId: record.user_id,
        documentId: record.resource_type === 'document' ? record.resource_id : '',
        documentTitle: record.resource_name || '',
        action: record.action as AccessAction,
        success: record.success,
        errorMessage: record.error_message,
        ipAddress: record.ip_address,
        userAgent: record.user_agent,
        metadata: record.metadata,
        createdAt: new Date(record.created_at)
      }));

    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(dateFrom?: Date, dateTo?: Date): Promise<AuditStats> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('action, resource_type, user_id, success, created_at');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit stats: ${error.message}`);
      }

      const events = data || [];
      const totalEvents = events.length;
      const successfulEvents = events.filter(e => e.success).length;

      // Calculate statistics
      const eventsByAction: Record<string, number> = {};
      const eventsByResource: Record<string, number> = {};
      const eventsByUser: Record<string, number> = {};

      events.forEach(event => {
        eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
        eventsByResource[event.resource_type] = (eventsByResource[event.resource_type] || 0) + 1;
        eventsByUser[event.user_id] = (eventsByUser[event.user_id] || 0) + 1;
      });

      // Get recent activity (last 10 events)
      const recentActivity = events
        .slice(0, 10)
        .map(event => ({
          userId: event.user_id,
          action: event.action as AuditAction,
          resource: {
            type: event.resource_type as ResourceType
          },
          resourceId: '',
          success: event.success,
          timestamp: new Date(event.created_at)
        }));

      // Get security events
      const securityActions = [
        AuditAction.UNAUTHORIZED_ACCESS,
        AuditAction.RATE_LIMIT_EXCEEDED,
        AuditAction.SUSPICIOUS_ACTIVITY,
        AuditAction.SECURITY_VIOLATION
      ];

      const securityEvents = events
        .filter(event => securityActions.includes(event.action as AuditAction))
        .slice(0, 10)
        .map(event => ({
          userId: event.user_id,
          action: event.action as AuditAction,
          resource: {
            type: event.resource_type as ResourceType
          },
          resourceId: '',
          success: event.success,
          timestamp: new Date(event.created_at)
        }));

      return {
        totalEvents,
        eventsByAction,
        eventsByResource,
        eventsByUser,
        successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0,
        recentActivity,
        securityEvents
      };

    } catch (error) {
      console.error('Failed to get audit stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUDIT LOG EXPORT
  // ============================================================================

  /**
   * Export audit logs
   */
  async exportAuditLogs(options: AuditExportOptions): Promise<string> {
    try {
      const filter: AuditLogFilter = {
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: 10000 // Large limit for export
      };

      const logs = await this.getAuditLogs(filter);

      if (options.format === 'csv') {
        return this.exportToCsv(logs, options.includeMetadata);
      } else {
        return JSON.stringify(logs, null, 2);
      }

    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Export logs to CSV format
   */
  private exportToCsv(logs: AccessAuditLog[], includeMetadata: boolean = false): string {
    const headers = [
      'Timestamp',
      'User ID',
      'Action',
      'Resource ID',
      'Success',
      'IP Address',
      'User Agent',
      'Error Message'
    ];

    if (includeMetadata) {
      headers.push('Metadata');
    }

    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.createdAt.toISOString(),
        log.userId,
        log.action,
        log.documentId || '',
        log.success.toString(),
        log.ipAddress || '',
        `"${log.userAgent || ''}"`,
        `"${log.errorMessage || ''}"`
      ];

      if (includeMetadata) {
        row.push(`"${JSON.stringify(log.metadata || {})}"`);
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get client IP address (best effort)
   */
  private async getClientIpAddress(): Promise<string | undefined> {
    try {
      // In a real application, this would be handled by the server
      // For demo purposes, we'll use a placeholder
      return 'client-ip';
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Store event locally as fallback
   */
  private storeEventLocally(event: AuditEvent): void {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('audit_events_fallback') || '[]');
      existingEvents.push({
        ...event,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 events
      if (existingEvents.length > 100) {
        existingEvents.splice(0, existingEvents.length - 100);
      }

      localStorage.setItem('audit_events_fallback', JSON.stringify(existingEvents));
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length > 0) {
      await this.processBatch();
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const auditService = new AuditService();

// Export types and enums
export { AuditAction, ResourceType };