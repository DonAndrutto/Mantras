// Settings for one mantra: its file gives the defaults, the viewer's changes
// are kept per mantra in this browser. Only values that differ from the
// defaults are stored, so a mantra file's later corrections still arrive.

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

const key = id => `mantras:settings:${id}`;
const countKey = id => `mantras:count:${id}`;

function read(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; }
}
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
}

export function loadSettings(mantra) {
  const defaults = defaultsFor(mantra);
  const saved = read(key(mantra.id)) || {};
  const s = { ...defaults };
  for (const k of Object.keys(saved)) if (k in defaults && typeof saved[k] === typeof defaults[k]) s[k] = saved[k];
  return s;
}

export function saveSettings(mantra, settings) {
  const defaults = defaultsFor(mantra);
  const changed = {};
  for (const k of Object.keys(defaults)) if (settings[k] !== defaults[k]) changed[k] = settings[k];
  write(key(mantra.id), changed);
}

export function loadCount(mantra) {
  const c = read(countKey(mantra.id));
  return Number.isFinite(c?.total) ? c.total : 0;
}
export function saveCount(mantra, total) { write(countKey(mantra.id), { total }); }

export function lastMantra() { return read('mantras:last'); }
export function rememberMantra(id) { write('mantras:last', id); }
