/**
 * UPDATE MANAGER - PWA AND BACKGROUND SYNC UTILITIES
 * ==================================================
 * 
 * Handles service worker registration and background sync functionality
 */

class UpdateManager {
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private isRegistered = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize service worker registration
   */
  private async init() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/goldenpricelist/sw.js', {
          scope: '/goldenpricelist/'
        });
        
        this.serviceWorker = registration;
        this.isRegistered = true;
        console.log('✅ Service Worker registered successfully');
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Service Workers are not yet supported on StackBlitz')) {
          console.warn('⚠️ Service Workers not supported in this environment (StackBlitz)');
        } else {
          console.error('❌ Service Worker registration failed:', error);
        }
      }
    }
  }

  /**
   * Register background sync for offline operations
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.serviceWorker || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('⚠️ Background sync not supported');
      return;
    }

    try {
      await this.serviceWorker.sync.register(tag);
      console.log(`📋 Background sync registered: ${tag}`);
    } catch (error) {
      console.error(`❌ Background sync registration failed for ${tag}:`, error);
    }
  }

  /**
   * Check if service worker is registered
   */
  get isServiceWorkerRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Get service worker registration
   */
  get registration(): ServiceWorkerRegistration | null {
    return this.serviceWorker;
  }
}

// Export singleton instance
export const updateManager = new UpdateManager();