/**
 * usePWA Hook
 * React hook for Progressive Web App functionality
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  canInstall: boolean;
}

interface PWAActions {
  install: () => Promise<boolean>;
  showInstallPrompt: () => void;
  checkForUpdates: () => Promise<boolean>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export const usePWA = (): PWAState & PWAActions => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // ============================================================================
  // INSTALLATION DETECTION
  // ============================================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-ignore - for iOS Safari
        window.navigator.standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => checkStandalone();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  // ============================================================================
  // INSTALL PROMPT HANDLING
  // ============================================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // ============================================================================
  // NETWORK STATUS
  // ============================================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    }
  }, [deferredPrompt]);

  const showInstallPrompt = useCallback(() => {
    if (deferredPrompt) {
      install();
    }
  }, [deferredPrompt, install]);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          return true;
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
    return false;
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const canInstall = isInstallable && !isInstalled && !isStandalone;

  return {
    // State
    isInstallable,
    isInstalled,
    isStandalone,
    isOnline,
    canInstall,
    
    // Actions
    install,
    showInstallPrompt,
    checkForUpdates,
  };
};

// ============================================================================
// SERVICE WORKER HOOK
// ============================================================================

export const useServiceWorker = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (!supported) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);
        setIsRegistered(true);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (registration && updateAvailable) {
      const newWorker = registration.waiting;
      if (newWorker) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }, [registration, updateAvailable]);

  return {
    isSupported,
    isRegistered,
    updateAvailable,
    updateServiceWorker,
  };
};

// ============================================================================
// INSTALL BANNER HOOK
// ============================================================================

export const useInstallBanner = () => {
  const { canInstall, install, isInstalled } = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    setBannerDismissed(dismissed === 'true');
  }, []);

  useEffect(() => {
    // Show banner if app can be installed and banner wasn't dismissed
    setShowBanner(canInstall && !bannerDismissed && !isInstalled);
  }, [canInstall, bannerDismissed, isInstalled]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    setBannerDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  }, []);

  const installApp = useCallback(async () => {
    const success = await install();
    if (success) {
      setShowBanner(false);
    }
    return success;
  }, [install]);

  return {
    showBanner,
    dismissBanner,
    installApp,
  };
};

export default usePWA;