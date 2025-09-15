/**
 * Mobile Layout Component
 * Provides mobile-optimized layout with responsive navigation and touch-friendly interfaces
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  MessageSquare, 
  Upload, 
  FolderOpen, 
  Search,
  Settings,
  ChevronLeft,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  navigationItems?: NavigationItem[];
  currentView?: string;
  onViewChange?: (view: string) => void;
  className?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewportHeight;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBack,
  navigationItems = [],
  currentView,
  onViewChange,
  className = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOnline = useNetworkStatus();
  const viewportHeight = useViewportHeight();

  // Handle navigation item click
  const handleNavigationClick = (itemId: string) => {
    onViewChange?.(itemId);
    setIsMenuOpen(false);
  };

  // Handle back button
  const handleBack = () => {
    onBack?.();
  };

  return (
    <div 
      className={cn("flex flex-col bg-background", className)}
      style={{ height: `${viewportHeight}px` }}
    >
      {/* Mobile Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Network Status */}
          <Badge 
            variant={isOnline ? "default" : "destructive"} 
            className="text-xs px-2 py-1"
          >
            {isOnline ? (
              <Wifi className="h-3 w-3 mr-1" />
            ) : (
              <WifiOff className="h-3 w-3 mr-1" />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>

          {/* Navigation Menu */}
          {navigationItems.length > 0 && (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Menu Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-2">
                      {navigationItems.map((item) => (
                        <Button
                          key={item.id}
                          variant={currentView === item.id ? "default" : "ghost"}
                          className="w-full justify-start h-12 text-left"
                          onClick={() => handleNavigationClick(item.id)}
                          disabled={item.disabled}
                        >
                          <div className="flex items-center space-x-3 w-full">
                            <div className="flex-shrink-0">
                              {item.icon}
                            </div>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

// ============================================================================
// MOBILE NAVIGATION HOOK
// ============================================================================

export const useMobileNavigation = () => {
  const [currentView, setCurrentView] = useState<string>('chat');
  const [navigationStack, setNavigationStack] = useState<string[]>(['chat']);

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setNavigationStack(prev => [...prev, view]);
  };

  const goBack = () => {
    if (navigationStack.length > 1) {
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);
      setCurrentView(newStack[newStack.length - 1]);
      return true;
    }
    return false;
  };

  const canGoBack = navigationStack.length > 1;

  return {
    currentView,
    navigateTo,
    goBack,
    canGoBack,
    navigationStack
  };
};

// ============================================================================
// MOBILE SAFE AREA HOOK
// ============================================================================

export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
};

export default MobileLayout;