// node --test tests/   (Node 20 or later; nothing to install)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MANTRAS } from '../mantras/index.js';
import { tibetanSyllables, phoneticWords, ringTokens } from '../js/tibetan.js';

const root = new URL('../', import.meta.url);

test('syllables split on tsheg and shad, keeping marks when asked', () => {
  assert.deepEqual(tibetanSyllables('ཨོཾ་བཛྲ་སཏྭ་ཨཱཿ'), ['ཨོཾ', 'བཛྲ', 'སཏྭ', 'ཨཱཿ']);
  assert.deepEqual(tibetanSyllables('ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ༔', { keepMarks: true }),
    ['ཨོཾ་', 'ཨཱཿ', 'ཧཱུྃ་', 'བཛྲ་', 'གུ་', 'རུ་', 'པདྨ་', 'སིདྡྷི་', 'ཧཱུྃ༔']);
  assert.deepEqual(phoneticWords(' OM  AH HUNG '), ['OM', 'AH', 'HUNG']);
});

test('every mantra is complete', () => {
  const ids = new Set();
  for (const m of MANTRAS) {
    assert.ok(/^[a-z0-9-]+$/.test(m.id), `${m.id}: id is used in the address`);
    assert.ok(!ids.has(m.id), `${m.id}: duplicate id`); ids.add(m.id);
    assert.ok(m.name && m.seed?.text, `${m.id}: name and seed`);
    for (const k of ['ink', 'hi', 'glow', 'halo', 'accent', 'muted', 'text'])
      assert.match(m.palette[k], /^#[0-9a-f]{6}$/i, `${m.id}: palette.${k}`);
    assert.equal(m.palette.bg.length, 3);
    assert.ok(m.motion.period > 0 && ['cw', 'ccw'].includes(m.motion.spin));
    assert.ok(m.rings.length >= 1 && (m.rings[0].turns ?? 1) !== 0, `${m.id}: the first ring turns`);
    for (const r of m.rings) {
      assert.ok(ringTokens(r, 'tibetan').length > 0, `${m.id}/${r.id}: syllables`);
      assert.ok(['cw', 'ccw'].includes(r.order), `${m.id}/${r.id}: order`);
      assert.ok(['billboard', 'outward', 'inward'].includes(r.facing), `${m.id}/${r.id}: facing`);
      if (r.phonetics) assert.ok(ringTokens(r, 'phonetics').length > 0);
    }
  }
});

test('the Vajra Guru phonetics follow the Tibetan word for word', () => {
  const ring = MANTRAS.find(m => m.id === 'vajra-guru').rings[0];
  assert.equal(ringTokens(ring, 'phonetics').length, ringTokens(ring, 'tibetan').length);
});

test('vendored files match the import map integrity hashes', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  for (const [path, sri] of Object.entries(map.integrity)) {
    const body = await readFile(new URL(path, root));
    assert.equal(`sha384-${createHash('sha384').update(body).digest('base64')}`, sri, path);
  }
  for (const path of Object.values(map.imports)) await access(new URL(path, root));
});
