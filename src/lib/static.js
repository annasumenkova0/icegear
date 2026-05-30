import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

export async function serveStatic(res, filePath) {
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
    const cacheControl = ext === '.html'
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=3600';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': cacheControl,
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

export function createStaticHandler(publicDir) {
  return {
    serveFile: (res, relativePath) => serveStatic(res, join(publicDir, relativePath)),
    serveIndex: (res) => serveStatic(res, join(publicDir, 'index.html')),
    serveProduct: (res) => serveStatic(res, join(publicDir, 'product.html')),
  };
}
