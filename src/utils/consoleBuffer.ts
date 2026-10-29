/**
 * CONSOLE BUFFER
 * ==============
 *
 * The on-device console only mounts after the startup restore gate has
 * finished, so everything logged before that - including the restore decision
 * itself - was lost. This module patches the console as soon as the bundle
 * loads and keeps the last messages in memory, so the console can replay them
 * when it is opened later.
 */

export interface BufferedLog {
  id: number;
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: Date;
}

const MAX_ENTRIES = 300;

const buffer: BufferedLog[] = [];
const listeners = new Set<(entry: BufferedLog) => void>();

let nextId = 0;
let installed = false;

const formatArgs = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');

export const installConsoleBuffer = (): void => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  (['log', 'error', 'warn'] as const).forEach((type) => {
    const original = console[type].bind(console);

    (console as any)[type] = (...args: unknown[]) => {
      original(...args);

      const entry: BufferedLog = {
        id: nextId++,
        type,
        message: formatArgs(args),
        timestamp: new Date()
      };

      buffer.unshift(entry);
      if (buffer.length > MAX_ENTRIES) {
        buffer.length = MAX_ENTRIES;
      }

      listeners.forEach((listener) => listener(entry));
    };
  });
};

/** Messages captured so far, newest first */
export const getBufferedLogs = (): BufferedLog[] => buffer;

/** Replays an entry to the open console */
export const subscribeToLogs = (listener: (entry: BufferedLog) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearBufferedLogs = (): void => {
  buffer.length = 0;
};

// Capture from the very first line of the app, not from the first mount
installConsoleBuffer();
