/**
 * STARTUP RESTORE GATE
 * ====================
 *
 * Holds the app behind a progress screen while the first-launch server restore
 * runs, so every module loads from the restored database. When the device
 * already has data the gate disappears after the quick emptiness check.
 */

import React, { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { maybeRestoreFromServer } from '../utils/startupRestore';

interface StartupRestoreGateProps {
  children: React.ReactNode;
}

const StartupRestoreGate: React.FC<StartupRestoreGateProps> = ({ children }) => {
  const [phase, setPhase] = useState<'checking' | 'done'>('checking');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('Checking this device...');
  const [visible, setVisible] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Only reveal the progress screen if the check is not instant
    const revealTimer = window.setTimeout(() => setVisible(true), 150);
    const skipTimer = window.setTimeout(() => setShowSkip(true), 6000);

    maybeRestoreFromServer((progress) => {
      if (cancelled) return;
      setPercent(progress.percent);
      setMessage(progress.message);
    })
      .then((outcome) => {
        if (cancelled) return;

        if (outcome.restored) {
          setPercent(100);
          setMessage(outcome.message);
          // Let the user read the result before the app takes over
          window.setTimeout(() => setPhase('done'), 700);
        } else {
          setPhase('done');
        }
      })
      .catch((error) => {
        console.error('❌ Startup restore failed:', error);
        if (!cancelled) setPhase('done');
      })
      .finally(() => {
        window.clearTimeout(revealTimer);
        window.clearTimeout(skipTimer);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.clearTimeout(skipTimer);
    };
  }, []);

  if (phase === 'done' || skipped) {
    return <>{children}</>;
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
          <DownloadCloud className="h-6 w-6 text-amber-600" />
        </div>

        <h1 className="text-lg font-semibold text-gray-900">Golden Store</h1>
        <p className="mt-1 text-xs text-gray-500">
          {percent < 6 ? 'Checking for a server backup' : 'Restoring from server'}
        </p>

        <div className="mt-5 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
          <span className="truncate">{message}</span>
          <span className="tabular-nums font-medium text-gray-700">{percent}%</span>
        </div>

        {showSkip && (
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="mt-6 text-xs text-gray-400 underline"
          >
            Continue without restoring
          </button>
        )}
      </div>
    </div>
  );
};

export default StartupRestoreGate;
