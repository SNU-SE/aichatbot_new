/**
 * Processing Status Demo Component
 * Demonstrates the real-time processing status system with all features
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Monitor,
  Bell,
  Settings,
  FileText,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import ProcessingStatusMonitor from './ProcessingStatusMonitor';
import ProcessingNotificationPanel from './ProcessingNotificationPanel';
import DocumentUploadWithStatus from './DocumentUploadWithStatus';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcessingStatusDemoProps {
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProcessingStatusDemo: React.FC<ProcessingStatusDemoProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [simulatedDocuments, setSimulatedDocuments] = useState<string[]>([]);
  const { toast } = useToast();

  const {
    processingStates,
    activeProcessing,
    completedProcessing,
    failedProcessing,
    notifications,
    unreadCount,
    isMonitoring,
    hasActiveProcessing,
    totalProgress,
    startMonitoring,
    retryProcessing,
    markAllAsRead,
    clearNotifications,
    notificationPreferences,
    updateNotificationPreferences
  } = useProcessingStatus({
    enableNotifications: true,
    enableToasts: true,
    autoRetry: false,
    onComplete: (documentId) => {
      toast({
        title: "Processing Complete",
        description: `Document ${documentId.slice(0, 8)}... has been processed successfully.`,
      });
    },
    onError: (documentId, error) => {
      toast({
        title: "Processing Error",
        description: `Failed to process document ${documentId.slice(0, 8)}...: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // ============================================================================
  // SIMULATION FUNCTIONS
  // ============================================================================

  const simulateDocumentProcessing = async () => {
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSimulatedDocuments(prev => [...prev, documentId]);
    
    try {
      await startMonitoring(documentId);
      
      toast({
        title: "Simulation Started",
        description: `Started monitoring document ${documentId.slice(0, 8)}...`,
      });
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: "Failed to start document processing simulation.",
        variant: "destructive",
      });
    }
  };

  const simulateMultipleDocuments = async () => {
    const count = 3;
    const documentIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const documentId = `batch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      documentIds.push(documentId);
    }
    
    setSimulatedDocuments(prev => [...prev, ...documentIds]);
    
    // Start monitoring all documents
    for (const documentId of documentIds) {
      try {
        await startMonitoring(documentId);
      } catch (error) {
        console.error(`Failed to start monitoring ${documentId}:`, error);
      }
    }
    
    toast({
      title: "Batch Simulation Started",
      description: `Started monitoring ${count} documents for processing.`,
    });
  };

  const handleUploadComplete = (documentId: string) => {
    setSimulatedDocuments(prev => [...prev, documentId]);
    toast({
      title: "Upload Complete",
      description: `Document uploaded and processing started.`,
    });
  };

  const handleUploadError = (error: string) => {
    toast({
      title: "Upload Error",
      description: error,
      variant: "destructive",
    });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatusSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Active Processing</p>
              <p className="text-2xl font-bold text-blue-600">{activeProcessing.length}</p>
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
              <p className="text-2xl font-bold text-green-600">{completedProcessing.length}</p>
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
              <p className="text-2xl font-bold text-red-600">{failedProcessing.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Notifications</p>
              <p className="text-2xl font-bold text-purple-600">{notifications.length}</p>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs mt-1">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSystemStatus = () => (
    <Alert className="mb-6">
      <Monitor className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm">
                Real-time monitoring: {isMonitoring ? 'Active' : 'Inactive'}
              </span>
            </div>
            {hasActiveProcessing && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  Overall progress: {Math.round(totalProgress)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={notificationPreferences.enableBrowserNotifications ? "default" : "secondary"}>
              Browser notifications: {notificationPreferences.enableBrowserNotifications ? 'On' : 'Off'}
            </Badge>
            <Badge variant={notificationPreferences.soundEnabled ? "default" : "secondary"}>
              Sound: {notificationPreferences.soundEnabled ? 'On' : 'Off'}
            </Badge>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );

  const renderSimulationControls = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Processing Simulation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={simulateDocumentProcessing}
            disabled={isMonitoring && activeProcessing.length >= 5}
          >
            <FileText className="h-4 w-4 mr-2" />
            Simulate Single Document
          </Button>
          
          <Button 
            onClick={simulateMultipleDocuments}
            variant="outline"
            disabled={isMonitoring && activeProcessing.length >= 3}
          >
            <Upload className="h-4 w-4 mr-2" />
            Simulate Batch Upload
          </Button>
          
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              Mark All Read
            </Button>
          )}
          
          {notifications.length > 0 && (
            <Button onClick={clearNotifications} variant="outline">
              Clear Notifications
            </Button>
          )}
        </div>
        
        {simulatedDocuments.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Simulated documents: {simulatedDocuments.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {simulatedDocuments.slice(-10).map(docId => (
                <Badge key={docId} variant="outline" className="text-xs">
                  {docId.slice(0, 12)}...
                </Badge>
              ))}
              {simulatedDocuments.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{simulatedDocuments.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-time Processing Status System</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive real-time monitoring of document processing with notifications and status updates
          </p>
        </div>
        <ProcessingNotificationPanel showBadge={true} />
      </div>

      {/* Status Summary */}
      {renderStatusSummary()}

      {/* System Status */}
      {renderSystemStatus()}

      {/* Simulation Controls */}
      {renderSimulationControls()}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Document Upload</TabsTrigger>
          <TabsTrigger value="monitor">Status Monitor</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload with Real-time Status</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUploadWithStatus
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxConcurrentUploads={3}
                autoStartProcessing={true}
                showProcessingStatus={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Status Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessingStatusMonitor
                documentIds={simulatedDocuments}
                onProcessingComplete={(documentId) => {
                  toast({
                    title: "Processing Complete",
                    description: `Document ${documentId.slice(0, 8)}... completed successfully.`,
                  });
                }}
                onProcessingError={(documentId, error) => {
                  toast({
                    title: "Processing Error",
                    description: `Error processing ${documentId.slice(0, 8)}...: ${error.message}`,
                    variant: "destructive",
                  });
                }}
                showNotifications={true}
                autoRefresh={true}
                refreshInterval={2000}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    The notification system provides real-time updates about document processing status.
                    You can configure notification preferences including browser notifications, sounds, and email alerts.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Notification Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total notifications:</span>
                        <Badge variant="outline">{notifications.length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Unread notifications:</span>
                        <Badge variant={unreadCount > 0 ? "destructive" : "secondary"}>
                          {unreadCount}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Browser notifications:</span>
                        <Badge variant={notificationPreferences.enableBrowserNotifications ? "default" : "secondary"}>
                          {notificationPreferences.enableBrowserNotifications ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Sound notifications:</span>
                        <Badge variant={notificationPreferences.soundEnabled ? "default" : "secondary"}>
                          {notificationPreferences.soundEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recent Notifications</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {notifications.slice(0, 5).map(notification => (
                        <div key={notification.id} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{notification.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-xs">{notification.message}</p>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <p className="text-gray-500 text-sm">No notifications yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    Click the notification bell in the top right to access the full notification panel 
                    with settings and detailed notification management.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Monitor className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Real-time Monitoring</h4>
              </div>
              <p className="text-sm text-gray-600">
                WebSocket-based real-time updates for document processing status with progress indicators.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Smart Notifications</h4>
              </div>
              <p className="text-sm text-gray-600">
                Browser notifications, toast messages, and optional email alerts with customizable preferences.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <h4 className="font-medium">Time Estimation</h4>
              </div>
              <p className="text-sm text-gray-600">
                Intelligent estimated completion time calculations based on processing stage and document size.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <h4 className="font-medium">Error Recovery</h4>
              </div>
              <p className="text-sm text-gray-600">
                Automatic retry mechanisms with exponential backoff and detailed error reporting.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-5 w-5 text-yellow-500" />
                <h4 className="font-medium">Batch Processing</h4>
              </div>
              <p className="text-sm text-gray-600">
                Support for multiple concurrent document uploads with individual status tracking.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Settings className="h-5 w-5 text-gray-500" />
                <h4 className="font-medium">Configurable</h4>
              </div>
              <p className="text-sm text-gray-600">
                Customizable notification preferences, refresh intervals, and processing options.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingStatusDemo;