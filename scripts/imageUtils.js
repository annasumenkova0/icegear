// Utility to get image dimensions from a URL using native Node.js
// Falls back to 'image-size' if needed for more formats or remote URLs
import { request } from 'node:https';

/**
 * Get image dimensions (width, height) from a remote image URL (JPEG/PNG/GIF only, no auth).
 * Returns { width, height, type } or null if failed.
 */
export function getImageDimensions(url) {
  return new Promise((resolve) => {
    request(url, { method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          let i = 2;
          while (i < buffer.length) {
            if (buffer[i] === 0xFF && buffer[i + 1] >= 0xC0 && buffer[i + 1] <= 0xC3) {
              const height = buffer.readUInt16BE(i + 5);
              const width = buffer.readUInt16BE(i + 7);
              return resolve({ width, height, type: 'jpeg' });
            }
            i++;
          }
        }
        // PNG
        if (buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return resolve({ width, height, type: 'png' });
        }
        // GIF
        if (buffer.slice(0, 6).toString() === 'GIF89a' || buffer.slice(0, 6).toString() === 'GIF87a') {
          const width = buffer.readUInt16LE(6);
          const height = buffer.readUInt16LE(8);
          return resolve({ width, height, type: 'gif' });
        }
        resolve(null);
      });
    }).on('error', () => resolve(null)).end();
  });
}

/**
 * Score an image for suitability as a category image.
 * Prefers aspect ratio close to 4:3 and higher resolution.
 */
export function scoreImage(width, height) {
  if (!width || !height) return 0;
  const aspect = width / height;
  const aspectScore = 1 - Math.abs(aspect - 4 / 3);
  const sizeScore = Math.min(width, height) / 400; // prefer at least 400px
  return aspectScore * 2 + sizeScore;
}
