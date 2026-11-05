// The frame every mantra opens in: the renderer and its loop, the clock that
// turns the garland, the counter, the bars and the sheets.
import * as THREE from 'three';
import { MANTRAS, findMantra, withVariant } from '../mantras/index.js';
import { loadSettings, saveSettings, defaultsFor, loadCount, saveCount, lastMantra, rememberMantra, loadVariant, saveVariant, PERIOD_MIN, PERIOD_MAX, validateSetting } from './settings.js';
import { loadFonts } from './glyphs.js';
import { Stage } from './stage.js';
import { fixedPose, createControls } from './camera.js';
import { vrSupported, enterVR } from './xr.js';
import { createNectar } from './effects/nectar.js';
import { createRays } from './effects/rays.js';
import { createOfferings, PHASES } from './effects/offerings.js';
import { createStars } from './effects/stars.js';
import { createBackdrop } from './backdrop.js';
import { buildSettings, buildPicker, roundPeriod, formatPeriod } from './ui.js';

import { sheets, welcoming, previewPaused, sceneReady } from './shell.js';
import { createQualityController } from './quality.js';

const TAU = Math.PI * 2;
const EFFECTS = { nectar: createNectar };
const $ = id => document.getElementById(id);

// ── renderer, scene, camera ──────────────────────────────────────────────
const canvas = $('scene');
// Opaque: the sky is drawn in the scene (see backdrop.js), so added light shows on every screen.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setClearColor(0x0a0f1a, 1);
renderer.xr.enabled = true;
// Pixels drawn per frame are held to about this many, so a large, sharp
// desktop screen does not draw four times what a phone does.
const PIXEL_BUDGET = 4.2e6;
const scene = new THREE.Scene();
const backdrop = createBackdrop({ scene });
const world = new THREE.Group();       // moved into place for VR
scene.add(world);
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
const controls = createControls(camera, canvas);
const stars = createStars({ parent: world });

// ── state ────────────────────────────────────────────────────────────────
let base = null, mantra = null, settings = null, stage = null, effects = [], ui = null, frontKey = '', offerings = null, phaseKey = '';
let rot = 0, maxRecited = 0, correction = 0, total = 0, paused = false;
let poseDirty = true, snap = true, inVR = false;
const taps = [];
let wanted = location.hash.slice(1) || lastMantra() || 'vajra-guru';
const quality = createQualityController();
let vrAvailable = false;

const ctx = {
  get mantra() { return mantra; },
  get base() { return base; },
  get settings() { return settings; },
  get canVR() { return vrAvailable; },
  canFullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
  set(key, value) {
    const defaults = defaultsFor(mantra);
    if (!(key in defaults)) return;
    value = validateSetting(key, value, defaults[key]);
    if (key === 'vajra.enabled' && !mantra.visualization?.vajra) return;
    if (settings[key] === value && !(key === 'vajra.view' && settings.camera === 'free')
      && !(key === 'phoneticsBelow' && value && settings.script !== 'tibetan')) return;
    if (key === 'seat.independent' && value) {
      for (const part of ['lotus', 'sun', 'moon']) settings[`seat.${part}.opacity`] = settings['seat.opacity'];
    }
    settings[key] = value;
    if (key === 'phoneticsBelow' && value) settings.script = 'tibetan';
    if (key === 'script' && value === 'phonetics') settings.phoneticsBelow = false;
    if (key === 'script' || key === 'repeat' || key === 'phoneticsBelow') buildStage();
    if ((key === 'camera' && value === 'fixed') || key === 'vajra.view') {
      // Consume residual orbit momentum before restoring the fixed pose.
      controls.enableDamping = false; controls.update(); controls.enableDamping = true;
    }
    if (key === 'repeat') maxRecited = Math.floor((rot * value) / TAU + 1e-9);
    if (key === 'vajra.view') settings.camera = 'fixed';
    if (['angle', 'camera', 'vajra.view', 'vajra.enabled', 'ringScale', 'seedScale', 'letterScale', 'highlight'].includes(key) || key.startsWith('seat.')) { poseDirty = true; snap = settings.camera === 'fixed'; controls.enabled = settings.camera === 'free' && !inVR; }
    if (key === 'quality') { quality.reset(value); resize(); }
    saveSettings(mantra, settings);
    applyLook();
    refreshUI();
  },
  counter: () => {
    const m = settings.malaSize;
    return `${total} · ${Math.floor(total / m)} mala${Math.floor(total / m) === 1 ? '' : 's'} + ${total % m}`;
  },
  actions: {
    panel: id => openSheet(id),
    vr: () => startVR(),
    ngondro: () => {
      Object.assign(settings, { 'vajra.enabled': true, 'vajra.view': 'mantra', 'seat.lotus': true,
        'seat.moon': true, 'seat.sun': false, 'seat.color': 'white', camera: 'fixed' });
      saveSettings(mantra, settings); poseDirty = true; snap = true; controls.enabled = false;
      applyLook(); refreshUI();
    },
    tap: () => tap(),
    variant: v => { saveVariant(base.id, v); openMantra(base.id, true); },
    resetView: () => { poseDirty = true; snap = true; },
    count: d => addCount(d),
    resetCount: () => { if (confirm(`Set the ${mantra.name} count back to zero?`)) { total = 0; saveCount(mantra, 0); refreshUI(); } },
    fullscreen: () => toggleFullscreen(),
    resetSettings: () => {
      if (!confirm(`Restore the ${mantra.name} settings to the defaults?`)) return;
      const previousRepeat = settings.repeat;
      settings = defaultsFor(mantra);
      saveSettings(mantra, settings);
      buildStage();
      if (previousRepeat !== settings.repeat) maxRecited = Math.floor(rot * settings.repeat / TAU + 1e-9);
      quality.reset(settings.quality); resize();
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
  if (!welcoming) rememberMantra(mantra.id);
  settings = welcoming ? { ...defaultsFor(mantra), period: 16, angle: 28, keepAwake: false, stillness: false } : loadSettings(mantra);
  quality.reset(settings.quality); resize();
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
  document.title = welcoming ? 'Mantras Visualised' : `${mantra.name} · Mantras Visualised`;
  frontKey = '';
  ui = buildSettings($('settingsBody'), ctx);
  ctx.onTap?.('Tap at the start of each recitation: the garland takes your pace and brings the first syllable to the front.');
  buildPicker($('pickerBody'), MANTRAS, mantra.id, pick => { closeSheets(true); location.hash = pick; });
  applyLook();
  refreshUI();
  sheets.refresh();
}

function applyLook() {
  document.body.dataset.bg = settings.background;
  stars.visible = settings.background === 'stars';
  backdrop.look(settings.background, mantra.palette);
  backdrop.visible = !inVR;
  scene.background = inVR ? new THREE.Color(settings.background === 'black' ? '#000000' : mantra.palette.bg[2]) : null;
  document.body.classList.toggle('free', settings.camera === 'free');
  updateWakeLock();
}

function refreshUI() {
  ui?.refresh();
  $('periodBtn').textContent = formatPeriod(settings.period);
  $('phoneticsBtn').setAttribute('aria-pressed', String(settings.script === 'tibetan' && settings.phoneticsBelow));
  $('fixedCameraBtn').setAttribute('aria-pressed', String(settings.camera === 'fixed'));
  $('freeCameraBtn').setAttribute('aria-pressed', String(settings.camera === 'free'));
  $('tapBtn').hidden = !settings.pinTap;
  const vajraOn = !!mantra.visualization?.vajra && settings['vajra.enabled'];
  $('vajraViews').hidden = !vajraOn;
  document.body.classList.toggle('has-vajra', vajraOn);
  document.querySelectorAll('[data-vajra-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vajraView === settings['vajra.view'])));
  $('playBtn').setAttribute('aria-pressed', String(paused || settings.stillness));
  $('playBtn').setAttribute('aria-label', settings.stillness ? 'Resume animation' : paused ? 'Play' : 'Pause');
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
  if (!paused && !settings.stillness) rot += (TAU * dt) / (settings.period * settings.repeat);
  if (correction && !settings.stillness) {
    const step = Math.abs(correction) < 1e-4 ? correction : correction * Math.min(1, dt * 5);
    rot += step; correction -= step;
  }
  const recited = Math.floor((rot * settings.repeat) / TAU + 1e-9);
  if (recited > maxRecited) {
    if (!welcoming && !sheets.isOpen && settings.countMode === 'auto' && !paused && !settings.stillness) addCount(recited - maxRecited);
    maxRecited = recited;
  }
}

// ── camera ───────────────────────────────────────────────────────────────
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.max(0.65, quality.scale * Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (w * h)))));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  poseDirty = true;
}

function placeCamera() {
  if (inVR) return;
  if (poseDirty) {
    const pose = fixedPose({ mantra, angle: settings.angle, aspect: camera.aspect, extent: stage.extent(settings) });
    if (welcoming) pose.eye.sub(pose.target).multiplyScalar(window.innerWidth < 760 && window.innerHeight > 650 ? 1.1 : 1.7).add(pose.target);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    // the free camera keeps its place through a resize; the fixed one is re-framed
    if (snap || settings.camera === 'fixed') {
      camera.position.copy(pose.eye);
      camera.lookAt(pose.target);
      controls.target.copy(pose.target);
      controls.maxDistance = Math.max(14, pose.eye.distanceTo(pose.target) * 4);
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
  const elapsed = lastTime === null ? 0 : Math.max(0, now - lastTime);
  if (!inVR && !settings.stillness && quality.sample(elapsed, settings.quality)) resize();
  const realDt = (welcoming ? previewPaused : settings.stillness) || sheets.isOpen || document.hidden ? 0 : Math.min(1, elapsed);
  const dt = Math.min(0.1, realDt);
  lastTime = now; clock += dt;
  advance(dt);
  placeCamera();
  stage.update({ rot, time: clock, camera, settings, quality: quality.detail });
  renderer.getDrawingBufferSize(_size);
  for (const fx of effects) fx.update({ dt, realDt, time: clock, camera, settings, viewportHeight: _size.y, fov: camera.fov });
  stars.update(dt);
  if (settings.readout) showFront();
  showPhase();
  backdrop.update({ pulse: 0.5 + 0.2 * Math.sin(2 * rot), width: _size.x, height: _size.y });
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
function openSheet(id) { sheets.open(id); }
function closeSheets(all = false) { sheets.close(all); }
function toggleChrome() { document.body.classList.toggle('bare'); sheets.refresh(); }
function flash(node) { node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash'); }
let toastTimer = null;
function toast(text) {
  const t = $('toast');
  t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}
function togglePause() {
  if (settings.stillness) { paused = false; ctx.set('stillness', false); }
  else paused = !paused;
  refreshUI(); updateWakeLock();
}
function toggleFullscreen() {
  const d = document, e = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else (e.requestFullscreen || e.webkitRequestFullscreen)?.call(e);
}

let wakeLock = null;
async function updateWakeLock() {
  const want = !welcoming && settings?.keepAwake && !paused && document.visibilityState === 'visible';
  try {
    if (want && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}

function wireChrome() {
  $('playBtn').onclick = togglePause;
  $('phoneticsBtn').onclick = () => ctx.set('phoneticsBelow', !(settings.script === 'tibetan' && settings.phoneticsBelow));
  $('fixedCameraBtn').onclick = () => ctx.set('camera', 'fixed');
  $('freeCameraBtn').onclick = () => {
    ctx.set('camera', 'free');
    toast('Drag to turn · pinch or scroll to zoom');
  };
  $('settingsBtn').onclick = () => openSheet('settings');
  $('pickerBtn').onclick = () => openSheet('picker');
  $('periodBtn').onclick = () => openSheet('pace');
  $('tapBtn').onclick = tap;
  $('countBtn').onclick = () => openSheet('counter');
  for (const b of document.querySelectorAll('[data-vajra-view]')) b.onclick = () => ctx.set('vajra.view', b.dataset.vajraView);
  for (const b of document.querySelectorAll('.sheet-close')) b.onclick = () => closeSheets();
  $('scrim').onclick = () => closeSheets();

  // a tap on the scene (not a drag) hides or shows the bars
  let down = null, fixedDragHintShown = false;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 350) {
      toggleChrome();
    }
    if (down && settings.camera === 'fixed' && !fixedDragHintShown && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 8) {
      fixedDragHintShown = true;
      toast('Choose Free below to drag and turn the view');
    }
    down = null;
  });

  window.addEventListener('keydown', e => {
    if (e.defaultPrevented || welcoming) return;
    if (e.target.closest?.('input, textarea, button, a, summary, select')) return;
    if (sheets.isOpen) return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 't' || k === 'T') tap();
    else if (k === '[') setPeriod(settings.period - (e.shiftKey ? 1 : 0.05));
    else if (k === ']') setPeriod(settings.period + (e.shiftKey ? 1 : 0.05));
    else if (k === '{') setPeriod(settings.period - 1);
    else if (k === '}') setPeriod(settings.period + 1);
    else if (k === 'h' || k === 'H') toggleChrome();
    else if (k === 'c' || k === 'C') (settings.camera === 'fixed' ? $('freeCameraBtn') : $('fixedCameraBtn')).click();
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'p' || k === 'P') ctx.set('readout', !settings.readout);
    else if (k === 'r' || k === 'R') ctx.set('script', settings.script === 'tibetan' ? 'phonetics' : 'tibetan');
    else if (k === 'Escape') closeSheets();
  });
  document.addEventListener('visibilitychange', () => { lastTime = null; updateWakeLock(); });
  window.addEventListener('resize', resize);
  window.addEventListener('hashchange', () => {
    wanted = location.hash.slice(1);
    if (!welcoming) openMantra(wanted);
  });
  window.addEventListener('mantras:enter', () => {
    paused = false;
    openMantra(findMantra(wanted) ? wanted : 'vajra-guru', true);
    history.replaceState(null, '', `#${mantra.id}`);
    lastTime = null;
  });
  window.addEventListener('mantras:welcome', () => {
    wanted = mantra.id; paused = false;
    openMantra('vajra-guru', true);
    lastTime = null;
  });
}

async function wireVR() {
  vrAvailable = await vrSupported();
  const btn = $('vrBtn'); if (btn) btn.hidden = !vrAvailable;
}
async function startVR() {
  if (!vrAvailable) return;
  if (renderer.xr.isPresenting) { renderer.xr.getSession()?.end(); return; }
  try {
    const { session, floor } = await enterVR(renderer);
    closeSheets(true); inVR = true; controls.enabled = false;
    world.position.set(0, floor ? 1.35 : -0.2, -1.9);
    world.scale.setScalar(0.65); applyLook();
    session.addEventListener('end', () => {
      inVR = false; world.position.set(0, 0, 0); world.scale.setScalar(1);
      controls.enabled = settings.camera === 'free'; poseDirty = true; snap = true; resize(); applyLook();
    });
  } catch (err) { toast('VR could not start'); console.warn(err); }
}

// ── start ────────────────────────────────────────────────────────────────
export async function start() {
  await loadFonts();
  wireChrome();
  resize();
  openMantra('vajra-guru');
  renderer.setAnimationLoop(frame);
  document.body.classList.add('ready');
  wireVR();
  sceneReady();
}
