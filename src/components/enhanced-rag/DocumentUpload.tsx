/**
 * Document Upload Component
 * Provides drag-and-drop file upload with validation and progress tracking
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  DocumentUploadRequest, 
  ProcessingStatus, 
  DocumentErrorCode,
  ValidationResult 
} from '../../types/enhanced-rag';
import { 
  validateFile, 
  validateMultipleFiles, 
  formatFileSize,
  createProcessingError 
} from '../../utils/enhanced-rag-utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: ProcessingStatus;
  error?: string;
}

export interface DocumentUploadProps {
  onUpload: (files: DocumentUploadRequest[]) => Promise<void>;
  onCancel?: (fileId: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  onCancel,
  maxFiles = 10,
  disabled = false,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // FILE SELECTION HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate files
    const validation = validateMultipleFiles(fileArray);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Check max files limit
    if (selectedFiles.length + fileArray.length > maxFiles) {
      setValidationErrors([`Maximum ${maxFiles} files allowed`]);
      return;
    }

    // Clear previous errors and add files
    setValidationErrors([]);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  }, [selectedFiles.length, maxFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setValidationErrors([]);
  }, []);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    setValidationErrors([]);
    setUploadProgress(new Map());
  }, []);

  // ============================================================================
  // UPLOAD HANDLING
  // ============================================================================

  const startUpload = useCallback(async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setValidationErrors([]);

    try {
      // Create upload requests
      const uploadRequests: DocumentUploadRequest[] = selectedFiles.map(file => ({
        file,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
        metadata: {
          originalFilename: file.name,
          uploadTimestamp: new Date().toISOString()
        }
      }));

      // Initialize progress tracking
      const progressMap = new Map<string, UploadProgress>();
      selectedFiles.forEach((file, index) => {
        const fileId = `${file.name}-${index}`;
        progressMap.set(fileId, {
          fileId,
          filename: file.name,
          progress: 0,
          status: ProcessingStatus.UPLOADING
        });
      });
      setUploadProgress(progressMap);

      // Start upload
      await onUpload(uploadRequests);

      // Clear files on successful upload
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setValidationErrors([
        error instanceof Error ? error.message : 'Upload failed. Please try again.'
      ]);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, isUploading, onUpload]);

  const cancelUpload = useCallback((fileId: string) => {
    if (onCancel) {
      onCancel(fileId);
    }
    
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, [onCancel]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderFileList = () => {
    if (selectedFiles.length === 0 && uploadProgress.size === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        {/* Selected files (not yet uploaded) */}
        {selectedFiles.map((file, index) => {
          const validation = validateFile(file);
          return (
            <div key={`selected-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  {!validation.valid && (
                    <p className="text-xs text-red-500">{validation.errors[0]}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {validation.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Files being uploaded */}
        {Array.from(uploadProgress.values()).map((progress) => (
          <div key={progress.fileId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3 flex-1">
              <FileText className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{progress.filename}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress value={progress.progress} className="flex-1 h-2" />
                  <Badge variant="outline" className="text-xs">
                    {progress.status}
                  </Badge>
                </div>
                {progress.error && (
                  <p className="text-xs text-red-500 mt-1">{progress.error}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {progress.status === ProcessingStatus.UPLOADING && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {progress.status === ProcessingStatus.COMPLETED && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {progress.status === ProcessingStatus.FAILED && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelUpload(progress.fileId)}
                disabled={progress.status === ProcessingStatus.COMPLETED}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <Alert className="mt-4" variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const hasValidFiles = selectedFiles.length > 0 && selectedFiles.every(file => validateFile(file).valid);
  const canUpload = hasValidFiles && !isUploading;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <Card 
        className={`
          border-2 border-dashed transition-colors cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <Upload className={`h-12 w-12 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isDragOver ? 'Drop files here' : 'Upload PDF Documents'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop your PDF files here, or click to browse
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Maximum file size: 50MB</p>
            <p>• Supported format: PDF</p>
            <p>• Maximum {maxFiles} files at once</p>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* File list */}
      {renderFileList()}

      {/* Validation errors */}
      {renderErrors()}

      {/* Action buttons */}
      {selectedFiles.length > 0 && (
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={clearAllFiles}
            disabled={isUploading}
          >
            Clear All
          </Button>
          <div className="flex space-x-2">
            <span className="text-sm text-gray-600 self-center">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              onClick={startUpload}
              disabled={!canUpload}
              className="min-w-[100px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Files'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;