import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { defaultsFor, loadSettings, saveSettings, loadCount } from '../js/settings.js';
import vajrasattva from '../mantras/vajrasattva.js';
import tara from '../mantras/green-tara.js';
import { createQualityController } from '../js/quality.js';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../vendor/three@0.184.0/build/three.module.js', import.meta.url).href, context);
  if (specifier.startsWith('three/addons/')) return next(new URL('../vendor/three@0.184.0/examples/jsm/' + specifier.slice(13), import.meta.url).href, context);
  return next(specifier, context);
} });
const THREE = await import('three');
const { createSeats } = await import('../js/seats.js');
const { createVajra, vajraLayout } = await import('../js/vajra.js');
const { fixedPose } = await import('../js/camera.js');

const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };

test('outward facing is opt-in, validated and saved per mantra', () => {
  storage.clear();
  assert.equal(loadSettings(vajrasattva).faceOutward, false);
  const s = { ...defaultsFor(vajrasattva), faceOutward: true };
  saveSettings(vajrasattva, s);
  assert.equal(loadSettings(vajrasattva).faceOutward, true);
  assert.equal(loadSettings(tara).faceOutward, false);
  saveSettings(vajrasattva, { ...s, faceOutward: false });
  assert.equal(loadSettings(vajrasattva).faceOutward, false);
  storage.set('mantras:settings:vajrasattva', JSON.stringify({ faceOutward: 'true' }));
  assert.equal(loadSettings(vajrasattva).faceOutward, false);
});

test('old preferences and counts survive; malformed saved settings cannot corrupt rendering', () => {
  storage.clear();
  storage.set('mantras:settings:vajrasattva', JSON.stringify({ period: 23, 'seat.lotus': true, seedScale: 2,
    angle: -20, malaSize: 0, 'seat.petals': 7, 'vajra.view': 'invalid', ringScale: 'large', glow: null }));
  storage.set('mantras:count:vajrasattva', '{"total":217}');
  const s = loadSettings(vajrasattva);
  assert.equal(s.period, 23); assert.equal(s.seedScale, 2); assert.equal(s['seat.lotus'], true);
  assert.equal(s.angle, 2); assert.equal(s.malaSize, 1); assert.equal(s['seat.petals'], 16);
  assert.equal(s['vajra.view'], 'mantra'); assert.equal(s.ringScale, 1); assert.equal(s.glow, 1);
  assert.equal(loadCount(vajrasattva), 217);
  s['vajra.enabled'] = true; s['vajra.view'] = 'hub'; s['seat.opacity'] = 0.28; s.pinTap = true;
  saveSettings(vajrasattva, s);
  assert.equal(loadSettings(vajrasattva)['vajra.view'], 'hub');
  assert.equal(loadSettings(vajrasattva)['seat.opacity'], 0.28);
  assert.equal(loadSettings(tara)['vajra.enabled'], false); assert.equal(loadSettings(tara).pinTap, true);
  storage.set('mantras:settings:green-tara', JSON.stringify({ script: 'phonetics' }));
  s.phoneticsBelow = true; saveSettings(vajrasattva, s);
  assert.equal(loadSettings(tara).phoneticsBelow, true);
  assert.equal(loadSettings(tara).script, 'tibetan');
  storage.set('mantras:count:vajrasattva', '{"total":-4}'); assert.equal(loadCount(vajrasattva), 0);
  storage.set('mantras:prefs', '"invalid"'); storage.set('mantras:settings:vajrasattva', '[]');
  assert.equal(loadSettings(vajrasattva).period, vajrasattva.motion.period);
});

test('all petal forms and separate translucency render finite geometry without invisible occlusion', () => {
  const scene = new THREE.Group(), seats = createSeats(scene), s = defaultsFor(vajrasattva);
  Object.assign(s, { 'seat.lotus': true, 'seat.sun': true, 'seat.moon': true });
  for (const count of [4, 8, 16, 1000]) for (const quality of ['low', 'high']) {
    s['seat.petals'] = count;
    const bounds = seats.update({ settings: s, top: -0.2, width: 1, quality });
    assert.ok(bounds.bottom < -0.2 && bounds.outer > 1);
    scene.traverse(n => { if (n.geometry) assert.ok(n.geometry.attributes.position.array.every(Number.isFinite)); });
  }
  Object.assign(s, { 'seat.appearance': 'translucent', 'seat.opacity': 0.25 });
  seats.update({ settings: s, top: 0, width: 1 });
  for (const name of ['sun-disc', 'moon-disc']) {
    const m = scene.getObjectByName(name).material;
    assert.equal(m.opacity, 0.25); assert.equal(m.depthWrite, false);
  }
  Object.assign(s, { 'seat.independent': true, 'seat.sun.opacity': 0, 'seat.moon.opacity': 0.7 });
  seats.update({ settings: s, top: 0, width: 1 });
  assert.equal(scene.getObjectByName('sun-disc').visible, false);
  assert.equal(scene.getObjectByName('moon-disc').material.opacity, 0.7);
  s['seat.appearance'] = 'solid'; seats.update({ settings: s, top: 0, width: 1 });
  assert.equal(scene.getObjectByName('sun-disc').material.depthWrite, true);
  seats.dispose(); assert.equal(scene.children.length, 0);
});

test('vajra contains the complete mantra bounds and has five prongs at both ends', () => {
  const extent = { radius: 3.2, half: 0.5, seedTop: 0.8, seedBottom: -0.4 };
  const bounds = vajraLayout(extent);
  assert.ok(Math.hypot(extent.radius, extent.seedTop) < bounds.hubRadius);
  assert.ok((extent.radius / bounds.hubRadius) ** 2 + (extent.seedTop / bounds.hubHeight) ** 2 < 1);
  const parent = new THREE.Group(), v = createVajra(parent), s = defaultsFor(vajrasattva);
  s['vajra.enabled'] = true; v.update(s, extent);
  for (const sign of [-1, 1]) {
    assert.ok(v.group.getObjectByName(`axial-prong-${sign}`));
    assert.equal(v.group.children.filter(n => n.name.startsWith(`curved-prong-${sign}-`)).length, 4);
  }
  v.group.traverse(n => { if (n.geometry) assert.ok(n.geometry.attributes.position.array.every(Number.isFinite)); });
  // The model is broad enough to match the reference silhouette, and every
  // carving stays inside the bounds used for camera framing.
  assert.ok(bounds.half / bounds.radius > 2.5 && bounds.half / bounds.radius < 3);
  for (const mesh of v.group.children) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      assert.ok(Math.hypot(p.getX(i), p.getZ(i)) * bounds.scale <= bounds.radius + 1e-5);
      assert.ok(Math.abs(p.getY(i)) * bounds.scale <= bounds.half + 1e-5);
    }
  }
  assert.ok(v.group.children.length <= 16, 'ornaments are batched for mobile rendering');
  for (const opacity of [0, 0.18, 0.6, 1]) {
    s['vajra.opacity'] = opacity; s['vajra.view'] = 'whole'; v.update(s, extent);
    assert.equal(v.group.visible, opacity > 0);
    for (const mesh of v.group.children) {
      assert.equal(mesh.material.uniforms.opacity.value, opacity, mesh.name);
      assert.equal(mesh.material.depthWrite, opacity === 1, mesh.name);
      assert.equal(mesh.material.transparent, opacity < 1, mesh.name);
    }
  }
  s['vajra.opacity'] = .24;
  for (const view of ['mantra', 'hub']) {
    s['vajra.view'] = view; v.update(s, extent);
    assert.deepEqual(v.group.children.filter(m => m.visible).map(m => m.name), ['central-hub']);
  }
  v.dispose(); assert.equal(parent.children.length, 0);
});

test('whole-vajra framing keeps top, base and outer edges within portrait and landscape viewports', () => {
  const extent = { radius: 3, half: 8, seedTop: 8, bottom: -9.2, fill: 0.86, angle: 10 };
  for (const aspect of [320 / 640, 390 / 844, 844 / 390, 1440 / 900]) {
    const pose = fixedPose({ mantra: vajrasattva, angle: 23, aspect, extent });
    const cam = new THREE.PerspectiveCamera(pose.fov, aspect, 0.01, 1000);
    cam.position.copy(pose.eye); cam.lookAt(pose.target); cam.updateMatrixWorld();
    for (let i = 0; i < 72; i++) for (const y of [extent.bottom, extent.half]) {
      const a = i / 72 * Math.PI * 2;
      const p = new THREE.Vector3(Math.sin(a) * extent.radius, y, Math.cos(a) * extent.radius).project(cam);
      assert.ok(Math.abs(p.x) <= 0.87 && Math.abs(p.y) <= 0.73, `${aspect}: ${p.toArray()}`);
    }
  }
});

test('automatic quality lowers sustained slow rendering without oscillation', () => {
  const q = createQualityController(); q.reset('auto');
  for (let i = 0; i < 500; i++) q.sample(1 / 25, 'auto');
  assert.equal(q.detail, 'low'); assert.ok(q.scale >= 0.65);
  const low = q.scale; for (let i = 0; i < 60; i++) q.sample(1 / 60, 'auto');
  assert.equal(q.scale, low);
  q.reset('high'); for (let i = 0; i < 500; i++) q.sample(0.05, 'high');
  assert.equal(q.scale, 1);
});
