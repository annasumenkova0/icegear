import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { routes, getProductById } from './src/routes/api.js';
import { createStaticHandler } from './src/lib/static.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const staticHandler = createStaticHandler(join(__dirname, 'public'));

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const method = req.method;

  const apiProductMatch = pathname.match(/^\/api\/products\/(\d+)$/);
  if (method === 'GET' && apiProductMatch) {
    return getProductById(req, res, apiProductMatch[1]);
  }

  const routeKey = `${method} ${pathname}`;
  if (routes[routeKey]) {
    return routes[routeKey](req, res);
  }

  if (pathname === '/product') {
    return staticHandler.serveProduct(res);
  }

  if (pathname === '/' || pathname === '/index.html') {
    return staticHandler.serveIndex(res);
  }

  staticHandler.serveFile(res, pathname);
}).listen(PORT, () => {
  console.log(`IceGear running on http://localhost:${PORT}`);
});
