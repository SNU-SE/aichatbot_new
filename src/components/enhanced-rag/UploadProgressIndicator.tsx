/**
 * Upload Progress Indicator Component
 * Displays detailed progress information for document processing
 */

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Clock, FileText, Zap, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  ProcessingStatus, 
  ProcessingStatusUpdate 
} from '../../types/enhanced-rag';
import { 
  getProcessingStatusDisplay, 
  getProcessingStatusColor,
  formatDuration,
  isProcessingComplete,
  isProcessingFailed,
  isProcessingInProgress
} from '../../utils/enhanced-rag-utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UploadProgressIndicatorProps {
  updates: ProcessingStatusUpdate[];
  onRetry?: (documentId: string) => void;
  onCancel?: (documentId: string) => void;
  className?: string;
}

interface ProcessingStageInfo {
  status: ProcessingStatus;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  estimatedDuration: number; // in seconds
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROCESSING_STAGES: ProcessingStageInfo[] = [
  {
    status: ProcessingStatus.UPLOADING,
    icon: FileText,
    description: 'Uploading file to server',
    estimatedDuration: 10
  },
  {
    status: ProcessingStatus.EXTRACTING,
    icon: FileText,
    description: 'Extracting text from PDF',
    estimatedDuration: 30
  },
  {
    status: ProcessingStatus.CHUNKING,
    icon: Zap,
    description: 'Breaking text into chunks',
    estimatedDuration: 15
  },
  {
    status: ProcessingStatus.EMBEDDING,
    icon: Brain,
    description: 'Generating AI embeddings',
    estimatedDuration: 45
  }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  updates,
  onRetry,
  onCancel,
  className = ''
}) => {
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getProgressPercentage = (status: ProcessingStatus, progress?: number): number => {
    if (progress !== undefined) return progress;
    
    const stageIndex = PROCESSING_STAGES.findIndex(stage => stage.status === status);
    if (stageIndex === -1) return 0;
    
    // Calculate progress based on stage completion
    const baseProgress = (stageIndex / PROCESSING_STAGES.length) * 100;
    const stageProgress = status === ProcessingStatus.COMPLETED ? 100 : baseProgress;
    
    return Math.min(stageProgress, 100);
  };

  const getEstimatedTimeRemaining = (status: ProcessingStatus): number => {
    const currentStageIndex = PROCESSING_STAGES.findIndex(stage => stage.status === status);
    if (currentStageIndex === -1) return 0;
    
    // Sum remaining stages
    return PROCESSING_STAGES
      .slice(currentStageIndex)
      .reduce((total, stage) => total + stage.estimatedDuration, 0);
  };

  const renderProcessingStages = (currentStatus: ProcessingStatus) => {
    return (
      <div className="space-y-3">
        {PROCESSING_STAGES.map((stage, index) => {
          const isCurrentStage = stage.status === currentStatus;
          const isCompleted = PROCESSING_STAGES.findIndex(s => s.status === currentStatus) > index;
          const isFailed = currentStatus === ProcessingStatus.FAILED && isCurrentStage;
          
          const IconComponent = stage.icon;
          
          return (
            <div key={stage.status} className="flex items-center space-x-3">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2
                ${isCompleted ? 'bg-green-100 border-green-500' : 
                  isCurrentStage && !isFailed ? 'bg-blue-100 border-blue-500' :
                  isFailed ? 'bg-red-100 border-red-500' :
                  'bg-gray-100 border-gray-300'}
              `}>
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : isFailed ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : isCurrentStage ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <IconComponent className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  isCompleted ? 'text-green-700' :
                  isCurrentStage && !isFailed ? 'text-blue-700' :
                  isFailed ? 'text-red-700' :
                  'text-gray-500'
                }`}>
                  {getProcessingStatusDisplay(stage.status)}
                </p>
                <p className="text-xs text-gray-500">{stage.description}</p>
              </div>
              
              {isCurrentStage && !isFailed && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    ~{stage.estimatedDuration}s
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSingleUpdate = (update: ProcessingStatusUpdate) => {
    const progress = getProgressPercentage(update.status, update.progress);
    const isComplete = isProcessingComplete(update.status);
    const isFailed = isProcessingFailed(update.status);
    const isInProgress = isProcessingInProgress(update.status);
    
    return (
      <Card key={update.documentId} className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Document Processing</CardTitle>
            <Badge 
              variant={isComplete ? 'default' : isFailed ? 'destructive' : 'secondary'}
              className={`
                ${isComplete ? 'bg-green-100 text-green-800' : ''}
                ${isFailed ? 'bg-red-100 text-red-800' : ''}
                ${isInProgress ? 'bg-blue-100 text-blue-800' : ''}
              `}
            >
              {getProcessingStatusDisplay(update.status)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Overall Progress
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress 
              value={progress} 
              className={`h-2 ${
                isComplete ? 'bg-green-100' :
                isFailed ? 'bg-red-100' :
                'bg-blue-100'
              }`}
            />
          </div>

          {/* Processing Stages */}
          {isInProgress && renderProcessingStages(update.status)}

          {/* Status Message */}
          {update.message && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{update.message}</p>
            </div>
          )}

          {/* Error Details */}
          {isFailed && update.errorDetails && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Processing Failed</p>
                  <p className="text-sm text-red-700 mt-1">{update.errorDetails}</p>
                </div>
              </div>
            </div>
          )}

          {/* Time Estimates */}
          {isInProgress && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>
                  Estimated time remaining: {formatDuration((update.estimatedTimeRemaining || getEstimatedTimeRemaining(update.status)) * 1000)}
                </span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isComplete && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-sm font-medium text-green-800">
                  Document processed successfully!
                </p>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your document is now ready for AI-powered conversations.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            {isFailed && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(update.documentId)}
              >
                Retry Processing
              </Button>
            )}
            
            {isInProgress && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(update.documentId)}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (updates.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {updates.map(renderSingleUpdate)}
    </div>
  );
};

export default UploadProgressIndicator;