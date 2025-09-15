/**
 * Real-time Processing Status Monitor Component
 * Provides comprehensive real-time monitoring of document processing status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  FileText,
  Zap,
  Timer,
  Bell,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ProcessingStatus, 
  ProcessingStatusUpdate, 
  DocumentErrorCode,
  EnhancedErrorResponse 
} from '@/types/enhanced-rag';
import { documentProcessingService } from '@/services/documentProcessingService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcessingJob {
  documentId: string;
  filename: string;
  status: ProcessingStatus;
  progress: number;
  message: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
  errorDetails?: string;
  retryCount: number;
  stages: ProcessingStage[];
}

export interface ProcessingStage {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress?: number;
  message?: string;
}

export interface ProcessingStatusMonitorProps {
  documentIds?: string[];
  onProcessingComplete?: (documentId: string) => void;
  onProcessingError?: (documentId: string, error: EnhancedErrorResponse) => void;
  showNotifications?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROCESSING_STAGES: Record<ProcessingStatus, string> = {
  [ProcessingStatus.UPLOADING]: 'File Upload',
  [ProcessingStatus.EXTRACTING]: 'Text Extraction',
  [ProcessingStatus.CHUNKING]: 'Content Chunking',
  [ProcessingStatus.EMBEDDING]: 'Vector Embedding',
  [ProcessingStatus.COMPLETED]: 'Processing Complete',
  [ProcessingStatus.FAILED]: 'Processing Failed'
};

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.UPLOADING]: 'bg-blue-500',
  [ProcessingStatus.EXTRACTING]: 'bg-yellow-500',
  [ProcessingStatus.CHUNKING]: 'bg-orange-500',
  [ProcessingStatus.EMBEDDING]: 'bg-purple-500',
  [ProcessingStatus.COMPLETED]: 'bg-green-500',
  [ProcessingStatus.FAILED]: 'bg-red-500'
};

const DEFAULT_REFRESH_INTERVAL = 2000; // 2 seconds

// ============================================================================
// COMPONENT
// ============================================================================

export const ProcessingStatusMonitor: React.FC<ProcessingStatusMonitorProps> = ({
  documentIds = [],
  onProcessingComplete,
  onProcessingError,
  showNotifications = true,
  autoRefresh = true,
  refreshInterval = DEFAULT_REFRESH_INTERVAL
}) => {
  const [processingJobs, setProcessingJobs] = useState<Map<string, ProcessingJob>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const createProcessingStages = (currentStatus: ProcessingStatus): ProcessingStage[] => {
    const stages: ProcessingStage[] = [
      { name: 'Upload', status: 'pending' },
      { name: 'Extract', status: 'pending' },
      { name: 'Chunk', status: 'pending' },
      { name: 'Embed', status: 'pending' }
    ];

    const statusOrder = [
      ProcessingStatus.UPLOADING,
      ProcessingStatus.EXTRACTING,
      ProcessingStatus.CHUNKING,
      ProcessingStatus.EMBEDDING
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    
    stages.forEach((stage, index) => {
      if (index < currentIndex) {
        stage.status = 'completed';
      } else if (index === currentIndex) {
        stage.status = 'active';
      }
    });

    if (currentStatus === ProcessingStatus.FAILED) {
      const activeIndex = stages.findIndex(s => s.status === 'active');
      if (activeIndex >= 0) {
        stages[activeIndex].status = 'failed';
      }
    }

    return stages;
  };

  const calculateEstimatedTime = (status: ProcessingStatus, progress: number): number => {
    // Base estimates in seconds for each stage
    const stageEstimates = {
      [ProcessingStatus.UPLOADING]: 30,
      [ProcessingStatus.EXTRACTING]: 60,
      [ProcessingStatus.CHUNKING]: 45,
      [ProcessingStatus.EMBEDDING]: 120
    };

    const currentStageTime = stageEstimates[status] || 0;
    const remainingInStage = currentStageTime * (1 - (progress / 100));
    
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

    return Math.ceil(remainingInStage + remainingStagesTime);
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // ============================================================================
  // STATUS UPDATE HANDLERS
  // ============================================================================

  const handleStatusUpdate = useCallback((update: ProcessingStatusUpdate) => {
    setProcessingJobs(prev => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(update.documentId);
      
      if (existingJob) {
        const updatedJob: ProcessingJob = {
          ...existingJob,
          status: update.status,
          progress: update.progress || 0,
          message: update.message || '',
          estimatedTimeRemaining: update.estimatedTimeRemaining || 
            calculateEstimatedTime(update.status, update.progress || 0),
          stages: createProcessingStages(update.status),
          errorDetails: update.errorDetails
        };

        newJobs.set(update.documentId, updatedJob);

        // Show notifications for status changes
        if (showNotifications && existingJob.status !== update.status) {
          if (update.status === ProcessingStatus.COMPLETED) {
            toast({
              title: "Processing Complete",
              description: `${existingJob.filename} has been processed successfully.`,
              duration: 5000,
            });
            onProcessingComplete?.(update.documentId);
          } else if (update.status === ProcessingStatus.FAILED) {
            toast({
              title: "Processing Failed",
              description: `Failed to process ${existingJob.filename}. ${update.errorDetails || ''}`,
              variant: "destructive",
              duration: 8000,
            });
          }
        }
      }

      return newJobs;
    });

    setLastUpdate(new Date());
  }, [showNotifications, toast, onProcessingComplete]);

  const handleProcessingError = useCallback((documentId: string, error: EnhancedErrorResponse) => {
    setProcessingJobs(prev => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(documentId);
      
      if (existingJob) {
        const updatedJob: ProcessingJob = {
          ...existingJob,
          status: ProcessingStatus.FAILED,
          progress: 0,
          message: error.message,
          errorDetails: error.details,
          stages: createProcessingStages(ProcessingStatus.FAILED)
        };

        newJobs.set(documentId, updatedJob);

        if (showNotifications) {
          toast({
            title: "Processing Error",
            description: `${error.message}${error.suggestedAction ? ` ${error.suggestedAction}` : ''}`,
            variant: "destructive",
            duration: 10000,
          });
        }

        onProcessingError?.(documentId, error);
      }

      return newJobs;
    });
  }, [showNotifications, toast, onProcessingError]);

  // ============================================================================
  // MONITORING SETUP
  // ============================================================================

  const startMonitoring = useCallback(async (docIds: string[]) => {
    setIsMonitoring(true);

    for (const documentId of docIds) {
      try {
        // Get initial status
        const status = await documentProcessingService.getProcessingStatus(documentId);
        
        // Create initial job entry
        const job: ProcessingJob = {
          documentId,
          filename: `Document ${documentId.slice(0, 8)}...`,
          status: status.status,
          progress: status.progress || 0,
          message: status.message || '',
          startTime: new Date(),
          estimatedTimeRemaining: status.estimatedTimeRemaining || 
            calculateEstimatedTime(status.status, status.progress || 0),
          errorDetails: status.errorDetails,
          retryCount: 0,
          stages: createProcessingStages(status.status)
        };

        setProcessingJobs(prev => new Map(prev.set(documentId, job)));

        // Set up real-time listener
        documentProcessingService.subscribeToStatusUpdates(documentId, {
          onStatusUpdate: handleStatusUpdate,
          onError: (error) => handleProcessingError(documentId, error),
          onComplete: () => {
            // Handle completion
          }
        });

      } catch (error) {
        console.error(`Failed to start monitoring for document ${documentId}:`, error);
      }
    }
  }, [handleStatusUpdate, handleProcessingError]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    // Cleanup subscriptions would be handled by the service
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (documentIds.length > 0 && autoRefresh) {
      startMonitoring(documentIds);
    }

    return () => {
      stopMonitoring();
    };
  }, [documentIds, autoRefresh, startMonitoring, stopMonitoring]);

  // ============================================================================
  // RETRY FUNCTIONALITY
  // ============================================================================

  const retryProcessing = async (documentId: string) => {
    try {
      const job = processingJobs.get(documentId);
      if (!job) return;

      setProcessingJobs(prev => {
        const newJobs = new Map(prev);
        const updatedJob = { ...job, retryCount: job.retryCount + 1 };
        newJobs.set(documentId, updatedJob);
        return newJobs;
      });

      await documentProcessingService.retryProcessing(documentId, {
        onStatusUpdate: handleStatusUpdate,
        onError: (error) => handleProcessingError(documentId, error),
        onComplete: () => {}
      });

      toast({
        title: "Retry Started",
        description: `Retrying processing for ${job.filename}`,
      });

    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Failed to retry processing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderProcessingStage = (stage: ProcessingStage, index: number) => {
    const getStageIcon = () => {
      switch (stage.status) {
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'active':
          return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case 'failed':
          return <XCircle className="h-4 w-4 text-red-500" />;
        default:
          return <Clock className="h-4 w-4 text-gray-400" />;
      }
    };

    return (
      <div key={index} className="flex items-center space-x-2">
        {getStageIcon()}
        <span className={`text-sm ${
          stage.status === 'completed' ? 'text-green-600' :
          stage.status === 'active' ? 'text-blue-600' :
          stage.status === 'failed' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {stage.name}
        </span>
      </div>
    );
  };

  const renderJobCard = (job: ProcessingJob) => {
    const isActive = job.status !== ProcessingStatus.COMPLETED && job.status !== ProcessingStatus.FAILED;
    const canRetry = job.status === ProcessingStatus.FAILED && job.retryCount < 3;

    return (
      <Card key={job.documentId} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{job.filename}</span>
            </CardTitle>
            <Badge 
              variant={job.status === ProcessingStatus.COMPLETED ? "default" : 
                     job.status === ProcessingStatus.FAILED ? "destructive" : "secondary"}
              className={`${STATUS_COLORS[job.status]} text-white`}
            >
              {PROCESSING_STAGES[job.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{job.message}</span>
                <span>{job.progress}%</span>
              </div>
              <Progress value={job.progress} className="h-2" />
            </div>

            {/* Processing Stages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {job.stages.map((stage, index) => renderProcessingStage(stage, index))}
            </div>

            {/* Time Information */}
            {isActive && job.estimatedTimeRemaining && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Timer className="h-4 w-4" />
                  <span>ETA: {formatTimeRemaining(job.estimatedTimeRemaining)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Started: {job.startTime.toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            {/* Error Details */}
            {job.status === ProcessingStatus.FAILED && job.errorDetails && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {job.errorDetails}
                  {canRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => retryProcessing(job.documentId)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry ({job.retryCount}/3)
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {job.status === ProcessingStatus.COMPLETED && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Document processed successfully and ready for search.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const activeJobs = Array.from(processingJobs.values()).filter(
    job => job.status !== ProcessingStatus.COMPLETED && job.status !== ProcessingStatus.FAILED
  );
  const completedJobs = Array.from(processingJobs.values()).filter(
    job => job.status === ProcessingStatus.COMPLETED
  );
  const failedJobs = Array.from(processingJobs.values()).filter(
    job => job.status === ProcessingStatus.FAILED
  );

  if (processingJobs.size === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents being processed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{activeJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {isMonitoring ? 'Real-time monitoring active' : 'Monitoring inactive'}
          </span>
          <span className="text-xs text-gray-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        {showNotifications && (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Bell className="h-4 w-4" />
            <span>Notifications enabled</span>
          </div>
        )}
      </div>

      {/* Processing Jobs */}
      <div className="space-y-4">
        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span>Currently Processing</span>
            </h3>
            {activeJobs.map(renderJobCard)}
          </div>
        )}

        {/* Failed Jobs */}
        {failedJobs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span>Failed Processing</span>
            </h3>
            {failedJobs.map(renderJobCard)}
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Completed Processing</span>
            </h3>
            {completedJobs.slice(0, 5).map(renderJobCard)}
            {completedJobs.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                ... and {completedJobs.length - 5} more completed jobs
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingStatusMonitor;