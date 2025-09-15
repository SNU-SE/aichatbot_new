/**
 * useProcessingStatus Hook
 * React hook for managing real-time document processing status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  ProcessingStatus, 
  ProcessingStatusUpdate, 
  EnhancedErrorResponse 
} from '@/types/enhanced-rag';
import { documentProcessingService } from '@/services/documentProcessingService';
import { 
  processingNotificationService,
  ProcessingNotification,
  NotificationPreferences 
} from '@/services/processingNotificationService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcessingStatusState {
  documentId: string;
  status: ProcessingStatus;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  errorDetails?: string;
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
}

export interface UseProcessingStatusOptions {
  enableNotifications?: boolean;
  enableToasts?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  onComplete?: (documentId: string) => void;
  onError?: (documentId: string, error: EnhancedErrorResponse) => void;
  onProgress?: (documentId: string, update: ProcessingStatusUpdate) => void;
}

export interface UseProcessingStatusReturn {
  // Status state
  processingStates: Map<string, ProcessingStatusState>;
  activeProcessing: ProcessingStatusState[];
  completedProcessing: ProcessingStatusState[];
  failedProcessing: ProcessingStatusState[];
  
  // Status management
  startMonitoring: (documentId: string) => Promise<void>;
  stopMonitoring: (documentId: string) => void;
  retryProcessing: (documentId: string) => Promise<void>;
  clearStatus: (documentId: string) => void;
  clearAllStatuses: () => void;
  
  // Notifications
  notifications: ProcessingNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  
  // Preferences
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  
  // Utility
  isMonitoring: boolean;
  hasActiveProcessing: boolean;
  totalProgress: number;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useProcessingStatus = (
  options: UseProcessingStatusOptions = {}
): UseProcessingStatusReturn => {
  const {
    enableNotifications = true,
    enableToasts = true,
    autoRetry = false,
    maxRetries = 3,
    onComplete,
    onError,
    onProgress
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const [processingStates, setProcessingStates] = useState<Map<string, ProcessingStatusState>>(new Map());
  const [notifications, setNotifications] = useState<ProcessingNotification[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    enableBrowserNotifications: true,
    enableToastNotifications: enableToasts,
    enableEmailNotifications: false,
    notifyOnComplete: true,
    notifyOnError: true,
    notifyOnProgress: false,
    soundEnabled: true
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  const { toast } = useToast();
  const listenerId = useRef(`processing-status-${Date.now()}`);
  const monitoredDocuments = useRef<Set<string>>(new Set());

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const activeProcessing = Array.from(processingStates.values()).filter(
    state => state.status !== ProcessingStatus.COMPLETED && state.status !== ProcessingStatus.FAILED
  );

  const completedProcessing = Array.from(processingStates.values()).filter(
    state => state.status === ProcessingStatus.COMPLETED
  );

  const failedProcessing = Array.from(processingStates.values()).filter(
    state => state.status === ProcessingStatus.FAILED
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const hasActiveProcessing = activeProcessing.length > 0;

  const totalProgress = processingStates.size > 0 
    ? Array.from(processingStates.values()).reduce((sum, state) => sum + state.progress, 0) / processingStates.size
    : 0;

  // ============================================================================
  // STATUS UPDATE HANDLERS
  // ============================================================================

  const handleStatusUpdate = useCallback((update: ProcessingStatusUpdate) => {
    setProcessingStates(prev => {
      const newStates = new Map(prev);
      const existingState = newStates.get(update.documentId);
      
      const updatedState: ProcessingStatusState = {
        documentId: update.documentId,
        status: update.status,
        progress: update.progress || 0,
        message: update.message || '',
        estimatedTimeRemaining: update.estimatedTimeRemaining,
        errorDetails: update.errorDetails,
        startTime: existingState?.startTime || new Date(),
        endTime: (update.status === ProcessingStatus.COMPLETED || update.status === ProcessingStatus.FAILED) 
          ? new Date() : undefined,
        retryCount: existingState?.retryCount || 0
      };

      newStates.set(update.documentId, updatedState);

      // Handle completion
      if (update.status === ProcessingStatus.COMPLETED) {
        onComplete?.(update.documentId);
        
        if (enableToasts) {
          toast({
            title: "Processing Complete",
            description: `Document processing completed successfully.`,
            duration: 5000,
          });
        }
      }

      // Handle failure with auto-retry
      if (update.status === ProcessingStatus.FAILED && autoRetry) {
        const retryCount = updatedState.retryCount;
        if (retryCount < maxRetries) {
          setTimeout(() => {
            retryProcessing(update.documentId);
          }, Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }

      // Call progress callback
      onProgress?.(update.documentId, update);

      return newStates;
    });
  }, [onComplete, onError, onProgress, enableToasts, autoRetry, maxRetries, toast]);

  const handleProcessingError = useCallback((documentId: string, error: EnhancedErrorResponse) => {
    setProcessingStates(prev => {
      const newStates = new Map(prev);
      const existingState = newStates.get(documentId);
      
      if (existingState) {
        const updatedState: ProcessingStatusState = {
          ...existingState,
          status: ProcessingStatus.FAILED,
          progress: 0,
          message: error.message,
          errorDetails: error.details,
          endTime: new Date()
        };

        newStates.set(documentId, updatedState);
      }

      return newStates;
    });

    onError?.(documentId, error);

    if (enableToasts) {
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [onError, enableToasts, toast]);

  const handleNotification = useCallback((notification: ProcessingNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100
  }, []);

  // ============================================================================
  // MONITORING FUNCTIONS
  // ============================================================================

  const startMonitoring = useCallback(async (documentId: string) => {
    if (monitoredDocuments.current.has(documentId)) {
      return; // Already monitoring
    }

    try {
      // Get initial status
      const initialStatus = await documentProcessingService.getProcessingStatus(documentId);
      
      // Create initial state
      const initialState: ProcessingStatusState = {
        documentId,
        status: initialStatus.status,
        progress: initialStatus.progress || 0,
        message: initialStatus.message || '',
        estimatedTimeRemaining: initialStatus.estimatedTimeRemaining,
        errorDetails: initialStatus.errorDetails,
        startTime: new Date(),
        retryCount: 0
      };

      setProcessingStates(prev => new Map(prev.set(documentId, initialState)));
      monitoredDocuments.current.add(documentId);
      setIsMonitoring(true);

      // Set up real-time subscription
      documentProcessingService.subscribeToStatusUpdates(documentId, {
        onStatusUpdate: handleStatusUpdate,
        onError: (error) => handleProcessingError(documentId, error),
        onComplete: () => {
          // Completion is handled in handleStatusUpdate
        }
      });

    } catch (error) {
      console.error(`Failed to start monitoring document ${documentId}:`, error);
      
      if (enableToasts) {
        toast({
          title: "Monitoring Error",
          description: "Failed to start monitoring document processing.",
          variant: "destructive",
        });
      }
    }
  }, [handleStatusUpdate, handleProcessingError, enableToasts, toast]);

  const stopMonitoring = useCallback((documentId: string) => {
    monitoredDocuments.current.delete(documentId);
    
    if (monitoredDocuments.current.size === 0) {
      setIsMonitoring(false);
    }

    // The actual subscription cleanup is handled by the service
  }, []);

  const retryProcessing = useCallback(async (documentId: string) => {
    try {
      const currentState = processingStates.get(documentId);
      if (!currentState) return;

      // Update retry count
      setProcessingStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(documentId);
        if (state) {
          newStates.set(documentId, {
            ...state,
            retryCount: state.retryCount + 1,
            status: ProcessingStatus.UPLOADING,
            progress: 0,
            message: 'Retrying processing...',
            errorDetails: undefined,
            startTime: new Date(),
            endTime: undefined
          });
        }
        return newStates;
      });

      // Start retry
      await documentProcessingService.retryProcessing(documentId, {
        onStatusUpdate: handleStatusUpdate,
        onError: (error) => handleProcessingError(documentId, error),
        onComplete: () => {}
      });

      if (enableToasts) {
        toast({
          title: "Retry Started",
          description: "Document processing retry has been initiated.",
        });
      }

    } catch (error) {
      console.error(`Failed to retry processing for document ${documentId}:`, error);
      
      if (enableToasts) {
        toast({
          title: "Retry Failed",
          description: "Failed to retry document processing.",
          variant: "destructive",
        });
      }
    }
  }, [processingStates, handleStatusUpdate, handleProcessingError, enableToasts, toast]);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const clearStatus = useCallback((documentId: string) => {
    setProcessingStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(documentId);
      return newStates;
    });
    
    stopMonitoring(documentId);
  }, [stopMonitoring]);

  const clearAllStatuses = useCallback(() => {
    setProcessingStates(new Map());
    monitoredDocuments.current.clear();
    setIsMonitoring(false);
  }, []);

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    processingNotificationService.markAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    processingNotificationService.markAllAsRead();
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    processingNotificationService.clearNotifications();
  }, []);

  const updateNotificationPreferences = useCallback(async (preferences: Partial<NotificationPreferences>) => {
    const newPreferences = { ...notificationPreferences, ...preferences };
    setNotificationPreferences(newPreferences);
    await processingNotificationService.updatePreferences(preferences);
  }, [notificationPreferences]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize notification service
  useEffect(() => {
    if (enableNotifications) {
      processingNotificationService.initialize();
      
      // Set up notification listener
      processingNotificationService.addListener(listenerId.current, {
        onNotification: handleNotification,
        onStatusUpdate: handleStatusUpdate,
        onError: handleProcessingError
      });

      // Load initial preferences
      setNotificationPreferences(processingNotificationService.getPreferences());
      
      // Load initial notifications
      setNotifications(processingNotificationService.getNotifications());
    }

    return () => {
      if (enableNotifications) {
        processingNotificationService.removeListener(listenerId.current);
      }
    };
  }, [enableNotifications, handleNotification, handleStatusUpdate, handleProcessingError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      monitoredDocuments.current.clear();
      setIsMonitoring(false);
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Status state
    processingStates,
    activeProcessing,
    completedProcessing,
    failedProcessing,
    
    // Status management
    startMonitoring,
    stopMonitoring,
    retryProcessing,
    clearStatus,
    clearAllStatuses,
    
    // Notifications
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    
    // Preferences
    notificationPreferences,
    updateNotificationPreferences,
    
    // Utility
    isMonitoring,
    hasActiveProcessing,
    totalProgress
  };
};

export default useProcessingStatus;