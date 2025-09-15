/**
 * Mobile Document Upload Component
 * Mobile-optimized document upload with camera capture support
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Upload, 
  Camera, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus,
  FolderOpen,
  Image as ImageIcon
} from 'lucide-react';
import { MobileLayout } from './MobileLayout';
import { 
  DocumentUploadRequest, 
  ProcessingStatus,
  ValidationResult 
} from '@/types/enhanced-rag';
import { 
  validateFile, 
  formatFileSize,
  createProcessingError 
} from '@/utils/enhanced-rag-utils';
import { cn } from '@/lib/utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MobileDocumentUploadProps {
  onUpload: (files: DocumentUploadRequest[]) => Promise<void>;
  onCancel?: (fileId: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  onBack?: () => void;
  className?: string;
}

interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: ProcessingStatus;
  error?: string;
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

// ============================================================================
// CAMERA MODAL COMPONENT
// ============================================================================

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>('');

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `document-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          onCapture(file);
          onClose();
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.9);
    }
  }, [onCapture, onClose]);

  // Handle modal open/close
  React.useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50 text-white">
          <h3 className="text-lg font-semibold">Capture Document</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative">
          {error ? (
            <div className="flex items-center justify-center h-full p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Capture Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white/50 rounded-lg w-80 h-60 pointer-events-none" />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center p-6 bg-black/50">
          <Button
            onClick={capturePhoto}
            disabled={!stream || isCapturing || !!error}
            size="lg"
            className="rounded-full w-16 h-16 bg-white text-black hover:bg-gray-200"
          >
            {isCapturing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// ============================================================================
// MOBILE FILE ITEM COMPONENT
// ============================================================================

interface MobileFileItemProps {
  file: File;
  progress?: UploadProgress;
  onRemove: () => void;
  isUploading?: boolean;
}

const MobileFileItem: React.FC<MobileFileItemProps> = ({
  file,
  progress,
  onRemove,
  isUploading = false
}) => {
  const validation = validateFile(file);
  const isImage = file.type.startsWith('image/');

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* File Icon */}
          <div className="flex-shrink-0">
            {isImage ? (
              <ImageIcon className="h-8 w-8 text-blue-500" />
            ) : (
              <FileText className="h-8 w-8 text-blue-500" />
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </div>
            
            {/* Validation Status */}
            {!validation.valid && (
              <div className="text-xs text-destructive mt-1">
                {validation.errors[0]}
              </div>
            )}

            {/* Upload Progress */}
            {progress && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={progress.status === ProcessingStatus.COMPLETED ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {progress.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {progress.progress}%
                  </span>
                </div>
                <Progress value={progress.progress} className="h-1" />
                {progress.error && (
                  <div className="text-xs text-destructive">{progress.error}</div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            {validation.valid && !progress && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {!validation.valid && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            {progress?.status === ProcessingStatus.UPLOADING && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isUploading}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MobileDocumentUpload: React.FC<MobileDocumentUploadProps> = ({
  onUpload,
  onCancel,
  maxFiles = 10,
  disabled = false,
  onBack,
  className = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if camera is available
  const isCameraAvailable = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Check max files limit
    if (selectedFiles.length + fileArray.length > maxFiles) {
      setValidationErrors([`Maximum ${maxFiles} files allowed`]);
      return;
    }

    // Clear previous errors and add files
    setValidationErrors([]);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  }, [selectedFiles.length, maxFiles]);

  // Handle camera capture
  const handleCameraCapture = useCallback((file: File) => {
    if (selectedFiles.length >= maxFiles) {
      setValidationErrors([`Maximum ${maxFiles} files allowed`]);
      return;
    }

    setSelectedFiles(prev => [...prev, file]);
  }, [selectedFiles.length, maxFiles]);

  // Remove file
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setValidationErrors([]);
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    setValidationErrors([]);
    setUploadProgress(new Map());
  }, []);

  // Start upload
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
          uploadTimestamp: new Date().toISOString(),
          capturedOnMobile: file.type.startsWith('image/')
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

  // Check if can upload
  const hasValidFiles = selectedFiles.length > 0 && selectedFiles.every(file => validateFile(file).valid);
  const canUpload = hasValidFiles && !isUploading;

  return (
    <MobileLayout
      title="Upload Documents"
      subtitle={`${selectedFiles.length}/${maxFiles} files selected`}
      showBackButton={!!onBack}
      onBack={onBack}
      className={className}
    >
      <div className="flex flex-col h-full p-4 space-y-4">
        {/* Upload Options */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-20 flex-col space-y-2"
          >
            <FolderOpen className="h-6 w-6" />
            <span className="text-sm">Browse Files</span>
          </Button>
          
          {isCameraAvailable && (
            <Button
              variant="outline"
              onClick={() => setShowCamera(true)}
              disabled={disabled}
              className="h-20 flex-col space-y-2"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Take Photo</span>
            </Button>
          )}
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf,image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        <div className="flex-1 overflow-auto">
          {selectedFiles.length === 0 && uploadProgress.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No files selected
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose files to upload or take a photo
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Maximum file size: 50MB</p>
                <p>• Supported formats: PDF, Images</p>
                <p>• Maximum {maxFiles} files at once</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selected files */}
              {selectedFiles.map((file, index) => (
                <MobileFileItem
                  key={`selected-${index}`}
                  file={file}
                  onRemove={() => removeFile(index)}
                  isUploading={isUploading}
                />
              ))}

              {/* Files being uploaded */}
              {Array.from(uploadProgress.values()).map((progress) => {
                const file = selectedFiles.find(f => f.name === progress.filename);
                return file ? (
                  <MobileFileItem
                    key={progress.fileId}
                    file={file}
                    progress={progress}
                    onRemove={() => onCancel?.(progress.fileId)}
                    isUploading={true}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={clearAllFiles}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <Button
              onClick={startUpload}
              disabled={!canUpload}
              className="w-full h-12"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </MobileLayout>
  );
};

export default MobileDocumentUpload;