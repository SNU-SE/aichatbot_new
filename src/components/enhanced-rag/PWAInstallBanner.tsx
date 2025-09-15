/**
 * PWA Install Banner Component
 * Prompts users to install the app as a PWA
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Download, Smartphone } from 'lucide-react';
import { useInstallBanner } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PWAInstallBannerProps {
  className?: string;
  variant?: 'banner' | 'card' | 'floating';
  showIcon?: boolean;
  title?: string;
  description?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  className = '',
  variant = 'banner',
  showIcon = true,
  title = 'Install App',
  description = 'Install this app on your device for a better experience'
}) => {
  const { showBanner, dismissBanner, installApp } = useInstallBanner();

  if (!showBanner) {
    return null;
  }

  const handleInstall = async () => {
    await installApp();
  };

  const content = (
    <>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {showIcon && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              PWA
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button
          onClick={handleInstall}
          size="sm"
          className="text-xs"
        >
          <Download className="h-3 w-3 mr-1" />
          Install
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissBanner}
          className="p-2"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </>
  );

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm",
        className
      )}>
        <Card className="shadow-lg border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              {content}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn("mb-4", className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {content}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default banner variant
  return (
    <div className={cn(
      "bg-primary/10 border-b border-primary/20 p-3",
      className
    )}>
      <div className="flex items-center space-x-3 max-w-7xl mx-auto">
        {content}
      </div>
    </div>
  );
};

// ============================================================================
// INSTALL PROMPT COMPONENT
// ============================================================================

export interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<boolean>;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isOpen,
  onClose,
  onInstall
}) => {
  const [isInstalling, setIsInstalling] = React.useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await onInstall();
      if (success) {
        onClose();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="h-8 w-8 text-primary-foreground" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Install Enhanced RAG</h2>
              <p className="text-muted-foreground text-sm">
                Install this app on your device for faster access and a native app experience.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Faster loading</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Native app experience</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isInstalling}
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleInstall}
                className="flex-1"
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <>Installing...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Install
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallBanner;