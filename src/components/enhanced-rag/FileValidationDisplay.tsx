/**
 * File Validation Display Component
 * Shows validation results and file information
 */

import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, FileText, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ValidationResult } from '../../utils/enhanced-rag-utils';
import { formatFileSize } from '../../utils/enhanced-rag-utils';
import { FILE_CONSTRAINTS } from '../../types/enhanced-rag';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface FileValidationDisplayProps {
  file: FileInfo;
  validation: ValidationResult;
  showDetails?: boolean;
  className?: string;
}

export interface BatchValidationDisplayProps {
  files: FileInfo[];
  validations: ValidationResult[];
  batchValidation: ValidationResult;
  className?: string;
}

// ============================================================================
// SINGLE FILE VALIDATION COMPONENT
// ============================================================================

export const FileValidationDisplay: React.FC<FileValidationDisplayProps> = ({
  file,
  validation,
  showDetails = true,
  className = ''
}) => {
  const getValidationIcon = () => {
    if (validation.valid) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getValidationStatus = () => {
    if (validation.valid) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Valid
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        Invalid
      </Badge>
    );
  };

  const renderFileDetails = () => {
    if (!showDetails) return null;

    return (
      <div className="space-y-3">
        <Separator />
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">File Size</p>
            <p className="text-gray-600">{formatFileSize(file.size)}</p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700">File Type</p>
            <p className="text-gray-600">{file.type}</p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700">Last Modified</p>
            <p className="text-gray-600">
              {new Date(file.lastModified).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700">Extension</p>
            <p className="text-gray-600">
              {file.name.substring(file.name.lastIndexOf('.'))}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">File Requirements</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              {FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as any) ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span>Supported file type (PDF)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {file.size <= FILE_CONSTRAINTS.MAX_FILE_SIZE ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span>File size under {formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {file.size >= FILE_CONSTRAINTS.MIN_FILE_SIZE ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span>File size over {formatFileSize(FILE_CONSTRAINTS.MIN_FILE_SIZE)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-base truncate">{file.name}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getValidationIcon()}
            {getValidationStatus()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Validation Errors */}
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Warnings */}
        {validation.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {validation.valid && validation.errors.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              File is valid and ready for upload.
            </AlertDescription>
          </Alert>
        )}

        {/* File Details */}
        {renderFileDetails()}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// BATCH VALIDATION COMPONENT
// ============================================================================

export const BatchValidationDisplay: React.FC<BatchValidationDisplayProps> = ({
  files,
  validations,
  batchValidation,
  className = ''
}) => {
  const validFiles = validations.filter(v => v.valid).length;
  const invalidFiles = validations.filter(v => !v.valid).length;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const renderSummary = () => (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="text-center">
        <p className="text-2xl font-bold text-green-600">{validFiles}</p>
        <p className="text-sm text-gray-600">Valid Files</p>
      </div>
      
      <div className="text-center">
        <p className="text-2xl font-bold text-red-600">{invalidFiles}</p>
        <p className="text-sm text-gray-600">Invalid Files</p>
      </div>
      
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-600">{formatFileSize(totalSize)}</p>
        <p className="text-sm text-gray-600">Total Size</p>
      </div>
    </div>
  );

  const renderFileList = () => (
    <div className="space-y-2">
      {files.map((file, index) => {
        const validation = validations[index];
        return (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)} • {file.type}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {validation.valid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              
              <Badge 
                variant={validation.valid ? "outline" : "destructive"}
                className={validation.valid ? "bg-green-50 text-green-700 border-green-200" : ""}
              >
                {validation.valid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Batch Validation Results</span>
          </CardTitle>
          
          <Badge 
            variant={batchValidation.valid ? "outline" : "destructive"}
            className={batchValidation.valid ? "bg-green-50 text-green-700 border-green-200" : ""}
          >
            {batchValidation.valid ? 'All Valid' : 'Has Issues'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        {renderSummary()}

        {/* Batch Errors */}
        {batchValidation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {batchValidation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Batch Warnings */}
        {batchValidation.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {batchValidation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Individual File Status</h4>
          {renderFileList()}
        </div>

        {/* Upload Guidelines */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Upload Guidelines:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Only PDF files are supported</li>
                <li>Maximum file size: {formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)}</li>
                <li>Files will be processed automatically after upload</li>
                <li>Processing time depends on file size and complexity</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FileValidationDisplay;