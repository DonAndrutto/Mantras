// One mantra in three dimensions: its rings, the seed at the hub and the
// light around them. Units are garland radii; the ring lies in the XZ plane
// around the origin and the default viewer stands on +Z.
//
// Angles: a syllable at angle φ stands at (sin φ, 0, cos φ), so φ = 0 is the
// front and φ grows counter-clockwise seen from above.
import * as THREE from 'three';
import { ringTokens } from './tibetan.js';
import { makeGlyphSet, glyphMaterial, radialTexture } from './glyphs.js';

const TAU = Math.PI * 2;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

function ringLayout(ring, tokens, set, script) {
  const adv = tokens.map(t => set.get(t).advance);
  const gap = script === 'phonetics' ? (ring.gapPhonetics ?? 0.34) : (ring.gap ?? 0.3);
  let centers;
  if (ring.spacing === 'even') {
    centers = tokens.map((_, i) => (i / tokens.length) * TAU);
  } else {
    const slots = adv.map(a => a + gap);
    const sum = slots.reduce((a, b) => a + b, 0) || 1;
    let cum = 0;
    centers = slots.map(s => { const c = ((cum + s / 2) / sum) * TAU; cum += s; return c; });
    const c0 = centers[0];
    centers = centers.map(c => c - c0);
  }
  // Em size in radii at the ring's own radius: 'auto' closes the ring; a fixed
  // size is held back only where it would make neighbours touch.
  const r0 = ring.radius ?? 1;
  const sumAdv = adv.reduce((a, b) => a + b, 0) || 1;
  const sumSlots = adv.reduce((a, b) => a + b + gap, 0) || 1;
  const auto = (TAU * r0) / sumSlots;
  let size;
  if (ring.letterSize === 'auto') size = auto;
  else if (script === 'phonetics') size = Math.min(ring.letterSize, auto);
  else size = Math.min(ring.letterSize, (TAU * r0 * 0.98) / sumAdv);
  return { centers, size };
}

export class Stage {
  constructor({ mantra, settings, renderer }) {
    this.mantra = mantra;
    this.script = settings.script;
    this.group = new THREE.Group();
    this.pal = mantra.palette;
    this.rings = [];
    this.disposables = [];
    this.rot = 0;

    const phon = settings.script === 'phonetics';
    for (const ring of mantra.rings) {
      const script = phon && ring.phonetics ? 'phonetics' : 'tibetan';
      const tokens = ringTokens(ring, script);
      const set = makeGlyphSet(tokens, { script, px: tokens.length > 40 ? 112 : 192, blur: ring.blur ?? 0.25, renderer });
      this.disposables.push(set);
      const { centers, size } = ringLayout(ring, tokens, set, script);
      const items = tokens.map((t, i) => {
        const g = set.get(t);
        const material = glyphMaterial(g.texture, this.pal);
        this.disposables.push(material);
        const mesh = new THREE.Mesh(g.geometry, material);
        this.group.add(mesh);
        return { mesh, material, c: centers[i], phi: 0 };
      });
      const height = Math.max(...tokens.map(t => set.get(t).height));
      this.rings.push({ spec: ring, items, size, height });
    }

    const seed = mantra.seed;
    const seedScript = phon && seed.phonetics ? 'phonetics' : 'tibetan';
    const seedText = seedScript === 'phonetics' ? seed.phonetics : seed.text;
    const seedSet = makeGlyphSet([seedText], { script: seedScript, px: 384, blur: seed.blur ?? 0.25, renderer });
    this.disposables.push(seedSet);
    const sg = seedSet.get(seedText);
    this.seedMaterial = glyphMaterial(sg.texture, this.pal);
    this.disposables.push(this.seedMaterial);
    this.seed = new THREE.Mesh(sg.geometry, this.seedMaterial);
    if (seed.onTop) { this.seedMaterial.depthTest = false; this.seed.renderOrder = 10; }
    this.seedSize = seed.size * (seedScript === 'phonetics' ? seed.phoneticsScale ?? 0.45 : 1);
    this.seedHeight = sg.height;
    this.group.add(this.seed);

    // light: a wide halo behind the seed, a pool under the ring
    const soft = radialTexture();
    this.disposables.push(soft);
    const additive = (color, opacity) => new THREE.MeshBasicMaterial({
      map: soft, color: new THREE.Color(color), transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive(this.pal.halo, 0.12));
    this.halo.renderOrder = -2;
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive(this.pal.glow, 0.05));
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.renderOrder = -3;
    this.group.add(this.halo, this.pool);
    this.disposables.push(this.halo.geometry, this.halo.material, this.pool.geometry, this.pool.material);

    this._cam = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  // Half the height the rings and seed need at scale 1, for framing the view.
  extent() {
    let half = 0;
    for (const r of this.rings) half = Math.max(half, (r.size * r.height) / 2);
    const seedTop = this.seedSize * (this.mantra.seed.lift + this.seedHeight / 2);
    return { radius: Math.max(...this.mantra.rings.map(r => r.radius ?? 1)), half, seedTop };
  }

  // Where the syllables are now, in the stage's own space (for effects).
  sources() {
    const out = [];
    for (const r of this.rings) if ((r.spec.turns ?? 1) !== 0) for (const it of r.items) out.push(it.mesh.position);
    return out;
  }

  update({ rot, time, camera, settings }) {
    this.rot = rot;
    // the viewer, seen from the stage
    camera.getWorldPosition(this._cam);
    this.group.worldToLocal(this._cam);
    camera.getWorldQuaternion(this._q);
    const front = Math.atan2(this._cam.x, this._cam.z);
    const ca = Math.cos(Math.atan2(this._cam.y, Math.hypot(this._cam.x, this._cam.z)));

    const spin = settings.spin === 'cw' ? -1 : 1;
    for (const r of this.rings) {
      const s = r.spec;
      const turns = s.turns ?? 1;
      const order = (turns !== 0 ? settings.order : s.order) === 'ccw' ? 1 : -1;
      const scale = s.scaleWith === 'seed' ? settings.seedScale : settings.ringScale;
      const radius = (s.radius ?? 1) * scale;
      const em = r.size * scale * (s.scaleWith === 'seed' ? 1 : settings.letterScale);
      const alpha = spin * rot * turns;
      const op = s.opacity || { min: 0.7, max: 0.7 };
      const exp = op.exp ?? 1.5;
      const norm = op.tilt ? Math.pow((ca + 1) / 2, exp) : 1;
      const hlSpec = s.highlight;
      for (const it of r.items) {
        const phi = order * it.c + alpha;
        it.phi = phi;
        const m = it.mesh;
        m.position.set(radius * Math.sin(phi), (s.y ?? 0) * scale, radius * (s.depth ?? 1) * Math.cos(phi));
        const d = wrap(phi - front);
        const cp = Math.cos(d);
        const c = op.tilt ? cp * ca : cp;
        const o = op.min + (op.max - op.min) * Math.min(1, Math.pow((c + 1) / 2, exp) / norm);
        const hl = hlSpec ? Math.exp(-(d * d) / (2 * hlSpec.sigma * hlSpec.sigma)) * settings.highlight : 0;
        m.scale.setScalar(em * (1 + (hlSpec?.scale ?? 0) * hl));
        if (s.facing === 'outward') m.rotation.set(0, phi, 0);
        else if (s.facing === 'inward') m.rotation.set(0, phi + Math.PI, 0);
        else m.quaternion.copy(this._q);
        const u = it.material.uniforms;
        u.opacity.value = o;
        u.mixHi.value = Math.min(1, hl);
        u.glow.value = settings.glow * ((s.glow ?? 0) + (hlSpec?.glow ?? 0) * hl);
      }
    }

    // the seed breathes: per round of the mantra, or on its own clock
    const b = this.mantra.seed.breath || {};
    const breath = b.perRound
      ? 0.5 + 0.5 * Math.sin(b.perRound * rot)
      : 0.5 + 0.5 * Math.sin((TAU * time) / (b.period || 6));
    this.breath = breath;
    const seedEm = this.seedSize * settings.seedScale;
    this.seed.scale.setScalar(seedEm);
    this.seed.position.set(0, seedEm * this.mantra.seed.lift, 0);
    this.seed.quaternion.copy(this._q);
    const su = this.seedMaterial.uniforms;
    su.opacity.value = this.mantra.seed.opacity ?? 0.75;
    su.glow.value = settings.glow * (0.30 + 0.22 * breath);

    const reach = Math.max(1.2, settings.ringScale) * 1.5;
    this.halo.position.copy(this.seed.position);
    this.halo.quaternion.copy(this._q);
    this.halo.scale.setScalar(Math.max(seedEm * 6, 1.2));
    this.halo.material.opacity = settings.glow * (0.07 + 0.05 * breath);
    const ringHalf = this.rings[0] ? this.rings[0].size * this.rings[0].height * settings.ringScale * settings.letterScale / 2 : 0;
    this.pool.position.set(0, -ringHalf * 1.1, 0);
    this.pool.scale.set(reach * 2, reach * 2, 1);
    this.pool.material.opacity = settings.glow * 0.08;
  }

  dispose() {
    this.group.removeFromParent();
    for (const d of this.disposables) d.dispose();
  }
}
