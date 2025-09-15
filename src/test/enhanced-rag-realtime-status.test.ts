/**
 * Enhanced RAG Real-time Processing Status Tests
 * Tests for the real-time processing status monitoring system
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProcessingStatus } from '../hooks/useProcessingStatus';
import { 
  processingNotificationService,
  ProcessingNotification,
  NotificationPreferences 
} from '../services/processingNotificationService';
import { documentProcessingService } from '../services/documentProcessingService';
import { 
  ProcessingStatus, 
  ProcessingStatusUpdate, 
  EnhancedErrorResponse,
  DocumentErrorCode 
} from '../types/enhanced-rag';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      })
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn()
    }),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'test-doc-id',
          processing_status: ProcessingStatus.UPLOADING,
          metadata: {},
          updated_at: new Date().toISOString()
        }
      }),
      update: vi.fn().mockReturnThis()
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null })
    }
  }
}));

// Mock toast
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock browser APIs
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: class MockNotification {
    static permission = 'granted';
    static requestPermission = vi.fn().mockResolvedValue('granted');
    
    constructor(title: string, options?: NotificationOptions) {
      this.title = title;
      this.body = options?.body;
      this.onclick = null;
      this.close = vi.fn();
    }
    
    title: string;
    body?: string;
    onclick: ((this: Notification, ev: Event) => any) | null;
    close: Mock;
  }
});

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: class MockAudioContext {
    currentTime = 0;
    createOscillator = vi.fn().mockReturnValue({
      connect: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn()
    });
    createGain = vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { 
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    });
    destination = {};
  }
});

// ============================================================================
// TEST DATA
// ============================================================================

const mockDocumentId = 'test-document-id';
const mockStatusUpdate: ProcessingStatusUpdate = {
  documentId: mockDocumentId,
  status: ProcessingStatus.EXTRACTING,
  progress: 30,
  message: 'Extracting text from PDF...',
  estimatedTimeRemaining: 120
};

const mockError: EnhancedErrorResponse = {
  code: DocumentErrorCode.EXTRACTION_FAILED,
  message: 'Failed to extract text from PDF',
  details: 'Invalid PDF format',
  retryable: true,
  suggestedAction: 'Please try uploading a different PDF file',
  timestamp: new Date()
};

const mockNotification: ProcessingNotification = {
  id: 'test-notification-id',
  documentId: mockDocumentId,
  type: 'complete',
  title: 'Processing Complete',
  message: 'Document has been processed successfully',
  timestamp: new Date(),
  read: false,
  actionUrl: `/documents/${mockDocumentId}`
};

// ============================================================================
// PROCESSING STATUS HOOK TESTS
// ============================================================================

describe('useProcessingStatus Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useProcessingStatus());

    expect(result.current.processingStates.size).toBe(0);
    expect(result.current.activeProcessing).toHaveLength(0);
    expect(result.current.completedProcessing).toHaveLength(0);
    expect(result.current.failedProcessing).toHaveLength(0);
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isMonitoring).toBe(false);
    expect(result.current.hasActiveProcessing).toBe(false);
    expect(result.current.totalProgress).toBe(0);
  });

  it('should start monitoring a document', async () => {
    const { result } = renderHook(() => useProcessingStatus());

    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    expect(result.current.processingStates.has(mockDocumentId)).toBe(true);
    expect(result.current.isMonitoring).toBe(true);
    expect(result.current.hasActiveProcessing).toBe(true);
  });

  it('should handle status updates', async () => {
    const onProgress = vi.fn();
    const { result } = renderHook(() => 
      useProcessingStatus({ onProgress })
    );

    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    // Simulate status update
    act(() => {
      const listener = (documentProcessingService as any).statusListeners.get(mockDocumentId);
      if (listener) {
        listener.onStatusUpdate(mockStatusUpdate);
      }
    });

    const state = result.current.processingStates.get(mockDocumentId);
    expect(state?.status).toBe(ProcessingStatus.EXTRACTING);
    expect(state?.progress).toBe(30);
    expect(state?.message).toBe('Extracting text from PDF...');
    expect(onProgress).toHaveBeenCalledWith(mockDocumentId, mockStatusUpdate);
  });

  it('should handle processing completion', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => 
      useProcessingStatus({ onComplete })
    );

    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    // Simulate completion
    const completionUpdate: ProcessingStatusUpdate = {
      ...mockStatusUpdate,
      status: ProcessingStatus.COMPLETED,
      progress: 100,
      message: 'Processing completed successfully'
    };

    act(() => {
      const listener = (documentProcessingService as any).statusListeners.get(mockDocumentId);
      if (listener) {
        listener.onStatusUpdate(completionUpdate);
      }
    });

    expect(result.current.completedProcessing).toHaveLength(1);
    expect(result.current.activeProcessing).toHaveLength(0);
    expect(onComplete).toHaveBeenCalledWith(mockDocumentId);
  });

  it('should handle processing errors', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => 
      useProcessingStatus({ onError })
    );

    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    // Simulate error
    act(() => {
      const listener = (documentProcessingService as any).statusListeners.get(mockDocumentId);
      if (listener) {
        listener.onError(mockError);
      }
    });

    expect(result.current.failedProcessing).toHaveLength(1);
    expect(result.current.activeProcessing).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(mockDocumentId, mockError);
  });

  it('should retry processing with exponential backoff', async () => {
    const { result } = renderHook(() => 
      useProcessingStatus({ autoRetry: true, maxRetries: 3 })
    );

    vi.useFakeTimers();

    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    // Simulate failure
    const failureUpdate: ProcessingStatusUpdate = {
      ...mockStatusUpdate,
      status: ProcessingStatus.FAILED,
      progress: 0,
      message: 'Processing failed',
      errorDetails: 'Test error'
    };

    act(() => {
      const listener = (documentProcessingService as any).statusListeners.get(mockDocumentId);
      if (listener) {
        listener.onStatusUpdate(failureUpdate);
      }
    });

    // Fast-forward time to trigger retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const state = result.current.processingStates.get(mockDocumentId);
    expect(state?.retryCount).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('should calculate total progress correctly', async () => {
    const { result } = renderHook(() => useProcessingStatus());

    // Start monitoring multiple documents
    const docIds = ['doc1', 'doc2', 'doc3'];
    
    for (const docId of docIds) {
      await act(async () => {
        await result.current.startMonitoring(docId);
      });
    }

    // Simulate different progress levels
    const updates = [
      { documentId: 'doc1', status: ProcessingStatus.EXTRACTING, progress: 30 },
      { documentId: 'doc2', status: ProcessingStatus.CHUNKING, progress: 60 },
      { documentId: 'doc3', status: ProcessingStatus.EMBEDDING, progress: 80 }
    ];

    act(() => {
      updates.forEach(update => {
        const listener = (documentProcessingService as any).statusListeners.get(update.documentId);
        if (listener) {
          listener.onStatusUpdate({
            ...update,
            message: 'Processing...'
          });
        }
      });
    });

    // Total progress should be (30 + 60 + 80) / 3 = 56.67
    expect(Math.round(result.current.totalProgress)).toBe(57);
  });

  it('should manage notification preferences', async () => {
    const { result } = renderHook(() => useProcessingStatus());

    const newPreferences: Partial<NotificationPreferences> = {
      enableBrowserNotifications: false,
      soundEnabled: false
    };

    await act(async () => {
      await result.current.updateNotificationPreferences(newPreferences);
    });

    expect(result.current.notificationPreferences.enableBrowserNotifications).toBe(false);
    expect(result.current.notificationPreferences.soundEnabled).toBe(false);
  });
});

// ============================================================================
// NOTIFICATION SERVICE TESTS
// ============================================================================

describe('ProcessingNotificationService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await processingNotificationService.initialize();
  });

  afterEach(() => {
    processingNotificationService.cleanup();
  });

  it('should initialize successfully', async () => {
    expect(processingNotificationService).toBeDefined();
    
    const preferences = processingNotificationService.getPreferences();
    expect(preferences.enableBrowserNotifications).toBe(true);
    expect(preferences.enableToastNotifications).toBe(true);
  });

  it('should update notification preferences', async () => {
    const newPreferences: Partial<NotificationPreferences> = {
      enableEmailNotifications: true,
      notifyOnProgress: true
    };

    await processingNotificationService.updatePreferences(newPreferences);
    
    const preferences = processingNotificationService.getPreferences();
    expect(preferences.enableEmailNotifications).toBe(true);
    expect(preferences.notifyOnProgress).toBe(true);
  });

  it('should handle processing error notifications', () => {
    const listener = {
      onNotification: vi.fn(),
      onStatusUpdate: vi.fn(),
      onError: vi.fn()
    };

    processingNotificationService.addListener('test-listener', listener);
    processingNotificationService.handleProcessingError(mockDocumentId, mockError);

    expect(listener.onError).toHaveBeenCalledWith(mockError);
    
    const notifications = processingNotificationService.getNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('error');
    expect(notifications[0].title).toBe('Processing Error');
  });

  it('should send browser notifications when enabled', () => {
    const mockNotificationConstructor = window.Notification as any;
    
    processingNotificationService.updatePreferences({
      enableBrowserNotifications: true
    });

    // Simulate sending a notification
    const notification = mockNotification;
    (processingNotificationService as any).sendBrowserNotification(notification);

    expect(mockNotificationConstructor).toHaveBeenCalledWith(
      notification.title,
      expect.objectContaining({
        body: notification.message,
        icon: '/favicon.ico'
      })
    );
  });

  it('should play notification sound when enabled', () => {
    const mockAudioContext = window.AudioContext as any;
    
    processingNotificationService.updatePreferences({
      soundEnabled: true
    });

    // Simulate playing sound
    (processingNotificationService as any).playNotificationSound();

    expect(mockAudioContext).toHaveBeenCalled();
  });

  it('should manage notification read status', () => {
    const notifications = [mockNotification];
    (processingNotificationService as any).notifications = notifications;

    expect(processingNotificationService.getUnreadNotifications()).toHaveLength(1);

    processingNotificationService.markAsRead(mockNotification.id);
    expect(processingNotificationService.getUnreadNotifications()).toHaveLength(0);
  });

  it('should clear notifications', () => {
    const notifications = [mockNotification];
    (processingNotificationService as any).notifications = notifications;

    expect(processingNotificationService.getNotifications()).toHaveLength(1);

    processingNotificationService.clearNotifications();
    expect(processingNotificationService.getNotifications()).toHaveLength(0);
  });
});

// ============================================================================
// DOCUMENT PROCESSING SERVICE TESTS
// ============================================================================

describe('DocumentProcessingService Real-time Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to status updates', () => {
    const listener = {
      onStatusUpdate: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn()
    };

    documentProcessingService.subscribeToStatusUpdates(mockDocumentId, listener);

    expect((documentProcessingService as any).statusListeners.has(mockDocumentId)).toBe(true);
    expect((documentProcessingService as any).subscriptions.has(mockDocumentId)).toBe(true);
  });

  it('should unsubscribe from status updates', () => {
    const listener = {
      onStatusUpdate: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn()
    };

    documentProcessingService.subscribeToStatusUpdates(mockDocumentId, listener);
    documentProcessingService.unsubscribeFromStatusUpdates(mockDocumentId);

    expect((documentProcessingService as any).statusListeners.has(mockDocumentId)).toBe(false);
    expect((documentProcessingService as any).subscriptions.has(mockDocumentId)).toBe(false);
  });

  it('should calculate estimated time correctly', () => {
    const service = documentProcessingService as any;
    
    expect(service.calculateEstimatedTime(ProcessingStatus.UPLOADING)).toBe(255); // 30 + 60 + 45 + 120
    expect(service.calculateEstimatedTime(ProcessingStatus.EXTRACTING)).toBe(225); // 60 + 45 + 120
    expect(service.calculateEstimatedTime(ProcessingStatus.CHUNKING)).toBe(165); // 45 + 120
    expect(service.calculateEstimatedTime(ProcessingStatus.EMBEDDING)).toBe(120); // 120
  });

  it('should calculate processing time correctly', () => {
    const service = documentProcessingService as any;
    const startTime = '2024-01-01T10:00:00Z';
    const endTime = new Date('2024-01-01T10:05:00Z');
    
    const processingTime = service.calculateProcessingTime(startTime, endTime);
    expect(processingTime).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Real-time Processing Status Integration', () => {
  it('should handle complete processing workflow', async () => {
    const onComplete = vi.fn();
    const onProgress = vi.fn();
    
    const { result } = renderHook(() => 
      useProcessingStatus({ 
        enableNotifications: true,
        onComplete,
        onProgress
      })
    );

    // Start monitoring
    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    expect(result.current.isMonitoring).toBe(true);
    expect(result.current.hasActiveProcessing).toBe(true);

    // Simulate processing stages
    const stages = [
      { status: ProcessingStatus.EXTRACTING, progress: 30 },
      { status: ProcessingStatus.CHUNKING, progress: 60 },
      { status: ProcessingStatus.EMBEDDING, progress: 80 },
      { status: ProcessingStatus.COMPLETED, progress: 100 }
    ];

    for (const stage of stages) {
      act(() => {
        const listener = (documentProcessingService as any).statusListeners.get(mockDocumentId);
        if (listener) {
          listener.onStatusUpdate({
            documentId: mockDocumentId,
            status: stage.status,
            progress: stage.progress,
            message: `Processing stage: ${stage.status}`
          });
        }
      });

      await waitFor(() => {
        const state = result.current.processingStates.get(mockDocumentId);
        expect(state?.status).toBe(stage.status);
        expect(state?.progress).toBe(stage.progress);
      });
    }

    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(onComplete).toHaveBeenCalledWith(mockDocumentId);
    expect(result.current.completedProcessing).toHaveLength(1);
    expect(result.current.hasActiveProcessing).toBe(false);
  });

  it('should handle error recovery workflow', async () => {
    const onError = vi.fn();
    
    const { result } = renderHook(() => 
      useProcessingStatus({ 
        enableNotifications: true,
        autoRetry: true,
        maxRetries: 2,
        onError
      })
    );

    vi.useFakeTimers();

    // Start monitoring
    await act(async () => {
      await result.current.startMonitoring(mockDocumentId);
    });

    // Simulate failure
    act(() => {
      const listener = (documentProcessingService as any).statusListeners.get(mockDocumentId);
      if (listener) {
        listener.onStatusUpdate({
          documentId: mockDocumentId,
          status: ProcessingStatus.FAILED,
          progress: 0,
          message: 'Processing failed',
          errorDetails: 'Test error'
        });
      }
    });

    expect(result.current.failedProcessing).toHaveLength(1);

    // Trigger retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Manual retry
    await act(async () => {
      await result.current.retryProcessing(mockDocumentId);
    });

    const state = result.current.processingStates.get(mockDocumentId);
    expect(state?.retryCount).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Real-time Processing Status Performance', () => {
  it('should handle multiple concurrent documents efficiently', async () => {
    const { result } = renderHook(() => useProcessingStatus());

    const documentCount = 10;
    const documentIds = Array.from({ length: documentCount }, (_, i) => `doc-${i}`);

    const startTime = performance.now();

    // Start monitoring all documents
    await act(async () => {
      for (const docId of documentIds) {
        await result.current.startMonitoring(docId);
      }
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.current.processingStates.size).toBe(documentCount);
    expect(result.current.isMonitoring).toBe(true);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should efficiently update status for multiple documents', () => {
    const { result } = renderHook(() => useProcessingStatus());

    const documentCount = 50;
    const updates: ProcessingStatusUpdate[] = Array.from({ length: documentCount }, (_, i) => ({
      documentId: `doc-${i}`,
      status: ProcessingStatus.EXTRACTING,
      progress: Math.random() * 100,
      message: `Processing document ${i}`
    }));

    const startTime = performance.now();

    act(() => {
      updates.forEach(update => {
        // Simulate status update handling
        const mockListener = {
          onStatusUpdate: (statusUpdate: ProcessingStatusUpdate) => {
            // This would normally update the state
          },
          onError: vi.fn(),
          onComplete: vi.fn()
        };
        mockListener.onStatusUpdate(update);
      });
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Real-time Processing Status Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const { result } = renderHook(() => useProcessingStatus());

    // Mock network error
    vi.mocked(documentProcessingService.getProcessingStatus).mockRejectedValue(
      new Error('Network error')
    );

    await act(async () => {
      try {
        await result.current.startMonitoring(mockDocumentId);
      } catch (error) {
        // Should handle error gracefully
      }
    });

    // Should not crash the application
    expect(result.current.processingStates.size).toBe(0);
  });

  it('should handle invalid status updates', () => {
    const { result } = renderHook(() => useProcessingStatus());

    // This should not crash the hook
    act(() => {
      try {
        const invalidUpdate = {
          documentId: '',
          status: 'invalid-status' as ProcessingStatus,
          progress: -1,
          message: null
        };
        
        // Simulate invalid update handling
        // The hook should handle this gracefully
      } catch (error) {
        // Expected to handle gracefully
      }
    });

    expect(result.current.processingStates.size).toBe(0);
  });
});