// Settings for one mantra: its file gives the defaults, the viewer's changes
// are kept per mantra in this browser. Only values that differ from the
// defaults are stored, so a mantra file's later corrections still arrive.
// A mantra with variants (Kurukulle) keeps settings and count per variant;
// `mantra` here is always the mantra with its variant applied.

export const PERIOD_MIN = 0.5, PERIOD_MAX = 180;

export function defaultsFor(mantra) {
  const d = {
    period: mantra.motion.period,      // seconds per round = one recitation
    spin: mantra.motion.spin,          // 'cw' | 'ccw', seen from above
    order: mantra.rings[0].order,      // how the syllables follow each other
    ringScale: 1,
    letterScale: 1,
    seedScale: 1,
    angle: mantra.view.angle,          // degrees above the ring's plane
    camera: 'fixed',                   // 'fixed' | 'free'
    script: 'tibetan',                 // 'tibetan' | 'phonetics'
    glow: 1,
    highlight: 1,
    opacity: 1,                        // the garland, × its depth shading
    seedOpacity: mantra.seed.opacity ?? 0.8,
    veil: 0.35,                        // how much syllables passing before the seed hide it
    'seat.lotus': !!mantra.seats?.lotus,
    'seat.sun': !!mantra.seats?.sun,
    'seat.moon': !!mantra.seats?.moon,
    'seat.petals': mantra.seats?.petals ?? 16,   // 4 | 8 | 16 | 1000
    'seat.color': 'pink',
    'seat.appearance': 'solid',
    'seat.opacity': 0.4,
    'seat.independent': false,
    'seat.lotus.opacity': 0.4,
    'seat.sun.opacity': 0.4,
    'seat.moon.opacity': 0.4,
    'vajra.enabled': false,
    'vajra.view': 'mantra',
    'vajra.opacity': 0.55,
    repeat: 1,                         // the mantra 1, 2 or 3 times round the garland
    readout: false,                    // the front syllable's phonetics at the side
    rays: 0,
    lights: false,                     // offering lights: up, back, down
    'lights.amount': 0.5,
    'lights.phase': 30,                // seconds each phase lasts: 10 | 30 | 60
    background: 'night',               // 'night' | 'black' | 'stars'
    countMode: 'auto',                 // 'auto' (each round) | 'manual' (tap)
    malaSize: 108,
    keepAwake: true,
    pinTap: false,
    stillness: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    quality: 'auto',
  };
  for (const fx of mantra.effects || []) {
    d[`fx.${fx.id}`] = fx.on !== false;
    d[`fx.${fx.id}.amount`] = fx.amount ?? 0.5;
  }
  return d;
}

// Preferences of the viewer rather than of a mantra: the same for every one.
const GLOBAL = ['readout', 'keepAwake', 'pinTap', 'stillness', 'quality'];

const ENUMS = {
  spin: ['cw', 'ccw'], order: ['cw', 'ccw'], camera: ['fixed', 'free'],
  script: ['tibetan', 'phonetics'], background: ['night', 'black', 'stars'],
  countMode: ['auto', 'manual'], quality: ['auto', 'low', 'high'],
  'seat.petals': [4, 8, 16, 1000], 'seat.color': ['pink', 'white'],
  'seat.appearance': ['solid', 'translucent'], 'vajra.view': ['mantra', 'hub', 'whole'],
  repeat: [1, 2, 3], 'lights.phase': [10, 30, 60],
};
const RANGES = {
  period: [PERIOD_MIN, PERIOD_MAX], ringScale: [0.3, 3], letterScale: [0.3, 3], seedScale: [0.3, 3],
  angle: [2, 90], glow: [0, 3], highlight: [0, 1.5], opacity: [0, 1.5],
  malaSize: [1, 10000],
};

export function validateSetting(key, value, fallback) {
  if (typeof value !== typeof fallback) return fallback;
  if (ENUMS[key]) return ENUMS[key].includes(value) ? value : fallback;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback;
    const [min, max] = RANGES[key] || [0, 1];
    const n = Math.min(max, Math.max(min, value));
    return key === 'malaSize' ? Math.round(n) : n;
  }
  return value;
}

const slot = m => (m.variant ? `${m.id}/${m.variant}` : m.id);
const key = m => `mantras:settings:${slot(m)}`;
const countKey = m => `mantras:count:${slot(m)}`;

function read(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; }
}
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
}

export function loadSettings(mantra) {
  const defaults = defaultsFor(mantra);
  const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const saved = record(read(key(mantra)));
  const prefs = record(read('mantras:prefs'));
  const s = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const value = GLOBAL.includes(k) && k in prefs ? prefs[k] : saved[k];
    s[k] = validateSetting(k, value, defaults[k]);
  }
  if (!mantra.visualization?.vajra) s['vajra.enabled'] = false;
  return s;
}

export function saveSettings(mantra, settings) {
  const defaults = defaultsFor(mantra);
  const changed = {};
  const prefs = {};
  for (const k of Object.keys(defaults)) {
    if (GLOBAL.includes(k)) prefs[k] = settings[k];
    else if (settings[k] !== defaults[k]) changed[k] = settings[k];
  }
  write(key(mantra), changed);
  write('mantras:prefs', prefs);
}

export function loadCount(mantra) {
  const c = read(countKey(mantra));
  return Number.isSafeInteger(c?.total) && c.total >= 0 ? c.total : 0;
}
export function saveCount(mantra, total) { write(countKey(mantra), { total }); }

export function loadVariant(id) { return read(`mantras:variant:${id}`); }
export function saveVariant(id, variant) { write(`mantras:variant:${id}`, variant); }

export function lastMantra() { return read('mantras:last'); }
export function rememberMantra(id) { write('mantras:last', id); }
