// A static server for trying the page locally, with no dependencies:
//   node tests/serve.mjs [port]   →   http://localhost:8000/
// (The page uses ES modules, which browsers will not load from file://.)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

export function serve(port = 8000, { basePath = '/', overrides = new Map() } = {}) {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!pathname.startsWith(basePath)) { res.writeHead(404).end('not found'); return; }
    const path = normalize('/' + pathname.slice(basePath.length)).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
    try {
      const override = overrides.get(path.slice(1));
      const body = override?.body ?? await readFile(file);
      res.writeHead(override?.status ?? 200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2]) || 8000;
  await serve(port);
  console.log(`http://localhost:${port}/`);
}
