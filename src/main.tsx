import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { updateManager } from './utils/updateManager'
import { automaticBackupManager } from './utils/automaticBackupManager'
import './index.css'

// Initialize update manager for PWA and background sync
updateManager;

// Initialize automatic backup manager
automaticBackupManager;

// Listen for service worker messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'PROCESS_AUTO_BACKUP') {
      console.log('📨 Received auto backup request from service worker');
      // Trigger backup processing
      automaticBackupManager.forceBackupNow().catch(error => {
        console.error('❌ Auto backup from service worker failed:', error);
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)