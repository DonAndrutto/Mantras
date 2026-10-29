// The frame every mantra opens in: the renderer and its loop, the clock that
// turns the garland, the counter, the bars and the sheets.
import * as THREE from 'three';
import { MANTRAS, findMantra, withVariant } from '../mantras/index.js';
import { loadSettings, saveSettings, defaultsFor, loadCount, saveCount, lastMantra, rememberMantra, loadVariant, saveVariant, PERIOD_MIN, PERIOD_MAX } from './settings.js';
import { loadFonts } from './glyphs.js';
import { Stage } from './stage.js';
import { fixedPose, createControls } from './camera.js';
import { vrSupported, enterVR } from './xr.js';
import { createNectar } from './effects/nectar.js';
import { createRays } from './effects/rays.js';
import { createOfferings, PHASES } from './effects/offerings.js';
import { createStars } from './effects/stars.js';
import { buildSettings, buildPicker, holdRepeat, roundPeriod, formatPeriod } from './ui.js';

const TAU = Math.PI * 2;
const EFFECTS = { nectar: createNectar };
const $ = id => document.getElementById(id);

// ── renderer, scene, camera ──────────────────────────────────────────────
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.xr.enabled = true;
const scene = new THREE.Scene();
const world = new THREE.Group();       // moved into place for VR
scene.add(world);
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
const controls = createControls(camera, canvas);
const stars = createStars({ parent: world });

// ── state ────────────────────────────────────────────────────────────────
let base = null, mantra = null, settings = null, stage = null, effects = [], ui = null, frontKey = '', offerings = null, phaseKey = '';
let rot = 0, maxRecited = 0, correction = 0, total = 0, paused = false;
let poseDirty = true, snap = true, inVR = false;
const taps = [];

const ctx = {
  get mantra() { return mantra; },
  get base() { return base; },
  get settings() { return settings; },
  canFullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
  set(key, value) {
    if (settings[key] === value) return;
    settings[key] = value;
    saveSettings(mantra, settings);
    if (key === 'script' || key === 'repeat') buildStage();
    if (key === 'repeat') maxRecited = Math.floor((rot * value) / TAU + 1e-9);
    if (key === 'angle' || key === 'camera') { poseDirty = true; snap = settings.camera === 'fixed'; controls.enabled = settings.camera === 'free' && !inVR; }
    applyLook();
    refreshUI();
  },
  counter: () => {
    const m = settings.malaSize;
    return `${total} · ${Math.floor(total / m)} mala${Math.floor(total / m) === 1 ? '' : 's'} + ${total % m}`;
  },
  actions: {
    tap: () => tap(),
    variant: v => { saveVariant(base.id, v); openMantra(base.id, true); },
    resetView: () => { poseDirty = true; snap = true; },
    count: d => addCount(d),
    resetCount: () => { if (confirm(`Set the ${mantra.name} count back to zero?`)) { total = 0; saveCount(mantra, 0); refreshUI(); } },
    fullscreen: () => toggleFullscreen(),
    resetSettings: () => {
      if (!confirm(`Restore the ${mantra.name} settings to the defaults?`)) return;
      const script = settings.script;
      settings = defaultsFor(mantra);
      saveSettings(mantra, settings);
      if (script !== settings.script) buildStage();
      poseDirty = true; snap = true; controls.enabled = false;
      applyLook(); refreshUI();
    },
  },
};

// ── loading a mantra ─────────────────────────────────────────────────────
function buildStage() {
  for (const fx of effects) fx.dispose();
  stage?.dispose();
  stage = new Stage({ mantra, settings });
  world.add(stage.group);
  offerings = createOfferings({ stage });
  effects = [createRays({ stage }), offerings];
  for (const fx of mantra.effects || []) if (EFFECTS[fx.id]) effects.push(EFFECTS[fx.id]({ stage, mantra }));
  poseDirty = true;
}

function openMantra(id, force = false) {
  const next = findMantra(id) || MANTRAS[0];
  if (!force && base && next.id === base.id) return;
  base = next;
  mantra = withVariant(base, loadVariant(base.id));
  rememberMantra(mantra.id);
  settings = loadSettings(mantra);
  total = loadCount(mantra);
  rot = 0; maxRecited = 0; correction = 0; taps.length = 0;
  controls.enabled = settings.camera === 'free' && !inVR;
  buildStage();
  snap = true;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries({ accent: mantra.palette.accent, muted: mantra.palette.muted, text: mantra.palette.text, glow: mantra.palette.glow,
    bg0: mantra.palette.bg[0], bg1: mantra.palette.bg[1], bg2: mantra.palette.bg[2] })) root.setProperty(`--${k}`, v);
  $('seedBtn').textContent = mantra.seed.text;
  const variantLabel = mantra.variants?.find(v => v.id === mantra.variant)?.label;
  $('nameBtn').textContent = variantLabel ? `${mantra.name} · ${variantLabel}` : mantra.name;
  document.title = `${mantra.name} · Mantras Visualised`;
  frontKey = '';
  ui = buildSettings($('settingsBody'), ctx);
  ctx.onTap?.('Tap at the start of each recitation: the garland takes your pace and brings the first syllable to the front.');
  buildPicker($('pickerBody'), MANTRAS, mantra.id, pick => { closeSheets(); location.hash = pick; });
  applyLook();
  refreshUI();
}

function applyLook() {
  document.body.dataset.bg = settings.background;
  stars.visible = settings.background === 'stars';
  scene.background = inVR ? new THREE.Color(settings.background === 'black' ? '#000000' : mantra.palette.bg[2]) : null;
  document.body.classList.toggle('free', settings.camera === 'free');
  updateWakeLock();
}

function refreshUI() {
  ui?.refresh();
  $('periodBtn').textContent = formatPeriod(settings.period);
  $('playBtn').setAttribute('aria-pressed', String(paused));
  $('playBtn').setAttribute('aria-label', paused ? 'Play' : 'Pause');
  $('scriptBtn').setAttribute('aria-pressed', String(settings.readout));
  $('readout').hidden = !settings.readout;
  const m = settings.malaSize;
  $('countBead').textContent = `${total % m}/${m}`;
  $('countMala').textContent = Math.floor(total / m);
  $('countBtn').classList.toggle('manual', settings.countMode === 'manual');
  ctx.onCount?.();
}

// ── the clock, tap tempo and counter ─────────────────────────────────────
function setPeriod(p) { ctx.set('period', roundPeriod(p)); }

function tap() {
  const now = performance.now() / 1000;
  const last = taps[taps.length - 1];
  if (last !== undefined && now - last > Math.max(6, 2.5 * settings.period) && taps.length > 1) taps.length = 0;
  if (last !== undefined && now - last > PERIOD_MAX) taps.length = 0;
  taps.push(now);
  if (taps.length > 6) taps.shift();
  // bring the first syllable to the front, gently
  // (the start of whichever recitation is nearest, when the garland holds several)
  const unit = TAU / settings.repeat;
  const frac = rot / unit - Math.round(rot / unit);
  correction = -frac * unit;
  if (taps.length >= 2) {
    const span = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
    if (span >= PERIOD_MIN) setPeriod(span);
    ctx.onTap?.(`From your last ${taps.length} taps: ${formatPeriod(settings.period)} a recitation.`);
  } else {
    ctx.onTap?.('Synced. Tap again at the next start to set the pace.');
  }
  flash($('tapBtn'));
}

function addCount(d) {
  const before = Math.floor(total / settings.malaSize);
  total = Math.max(0, total + d);
  saveCount(mantra, total);
  if (d > 0 && Math.floor(total / settings.malaSize) > before) {
    toast(`Mala ${Math.floor(total / settings.malaSize)} complete`);
    navigator.vibrate?.(60);
  }
  refreshUI();
}

function advance(dt) {
  // the period is one recitation; a garland holding the mantra n times turns once in n of them
  if (!paused) rot += (TAU * dt) / (settings.period * settings.repeat);
  if (correction) {
    const step = Math.abs(correction) < 1e-4 ? correction : correction * Math.min(1, dt * 5);
    rot += step; correction -= step;
  }
  const recited = Math.floor((rot * settings.repeat) / TAU + 1e-9);
  if (recited > maxRecited) {
    if (settings.countMode === 'auto' && !paused) addCount(recited - maxRecited);
    maxRecited = recited;
  }
}

// ── camera ───────────────────────────────────────────────────────────────
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  poseDirty = true;
}

function placeCamera() {
  if (inVR) return;
  if (poseDirty) {
    const pose = fixedPose({ mantra, angle: settings.angle, aspect: camera.aspect, extent: stage.extent() });
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    // the free camera keeps its place through a resize; the fixed one is re-framed
    if (snap || settings.camera === 'fixed') {
      camera.position.copy(pose.eye);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      snap = false;
    }
    poseDirty = false;
  }
  if (settings.camera === 'free') controls.update();
}

// ── frame ────────────────────────────────────────────────────────────────
let lastTime = null, clock = 0;
const _size = new THREE.Vector2();
function frame(t) {
  const now = t / 1000;
  const realDt = lastTime === null ? 0 : Math.min(1, Math.max(0, now - lastTime));   // for clocks that keep real time
  const dt = Math.min(0.1, realDt);
  lastTime = now; clock += dt;
  advance(dt);
  placeCamera();
  stage.update({ rot, time: clock, camera, settings });
  renderer.getDrawingBufferSize(_size);
  for (const fx of effects) fx.update({ dt, realDt, time: clock, camera, settings, viewportHeight: _size.y, fov: camera.fov });
  stars.update(dt);
  if (settings.readout) showFront();
  showPhase();
  $('bg').style.setProperty('--pulse', (0.5 + 0.2 * Math.sin(2 * rot)).toFixed(3));
  renderer.render(scene, camera);
}

// The syllable at the front, at the side of the screen, as in the Ngöndro app.
function showFront() {
  const f = stage.frontSyllable();
  const k = f ? `${f.tibetan}|${f.phonetics}` : '';
  if (k === frontKey) return;
  frontKey = k;
  $('readTib').textContent = f?.tibetan || '';
  $('readPho').textContent = f?.phonetics || '';
}

// Which phase the offering lights are in, under the top bar.
function showPhase() {
  const st = offerings?.status;
  const chip = $('phase');
  if (!st?.on) { if (!chip.hidden) chip.hidden = true; phaseKey = ''; return; }
  chip.hidden = false;
  const p = PHASES[st.phase];
  if (phaseKey !== p.id) {
    phaseKey = p.id;
    $('phaseName').textContent = p.label;
    $('phaseHint').textContent = p.hint;
    chip.dataset.phase = p.id;
  }
  $('phaseBar').style.transform = `scaleX(${st.progress.toFixed(4)})`;
}

// ── chrome: bars, sheets, gestures, keys ─────────────────────────────────
function openSheet(id) {
  closeSheets();
  $(id).hidden = false;
  document.body.classList.add('sheet-open');
  $(id).querySelector('.sheet-close')?.focus({ preventScroll: true });
}
function closeSheets() {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = true;
  document.body.classList.remove('sheet-open');
}
function flash(node) { node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash'); }
let toastTimer = null;
function toast(text) {
  const t = $('toast');
  t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}
function togglePause() { paused = !paused; refreshUI(); updateWakeLock(); }
function toggleFullscreen() {
  const d = document, e = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else (e.requestFullscreen || e.webkitRequestFullscreen)?.call(e);
}

let wakeLock = null;
async function updateWakeLock() {
  const want = settings?.keepAwake && !paused && document.visibilityState === 'visible';
  try {
    if (want && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}

function wireChrome() {
  $('playBtn').onclick = togglePause;
  $('settingsBtn').onclick = () => openSheet('settings');
  $('pickerBtn').onclick = () => openSheet('picker');
  $('periodBtn').onclick = () => openSheet('settings');
  $('scriptBtn').onclick = () => { frontKey = ''; ctx.set('readout', !settings.readout); };
  $('tapBtn').onclick = tap;
  $('countBtn').onclick = () => (settings.countMode === 'manual' ? addCount(1) : openSheet('settings'));
  holdRepeat($('slowerBtn'), held => setPeriod(settings.period + 0.05 * (held > 2500 ? 5 : 1)));
  holdRepeat($('fasterBtn'), held => setPeriod(settings.period - 0.05 * (held > 2500 ? 5 : 1)));
  for (const b of document.querySelectorAll('.sheet-close')) b.onclick = closeSheets;
  $('scrim').onclick = closeSheets;
  $('fsBtn').hidden = !ctx.canFullscreen;
  $('fsBtn').onclick = toggleFullscreen;

  // a tap on the scene (not a drag) hides or shows the bars
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 350) {
      document.body.classList.toggle('bare');
    }
    down = null;
  });

  window.addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea')) return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 't' || k === 'T') tap();
    else if (k === '[') setPeriod(settings.period - (e.shiftKey ? 1 : 0.05));
    else if (k === ']') setPeriod(settings.period + (e.shiftKey ? 1 : 0.05));
    else if (k === '{') setPeriod(settings.period - 1);
    else if (k === '}') setPeriod(settings.period + 1);
    else if (k === 'h' || k === 'H') document.body.classList.toggle('bare');
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'p' || k === 'P') $('scriptBtn').click();
    else if (k === 'r' || k === 'R') ctx.set('script', settings.script === 'tibetan' ? 'phonetics' : 'tibetan');
    else if (k === 'Escape') closeSheets();
  });
  document.addEventListener('visibilitychange', updateWakeLock);
  window.addEventListener('resize', resize);
  window.addEventListener('hashchange', () => openMantra(location.hash.slice(1)));
}

async function wireVR() {
  if (!(await vrSupported())) return;
  const btn = $('vrBtn');
  btn.hidden = false;
  btn.onclick = async () => {
    if (renderer.xr.isPresenting) { renderer.xr.getSession()?.end(); return; }
    try {
      const { session, floor } = await enterVR(renderer);
      inVR = true;
      controls.enabled = false;
      world.position.set(0, floor ? 1.35 : -0.2, -1.9);
      world.scale.setScalar(0.65);
      applyLook();
      session.addEventListener('end', () => {
        inVR = false;
        world.position.set(0, 0, 0);
        world.scale.setScalar(1);
        controls.enabled = settings.camera === 'free';
        poseDirty = true; snap = true;
        resize();
        applyLook();
      });
    } catch (err) {
      toast('VR could not start');
      console.warn(err);
    }
  };
}

// ── start ────────────────────────────────────────────────────────────────
async function start() {
  await loadFonts();
  wireChrome();
  resize();
  const wanted = location.hash.slice(1) || lastMantra();
  openMantra(findMantra(wanted) ? wanted : MANTRAS[0].id);
  if (location.hash.slice(1) !== mantra.id) history.replaceState(null, '', `#${mantra.id}`);
  renderer.setAnimationLoop(frame);
  document.body.classList.add('ready');
  wireVR();
}

start();
