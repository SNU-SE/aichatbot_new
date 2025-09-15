/**
 * Enhanced Document Upload Component with Language Detection
 * Provides drag-and-drop file upload with automatic language detection
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileText, Loader2, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  DocumentUploadRequest, 
  ProcessingStatus, 
  DocumentMetadata,
  LanguageDetectionMethod,
  LanguageDetectionResult
} from '../../types/enhanced-rag';
import { 
  validateFile, 
  validateMultipleFiles, 
  formatFileSize 
} from '../../utils/enhanced-rag-utils';
import { LanguageDetectionService } from '../../services/languageDetectionService';
import { LanguageSelector, LanguageDetectionIndicator } from './LanguageSelector';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UploadProgressWithLanguage {
  fileId: string;
  filename: string;
  progress: number;
  status: ProcessingStatus;
  error?: string;
  detectedLanguage?: string;
  languageConfidence?: number;
  detectionMethod?: LanguageDetectionMethod;
}

export interface FileWithLanguage extends File {
  detectedLanguage?: string;
  languageConfidence?: number;
  detectionMethod?: LanguageDetectionMethod;
  manualLanguage?: string;
}

export interface DocumentUploadWithLanguageProps {
  onUpload: (files: DocumentUploadRequest[]) => Promise<void>;
  onCancel?: (fileId: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  enableLanguageDetection?: boolean;
  defaultLanguage?: string;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DocumentUploadWithLanguage: React.FC<DocumentUploadWithLanguageProps> = ({
  onUpload,
  onCancel,
  maxFiles = 10,
  disabled = false,
  enableLanguageDetection = true,
  defaultLanguage,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithLanguage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgressWithLanguage>>(new Map());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [globalLanguageOverride, setGlobalLanguageOverride] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // LANGUAGE DETECTION
  // ============================================================================

  const detectFileLanguage = useCallback(async (file: File): Promise<LanguageDetectionResult> => {
    try {
      // For PDF files, we would need to extract text first
      // For now, we'll use a simple heuristic based on filename
      const filename = file.name.toLowerCase();
      
      // Simple filename-based detection
      if (filename.includes('korean') || filename.includes('한국')) {
        return {
          detectedLanguage: 'ko',
          confidence: 0.8,
          method: LanguageDetectionMethod.AUTOMATIC
        };
      } else if (filename.includes('japanese') || filename.includes('日本')) {
        return {
          detectedLanguage: 'ja',
          confidence: 0.8,
          method: LanguageDetectionMethod.AUTOMATIC
        };
      } else if (filename.includes('chinese') || filename.includes('中文')) {
        return {
          detectedLanguage: 'zh',
          confidence: 0.8,
          method: LanguageDetectionMethod.AUTOMATIC
        };
      }

      // Default to English with lower confidence
      return {
        detectedLanguage: defaultLanguage || 'en',
        confidence: 0.6,
        method: LanguageDetectionMethod.FALLBACK
      };

    } catch (error) {
      console.error('Language detection failed:', error);
      return {
        detectedLanguage: defaultLanguage || 'en',
        confidence: 0.5,
        method: LanguageDetectionMethod.FALLBACK
      };
    }
  }, [defaultLanguage]);

  const detectLanguagesForFiles = useCallback(async (files: File[]) => {
    if (!enableLanguageDetection) return files;

    setIsDetectingLanguage(true);
    
    try {
      const filesWithLanguage: FileWithLanguage[] = await Promise.all(
        files.map(async (file) => {
          const detection = await detectFileLanguage(file);
          
          return Object.assign(file, {
            detectedLanguage: detection.detectedLanguage,
            languageConfidence: detection.confidence,
            detectionMethod: detection.method
          });
        })
      );

      return filesWithLanguage;
    } catch (error) {
      console.error('Batch language detection failed:', error);
      return files;
    } finally {
      setIsDetectingLanguage(false);
    }
  }, [enableLanguageDetection, detectFileLanguage]);

  // ============================================================================
  // FILE SELECTION HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback(async (files: FileList | null) => {
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

    // Clear previous errors
    setValidationErrors([]);

    // Detect languages for new files
    const filesWithLanguage = await detectLanguagesForFiles(fileArray);
    
    // Add files
    setSelectedFiles(prev => [...prev, ...filesWithLanguage]);
  }, [selectedFiles.length, maxFiles, detectLanguagesForFiles]);

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

  const updateFileLanguage = useCallback((index: number, language: string) => {
    setSelectedFiles(prev => prev.map((file, i) => {
      if (i === index) {
        return Object.assign(file, {
          manualLanguage: language,
          detectionMethod: LanguageDetectionMethod.MANUAL
        });
      }
      return file;
    }));
  }, []);

  // ============================================================================
  // UPLOAD HANDLING
  // ============================================================================

  const startUpload = useCallback(async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setValidationErrors([]);

    try {
      // Create upload requests with language information
      const uploadRequests: DocumentUploadRequest[] = selectedFiles.map(file => {
        const finalLanguage = globalLanguageOverride || 
                             file.manualLanguage || 
                             file.detectedLanguage || 
                             defaultLanguage || 
                             'auto';

        const metadata: Partial<DocumentMetadata> = {
          language: finalLanguage,
          languageDetection: {
            detectedLanguage: file.detectedLanguage || 'unknown',
            confidence: file.languageConfidence || 0,
            method: file.detectionMethod || LanguageDetectionMethod.FALLBACK
          }
        };

        return {
          file,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
          language: finalLanguage,
          metadata
        };
      });

      // Initialize progress tracking
      const progressMap = new Map<string, UploadProgressWithLanguage>();
      selectedFiles.forEach((file, index) => {
        const fileId = `${file.name}-${index}`;
        progressMap.set(fileId, {
          fileId,
          filename: file.name,
          progress: 0,
          status: ProcessingStatus.UPLOADING,
          detectedLanguage: file.detectedLanguage,
          languageConfidence: file.languageConfidence,
          detectionMethod: file.detectionMethod
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
  }, [selectedFiles, isUploading, onUpload, globalLanguageOverride, defaultLanguage]);

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

  const renderLanguageControls = () => {
    if (!enableLanguageDetection) return null;

    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Globe className="h-4 w-4 mr-2" />
          Language Settings
        </h3>
        
        <LanguageSelector
          mode="upload"
          selectedLanguage={globalLanguageOverride}
          onLanguageChange={setGlobalLanguageOverride}
          className="mb-2"
        />
        
        {globalLanguageOverride && (
          <p className="text-xs text-blue-600">
            This language will be applied to all uploaded files
          </p>
        )}
      </div>
    );
  };

  const renderFileList = () => {
    if (selectedFiles.length === 0 && uploadProgress.size === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        {/* Selected files (not yet uploaded) */}
        {selectedFiles.map((file, index) => {
          const validation = validateFile(file);
          const finalLanguage = globalLanguageOverride || 
                               file.manualLanguage || 
                               file.detectedLanguage;
          
          return (
            <div key={`selected-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <FileText className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    {finalLanguage && (
                      <LanguageDetectionIndicator
                        detectedLanguage={finalLanguage}
                        confidence={file.languageConfidence}
                        method={file.detectionMethod}
                      />
                    )}
                  </div>
                  {!validation.valid && (
                    <p className="text-xs text-red-500">{validation.errors[0]}</p>
                  )}
                </div>
                
                {/* Individual language selector */}
                {enableLanguageDetection && !globalLanguageOverride && (
                  <div className="w-32">
                    <LanguageSelector
                      mode="upload"
                      selectedLanguage={file.manualLanguage || file.detectedLanguage}
                      onLanguageChange={(lang) => updateFileLanguage(index, lang)}
                      className="text-xs"
                    />
                  </div>
                )}
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
                  {progress.detectedLanguage && (
                    <LanguageDetectionIndicator
                      detectedLanguage={progress.detectedLanguage}
                      confidence={progress.languageConfidence}
                      method={progress.detectionMethod}
                    />
                  )}
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
  const canUpload = hasValidFiles && !isUploading && !isDetectingLanguage;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Language Controls */}
      {renderLanguageControls()}

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
            {enableLanguageDetection && (
              <p>• Language detection enabled</p>
            )}
          </div>
          
          {isDetectingLanguage && (
            <div className="mt-4 flex items-center text-blue-600">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm">Detecting languages...</span>
            </div>
          )}
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
              ) : isDetectingLanguage ? (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Detecting...
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

export default DocumentUploadWithLanguage;