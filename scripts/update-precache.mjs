// No build is required. Run after changing shipped files, then commit sw.js.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
async function walk(dir) {
  const entries = await readdir(new URL(dir, root), { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}${e.name}/`) : `${dir}${e.name}`))).flat();
}
export async function precache() {
  const files = ['index.html', 'app.css', 'manifest.webmanifest', ...(await Promise.all(['js/', 'mantras/', 'fonts/', 'icons/', 'vendor/'].map(walk))).flat()]
    .filter(f => !f.endsWith('.md') && !f.endsWith('/LICENSE')).sort();
  const hash = createHash('sha256');
  // A worker-logic-only change also gets an isolated release cache.
  const worker = await readFile(new URL('sw.js', root), 'utf8');
  hash.update(worker.replace(/\/\/ BEGIN GENERATED[\s\S]*?\/\/ END GENERATED/, ''));
  for (const file of files) { hash.update(file); hash.update(await readFile(new URL(file, root))); }
  return { files, version: hash.digest('hex').slice(0, 16) };
}
if (process.argv[1] && new URL(process.argv[1], 'file://').href === import.meta.url) {
  const { files, version } = await precache();
  const path = new URL('sw.js', root);
  const source = await readFile(path, 'utf8');
  await writeFile(path, source.replace(/\/\/ BEGIN GENERATED[\s\S]*?\/\/ END GENERATED/, `// BEGIN GENERATED\nconst VERSION = '${version}';\nconst PRECACHE = ${JSON.stringify(files, null, 2)};\n// END GENERATED`));
  console.log(`Precache ${version}: ${files.length} files`);
}
