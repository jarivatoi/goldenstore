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
        const registration = await navigator.serviceWorker.register('./sw.js', {
          scope: './'
        });
        
        this.serviceWorker = registration;
        this.isRegistered = true;
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Service Workers are not yet supported on StackBlitz')) {
        } else {
        }
      }
    }
  }

  /**
   * Register background sync for offline operations
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.serviceWorker || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return;
    }

    try {
      await this.serviceWorker.sync.register(tag);
    } catch (error) {
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