/**
 * DEVICE IDENTITY & BACKUP PERMISSION
 * ==================================
 *
 * Gives every installation a stable random ID and remembers whether this
 * device is allowed to write server backups. Both values live in localStorage,
 * so they survive app restarts (but not clearing of site data).
 *
 * The switch is per device on purpose: a lock stored on one device is invisible
 * to the others, so each device has to be told whether it may upload.
 */

export interface DeviceIdentity {
  id: string;
  label: string;
}

const DEVICE_ID_KEY = 'gsDeviceId';
const SERVER_BACKUP_ENABLED_KEY = 'gsServerBackupEnabled';

const createId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the manual id below
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Human readable guess of the device type, used to tell tablet/phone/browser apart
 */
const detectLabel = (): string => {
  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMobileAndroid = isAndroid && /mobile/i.test(ua);
  const isTablet =
    /ipad|tablet/i.test(ua) ||
    (isAndroid && !isMobileAndroid) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  const os = isAndroid
    ? 'Android'
    : isIOS
      ? 'iOS'
      : /mac/i.test(ua)
        ? 'macOS'
        : /win/i.test(ua)
          ? 'Windows'
          : 'Unknown OS';

  if (isTablet) return `${os} tablet`;
  if (/iphone|ipod/i.test(ua) || isMobileAndroid) return `${os} phone`;
  return `${os} browser`;
};

let cachedIdentity: DeviceIdentity | null = null;

/**
 * Get (and on first call create) the identity of this installation
 */
export const getDeviceIdentity = (): DeviceIdentity => {
  if (cachedIdentity) {
    return cachedIdentity;
  }

  let id: string | null = null;
  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = createId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
  } catch {
    id = createId();
  }

  cachedIdentity = { id, label: detectLabel() };
  return cachedIdentity;
};

/**
 * Whether this device is allowed to upload server backups.
 * Defaults to disabled: every new installation has to opt in explicitly, so a
 * second device can never upload before it is allowed to.
 */
export const isServerBackupEnabled = (): boolean => {
  try {
    return localStorage.getItem(SERVER_BACKUP_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Turn server backups on or off for this device only
 */
export const setServerBackupEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SERVER_BACKUP_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore storage failures - the setting simply stays unchanged
  }
};

/**
 * Whether the app is running as the installed PWA rather than a browser tab.
 * A plain site visit must never pull the server snapshot on its own.
 */
export const isInstalledApp = (): boolean => {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      // Android installs launched from the home screen open with this referrer
      document.referrer.startsWith('android-app://')
    );
  } catch {
    return false;
  }
};

/**
 * Message used whenever a blocked backup attempt is reported
 */
export const getServerBackupDisabledMessage = (): string => {
  const { label } = getDeviceIdentity();
  return `Server backups are disabled on this device (${label}). Open Backup settings here to enable them, and keep them disabled on every device except the one that should upload the daily backup.`;
};
