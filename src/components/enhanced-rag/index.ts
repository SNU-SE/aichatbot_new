/**
 * Enhanced RAG Components Index
 * Exports all enhanced RAG system components
 */

// Main upload components
export { default as DocumentUpload } from './DocumentUpload';
export { DocumentUploadWithLanguage } from './DocumentUploadWithLanguage';
export { default as DocumentUploadManager } from './DocumentUploadManager';
export { default as DocumentUploadWithStatus } from './DocumentUploadWithStatus';
export { default as UploadProgressIndicator } from './UploadProgressIndicator';

// Document management components
export { default as DocumentManagement } from './DocumentManagement';
export { default as DocumentList } from './DocumentList';
export { default as FolderManager } from './FolderManager';
export { default as DocumentActions } from './DocumentActions';
export { default as DocumentManagementDemo } from './DocumentManagementDemo';

// Search components
export { SearchInterface } from './SearchInterface';
export { MultiLanguageSearchInterface, MultiLanguageSearchResult } from './MultiLanguageSearchInterface';

// Language components
export { 
  LanguageSelector, 
  LanguageDetectionIndicator, 
  CrossLanguageToggle 
} from './LanguageSelector';

// Enhanced Chat Components
export { default as EnhancedChatInterface } from './EnhancedChatInterface';
export { default as ChatMessageList } from './ChatMessageList';
export { default as ChatInput } from './ChatInput';
export { default as DocumentContextPanel } from './DocumentContextPanel';
export { default as SessionList } from './SessionList';

// Validation components
export { 
  FileValidationDisplay, 
  BatchValidationDisplay 
} from './FileValidationDisplay';

// Error handling components
export { default as UploadErrorHandler } from './UploadErrorHandler';

// Real-time processing components
export { default as ProcessingStatusMonitor } from './ProcessingStatusMonitor';
export { default as ProcessingNotificationPanel } from './ProcessingNotificationPanel';

// Admin and Permission Components
export { DocumentPermissionManager } from '../admin/DocumentPermissionManager';
export { DocumentPermissionDemo } from '../admin/DocumentPermissionDemo';
export { PermissionAssignmentDialog } from '../admin/PermissionAssignmentDialog';
export { BulkPermissionDialog } from '../admin/BulkPermissionDialog';
export { PermissionStatsCard } from '../admin/PermissionStatsCard';
export { DocumentPermissionList } from '../admin/DocumentPermissionList';
export { AccessAuditLogViewer } from '../admin/AccessAuditLogViewer';

// Type exports for component props
export type { DocumentUploadProps } from './DocumentUpload';
export type { DocumentUploadWithLanguageProps } from './DocumentUploadWithLanguage';
export type { UploadProgressIndicatorProps } from './UploadProgressIndicator';
export type { DocumentManagementProps } from './DocumentManagement';
export type { DocumentListProps, DocumentAction, BulkAction } from './DocumentList';
export type { FolderManagerProps, FolderAction } from './FolderManager';
export type { DocumentActionsProps, DocumentActionType } from './DocumentActions';
export type { 
  FileValidationDisplayProps, 
  BatchValidationDisplayProps 
} from './FileValidationDisplay';
export type { 
  UploadErrorHandlerProps, 
  UploadError,
  RetryConfig 
} from './UploadErrorHandler';
export type { DocumentUploadManagerProps } from './DocumentUploadManager';

// Security components
export { 
  SecurityDashboard,
  SecurityMiddleware,
  InputValidator,
  SecurityDemo,
  withSecurity,
  useSecurityContext,
  useSecureInput,
  useRateLimit,
  useSecurityAudit,
  SecurityLevel
} from '../security';

// Re-export utility types that components use
export type { 
  ValidationResult 
} from '../../utils/enhanced-rag-utils';

export type {
  DocumentUploadRequest,
  ProcessingStatusUpdate,
  ProcessingStatus,
  DocumentErrorCode,
  EnhancedErrorResponse
} from '../../types/enhanced-rag';

// Error Handling Components
export * from '../error-handling';

// Mobile-Responsive Components
export { default as MobileLayout } from './MobileLayout';
export { default as MobileChatInterface } from './MobileChatInterface';
export { default as MobileDocumentUpload } from './MobileDocumentUpload';
export { default as MobileDocumentList } from './MobileDocumentList';
export { default as ResponsiveEnhancedRAG } from './ResponsiveEnhancedRAG';
export { default as PWAInstallBanner } from './PWAInstallBanner';

// Mobile hooks
export { useMobileNavigation } from './MobileLayout';

// Mobile component types
export type { MobileLayoutProps, NavigationItem } from './MobileLayout';
export type { MobileChatInterfaceProps } from './MobileChatInterface';
export type { MobileDocumentUploadProps } from './MobileDocumentUpload';
export type { MobileDocumentListProps } from './MobileDocumentList';
export type { ResponsiveEnhancedRAGProps } from './ResponsiveEnhancedRAG';
export type { PWAInstallBannerProps, PWAInstallPromptProps } from './PWAInstallBanner';