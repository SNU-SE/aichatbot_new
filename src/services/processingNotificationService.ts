/**
 * Processing Notification Service
 * Handles real-time notifications for document processing status updates
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  ProcessingStatus, 
  ProcessingStatusUpdate, 
  EnhancedErrorResponse,
  DocumentErrorCode 
} from '@/types/enhanced-rag';

// ============================================================================
// INTERFACES
// ============================================================================

export interface NotificationPreferences {
  enableBrowserNotifications: boolean;
  enableToastNotifications: boolean;
  enableEmailNotifications: boolean;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  notifyOnProgress: boolean;
  soundEnabled: boolean;
}

export interface ProcessingNotification {
  id: string;
  documentId: string;
  type: 'progress' | 'complete' | 'error' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationListener {
  onNotification: (notification: ProcessingNotification) => void;
  onStatusUpdate: (update: ProcessingStatusUpdate) => void;
  onError: (error: EnhancedErrorResponse) => void;
}

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================

class ProcessingNotificationService {
  private listeners = new Map<string, NotificationListener>();
  private notifications: ProcessingNotification[] = [];
  private preferences: NotificationPreferences = {
    enableBrowserNotifications: true,
    enableToastNotifications: true,
    enableEmailNotifications: false,
    notifyOnComplete: true,
    notifyOnError: true,
    notifyOnProgress: false,
    soundEnabled: true
  };
  private isInitialized = false;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request browser notification permission
      if ('Notification' in window && this.preferences.enableBrowserNotifications) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Browser notifications not granted');
          this.preferences.enableBrowserNotifications = false;
        }
      }

      // Load user preferences
      await this.loadPreferences();

      // Set up global processing status listener
      this.setupGlobalStatusListener();

      this.isInitialized = true;
      console.log('Processing notification service initialized');

    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load preferences from user metadata or local storage
      const stored = localStorage.getItem(`notification-preferences-${user.id}`);
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  async updatePreferences(newPreferences: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...newPreferences };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(
          `notification-preferences-${user.id}`, 
          JSON.stringify(this.preferences)
        );
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // ============================================================================
  // LISTENER MANAGEMENT
  // ============================================================================

  addListener(id: string, listener: NotificationListener): void {
    this.listeners.set(id, listener);
  }

  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  private setupGlobalStatusListener(): void {
    // Listen to all document processing updates
    const channel = supabase
      .channel('global-document-processing')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          this.handleDocumentUpdate(payload);
        }
      )
      .subscribe();
  }

  private handleDocumentUpdate(payload: any): void {
    const document = payload.new;
    const oldDocument = payload.old;

    // Check if processing status changed
    if (document.processing_status !== oldDocument?.processing_status) {
      const statusUpdate: ProcessingStatusUpdate = {
        documentId: document.id,
        status: document.processing_status,
        progress: this.calculateProgress(document.processing_status),
        message: this.getStatusMessage(document.processing_status),
        estimatedTimeRemaining: this.calculateEstimatedTime(document.processing_status)
      };

      this.handleStatusUpdate(statusUpdate);
    }
  }

  // ============================================================================
  // STATUS UPDATE HANDLING
  // ============================================================================

  private handleStatusUpdate(update: ProcessingStatusUpdate): void {
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener.onStatusUpdate(update);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });

    // Create and send notifications based on status
    this.createStatusNotification(update);
  }

  private createStatusNotification(update: ProcessingStatusUpdate): void {
    const { documentId, status, message } = update;

    let notification: ProcessingNotification | null = null;

    switch (status) {
      case ProcessingStatus.COMPLETED:
        if (this.preferences.notifyOnComplete) {
          notification = {
            id: `${documentId}-complete-${Date.now()}`,
            documentId,
            type: 'complete',
            title: 'Document Processing Complete',
            message: `Document has been successfully processed and is ready for search.`,
            timestamp: new Date(),
            read: false,
            actionUrl: `/documents/${documentId}`
          };
        }
        break;

      case ProcessingStatus.FAILED:
        if (this.preferences.notifyOnError) {
          notification = {
            id: `${documentId}-error-${Date.now()}`,
            documentId,
            type: 'error',
            title: 'Document Processing Failed',
            message: message || 'An error occurred during document processing.',
            timestamp: new Date(),
            read: false,
            actionUrl: `/documents/${documentId}`
          };
        }
        break;

      case ProcessingStatus.EXTRACTING:
      case ProcessingStatus.CHUNKING:
      case ProcessingStatus.EMBEDDING:
        if (this.preferences.notifyOnProgress) {
          notification = {
            id: `${documentId}-progress-${Date.now()}`,
            documentId,
            type: 'progress',
            title: 'Processing Update',
            message: message || `Document is being processed: ${status}`,
            timestamp: new Date(),
            read: false
          };
        }
        break;
    }

    if (notification) {
      this.sendNotification(notification);
    }
  }

  // ============================================================================
  // NOTIFICATION DELIVERY
  // ============================================================================

  private async sendNotification(notification: ProcessingNotification): Promise<void> {
    // Store notification
    this.notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener.onNotification(notification);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });

    // Send browser notification
    if (this.preferences.enableBrowserNotifications) {
      this.sendBrowserNotification(notification);
    }

    // Play sound
    if (this.preferences.soundEnabled && notification.type === 'complete') {
      this.playNotificationSound();
    }

    // Send email notification (if enabled and configured)
    if (this.preferences.enableEmailNotifications) {
      await this.sendEmailNotification(notification);
    }
  }

  private sendBrowserNotification(notification: ProcessingNotification): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.documentId, // Replace previous notifications for same document
        requireInteraction: notification.type === 'error',
        silent: !this.preferences.soundEnabled
      });

      // Auto-close after 5 seconds (except for errors)
      if (notification.type !== 'error') {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }

      // Handle click
      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

    } catch (error) {
      console.error('Failed to send browser notification:', error);
    }
  }

  private playNotificationSound(): void {
    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);

    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  private async sendEmailNotification(notification: ProcessingNotification): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      // Call Edge Function to send email
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: user.email,
          subject: notification.title,
          message: notification.message,
          documentId: notification.documentId,
          type: notification.type
        }
      });

      if (error) {
        console.error('Failed to send email notification:', error);
      }

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  getNotifications(): ProcessingNotification[] {
    return [...this.notifications];
  }

  getUnreadNotifications(): ProcessingNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  clearNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  handleProcessingError(documentId: string, error: EnhancedErrorResponse): void {
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener.onError(error);
      } catch (err) {
        console.error('Error notifying listener:', err);
      }
    });

    // Create error notification
    const notification: ProcessingNotification = {
      id: `${documentId}-error-${Date.now()}`,
      documentId,
      type: 'error',
      title: 'Processing Error',
      message: `${error.message}${error.suggestedAction ? ` ${error.suggestedAction}` : ''}`,
      timestamp: new Date(),
      read: false,
      actionUrl: `/documents/${documentId}`,
      metadata: {
        errorCode: error.code,
        retryable: error.retryable,
        details: error.details
      }
    };

    this.sendNotification(notification);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateProgress(status: ProcessingStatus): number {
    switch (status) {
      case ProcessingStatus.UPLOADING: return 10;
      case ProcessingStatus.EXTRACTING: return 30;
      case ProcessingStatus.CHUNKING: return 60;
      case ProcessingStatus.EMBEDDING: return 80;
      case ProcessingStatus.COMPLETED: return 100;
      case ProcessingStatus.FAILED: return 0;
      default: return 0;
    }
  }

  private getStatusMessage(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.UPLOADING: return 'Uploading document...';
      case ProcessingStatus.EXTRACTING: return 'Extracting text from PDF...';
      case ProcessingStatus.CHUNKING: return 'Creating document chunks...';
      case ProcessingStatus.EMBEDDING: return 'Generating embeddings...';
      case ProcessingStatus.COMPLETED: return 'Processing completed successfully';
      case ProcessingStatus.FAILED: return 'Processing failed';
      default: return 'Unknown status';
    }
  }

  private calculateEstimatedTime(status: ProcessingStatus): number {
    const estimates = {
      [ProcessingStatus.UPLOADING]: 30,
      [ProcessingStatus.EXTRACTING]: 90,
      [ProcessingStatus.CHUNKING]: 60,
      [ProcessingStatus.EMBEDDING]: 120
    };

    return estimates[status] || 0;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.listeners.clear();
    this.notifications = [];
    this.isInitialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const processingNotificationService = new ProcessingNotificationService();
export default processingNotificationService;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  NotificationPreferences,
  ProcessingNotification,
  NotificationListener
};