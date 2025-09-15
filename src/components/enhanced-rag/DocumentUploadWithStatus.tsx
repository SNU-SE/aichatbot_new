/**
 * Document Upload with Real-time Status Component
 * Enhanced document upload with integrated real-time processing status monitoring
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { 
  DocumentUploadRequest, 
  DocumentUploadResponse, 
  ProcessingStatus,
  SupportedLanguage,
  FILE_CONSTRAINTS 
} from '@/types/enhanced-rag';
import { documentProcessingService } from '@/services/documentProcessingService';
import { formatFileSize } from '@/utils/enhanced-rag-utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UploadJob {
  id: string;
  file: File;
  title: string;
  language?: string;
  folderId?: string;
  uploadProgress: number;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  message: string;
  documentId?: string;
  error?: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
  retryCount: number;
}

export interface DocumentUploadWithStatusProps {
  folderId?: string;
  onUploadComplete?: (documentId: string) => void;
  onUploadError?: (error: string) => void;
  maxConcurrentUploads?: number;
  autoStartProcessing?: boolean;
  showProcessingStatus?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_LANGUAGES = [
  { code: SupportedLanguage.ENGLISH, name: 'English' },
  { code: SupportedLanguage.KOREAN, name: '한국어' },
  { code: SupportedLanguage.JAPANESE, name: '日本語' },
  { code: SupportedLanguage.CHINESE, name: '中文' },
  { code: SupportedLanguage.FRENCH, name: 'Français' },
  { code: SupportedLanguage.GERMAN, name: 'Deutsch' },
  { code: SupportedLanguage.SPANISH, name: 'Español' },
  { code: SupportedLanguage.ITALIAN, name: 'Italiano' },
  { code: SupportedLanguage.PORTUGUESE, name: 'Português' },
  { code: SupportedLanguage.RUSSIAN, name: 'Русский' },
  { code: SupportedLanguage.ARABIC, name: 'العربية' },
  { code: SupportedLanguage.HINDI, name: 'हिन्दी' }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentUploadWithStatus: React.FC<DocumentUploadWithStatusProps> = ({
  folderId,
  onUploadComplete,
  onUploadError,
  maxConcurrentUploads = 3,
  autoStartProcessing = true,
  showProcessingStatus = true
}) => {
  const [uploadJobs, setUploadJobs] = useState<Map<string, UploadJob>>(new Map());
  const [defaultLanguage, setDefaultLanguage] = useState<string>('auto');
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const {
    startMonitoring,
    retryProcessing,
    activeProcessing,
    completedProcessing,
    failedProcessing
  } = useProcessingStatus({
    enableNotifications: true,
    enableToasts: true,
    autoRetry: false,
    onComplete: (documentId) => {
      onUploadComplete?.(documentId);
      
      // Update job status
      setUploadJobs(prev => {
        const newJobs = new Map(prev);
        for (const [jobId, job] of newJobs) {
          if (job.documentId === documentId) {
            newJobs.set(jobId, {
              ...job,
              processingStatus: ProcessingStatus.COMPLETED,
              processingProgress: 100,
              message: 'Processing completed successfully'
            });
            break;
          }
        }
        return newJobs;
      });
    },
    onError: (documentId, error) => {
      onUploadError?.(error.message);
    }
  });

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Invalid file type. Only PDF files are supported.`;
    }

    // Check file size
    if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)}.`;
    }

    if (file.size < FILE_CONSTRAINTS.MIN_FILE_SIZE) {
      return `File too small. Minimum size is ${formatFileSize(FILE_CONSTRAINTS.MIN_FILE_SIZE)}.`;
    }

    return null;
  };

  // ============================================================================
  // UPLOAD HANDLING
  // ============================================================================

  const createUploadJob = (file: File): UploadJob => {
    const jobId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: jobId,
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      language: defaultLanguage === 'auto' ? undefined : defaultLanguage,
      folderId,
      uploadProgress: 0,
      processingStatus: ProcessingStatus.UPLOADING,
      processingProgress: 0,
      message: 'Preparing upload...',
      startTime: new Date(),
      retryCount: 0
    };
  };

  const uploadFile = async (job: UploadJob): Promise<void> => {
    const abortController = new AbortController();
    abortControllers.current.set(job.id, abortController);

    try {
      // Update job status
      setUploadJobs(prev => new Map(prev.set(job.id, {
        ...job,
        uploadProgress: 0,
        message: 'Starting upload...'
      })));

      // Create upload request
      const uploadRequest: DocumentUploadRequest = {
        file: job.file,
        title: job.title,
        folderId: job.folderId,
        language: job.language,
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalFilename: job.file.name
        }
      };

      // Simulate upload progress (in real implementation, this would come from the upload service)
      const progressInterval = setInterval(() => {
        setUploadJobs(prev => {
          const currentJob = prev.get(job.id);
          if (!currentJob || currentJob.uploadProgress >= 100) {
            clearInterval(progressInterval);
            return prev;
          }

          const newProgress = Math.min(currentJob.uploadProgress + 10, 100);
          return new Map(prev.set(job.id, {
            ...currentJob,
            uploadProgress: newProgress,
            message: `Uploading... ${newProgress}%`
          }));
        });
      }, 200);

      // Process document (this would typically be a separate API call)
      const response = await documentProcessingService.processDocument(
        {
          documentId: '', // Will be set by the service
          file: job.file,
          title: job.title,
          folderId: job.folderId,
          language: job.language,
          options: {
            autoProcess: autoStartProcessing,
            enableRealTimeUpdates: true
          }
        },
        {
          onStatusUpdate: (update) => {
            setUploadJobs(prev => {
              const currentJob = prev.get(job.id);
              if (!currentJob) return prev;

              return new Map(prev.set(job.id, {
                ...currentJob,
                documentId: update.documentId,
                processingStatus: update.status,
                processingProgress: update.progress || 0,
                message: update.message || '',
                estimatedTimeRemaining: update.estimatedTimeRemaining
              }));
            });
          },
          onError: (error) => {
            setUploadJobs(prev => {
              const currentJob = prev.get(job.id);
              if (!currentJob) return prev;

              return new Map(prev.set(job.id, {
                ...currentJob,
                processingStatus: ProcessingStatus.FAILED,
                processingProgress: 0,
                message: error.message,
                error: error.message
              }));
            });
          },
          onComplete: (result) => {
            clearInterval(progressInterval);
            
            setUploadJobs(prev => {
              const currentJob = prev.get(job.id);
              if (!currentJob) return prev;

              return new Map(prev.set(job.id, {
                ...currentJob,
                documentId: result.documentId,
                uploadProgress: 100,
                processingStatus: ProcessingStatus.COMPLETED,
                processingProgress: 100,
                message: 'Upload and processing completed successfully'
              }));
            });

            // Start monitoring if enabled
            if (showProcessingStatus && result.documentId) {
              startMonitoring(result.documentId);
            }

            toast({
              title: "Upload Complete",
              description: `${job.file.name} has been uploaded and processed successfully.`,
            });
          }
        }
      );

      clearInterval(progressInterval);

    } catch (error: any) {
      console.error('Upload failed:', error);
      
      setUploadJobs(prev => {
        const currentJob = prev.get(job.id);
        if (!currentJob) return prev;

        return new Map(prev.set(job.id, {
          ...currentJob,
          processingStatus: ProcessingStatus.FAILED,
          processingProgress: 0,
          message: error.message || 'Upload failed',
          error: error.message || 'Upload failed'
        }));
      });

      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload document',
        variant: "destructive",
      });

    } finally {
      abortControllers.current.delete(job.id);
    }
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      toast({
        title: "File Validation Errors",
        description: errors.join('\n'),
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) return;

    // Check concurrent upload limit
    const activeUploads = Array.from(uploadJobs.values()).filter(
      job => job.processingStatus === ProcessingStatus.UPLOADING
    ).length;

    if (activeUploads + validFiles.length > maxConcurrentUploads) {
      toast({
        title: "Too Many Uploads",
        description: `Maximum ${maxConcurrentUploads} concurrent uploads allowed.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // Create and start upload jobs
    for (const file of validFiles) {
      const job = createUploadJob(file);
      setUploadJobs(prev => new Map(prev.set(job.id, job)));
      
      // Start upload (don't await to allow concurrent uploads)
      uploadFile(job).finally(() => {
        // Check if all uploads are complete
        setUploadJobs(current => {
          const hasActiveUploads = Array.from(current.values()).some(
            j => j.processingStatus === ProcessingStatus.UPLOADING
          );
          
          if (!hasActiveUploads) {
            setIsUploading(false);
          }
          
          return current;
        });
      });
    }
  }, [uploadJobs, maxConcurrentUploads, defaultLanguage, folderId, autoStartProcessing, showProcessingStatus, toast, startMonitoring]);

  // ============================================================================
  // DROPZONE SETUP
  // ============================================================================

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesSelected,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: isUploading
  });

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  const retryUpload = async (jobId: string) => {
    const job = uploadJobs.get(jobId);
    if (!job) return;

    const updatedJob = {
      ...job,
      retryCount: job.retryCount + 1,
      processingStatus: ProcessingStatus.UPLOADING,
      processingProgress: 0,
      uploadProgress: 0,
      message: 'Retrying upload...',
      error: undefined,
      startTime: new Date()
    };

    setUploadJobs(prev => new Map(prev.set(jobId, updatedJob)));
    await uploadFile(updatedJob);
  };

  const cancelUpload = (jobId: string) => {
    const abortController = abortControllers.current.get(jobId);
    if (abortController) {
      abortController.abort();
    }

    setUploadJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.delete(jobId);
      return newJobs;
    });
  };

  const clearCompletedJobs = () => {
    setUploadJobs(prev => {
      const newJobs = new Map();
      for (const [jobId, job] of prev) {
        if (job.processingStatus !== ProcessingStatus.COMPLETED) {
          newJobs.set(jobId, job);
        }
      }
      return newJobs;
    });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderUploadJob = (job: UploadJob) => {
    const isActive = job.processingStatus !== ProcessingStatus.COMPLETED && 
                    job.processingStatus !== ProcessingStatus.FAILED;
    const canRetry = job.processingStatus === ProcessingStatus.FAILED && job.retryCount < 3;

    const getStatusIcon = () => {
      switch (job.processingStatus) {
        case ProcessingStatus.UPLOADING:
          return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case ProcessingStatus.EXTRACTING:
        case ProcessingStatus.CHUNKING:
        case ProcessingStatus.EMBEDDING:
          return <Zap className="h-4 w-4 text-yellow-500" />;
        case ProcessingStatus.COMPLETED:
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case ProcessingStatus.FAILED:
          return <XCircle className="h-4 w-4 text-red-500" />;
        default:
          return <Clock className="h-4 w-4 text-gray-500" />;
      }
    };

    const getStatusColor = () => {
      switch (job.processingStatus) {
        case ProcessingStatus.COMPLETED:
          return 'border-green-200 bg-green-50';
        case ProcessingStatus.FAILED:
          return 'border-red-200 bg-red-50';
        default:
          return 'border-blue-200 bg-blue-50';
      }
    };

    return (
      <Card key={job.id} className={`mb-3 ${getStatusColor()}`}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-sm">{job.title}</span>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(job.file.size)}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <Badge variant={job.processingStatus === ProcessingStatus.COMPLETED ? "default" : 
                              job.processingStatus === ProcessingStatus.FAILED ? "destructive" : "secondary"}>
                  {job.processingStatus}
                </Badge>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{job.message}</span>
                <span>
                  {job.processingStatus === ProcessingStatus.UPLOADING 
                    ? `${job.uploadProgress}%` 
                    : `${job.processingProgress}%`}
                </span>
              </div>
              <Progress 
                value={job.processingStatus === ProcessingStatus.UPLOADING 
                  ? job.uploadProgress 
                  : job.processingProgress} 
                className="h-2" 
              />
            </div>

            {/* Time info */}
            {isActive && job.estimatedTimeRemaining && (
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>ETA: {Math.ceil(job.estimatedTimeRemaining / 60)}m</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Started: {job.startTime.toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {job.error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {job.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {job.language && (
                  <Badge variant="outline" className="text-xs">
                    {SUPPORTED_LANGUAGES.find(l => l.code === job.language)?.name || job.language}
                  </Badge>
                )}
                {job.retryCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Retry {job.retryCount}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {job.documentId && (
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                {canRetry && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2"
                    onClick={() => retryUpload(job.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                {!isActive && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2"
                    onClick={() => cancelUpload(job.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const activeJobs = Array.from(uploadJobs.values()).filter(
    job => job.processingStatus !== ProcessingStatus.COMPLETED && 
           job.processingStatus !== ProcessingStatus.FAILED
  );
  const completedJobs = Array.from(uploadJobs.values()).filter(
    job => job.processingStatus === ProcessingStatus.COMPLETED
  );
  const failedJobs = Array.from(uploadJobs.values()).filter(
    job => job.processingStatus === ProcessingStatus.FAILED
  );

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Language Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="default-language">Default Language</Label>
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} ref={fileInputRef} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop files here' : 'Upload PDF Documents'}
              </h3>
              <p className="text-gray-500 mb-4">
                Drag and drop PDF files here, or click to select files
              </p>
              <p className="text-sm text-gray-400">
                Maximum file size: {formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)} • 
                Maximum {maxConcurrentUploads} concurrent uploads
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Jobs */}
      {uploadJobs.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Status</CardTitle>
              <div className="flex items-center space-x-2">
                {completedJobs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearCompletedJobs}>
                    Clear Completed
                  </Button>
                )}
                <Badge variant="outline">
                  {activeJobs.length} active, {completedJobs.length} completed, {failedJobs.length} failed
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Active Jobs */}
              {activeJobs.map(renderUploadJob)}
              
              {/* Failed Jobs */}
              {failedJobs.map(renderUploadJob)}
              
              {/* Completed Jobs (show last 3) */}
              {completedJobs.slice(0, 3).map(renderUploadJob)}
              
              {completedJobs.length > 3 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... and {completedJobs.length - 3} more completed uploads
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUploadWithStatus;