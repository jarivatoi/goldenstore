import React, { useState, useEffect } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import {
  BufferedLog,
  clearBufferedLogs,
  getBufferedLogs,
  subscribeToLogs
} from '../utils/consoleBuffer';
import { getLastStartupCheck } from '../utils/startupRestore';

const OnDeviceConsole: React.FC = () => {
  const [logs, setLogs] = useState<BufferedLog[]>(() => getBufferedLogs());
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Logs written before this component mounted (the startup restore runs
    // first) are already in the buffer, so replay them from there.
    setLogs([...getBufferedLogs()]);

    const unsubscribe = subscribeToLogs((entry) => {
      setLogs(prev => [entry, ...prev].slice(0, 300));
    });

    // Show console on 3 finger tap
    let touchCount = 0;
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 3) {
        touchCount++;
        if (touchCount === 1) {
          setTimeout(() => {
            if (touchCount === 1) {
              setIsVisible(true);
              setLogs([...getBufferedLogs()]);
            }
            touchCount = 0;
          }, 300);
        }
      }
    };

    document.addEventListener('touchstart', handleTouch);

    return () => {
      unsubscribe();
      document.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  const clearLogs = () => {
    clearBufferedLogs();
    setLogs([]);
  };

  if (!isVisible) {
    return null; // Hide the debug button completely
  }

  const lastCheck = getLastStartupCheck();
  const lastCheckText = lastCheck
    ? `${lastCheck.message} - ${lastCheck.installed ? 'installed app' : 'browser tab'}, ${new Date(lastCheck.at).toLocaleString()}`
    : 'no startup check recorded yet';

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

      {/* Startup restore decision - pinned so it survives log rotation */}
      {!isMinimized && (
        <div className="px-3 py-2 bg-amber-950 text-amber-200 font-mono text-[11px] border-b border-amber-900">
          Startup restore: {lastCheckText}
        </div>
      )}

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
