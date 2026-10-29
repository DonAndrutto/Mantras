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
    join: '',                          // other mantras in the same garland: 'id' or 'id/variant', comma-separated
    readout: false,                    // the front syllable's phonetics at the side
    rays: 0,
    background: 'night',               // 'night' | 'black' | 'stars'
    countMode: 'auto',                 // 'auto' (each round) | 'manual' (tap)
    malaSize: 108,
    keepAwake: true,
  };
  for (const fx of mantra.effects || []) {
    d[`fx.${fx.id}`] = fx.on !== false;
    d[`fx.${fx.id}.amount`] = fx.amount ?? 0.5;
  }
  return d;
}

// Preferences of the viewer rather than of a mantra: the same for every one.
const GLOBAL = ['readout', 'keepAwake'];

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
  const saved = { ...read(key(mantra)), ...read('mantras:prefs') };
  const s = { ...defaults };
  for (const k of Object.keys(saved)) if (k in defaults && typeof saved[k] === typeof defaults[k]) s[k] = saved[k];
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
  return Number.isFinite(c?.total) ? c.total : 0;
}
export function saveCount(mantra, total) { write(countKey(mantra), { total }); }

export function loadVariant(id) { return read(`mantras:variant:${id}`); }
export function saveVariant(id, variant) { write(`mantras:variant:${id}`, variant); }

export function lastMantra() { return read('mantras:last'); }
export function rememberMantra(id) { write('mantras:last', id); }
