/**
 * Document Upload Manager Component
 * Main component that orchestrates the entire upload process
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { FileText, Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';

import DocumentUpload from './DocumentUpload';
import UploadProgressIndicator from './UploadProgressIndicator';
import { FileValidationDisplay, BatchValidationDisplay } from './FileValidationDisplay';
import UploadErrorHandler, { UploadError } from './UploadErrorHandler';

import {
  DocumentUploadRequest,
  ProcessingStatusUpdate,
  ProcessingStatus,
  DocumentErrorCode
} from '../../types/enhanced-rag';
import {
  validateFile,
  validateMultipleFiles,
  createProcessingError,
  generateSessionId
} from '../../utils/enhanced-rag-utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DocumentUploadManagerProps {
  onUploadComplete?: (documentIds: string[]) => void;
  onUploadError?: (errors: UploadError[]) => void;
  maxConcurrentUploads?: number;
  className?: string;
}

interface UploadSession {
  id: string;
  files: DocumentUploadRequest[];
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  errors: UploadError[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentUploadManager: React.FC<DocumentUploadManagerProps> = ({
  onUploadComplete,
  onUploadError,
  maxConcurrentUploads = 3,
  className = ''
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [activeTab, setActiveTab] = useState<'upload' | 'progress' | 'errors'>('upload');
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [processingUpdates, setProcessingUpdates] = useState<ProcessingStatusUpdate[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const activeUploads = uploadSessions.filter(session => session.status === 'uploading').length;
  const completedUploads = uploadSessions.filter(session => session.status === 'completed').length;
  const failedUploads = uploadSessions.filter(session => session.status === 'failed').length;
  const totalProcessingFiles = processingUpdates.length;
  const completedProcessing = processingUpdates.filter(update => 
    update.status === ProcessingStatus.COMPLETED
  ).length;

  // ============================================================================
  // UPLOAD HANDLING
  // ============================================================================

  const handleUpload = useCallback(async (uploadRequests: DocumentUploadRequest[]) => {
    const sessionId = generateSessionId();
    
    // Create new upload session
    const newSession: UploadSession = {
      id: sessionId,
      files: uploadRequests,
      status: 'uploading',
      startTime: new Date(),
      errors: []
    };

    setUploadSessions(prev => [...prev, newSession]);
    setActiveTab('progress');

    try {
      // Simulate upload process (replace with actual upload logic)
      const uploadPromises = uploadRequests.map(async (request, index) => {
        const documentId = `doc-${sessionId}-${index}`;
        
        // Validate file before upload
        const validation = validateFile(request.file);
        if (!validation.valid) {
          const error: UploadError = createProcessingError(
            DocumentErrorCode.INVALID_FILE_FORMAT,
            validation.errors.join(', '),
            { filename: request.file.name },
            false
          );
          error.documentId = documentId;
          error.filename = request.file.name;
          throw error;
        }

        // Simulate upload stages
        const stages = [
          ProcessingStatus.UPLOADING,
          ProcessingStatus.EXTRACTING,
          ProcessingStatus.CHUNKING,
          ProcessingStatus.EMBEDDING
        ];

        for (let i = 0; i < stages.length; i++) {
          const status = stages[i];
          const progress = ((i + 1) / stages.length) * 100;
          
          // Update processing status
          const update: ProcessingStatusUpdate = {
            documentId,
            status,
            progress,
            message: `Processing ${request.file.name}...`,
            estimatedTimeRemaining: (stages.length - i - 1) * 15 // 15 seconds per stage
          };

          setProcessingUpdates(prev => {
            const filtered = prev.filter(u => u.documentId !== documentId);
            return [...filtered, update];
          });

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Mark as completed
        const completedUpdate: ProcessingStatusUpdate = {
          documentId,
          status: ProcessingStatus.COMPLETED,
          progress: 100,
          message: `Successfully processed ${request.file.name}`
        };

        setProcessingUpdates(prev => {
          const filtered = prev.filter(u => u.documentId !== documentId);
          return [...filtered, completedUpdate];
        });

        return documentId;
      });

      // Wait for all uploads to complete
      const documentIds = await Promise.all(uploadPromises);

      // Update session status
      setUploadSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'completed', endTime: new Date() }
          : session
      ));

      // Notify completion
      if (onUploadComplete) {
        onUploadComplete(documentIds);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Handle upload errors
      const uploadError = error as UploadError;
      setUploadErrors(prev => [...prev, uploadError]);
      
      // Update session status
      setUploadSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              status: 'failed', 
              endTime: new Date(),
              errors: [uploadError]
            }
          : session
      ));

      // Switch to errors tab
      setActiveTab('errors');

      // Notify error
      if (onUploadError) {
        onUploadError([uploadError]);
      }
    }
  }, [onUploadComplete, onUploadError]);

  const handleRetry = useCallback(async (documentId: string) => {
    // Find the error and increment retry count
    setUploadErrors(prev => prev.map(error => 
      error.documentId === documentId 
        ? { ...error, retryCount: (error.retryCount || 0) + 1 }
        : error
    ));

    // Remove from processing updates to restart
    setProcessingUpdates(prev => prev.filter(update => update.documentId !== documentId));

    // Simulate retry logic (replace with actual retry implementation)
    console.log(`Retrying upload for document: ${documentId}`);
  }, []);

  const handleCancelUpload = useCallback((documentId: string) => {
    // Remove from processing updates
    setProcessingUpdates(prev => prev.filter(update => update.documentId !== documentId));
    
    // Add cancellation error
    const cancelError: UploadError = createProcessingError(
      DocumentErrorCode.PROCESSING_TIMEOUT,
      'Upload was cancelled by user',
      { documentId },
      false
    );
    cancelError.documentId = documentId;
    
    setUploadErrors(prev => [...prev, cancelError]);
  }, []);

  const handleDismissError = useCallback((documentId: string) => {
    setUploadErrors(prev => prev.filter(error => error.documentId !== documentId));
  }, []);

  const handleDismissAllErrors = useCallback(() => {
    setUploadErrors([]);
  }, []);

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  const handleFileSelection = useCallback((files: File[]) => {
    setSelectedFiles(files);
    
    // Validate files
    const validations = files.map(validateFile);
    const batchValidation = validateMultipleFiles(files);
    
    setValidationResults(validations);
    
    // If there are validation issues, switch to upload tab to show them
    if (!batchValidation.valid || validations.some(v => !v.valid)) {
      setActiveTab('upload');
    }
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderTabBadges = () => {
    return (
      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <Upload className="h-4 w-4" />
          <span>{activeUploads} active</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>{totalProcessingFiles} processing</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>{completedUploads} completed</span>
        </div>
        
        {uploadErrors.length > 0 && (
          <div className="flex items-center space-x-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span>{uploadErrors.length} errors</span>
          </div>
        )}
      </div>
    );
  };

  const renderUploadStats = () => {
    const totalSessions = uploadSessions.length;
    if (totalSessions === 0) return null;

    return (
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{totalSessions}</p>
          <p className="text-sm text-gray-600">Total Sessions</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{activeUploads}</p>
          <p className="text-sm text-gray-600">Active Uploads</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{completedUploads}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{failedUploads}</p>
          <p className="text-sm text-gray-600">Failed</p>
        </div>
      </div>
    );
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Auto-switch to progress tab when uploads start
    if (activeUploads > 0 && activeTab === 'upload') {
      setActiveTab('progress');
    }
  }, [activeUploads, activeTab]);

  useEffect(() => {
    // Auto-switch to errors tab when errors occur
    if (uploadErrors.length > 0 && activeTab !== 'errors') {
      setActiveTab('errors');
    }
  }, [uploadErrors.length, activeTab]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Document Upload Manager</span>
          </CardTitle>
          {renderTabBadges()}
        </div>
      </CardHeader>

      <CardContent>
        {renderUploadStats()}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            
            <TabsTrigger value="progress" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Progress</span>
              {totalProcessingFiles > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {totalProcessingFiles}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="errors" className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>Errors</span>
              {uploadErrors.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {uploadErrors.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="upload" className="space-y-4">
              <DocumentUpload
                onUpload={handleUpload}
                onCancel={handleCancelUpload}
                maxFiles={10}
                disabled={activeUploads >= maxConcurrentUploads}
              />
              
              {selectedFiles.length > 0 && validationResults.length > 0 && (
                <>
                  <Separator />
                  <BatchValidationDisplay
                    files={selectedFiles.map(f => ({
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      lastModified: f.lastModified
                    }))}
                    validations={validationResults}
                    batchValidation={validateMultipleFiles(selectedFiles)}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="progress" className="space-y-4">
              {processingUpdates.length > 0 ? (
                <UploadProgressIndicator
                  updates={processingUpdates}
                  onRetry={handleRetry}
                  onCancel={handleCancelUpload}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No active uploads</p>
                  <p className="text-sm">Upload files to see progress here</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              {uploadErrors.length > 0 ? (
                <UploadErrorHandler
                  errors={uploadErrors}
                  onRetry={handleRetry}
                  onDismiss={handleDismissError}
                  onDismissAll={handleDismissAllErrors}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No upload errors</p>
                  <p className="text-sm">All uploads completed successfully</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentUploadManager;