/**
 * STARTUP RESTORE
 * =================
 *
 * On a device that holds no data (fresh install, cleared storage) the app pulls
 * the latest server snapshot back automatically. A device that already has data
 * is never touched, so this can never overwrite real local work.
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

export const maybeRestoreFromServer = async (
  onProgress: (progress: StartupRestoreProgress) => void
): Promise<StartupRestoreOutcome> => {
  const report = (percent: number, message: string) =>
    onProgress({ percent: Math.max(0, Math.min(100, Math.round(percent))), message });

  report(2, 'Checking this device...');

  // Only the installed app restores: a browser tab must not download the
  // snapshot and fill its own storage just because the site was opened.
  // "?restore=1" forces the check so the flow can be tested in a browser.
  const forceRestore = new URLSearchParams(window.location.search).get('restore') === '1';
  if (!forceRestore && !isInstalledApp()) {
    return { restored: false, message: 'Not running as an installed app.' };
  }

  // Never restore over existing data - only an empty device is filled in
  const hasData = await hasLocalData();
  if (hasData === null) {
    return { restored: false, message: 'Local database could not be read.' };
  }
  if (hasData) {
    return { restored: false, message: 'Local data found.' };
  }

  if (!navigator.onLine) {
    return { restored: false, message: 'Offline - server restore skipped.' };
  }

  report(6, 'Looking for a server backup...');
  const hasBackup = await SupabaseBackupManager.hasBackupOnSupabase();
  if (!hasBackup) {
    return { restored: false, message: 'No server backup found.' };
  }

  report(8, 'Downloading server backup...');
  const backup = await SupabaseBackupManager.loadFromSupabaseWithProgress((percent) => {
    report(8 + percent * 0.55, `Downloading server backup ${percent}%`);
  });

  // A snapshot without records would leave the device empty - do not apply it
  if (countSnapshotRecords(backup.data).total === 0) {
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
