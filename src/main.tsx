import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { updateManager } from './utils/updateManager'
import { automaticBackupManager } from './utils/automaticBackupManager'
import './index.css'

// Error boundary for debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Something went wrong</h1>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Error: {this.state.error?.message || 'Unknown error'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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

// Add console logging for debugging
console.log('🚀 Golden Store starting up...');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🌐 Location:', window.location.href);

// Check for critical dependencies
try {
  console.log('✅ React version:', React.version);
  console.log('✅ ReactDOM available:', !!ReactDOM);
} catch (error) {
  console.error('❌ Critical dependency missing:', error);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)