// The settings sheet and the mantra menu, built from small control helpers.
// Each control reads and writes one key of the settings through `ctx.set`,
// and `refresh()` brings every control back in line with the settings.
import { PERIOD_MIN, PERIOD_MAX } from './settings.js';

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) n.append(c);
  return n;
}

// A button that repeats while held, for fine steps.
export function holdRepeat(button, fn) {
  let timer = null, started = 0;
  const stop = () => { clearTimeout(timer); timer = null; };
  const tick = () => { fn(Date.now() - started); timer = setTimeout(tick, 70); };
  button.addEventListener('pointerdown', e => {
    e.preventDefault();
    started = Date.now();
    fn(0);
    timer = setTimeout(tick, 420);
  });
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(t, stop);
  button.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(0); } });
}

const periodToSlider = p => Math.round(1000 * Math.log(p / PERIOD_MIN) / Math.log(PERIOD_MAX / PERIOD_MIN));
const sliderToPeriod = v => PERIOD_MIN * Math.pow(PERIOD_MAX / PERIOD_MIN, v / 1000);
export const roundPeriod = p => Math.round(Math.min(PERIOD_MAX, Math.max(PERIOD_MIN, p)) * 100) / 100;
export const formatPeriod = p => `${p.toFixed(2)} s`;

export function buildSettings(root, ctx) {
  const { mantra } = ctx;
  const syncs = [];
  const sync = fn => { syncs.push(fn); return fn; };

  const row = (label, value, ...control) => el('div', { class: 'row' },
    el('div', { class: 'row-head' }, el('span', { class: 'label', text: label }), value || null), ...control);

  const range = (key, label, { min, max, step, format = v => v.toFixed(2), enabled }) => {
    const out = el('span', { class: 'value' });
    const input = el('input', { type: 'range', min, max, step, 'aria-label': label,
      oninput: e => ctx.set(key, Number(e.target.value)) });
    const r = row(label, out, input);
    sync(s => {
      input.value = s[key]; out.textContent = format(s[key]);
      if (enabled) r.classList.toggle('disabled', !enabled(s));
    });
    return r;
  };

  const segmented = (key, label, options, hint) => {
    const buttons = options.map(([value, text, cls]) => el('button', {
      type: 'button', class: cls, text, 'aria-pressed': 'false',
      onclick: () => ctx.set(key, value),
    }));
    sync(s => options.forEach(([v], i) => buttons[i].setAttribute('aria-pressed', String(s[key] === v))));
    return row(label, hint ? el('span', { class: 'hint', text: hint }) : null, el('div', { class: 'seg' }, buttons));
  };

  const toggle = (key, label) => {
    const input = el('input', { type: 'checkbox', role: 'switch', onchange: e => ctx.set(key, e.target.checked) });
    sync(s => { input.checked = !!s[key]; });
    return el('label', { class: 'row toggle' }, el('span', { class: 'label', text: label }), input);
  };

  const section = (title, ...rows) => el('section', { class: 'group' }, el('h3', { text: title }), ...rows);

  // ── motion ─────────────────────────────────────────────────────────────
  const periodOut = el('input', { type: 'number', class: 'num', min: PERIOD_MIN, max: PERIOD_MAX, step: '0.01',
    inputmode: 'decimal', 'aria-label': 'Seconds per round',
    onchange: e => { const v = Number(e.target.value); if (v > 0) ctx.set('period', roundPeriod(v)); } });
  const periodSlider = el('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Seconds per round',
    oninput: e => ctx.set('period', roundPeriod(sliderToPeriod(Number(e.target.value)))) });
  const fine = (delta, text) => {
    const b = el('button', { type: 'button', class: 'step', text, 'aria-label': `${delta > 0 ? 'Slower' : 'Faster'} by ${Math.abs(delta)} s` });
    holdRepeat(b, held => ctx.set('period', roundPeriod(ctx.settings.period + delta * (held > 2500 ? 5 : 1))));
    return b;
  };
  const pace = el('div', { class: 'hint' });
  const tapStatus = el('div', { class: 'hint', text: 'Tap at the start of each recitation: the garland takes your pace and brings the first syllable to the front.' });
  const tapBtn = el('button', { type: 'button', class: 'wide', text: 'Tap', onclick: () => ctx.actions.tap() });
  ctx.onTap = text => { tapStatus.textContent = text; };
  const syllableCount = mantra.rings.find(r => (r.turns ?? 1) !== 0)?.text.split(/[་།\s]+/).filter(Boolean).length || 1;
  sync(s => {
    if (document.activeElement !== periodOut) periodOut.value = s.period.toFixed(2);
    periodSlider.value = periodToSlider(s.period);
    pace.textContent = `${(60 / s.period).toFixed(2)} rounds a minute · ${(s.period / syllableCount).toFixed(3)} s a syllable`;
  });

  const motion = section('Motion',
    el('div', { class: 'row' },
      el('div', { class: 'row-head' }, el('span', { class: 'label', text: 'Seconds per round' }), periodOut),
      periodSlider,
      el('div', { class: 'steps' }, fine(-1, '−1'), fine(-0.05, '−0.05'), fine(0.05, '+0.05'), fine(1, '+1')),
      pace),
    el('div', { class: 'row' }, el('div', { class: 'row-head' }, el('span', { class: 'label', text: 'Tap tempo' })), tapBtn, tapStatus),
    segmented('spin', 'Turning', [['cw', 'Clockwise'], ['ccw', 'Counter-clockwise']], 'seen from above'),
    segmented('order', 'Syllables follow', [['cw', 'Clockwise'], ['ccw', 'Counter-clockwise']], 'seen from above'),
  );

  // ── size, view, script ─────────────────────────────────────────────────
  const times = v => `× ${v.toFixed(2)}`;
  const size = section('Size',
    range('ringScale', 'Garland', { min: 0.3, max: 3, step: 0.01, format: times }),
    range('letterScale', 'Letters', { min: 0.3, max: 3, step: 0.01, format: times }),
    range('seedScale', 'Seed syllable', { min: 0.3, max: 3, step: 0.01, format: times }),
  );
  const [aMin, aMax] = mantra.view.angleRange || [0, 90];
  const view = section('View',
    segmented('camera', 'Camera', [['fixed', 'Fixed'], ['free', 'Free']]),
    range('angle', 'Angle', { min: aMin, max: aMax, step: 0.5, format: v => `${v.toFixed(1)}°`, enabled: s => s.camera === 'fixed' }),
    el('div', { class: 'hint', text: 'Free: drag to go round the garland, pinch or scroll to come nearer, two fingers to slide.' }),
    el('button', { type: 'button', class: 'wide', text: 'Reset view', onclick: () => ctx.actions.resetView() }),
  );
  const script = section('Script',
    segmented('script', 'Syllables', [['tibetan', 'བོད་ཡིག', 'bo'], ['phonetics', 'Phonetics']]),
  );

  // ── light & effects ────────────────────────────────────────────────────
  const fxRows = (mantra.effects || []).flatMap(fx => [
    toggle(`fx.${fx.id}`, fx.label),
    range(`fx.${fx.id}.amount`, 'Amount', { min: 0, max: 1, step: 0.01, format: v => `${Math.round(v * 100)}%`, enabled: s => s[`fx.${fx.id}`] }),
  ]);
  const light = section('Light & effects',
    range('glow', 'Glow', { min: 0, max: 2, step: 0.01, format: times }),
    range('highlight', 'Front highlight', { min: 0, max: 1.5, step: 0.01, format: times }),
    range('rays', 'Light rays', { min: 0, max: 1, step: 0.01, format: v => `${Math.round(v * 100)}%` }),
    segmented('background', 'Background', [['night', 'Night'], ['black', 'Black'], ['stars', 'Stars']]),
    ...fxRows,
  );

  // ── counter ────────────────────────────────────────────────────────────
  const total = el('span', { class: 'value' });
  const mala = el('input', { type: 'number', class: 'num', min: 1, max: 10000, step: 1, inputmode: 'numeric',
    'aria-label': 'Beads on the mala',
    onchange: e => { const v = Math.round(Number(e.target.value)); if (v >= 1) ctx.set('malaSize', v); } });
  sync(s => {
    total.textContent = ctx.counter();
    if (document.activeElement !== mala) mala.value = s.malaSize;
  });
  ctx.onCount = () => { total.textContent = ctx.counter(); };
  const counter = section('Counter',
    segmented('countMode', 'Count', [['auto', 'Each round'], ['manual', 'By tapping']]),
    el('div', { class: 'row' }, el('div', { class: 'row-head' }, el('span', { class: 'label', text: 'Beads on the mala' }), mala)),
    el('div', { class: 'row' }, el('div', { class: 'row-head' }, el('span', { class: 'label', text: 'Recitations' }), total),
      el('div', { class: 'steps' },
        el('button', { type: 'button', class: 'step', text: '−1', onclick: () => ctx.actions.count(-1) }),
        el('button', { type: 'button', class: 'step', text: '+1', onclick: () => ctx.actions.count(1) }),
        el('button', { type: 'button', class: 'step', text: 'Reset', onclick: () => ctx.actions.resetCount() }))),
  );

  // ── screen ─────────────────────────────────────────────────────────────
  const screen = section('Screen',
    toggle('keepAwake', 'Keep the screen awake'),
    ctx.canFullscreen
      ? el('button', { type: 'button', class: 'wide', text: 'Full screen', onclick: () => ctx.actions.fullscreen() })
      : el('div', { class: 'hint', text: 'For full screen on iPhone: Share → Add to Home Screen, then open it from there.' }),
    el('button', { type: 'button', class: 'wide quiet', text: `Restore ${mantra.name} defaults`, onclick: () => ctx.actions.resetSettings() }),
  );

  root.replaceChildren(motion, size, view, script, light, counter, screen);
  return { refresh: () => { for (const f of syncs) f(ctx.settings); } };
}

export function buildPicker(root, mantras, current, onPick) {
  root.replaceChildren(...mantras.map(m => el('button', {
    type: 'button', class: 'mantra', 'aria-current': m.id === current ? 'true' : null,
    style: `--accent:${m.palette.accent}`,
    onclick: () => onPick(m.id),
  },
  el('span', { class: 'seed bo', text: m.seed.text }),
  el('span', { class: 'names' },
    el('span', { class: 'name', text: m.name }),
    el('span', { class: 'bo tib', text: m.tibetanName || '' }),
    el('span', { class: 'sub', text: m.subtitle || '' })))));
}
