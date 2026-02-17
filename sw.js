// Enhanced service worker for PWA functionality
const CACHE_NAME = 'golden-price-list-v4';
const BASE_PATH = '/goldenpricelist';

// Sync tags for background sync
const SYNC_TAGS = {
  PRICE_ITEMS: 'price-items-sync',
  CREDIT_DATA: 'credit-data-sync',
  OVER_ITEMS: 'over-items-sync',
  ORDER_DATA: 'order-data-sync'
};

// Files to cache for offline functionality
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle requests for our domain
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(`${BASE_PATH}/index.html`);
        }
      })
  );
});

// Handle background sync (if supported)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  // Add background sync logic here if needed
});

// Handle push notifications (if needed in future)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  // Add push notification logic here if needed
});

// Background Sync Event Handler
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_TAGS.PRICE_ITEMS) {
    event.waitUntil(syncPriceItems());
  } else if (event.tag === SYNC_TAGS.CREDIT_DATA) {
    event.waitUntil(syncCreditData());
  } else if (event.tag === SYNC_TAGS.OVER_ITEMS) {
    event.waitUntil(syncOverItems());
  } else if (event.tag === SYNC_TAGS.ORDER_DATA) {
    event.waitUntil(syncOrderData());
  }
});

// Sync Functions
async function syncPriceItems() {
  try {
    console.log('🔄 Syncing price items...');
    
    // Get queued sync data from IndexedDB
    const syncQueue = await getSyncQueue('price_items');
    
    for (const item of syncQueue) {
      try {
        await processSyncItem(item);
        await removeSyncItem(item.id);
        console.log('✅ Synced price item:', item.id);
      } catch (error) {
        console.error('❌ Failed to sync price item:', item.id, error);
        // Keep item in queue for retry
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed for price items:', error);
  }
}

async function syncCreditData() {
  try {
    console.log('🔄 Syncing credit data...');
    
    const syncQueue = await getSyncQueue('credit_data');
    
    for (const item of syncQueue) {
      try {
        await processSyncItem(item);
        await removeSyncItem(item.id);
        console.log('✅ Synced credit data:', item.id);
      } catch (error) {
        console.error('❌ Failed to sync credit data:', item.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed for credit data:', error);
  }
}

async function syncOverItems() {
  try {
    console.log('🔄 Syncing over items...');
    
    const syncQueue = await getSyncQueue('over_items');
    
    for (const item of syncQueue) {
      try {
        await processSyncItem(item);
        await removeSyncItem(item.id);
        console.log('✅ Synced over item:', item.id);
      } catch (error) {
        console.error('❌ Failed to sync over item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed for over items:', error);
  }
}

async function syncOrderData() {
  try {
    console.log('🔄 Syncing order data...');
    
    const syncQueue = await getSyncQueue('order_data');
    
    for (const item of syncQueue) {
      try {
        await processSyncItem(item);
        await removeSyncItem(item.id);
        console.log('✅ Synced order data:', item.id);
      } catch (error) {
        console.error('❌ Failed to sync order data:', item.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed for order data:', error);
  }
}

// Helper Functions for IndexedDB operations
async function getSyncQueue(tableName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SyncQueueDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('tableName');
      const getRequest = index.getAll(tableName);
      
      getRequest.onsuccess = () => resolve(getRequest.result || []);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('tableName', 'tableName', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function processSyncItem(item) {
  // Process the sync item based on its type and operation
  const { tableName, operation, data } = item;
  
  // This would typically make API calls to Supabase
  // For now, we'll simulate the sync operation
  console.log(`Processing ${operation} for ${tableName}:`, data);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In a real implementation, you would:
  // 1. Make the appropriate API call to Supabase
  // 2. Handle the response
  // 3. Update local storage if needed
  // 4. Broadcast the change to open tabs
}

async function removeSyncItem(itemId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SyncQueueDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const deleteRequest = store.delete(itemId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  if (type === 'QUEUE_SYNC') {
    // Queue a sync operation
    queueSyncOperation(data);
  } else if (type === 'SKIP_WAITING') {
    // Handle update skip waiting
    self.skipWaiting();
  }
});

async function queueSyncOperation(syncData) {
  try {
    const request = indexedDB.open('SyncQueueDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tableName: syncData.tableName,
        operation: syncData.operation,
        data: syncData.data,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      store.add(queueItem);
      console.log('📋 Queued sync operation:', queueItem);
    };
  } catch (error) {
    console.error('❌ Failed to queue sync operation:', error);
  }
}