/**
 * Document Processing Service
 * Handles communication with the enhanced document processing Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  ProcessingStatus, 
  DocumentErrorCode, 
  EnhancedErrorResponse,
  ProcessingStatusUpdate 
} from '@/types/enhanced-rag';

export interface ProcessingRequest {
  documentId: string;
  fileUrl: string;
  userId: string;
  activityId?: string;
  chunkingConfig?: ChunkingConfig;
}

export interface ChunkingConfig {
  maxChunkSize?: number;
  minChunkSize?: number;
  chunkOverlap?: number;
  preserveParagraphs?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  processingTimeMs: number;
  error?: string;
}

export interface ProcessingStatusListener {
  onStatusUpdate: (update: ProcessingStatusUpdate) => void;
  onError: (error: EnhancedErrorResponse) => void;
  onComplete: (result: ProcessingResult) => void;
}

class DocumentProcessingService {
  private statusListeners = new Map<string, ProcessingStatusListener>();
  private processingRequests = new Map<string, AbortController>();
  private subscriptions = new Map<string, any>();

  /**
   * Start processing a document
   */
  async processDocument(
    request: ProcessingRequest,
    listener?: ProcessingStatusListener
  ): Promise<ProcessingResult> {
    const { documentId } = request;

    try {
      // Register status listener if provided
      if (listener) {
        this.statusListeners.set(documentId, listener);
      }

      // Create abort controller for this request
      const abortController = new AbortController();
      this.processingRequests.set(documentId, abortController);

      // Start real-time status monitoring
      this.startStatusMonitoring(documentId);

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        'enhanced-document-processor',
        {
          body: request,
          signal: abortController.signal,
        }
      );

      if (error) {
        throw new Error(`Processing failed: ${error.message}`);
      }

      const result = data as ProcessingResult;

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      // Notify completion
      if (listener) {
        listener.onComplete(result);
      }

      return result;

    } catch (error) {
      const enhancedError: EnhancedErrorResponse = {
        code: DocumentErrorCode.PROCESSING_TIMEOUT,
        message: error instanceof Error ? error.message : 'Unknown processing error',
        retryable: true,
        suggestedAction: 'Please try uploading the document again',
        timestamp: new Date(),
      };

      // Notify error
      if (listener) {
        listener.onError(enhancedError);
      }

      throw enhancedError;

    } finally {
      // Clean up
      this.statusListeners.delete(documentId);
      this.processingRequests.delete(documentId);
    }
  }

  /**
   * Cancel document processing
   */
  cancelProcessing(documentId: string): void {
    const abortController = this.processingRequests.get(documentId);
    if (abortController) {
      abortController.abort();
      this.processingRequests.delete(documentId);
    }

    this.statusListeners.delete(documentId);
  }

  /**
   * Get current processing status for a document
   */
  async getProcessingStatus(documentId: string): Promise<ProcessingStatusUpdate> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('processing_status, metadata, updated_at')
        .eq('id', documentId)
        .single();

      if (error) {
        throw new Error(`Failed to get status: ${error.message}`);
      }

      const metadata = data.metadata || {};
      
      return {
        documentId,
        status: data.processing_status as ProcessingStatus,
        progress: this.calculateProgress(data.processing_status),
        message: this.getStatusMessage(data.processing_status),
        estimatedTimeRemaining: metadata.estimatedTimeRemaining,
      };

    } catch (error) {
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retry failed processing
   */
  async retryProcessing(
    documentId: string,
    listener?: ProcessingStatusListener,
    activityId?: string
  ): Promise<ProcessingResult> {
    try {
      // Get document details
      const { data: document, error } = await supabase
        .from('documents')
        .select('file_path, user_id')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        throw new Error('Document not found');
      }

      let targetActivityId = activityId;

      if (!targetActivityId) {
        const { data: activityLinks } = await supabase
          .from('activity_documents')
          .select('activity_id')
          .eq('document_id', documentId);

        if (activityLinks && activityLinks.length === 1) {
          targetActivityId = activityLinks[0].activity_id;
        }
      }

      // Reset status to uploading
      await supabase
        .from('documents')
        .update({ 
          processing_status: ProcessingStatus.UPLOADING,
          metadata: {}
        })
        .eq('id', documentId);

      // Clear existing chunks
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

      // Start processing again
      return await this.processDocument({
        documentId,
        fileUrl: document.file_path,
        userId: document.user_id,
        activityId: targetActivityId,
      }, listener);

    } catch (error) {
      throw new Error(`Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to real-time status updates for a document
   */
  subscribeToStatusUpdates(documentId: string, listener: ProcessingStatusListener): void {
    // Store the listener
    this.statusListeners.set(documentId, listener);

    // Set up real-time subscription for status updates
    const subscription = supabase
      .channel(`document-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // Only process if status actually changed
          if (newRecord.processing_status !== oldRecord?.processing_status) {
            const statusUpdate: ProcessingStatusUpdate = {
              documentId,
              status: newRecord.processing_status,
              progress: this.calculateProgress(newRecord.processing_status),
              message: this.getStatusMessage(newRecord.processing_status),
              estimatedTimeRemaining: this.calculateEstimatedTime(newRecord.processing_status),
              errorDetails: newRecord.metadata?.errorDetails
            };

            listener.onStatusUpdate(statusUpdate);

            // If processing is complete or failed, unsubscribe and cleanup
            if (newRecord.processing_status === ProcessingStatus.COMPLETED ||
                newRecord.processing_status === ProcessingStatus.FAILED) {
              subscription.unsubscribe();
              this.statusListeners.delete(documentId);
              
              if (newRecord.processing_status === ProcessingStatus.COMPLETED) {
                listener.onComplete({
                  documentId,
                  status: ProcessingStatus.COMPLETED,
                  message: 'Processing completed successfully',
                  processingTime: this.calculateProcessingTime(newRecord.created_at, new Date()),
                  chunkCount: newRecord.metadata?.chunkCount || 0,
                  wordCount: newRecord.metadata?.wordCount || 0
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Store subscription for cleanup
    this.subscriptions.set(documentId, subscription);
  }

  /**
   * Unsubscribe from status updates for a document
   */
  unsubscribeFromStatusUpdates(documentId: string): void {
    const subscription = this.subscriptions.get(documentId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(documentId);
    }
    
    this.statusListeners.delete(documentId);
  }

  /**
   * Start real-time status monitoring for a document (private method)
   */
  private startStatusMonitoring(documentId: string): void {
    const listener = this.statusListeners.get(documentId);
    if (!listener) return;

    this.subscribeToStatusUpdates(documentId, listener);
  }

  /**
   * Calculate progress percentage based on status
   */
  private calculateProgress(status: ProcessingStatus): number {
    switch (status) {
      case ProcessingStatus.UPLOADING:
        return 10;
      case ProcessingStatus.EXTRACTING:
        return 30;
      case ProcessingStatus.CHUNKING:
        return 60;
      case ProcessingStatus.EMBEDDING:
        return 80;
      case ProcessingStatus.COMPLETED:
        return 100;
      case ProcessingStatus.FAILED:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get user-friendly status message
   */
  private getStatusMessage(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.UPLOADING:
        return 'Uploading document...';
      case ProcessingStatus.EXTRACTING:
        return 'Extracting text from PDF...';
      case ProcessingStatus.CHUNKING:
        return 'Creating document chunks...';
      case ProcessingStatus.EMBEDDING:
        return 'Generating embeddings...';
      case ProcessingStatus.COMPLETED:
        return 'Processing completed successfully';
      case ProcessingStatus.FAILED:
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Calculate estimated time remaining based on status
   */
  private calculateEstimatedTime(status: ProcessingStatus): number {
    // Base estimates in seconds for each stage
    const stageEstimates = {
      [ProcessingStatus.UPLOADING]: 30,
      [ProcessingStatus.EXTRACTING]: 60,
      [ProcessingStatus.CHUNKING]: 45,
      [ProcessingStatus.EMBEDDING]: 120
    };

    const currentStageTime = stageEstimates[status] || 0;
    
    // Add time for remaining stages
    const statusOrder = [
      ProcessingStatus.UPLOADING,
      ProcessingStatus.EXTRACTING,
      ProcessingStatus.CHUNKING,
      ProcessingStatus.EMBEDDING
    ];
    
    const currentIndex = statusOrder.indexOf(status);
    let remainingStagesTime = 0;
    
    for (let i = currentIndex + 1; i < statusOrder.length; i++) {
      remainingStagesTime += stageEstimates[statusOrder[i]] || 0;
    }

    return currentStageTime + remainingStagesTime;
  }

  /**
   * Calculate processing time in milliseconds
   */
  private calculateProcessingTime(startTime: string, endTime: Date): number {
    const start = new Date(startTime);
    return endTime.getTime() - start.getTime();
  }

  /**
   * Validate chunking configuration
   */
  validateChunkingConfig(config: ChunkingConfig): string[] {
    const errors: string[] = [];

    if (config.maxChunkSize && config.maxChunkSize < 100) {
      errors.push('Maximum chunk size must be at least 100 characters');
    }

    if (config.maxChunkSize && config.maxChunkSize > 2000) {
      errors.push('Maximum chunk size cannot exceed 2000 characters');
    }

    if (config.minChunkSize && config.minChunkSize < 50) {
      errors.push('Minimum chunk size must be at least 50 characters');
    }

    if (config.maxChunkSize && config.minChunkSize && 
        config.minChunkSize >= config.maxChunkSize) {
      errors.push('Minimum chunk size must be less than maximum chunk size');
    }

    if (config.chunkOverlap && config.chunkOverlap < 0) {
      errors.push('Chunk overlap cannot be negative');
    }

    if (config.chunkOverlap && config.maxChunkSize && 
        config.chunkOverlap >= config.maxChunkSize) {
      errors.push('Chunk overlap must be less than maximum chunk size');
    }

    return errors;
  }

  /**
   * Get default chunking configuration
   */
  getDefaultChunkingConfig(): ChunkingConfig {
    return {
      maxChunkSize: 1000,
      minChunkSize: 100,
      chunkOverlap: 200,
      preserveParagraphs: true,
    };
  }

  /**
   * Estimate processing time based on document size
   */
  estimateProcessingTime(fileSizeBytes: number): number {
    // Rough estimation: 1MB takes about 30 seconds to process
    const sizeInMB = fileSizeBytes / (1024 * 1024);
    const baseTimeSeconds = Math.max(30, sizeInMB * 30);
    
    // Add buffer for API calls and embedding generation
    return Math.round(baseTimeSeconds * 1.5);
  }
}

// Export singleton instance
export const documentProcessingService = new DocumentProcessingService();

// Export types for external use
export type {
  ProcessingStatusListener,
  ProcessingStatusUpdate,
};
