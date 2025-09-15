/**
 * Processing Notification Panel Component
 * Displays real-time processing notifications and status updates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Settings,
  Trash2,
  MarkAsRead,
  Volume2,
  VolumeX,
  Mail,
  Monitor,
  Smartphone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { ProcessingNotification, NotificationPreferences } from '@/services/processingNotificationService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcessingNotificationPanelProps {
  className?: string;
  showBadge?: boolean;
  maxNotifications?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProcessingNotificationPanel: React.FC<ProcessingNotificationPanelProps> = ({
  className = '',
  showBadge = true,
  maxNotifications = 50
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    notificationPreferences,
    updateNotificationPreferences
  } = useProcessingStatus({
    enableNotifications: true,
    enableToasts: notificationPreferences.enableToastNotifications
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getNotificationIcon = (type: ProcessingNotification['type']) => {
    switch (type) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: ProcessingNotification['type']) => {
    switch (type) {
      case 'complete':
        return 'border-l-green-500 bg-green-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'progress':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleNotificationClick = (notification: ProcessingNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    await updateNotificationPreferences({ [key]: value });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderNotificationItem = (notification: ProcessingNotification) => (
    <div
      key={notification.id}
      className={`p-3 border-l-4 cursor-pointer hover:bg-gray-100 transition-colors ${
        getNotificationColor(notification.type)
      } ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-50'}`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${
              !notification.read ? 'text-gray-900' : 'text-gray-600'
            }`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2">
              {!notification.read && (
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
              )}
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>
          <p className={`text-sm mt-1 ${
            !notification.read ? 'text-gray-700' : 'text-gray-500'
          }`}>
            {notification.message}
          </p>
          {notification.metadata && (
            <div className="mt-2 flex flex-wrap gap-1">
              {notification.metadata.errorCode && (
                <Badge variant="outline" className="text-xs">
                  {notification.metadata.errorCode}
                </Badge>
              )}
              {notification.metadata.retryable && (
                <Badge variant="secondary" className="text-xs">
                  Retryable
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
        
        <div className="space-y-4">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-4 w-4 text-gray-500" />
              <div>
                <Label htmlFor="browser-notifications">Browser Notifications</Label>
                <p className="text-sm text-gray-500">Show desktop notifications</p>
              </div>
            </div>
            <Switch
              id="browser-notifications"
              checked={notificationPreferences.enableBrowserNotifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('enableBrowserNotifications', checked)
              }
            />
          </div>

          {/* Toast Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4 text-gray-500" />
              <div>
                <Label htmlFor="toast-notifications">In-App Notifications</Label>
                <p className="text-sm text-gray-500">Show toast messages in the app</p>
              </div>
            </div>
            <Switch
              id="toast-notifications"
              checked={notificationPreferences.enableToastNotifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('enableToastNotifications', checked)
              }
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">Send notifications via email</p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={notificationPreferences.enableEmailNotifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('enableEmailNotifications', checked)
              }
            />
          </div>

          <Separator />

          {/* Notification Types */}
          <div>
            <h4 className="font-medium mb-3">Notification Types</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Label htmlFor="notify-complete">Processing Complete</Label>
                </div>
                <Switch
                  id="notify-complete"
                  checked={notificationPreferences.notifyOnComplete}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('notifyOnComplete', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Label htmlFor="notify-error">Processing Errors</Label>
                </div>
                <Switch
                  id="notify-error"
                  checked={notificationPreferences.notifyOnError}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('notifyOnError', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="notify-progress">Progress Updates</Label>
                </div>
                <Switch
                  id="notify-progress"
                  checked={notificationPreferences.notifyOnProgress}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('notifyOnProgress', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {notificationPreferences.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-gray-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-500" />
              )}
              <div>
                <Label htmlFor="sound-enabled">Notification Sounds</Label>
                <p className="text-sm text-gray-500">Play sound for notifications</p>
              </div>
            </div>
            <Switch
              id="sound-enabled"
              checked={notificationPreferences.soundEnabled}
              onCheckedChange={(checked) => 
                handlePreferenceChange('soundEnabled', checked)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  const displayNotifications = notifications.slice(0, maxNotifications);
  const hasNotifications = notifications.length > 0;

  return (
    <div className={className}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            {hasNotifications && notificationPreferences.enableToastNotifications ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            {showBadge && unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Processing Notifications</SheetTitle>
                <SheetDescription>
                  Real-time updates on document processing status
                </SheetDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
                    <MarkAsRead className="h-4 w-4 mr-2" />
                    Mark All as Read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearNotifications} disabled={!hasNotifications}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSettings(!showSettings)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          <div className="mt-6">
            {showSettings ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="mb-4"
                >
                  ← Back to Notifications
                </Button>
                {renderNotificationSettings()}
              </div>
            ) : (
              <div>
                {/* Summary */}
                {hasNotifications && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-blue-600 font-medium">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Notifications List */}
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {hasNotifications ? (
                    <div className="space-y-2">
                      {displayNotifications.map(renderNotificationItem)}
                      {notifications.length > maxNotifications && (
                        <div className="text-center py-4 text-sm text-gray-500">
                          Showing {maxNotifications} of {notifications.length} notifications
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No notifications
                      </h3>
                      <p className="text-gray-500">
                        You'll see processing updates here when documents are being processed.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProcessingNotificationPanel;