import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { precache } from '../scripts/update-precache.mjs';

test('offline precache matches every shipped asset and its current content', async () => {
  const { files, version } = await precache();
  const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(source.includes(`const VERSION = '${version}';`), 'Run npm run precache after changing shipped files');
  const listed = JSON.parse(source.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.deepEqual(listed, files);
  for (const required of ['index.html', 'js/shell.js', 'js/app.js', 'fonts/Jomolhari-Regular.ttf', 'vendor/three@0.184.0/build/three.core.js', 'mantras/vajrasattva.js']) assert.ok(files.includes(required));
});
