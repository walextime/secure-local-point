// Service Worker Registration for Backup System
export class ServiceWorkerRegistration {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  
  // Register the service worker
  static async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[ServiceWorker] Service Worker not supported');
      return null;
    }
    
    // Only register in production mode
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      console.log('[ServiceWorker] Skipping registration in development mode');
      return null;
    }
    
    try {
      console.log('[ServiceWorker] Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      this.swRegistration = registration;
      
      console.log('[ServiceWorker] Service Worker registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[ServiceWorker] New content available');
              // You can show a notification to the user here
            }
          });
        }
      });
      
      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[ServiceWorker] Controller changed');
      });
      
      return registration;
      
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
      return null;
    }
  }
  
  // Unregister the service worker
  static async unregister(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }
    
    try {
      // Use the static method to unregister
      const unregistered = await navigator.serviceWorker.getRegistrations().then(registrations => {
        return Promise.all(registrations.map(registration => registration.unregister()));
      });
      
      console.log('[ServiceWorker] Service Worker unregistered:', unregistered);
      this.swRegistration = null;
      return unregistered.some(result => result);
    } catch (error) {
      console.error('[ServiceWorker] Unregistration failed:', error);
      return false;
    }
  }
  
  // Get the current registration
  static getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }
  
  // Check if service worker is supported
  static isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }
  
  // Check if background sync is supported
  static isBackgroundSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in window;
  }
  
  // Request background sync
  static async requestBackgroundSync(tag: string): Promise<boolean> {
    if (!this.isBackgroundSyncSupported()) {
      console.warn('[ServiceWorker] Background Sync not supported');
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(tag);
        console.log('[ServiceWorker] Background sync requested:', tag);
        return true;
      } else {
        console.warn('[ServiceWorker] Sync API not available on registration');
        return false;
      }
    } catch (error) {
      console.error('[ServiceWorker] Background sync request failed:', error);
      return false;
    }
  }
  
  // Get service worker status
  static getStatus(): {
    supported: boolean;
    registered: boolean;
    backgroundSyncSupported: boolean;
    controller: boolean;
  } {
    return {
      supported: this.isSupported(),
      registered: !!this.swRegistration,
      backgroundSyncSupported: this.isBackgroundSyncSupported(),
      controller: !!navigator.serviceWorker.controller
    };
  }
}

// Auto-register service worker when module is loaded
if (typeof window !== 'undefined') {
  // Register after a short delay to ensure app is ready
  setTimeout(() => {
    ServiceWorkerRegistration.register().catch(error => {
      console.error('[ServiceWorker] Failed to register:', error);
    });
  }, 1000);
} 