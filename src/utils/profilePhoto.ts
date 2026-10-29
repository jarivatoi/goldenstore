/**
 * PROFILE PHOTO PIPELINE
 * ======================
 *
 * Every stored picture is a base64 JPEG inside IndexedDB, which also travels
 * inside the server snapshot. A phone photo cropped at its native size is often
 * 3000 px and several megabytes, while the app can only ever display it at
 * 96 px in the client card or full screen in the zoom view.
 *
 * Both the cropper and the one-off clean-up pass therefore target the same
 * box and quality, so a photo never exceeds what a tablet screen can show.
 */

import { creditDBManager } from './creditIndexedDB';

/** Longest side of a stored picture */
export const MAX_PROFILE_PHOTO_SIZE = 1024;

/** WebP/JPEG quality - visually identical to 0.95 at this size */
export const PROFILE_PHOTO_QUALITY = 0.8;

/** Only pictures bigger than this are worth re-encoding (~220 KB binary) */
const HEAVY_PHOTO_CHARS = 300000;

const COMPACTED_KEY = 'gsProfilePhotoCompaction';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load image')));
    image.src = src;
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          // A browser that cannot encode the requested type silently returns
          // PNG, which is larger than both - treat that as a miss
          resolve(blob && blob.type === type ? blob : null);
        },
        type,
        quality
      );
    } catch {
      resolve(null);
    }
  });

const encodeCanvas = async (canvas: HTMLCanvasElement): Promise<string | null> => {
  const blob =
    (await canvasToBlob(canvas, 'image/webp', PROFILE_PHOTO_QUALITY)) ||
    (await canvasToBlob(canvas, 'image/jpeg', PROFILE_PHOTO_QUALITY));

  return blob ? blobToDataUrl(blob) : null;
};

const drawScaled = (image: HTMLImageElement, canvas: HTMLCanvasElement, source: CropArea): void => {
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scale = Math.min(1, MAX_PROFILE_PHOTO_SIZE / Math.max(source.width, source.height));

  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
};

/**
 * Encode the cropped area of a picture at the profile photo target size
 */
export const cropToProfilePhoto = async (imageSrc: string, crop: CropArea): Promise<string> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');

  drawScaled(image, canvas, crop);

  const encoded = await encodeCanvas(canvas);
  return encoded ?? canvas.toDataURL('image/jpeg', PROFILE_PHOTO_QUALITY);
};

/**
 * Re-encode an existing picture into the target box. Returns null when the
 * source cannot be decoded or the result would not be smaller.
 */
export const shrinkProfilePhoto = async (dataUrl: string): Promise<string | null> => {
  try {
    const image = await loadImage(dataUrl);
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (!width || !height) {
      return null;
    }

    const canvas = document.createElement('canvas');
    drawScaled(image, canvas, { x: 0, y: 0, width, height });

    const encoded = await encodeCanvas(canvas);
    return encoded && encoded.length < dataUrl.length ? encoded : null;
  } catch (error) {
    console.warn('Could not shrink profile photo:', error);
    return null;
  }
};

/**
 * One-off pass over the stored clients. Older builds saved pictures at their
 * raw crop size, so this brings them down to the current target. It runs once
 * per device and only touches pictures above the size threshold.
 */
export const compactStoredClientPhotos = async (): Promise<{ updated: number; savedBytes: number }> => {
  try {
    if (localStorage.getItem(COMPACTED_KEY) === '1') {
      return { updated: 0, savedBytes: 0 };
    }
  } catch {
    return { updated: 0, savedBytes: 0 };
  }

  await creditDBManager.initDB();
  const clients = await creditDBManager.getAllClients();

  let updated = 0;
  let savedBytes = 0;

  for (const client of clients) {
    const record = client as unknown as Record<string, unknown>;

    // Older rows use profilePicture, newer ones profilePictureUrl
    const field =
      typeof record.profilePictureUrl === 'string'
        ? 'profilePictureUrl'
        : typeof record.profilePicture === 'string'
          ? 'profilePicture'
          : null;

    if (!field) {
      continue;
    }

    const original = record[field] as string;

    if (!original.startsWith('data:') || original.length < HEAVY_PHOTO_CHARS) {
      continue;
    }

    const compacted = await shrinkProfilePhoto(original);

    if (!compacted) {
      continue;
    }

    record[field] = compacted;

    try {
      await creditDBManager.saveClient(client);
      updated++;
      savedBytes += original.length - compacted.length;
    } catch (error) {
      console.warn('Could not save the smaller profile photo:', error);
    }
  }

  try {
    localStorage.setItem(COMPACTED_KEY, '1');
  } catch {
    // Diagnostics only
  }

  return { updated, savedBytes };
};
