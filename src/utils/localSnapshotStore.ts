/**
 * LOCAL SNAPSHOT STORE
 * ====================
 *
 * Keeps a single device-local copy of the latest automatic backup in the origin
 * private file system. Every backup replaces that one file instead of saving a
 * dated download, so the device does not collect one JSON per day.
 *
 * The new snapshot is validated before it is allowed to touch the existing
 * copy: it must serialise, and the text that would be written must parse back
 * with all backup sections present. Writes land through createWritable(), which
 * only swaps the new content in when close() succeeds - a failed or aborted
 * write leaves the previous copy exactly as it was.
 *
 * Manual exports (UnifiedDataManager) are unchanged and still download dated
 * files on demand.
 */

const SNAPSHOT_FILENAME = 'GoldenStore_latest.json';
const TEMP_FILENAME = 'GoldenStore_latest.tmp';
const META_KEY = 'localSnapshotMeta';

export interface LocalSnapshotMeta {
  savedAt: string;
  bytes: number;
}

export type LocalSnapshotStatus = 'saved' | 'downloaded' | 'failed';

export interface LocalSnapshotResult {
  status: LocalSnapshotStatus;
  message: string;
  meta?: LocalSnapshotMeta;
}

// Minimal shape of the OPFS handles so the build does not depend on how much of
// the File System Access API the TypeScript DOM lib exposes
interface OpfsWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

interface OpfsFileHandle {
  createWritable(): Promise<OpfsWritable>;
  getFile(): Promise<File>;
}

interface OpfsDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandle>;
  removeEntry(name: string): Promise<void>;
}

/**
 * The exact text that would be written must parse back and carry every section
 * the import path restores. Anything else keeps the previous local copy.
 */
const isSnapshotTextValid = (text: string): boolean => {
  try {
    const parsed = JSON.parse(text);
    return (
      typeof parsed?.version === 'string' &&
      Array.isArray(parsed?.priceList?.items) &&
      Array.isArray(parsed?.creditManagement?.clients) &&
      Array.isArray(parsed?.creditManagement?.transactions) &&
      Array.isArray(parsed?.creditManagement?.payments) &&
      Array.isArray(parsed?.overManagement?.items) &&
      Array.isArray(parsed?.orderManagement?.categories) &&
      Array.isArray(parsed?.orderManagement?.itemTemplates) &&
      Array.isArray(parsed?.orderManagement?.orders) &&
      Array.isArray(parsed?.returns)
    );
  } catch {
    return false;
  }
};

/**
 * Write text into an OPFS file. The visible file only changes when close()
 * succeeds, so a failure here never leaves a half-written snapshot behind.
 */
const writeSnapshotFile = async (
  directory: OpfsDirectoryHandle,
  name: string,
  text: string
): Promise<void> => {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();

  try {
    await writable.write(text);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => undefined);
    throw error;
  }
};

/**
 * Resolve the private directory that holds the snapshot, or null when the
 * browser does not expose the origin private file system.
 */
const getSnapshotDirectory = async (): Promise<OpfsDirectoryHandle | null> => {
  try {
    const storage = navigator.storage as StorageManager & {
      getDirectory?: () => Promise<OpfsDirectoryHandle>;
    };

    if (!storage?.getDirectory) {
      return null;
    }

    return await storage.getDirectory();
  } catch {
    return null;
  }
};

/**
 * Keep a dated download as the fallback for browsers without OPFS. Only used
 * when the single-file store is unavailable, so the device still holds a copy.
 */
const downloadSnapshot = (text: string): void => {
  try {
    const dataBlob = new Blob([text], { type: 'application/json' });
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
    const filename = `GoldenStore_Complete_${dateStr}_${timeStr}.json`;

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Give the browser time to start the download before releasing the blob
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error('❌ Fallback local download failed:', error);
  }
};

const saveMeta = (meta: LocalSnapshotMeta): void => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.warn('Failed to save local snapshot metadata:', error);
  }
};

/**
 * Details of the last local copy that was written, for status display
 */
export const readLocalSnapshotMeta = (): LocalSnapshotMeta | null => {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as LocalSnapshotMeta) : null;
  } catch {
    return null;
  }
};

/**
 * Replace the single local copy with this snapshot.
 * Never throws: a failed local copy must not fail the server upload.
 */
export const saveLocalSnapshot = async (snapshot: any): Promise<LocalSnapshotResult> => {
  let text: string;

  try {
    text = JSON.stringify(snapshot, null, 2);
  } catch (error) {
    return {
      status: 'failed',
      message: `Snapshot could not be serialised: ${error instanceof Error ? error.message : 'unknown error'}`
    };
  }

  // Validate before anything is written, so a bad snapshot keeps the good copy
  if (!isSnapshotTextValid(text)) {
    return {
      status: 'failed',
      message: 'Snapshot failed validation, the previous local copy was kept.'
    };
  }

  const expectedBytes = new Blob([text]).size;
  const directory = await getSnapshotDirectory();

  if (!directory) {
    console.warn('⚠️ Origin private file system unavailable, saving a dated download instead');
    downloadSnapshot(text);
    return { status: 'downloaded', message: 'Origin private file system unavailable on this browser.' };
  }

  try {
    // Write the candidate next to the good copy and read it back before use
    await writeSnapshotFile(directory, TEMP_FILENAME, text);

    const tempFile = await (await directory.getFileHandle(TEMP_FILENAME)).getFile();
    const tempText = await tempFile.text();

    if (tempFile.size !== expectedBytes || !isSnapshotTextValid(tempText)) {
      throw new Error('Stored copy did not read back intact');
    }

    // Replace the single local snapshot; the old content survives until close()
    await writeSnapshotFile(directory, SNAPSHOT_FILENAME, text);
    await directory.removeEntry(TEMP_FILENAME).catch(() => undefined);

    const meta: LocalSnapshotMeta = {
      savedAt: new Date().toISOString(),
      bytes: tempFile.size
    };
    saveMeta(meta);

    console.log(`💾 Local backup file replaced: ${SNAPSHOT_FILENAME} (${Math.round(tempFile.size / 1024)} KB)`);

    return { status: 'saved', message: SNAPSHOT_FILENAME, meta };
  } catch (error) {
    // Supplementary copy only - the previous file is untouched and the upload continues
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Local backup file failed:', error);
    return { status: 'failed', message };
  }
};
