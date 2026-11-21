// A static server for trying the page locally, with no dependencies:
//   node tests/serve.mjs [port]   →   http://localhost:8000/
// (The page uses ES modules, which browsers will not load from file://.)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

export function serve(port = 8000, { basePath = '/', overrides = new Map(), host = '127.0.0.1' } = {}) {
  const server = createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end('bad request');
      return;
    }
    if (pathname.includes('\0') || !pathname.startsWith(basePath)) {
      res.writeHead(404).end('not found');
      return;
    }
    const rel = pathname.slice(basePath.length);
    const segments = rel.split('/').filter(Boolean);
    if (segments.some(s => s.startsWith('.'))) {
      res.writeHead(404).end('not found');
      return;
    }
    const target = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
    const file = resolve(root, target);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(404).end('not found');
      return;
    }
    const overrideKey = file.slice(root.length + 1).replaceAll('\\', '/');
    try {
      const override = overrides.get(overrideKey);
      const body = override?.body ?? await readFile(file);
      res.writeHead(override?.status ?? 200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise(resolveServer => server.listen(port, host, () => resolveServer(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2]) || 8000;
  await serve(port);
  console.log(`http://localhost:${port}/`);
}
