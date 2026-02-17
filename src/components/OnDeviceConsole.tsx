import React, { useState, useEffect } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';

interface LogEntry {
  id: number;
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: Date;
}

const OnDeviceConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  let logId = 0;

  useEffect(() => {
    // Override console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '));
    };

    // Show console on 3 finger tap
    let touchCount = 0;
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 3) {
        touchCount++;
        if (touchCount === 1) {
          setTimeout(() => {
            if (touchCount === 1) {
              setIsVisible(true);
            }
            touchCount = 0;
          }, 300);
        }
      }
    };

    document.addEventListener('touchstart', handleTouch);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      document.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  const addLog = (type: 'log' | 'error' | 'warn', message: string) => {
    const newLog: LogEntry = {
      id: logId++,
      type,
      message,
      timestamp: new Date()
    };
    
    setLogs(prev => {
      const updated = [newLog, ...prev];
      return updated.slice(0, 100); // Keep only last 100 logs
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded-lg text-xs z-50 opacity-50"
        onClick={() => setIsVisible(true)}
      >
        Debug ({logs.length})
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col ${isMinimized ? 'h-16' : ''}`}>
      {/* Header */}
      <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
        <h3 className="font-bold">Debug Console ({logs.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={clearLogs}
            className="px-2 py-1 bg-red-600 rounded text-xs"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-3 bg-black text-green-400 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map(log => (
              <div 
                key={log.id} 
                className={`mb-2 p-2 rounded ${
                  log.type === 'error' ? 'bg-red-900 text-red-200' :
                  log.type === 'warn' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-gray-900 text-green-200'
                }`}
              >
                <div className="text-gray-400 text-xs mb-1">
                  {log.timestamp.toLocaleTimeString()} [{log.type.toUpperCase()}]
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OnDeviceConsole;