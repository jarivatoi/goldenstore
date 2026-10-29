/**
 * STARTUP RESTORE
 * =================
 *
 * On a device that holds no data (fresh install, cleared storage) the app pulls
 * the latest server snapshot back automatically. A device that already has data
 * is never touched, so this can never overwrite real local work.
 *
 * Every check is recorded, so the reason for a skipped restore can be read from
 * the Backup settings instead of a console that is not available on a tablet.
 */

import { SupabaseBackupManager } from './supabaseBackupManager';
import { countSnapshotRecords, hasLocalData, restoreDatabase } from './databaseRestore';
import { AutomaticBackupManager } from './automaticBackupManager';
import { isInstalledApp } from './deviceIdentity';

export interface StartupRestoreProgress {
  percent: number;
  message: string;
}

export interface StartupRestoreOutcome {
  restored: boolean;
  message: string;
}

export interface StartupCheckRecord {
  at: string;
  installed: boolean;
  forceRestore: boolean;
  outcome: 'restored' | 'skipped' | 'failed';
  message: string;
}

const LAST_CHECK_KEY = 'gsLastStartupCheck';

const recordStartupCheck = (record: StartupCheckRecord): void => {
  try {
    localStorage.setItem(LAST_CHECK_KEY, JSON.stringify(record));
  } catch {
    // Diagnostics only - never block the app because of storage
  }
};

export const getLastStartupCheck = (): StartupCheckRecord | null => {
  try {
    const raw = localStorage.getItem(LAST_CHECK_KEY);
    return raw ? (JSON.parse(raw) as StartupCheckRecord) : null;
  } catch {
    return null;
  }
};

const runRestoreCheck = async (
  installed: boolean,
  forceRestore: boolean,
  report: (percent: number, message: string) => void
): Promise<StartupRestoreOutcome> => {
  // Only the installed app restores: a browser tab must not download the
  // snapshot and fill its own storage just because the site was opened.
  // "?restore=1" forces the check so the flow can be tested in a browser.
  if (!forceRestore && !installed) {
    return { restored: false, message: 'Not running as an installed app.' };
  }

  // Never restore over existing data - only an empty device is filled in
  const hasData = await hasLocalData();
  if (hasData === null) {
    return { restored: false, message: 'Local database could not be read.' };
  }
  if (hasData) {
    console.log('📦 Local data found - server restore skipped');
    return { restored: false, message: 'Local data found.' };
  }

  console.log('📭 Local database is empty - looking for a server backup');

  if (!navigator.onLine) {
    return { restored: false, message: 'Offline - server restore skipped.' };
  }

  report(6, 'Looking for a server backup...');
  const hasBackup = await SupabaseBackupManager.hasBackupOnSupabase();
  if (!hasBackup) {
    console.log('ℹ️ No server backup found');
    return { restored: false, message: 'No server backup found.' };
  }

  report(8, 'Downloading server backup...');
  const backup = await SupabaseBackupManager.loadFromSupabaseWithProgress((percent) => {
    report(8 + percent * 0.55, `Downloading server backup ${percent}%`);
  });

  // A snapshot without records would leave the device empty - do not apply it
  if (countSnapshotRecords(backup.data).total === 0) {
    console.log('ℹ️ Server backup is empty');
    return { restored: false, message: 'Server backup is empty.' };
  }

  report(63, 'Writing data to this device...');

  // Hold scheduled uploads until the local database is complete again
  AutomaticBackupManager.setBackupSuspended(true);
  try {
    const counts = await restoreDatabase(backup.data, (percent, label) => {
      report(63 + percent * 0.37, label);
    });

    return { restored: true, message: `Restored ${counts.total} records` };
  } finally {
    AutomaticBackupManager.setBackupSuspended(false);
  }
};

export const maybeRestoreFromServer = async (
  onProgress: (progress: StartupRestoreProgress) => void
): Promise<StartupRestoreOutcome> => {
  const report = (percent: number, message: string) =>
    onProgress({ percent: Math.max(0, Math.min(100, Math.round(percent))), message });

  const installed = isInstalledApp();
  const forceRestore = new URLSearchParams(window.location.search).get('restore') === '1';

  console.log('🔄 Startup restore check', {
    installed,
    forceRestore,
    displayMode: ['standalone', 'fullscreen', 'minimal-ui', 'browser'].filter((mode) =>
      window.matchMedia(`(display-mode: ${mode})`).matches
    ),
    iosStandalone: (window.navigator as any).standalone,
    referrer: document.referrer
  });

  report(2, 'Checking this device...');

  try {
    const outcome = await runRestoreCheck(installed, forceRestore, report);
    recordStartupCheck({
      at: new Date().toISOString(),
      installed,
      forceRestore,
      outcome: outcome.restored ? 'restored' : 'skipped',
      message: outcome.message
    });
    return outcome;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    recordStartupCheck({
      at: new Date().toISOString(),
      installed,
      forceRestore,
      outcome: 'failed',
      message
    });
    throw error;
  }
};
