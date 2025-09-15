/**
 * Document Upload Demo Component
 * Demonstrates how to use the document upload system
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';

import DocumentUploadManager from './DocumentUploadManager';
import { UploadError } from './UploadErrorHandler';

// ============================================================================
// DEMO COMPONENT
// ============================================================================

export const DocumentUploadDemo: React.FC = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [isDemo, setIsDemo] = useState(true);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleUploadComplete = (documentIds: string[]) => {
    console.log('Upload completed:', documentIds);
    setUploadedDocuments(prev => [...prev, ...documentIds]);
    
    // Show success message
    alert(`Successfully uploaded ${documentIds.length} document(s)!`);
  };

  const handleUploadError = (errors: UploadError[]) => {
    console.error('Upload errors:', errors);
    setUploadErrors(prev => [...prev, ...errors]);
  };

  const clearHistory = () => {
    setUploadedDocuments([]);
    setUploadErrors([]);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Upload className="h-6 w-6 text-blue-500" />
              <CardTitle className="text-2xl">Enhanced RAG Document Upload System</CardTitle>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Demo Mode
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              This demo showcases the document upload and validation system for the Enhanced RAG platform. 
              Upload PDF documents to see the validation, progress tracking, and error handling in action.
            </p>
            
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Features demonstrated:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Drag-and-drop file upload with validation</li>
                  <li>Real-time progress tracking with processing stages</li>
                  <li>Comprehensive error handling and retry mechanisms</li>
                  <li>Batch file validation and management</li>
                  <li>Mobile-responsive design</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Upload Manager */}
      <DocumentUploadManager
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        maxConcurrentUploads={3}
      />

      {/* Upload History */}
      {(uploadedDocuments.length > 0 || uploadErrors.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Upload History</span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearHistory}>
                Clear History
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Successful Uploads */}
              {uploadedDocuments.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-2 flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Successfully Uploaded ({uploadedDocuments.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {uploadedDocuments.map((docId, index) => (
                      <div key={docId} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                        Document {index + 1}: {docId}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Errors */}
              {uploadErrors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Upload Errors ({uploadErrors.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {uploadErrors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-800">
                          {error.filename || 'Unknown File'}
                        </p>
                        <p className="text-sm text-red-600">{error.message}</p>
                        <p className="text-xs text-red-500 mt-1">
                          Code: {error.code} • {error.timestamp.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Information */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Components Used:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><code>DocumentUploadManager</code> - Main orchestration component</li>
                <li><code>DocumentUpload</code> - Drag-and-drop upload interface</li>
                <li><code>UploadProgressIndicator</code> - Real-time progress tracking</li>
                <li><code>FileValidationDisplay</code> - File validation results</li>
                <li><code>UploadErrorHandler</code> - Error handling and retry logic</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Validation Rules:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>File type: PDF only</li>
                <li>File size: 1KB - 50MB</li>
                <li>Filename: Valid characters, max 255 chars</li>
                <li>Batch limit: 10 files, 250MB total</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Processing Stages:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Uploading - File transfer to server</li>
                <li>Extracting - Text extraction from PDF</li>
                <li>Chunking - Breaking text into searchable chunks</li>
                <li>Embedding - Generating AI embeddings for semantic search</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUploadDemo;