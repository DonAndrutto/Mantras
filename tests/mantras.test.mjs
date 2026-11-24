// node --test tests/   (Node 20 or later; nothing to install)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MANTRAS, withVariant } from '../mantras/index.js';
import { tibetanSyllables, phoneticWords, ringTokens, ringSyllables, BETWEEN } from '../js/tibetan.js';
import { defaultsFor } from '../js/settings.js';

const root = new URL('../', import.meta.url);

test('syllables keep their marks: tsheg, shad, visarga, terma', () => {
  assert.deepEqual(tibetanSyllables('ཨོཾ་བཛྲ་སཏྭ་ཨཱཿ'), ['ཨོཾ་', 'བཛྲ་', 'སཏྭ་', 'ཨཱཿ']);
  assert.deepEqual(tibetanSyllables('ཀུལླེ་ཧྲཱིཿསྭཱ་ཧཱ།'), ['ཀུལླེ་', 'ཧྲཱིཿ', 'སྭཱ་', 'ཧཱ།']);
  assert.deepEqual(tibetanSyllables('ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ༔'),
    ['ཨོཾ་', 'ཨཱཿ', 'ཧཱུྃ་', 'བཛྲ་', 'གུ་', 'རུ་', 'པདྨ་', 'སིདྡྷི་', 'ཧཱུྃ༔']);
  assert.deepEqual(tibetanSyllables('ཧ་ཧོཿ བྷ་ག་ཝན།'), ['ཧ་', 'ཧོཿ', 'བྷ་', 'ག་', 'ཝན།']);
  assert.deepEqual(tibetanSyllables('ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ'), ['ཨོཾ་', 'མ་', 'ཎི་', 'པདྨེ་', 'ཧཱུྃ']);
  assert.deepEqual(tibetanSyllables('ༀ་ཨ་མི་དྷེ་ཝ་ཧྲཱི༔'), ['ༀ་', 'ཨ་', 'མི་', 'དྷེ་', 'ཝ་', 'ཧྲཱི༔']);
  assert.deepEqual(phoneticWords(' OM  AH HUNG '), ['OM', 'AH', 'HUNG']);
});

test('a garland can hold its mantra twice or three times over without extra gap between recitations', () => {
  const ring = { text: 'ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་སྭཱཧཱ།', phonetics: 'om tā re tuttā re tu re svāhā' };
  const once = ringSyllables(ring, 1), thrice = ringSyllables(ring, 3);
  assert.equal(BETWEEN, 0);
  assert.equal(thrice.tibetan.length, 3 * once.tibetan.length);
  assert.deepEqual(thrice.tibetan.slice(8, 16), once.tibetan);
  assert.deepEqual(thrice.phonetics.slice(16), once.phonetics);
  assert.deepEqual(once.after, once.after.map(() => 0));
  assert.deepEqual(thrice.after, thrice.after.map(() => 0));
});

test('default repeat follows mantra length: short 3x, medium 2x, long 1x', () => {
  const byKey = Object.fromEntries(
    MANTRAS.flatMap(b => (b.variants?.length ? b.variants.map(v => withVariant(b, v.id)) : [b]))
      .map(m => [m.variant ? `${m.id}/${m.variant}` : m.id, defaultsFor(m).repeat]),
  );
  for (const id of ['chenrezig', 'amitabha', 'green-tara', 'dzambhala']) assert.equal(byKey[id], 3, id);
  for (const id of ['vajra-guru', 'kurukulle/approach', 'vajrakilaya']) assert.equal(byKey[id], 2, id);
  for (const id of ['white-tara', 'kurukulle/accomplishment', 'vajrasattva']) assert.equal(byKey[id], 1, id);
});

// every mantra, and every variant of one, as the page sees it
const resolved = MANTRAS.flatMap(b => (b.variants?.length ? b.variants.map(v => withVariant(b, v.id)) : [b]));

test('every mantra is complete', () => {
  const ids = new Set();
  for (const b of MANTRAS) {
    assert.ok(/^[a-z0-9-]+$/.test(b.id), `${b.id}: id is used in the address`);
    assert.ok(!ids.has(b.id), `${b.id}: duplicate id`); ids.add(b.id);
  }
  for (const m of resolved) {
    assert.ok(m.name && m.seed?.text && m.seed?.phonetics, `${m.id}: name and seed`);
    for (const k of ['ink', 'hi', 'glow', 'halo', 'accent', 'muted', 'text'])
      assert.match(m.palette[k], /^#[0-9a-f]{6}$/i, `${m.id}: palette.${k}`);
    assert.equal(m.palette.bg.length, 3);
    assert.ok(m.motion.period > 0 && ['cw', 'ccw'].includes(m.motion.spin));
    assert.ok(m.rings.length >= 1 && (m.rings[0].turns ?? 1) !== 0, `${m.id}: the first ring turns`);
    for (const r of m.rings) {
      assert.ok(ringTokens(r, 'tibetan').length > 0, `${m.id}/${r.id}: syllables`);
      assert.ok(['cw', 'ccw'].includes(r.order), `${m.id}/${r.id}: order`);
      assert.ok(r.phonetics, `${m.id}/${r.id}: phonetics`);
      assert.equal(ringTokens(r, 'phonetics').length, ringTokens(r, 'tibetan').length,
        `${m.id}/${r.id}: one phonetic entry per Tibetan syllable`);
    }
  }
});

test('Kurukulle offers its two mantras around one seed', () => {
  const k = MANTRAS.find(m => m.id === 'kurukulle');
  assert.deepEqual(k.variants.map(v => v.id), ['approach', 'accomplishment']);
  const [a, b] = k.variants.map(v => withVariant(k, v.id));
  assert.equal(a.seed.text, b.seed.text);
  assert.notEqual(a.rings[0].text, b.rings[0].text);
  assert.equal(withVariant(k, 'nonsense').variant, 'approach');
});

test('Vajrakilaya keeps its fifteen syllables and punctuation aligned with phonetics', () => {
  const mantra = MANTRAS.find(m => m.id === 'vajrakilaya');
  const ring = mantra.rings[0];
  const expected = ['ཨོཾ་', 'བཛྲ་', 'ཀཱི་', 'ལི་', 'ཀཱི་', 'ལ་', 'ཡ་', 'སརྦ་',
    'བིགྷྣཱན་', 'བྂ་', 'ཧཱུྂ་', 'ཕཊ།', 'ཛཿ', 'ཧཱུྂ་', 'ཨཱཿ'];
  assert.deepEqual(tibetanSyllables(ring.text), expected);
  for (const repeats of [1, 2, 3]) {
    const { tibetan, phonetics, after } = ringSyllables(ring, repeats);
    assert.equal(tibetan.length, 15 * repeats);
    assert.equal(phonetics.length, tibetan.length);
    for (let i = 0; i < repeats; i++) {
      assert.deepEqual(tibetan.slice(i * 15, (i + 1) * 15), expected);
      assert.deepEqual(phonetics.slice(i * 15 + 12, (i + 1) * 15), ['jaḥ', 'hūṃ', 'āḥ']);
    }
    assert.ok(after.every((gap, i) => (i + 1) % 15 === 0 || gap === 0),
      'punctuation does not add extra gaps within a recitation');
  }
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
