// One mantra in three dimensions: its rings, the seed at the hub, its seat and
// the light around them. Units are garland radii; the ring lies in the XZ
// plane around the origin and the default viewer stands on +Z.
//
// Every syllable, and the seed, stands upright facing the viewer from any
// angle and any camera. A syllable at angle φ stands at (sin φ, 0, cos φ), so
// φ = 0 is the front and φ grows counter-clockwise seen from above.
import * as THREE from 'three';
import { tibetanSyllables, ringSyllables } from './tibetan.js';
import { makeGlyphSet, glyphMaterial, softLightMaterial } from './glyphs.js';
import { createSeats } from './seats.js';

const TAU = Math.PI * 2;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// own: how many syllables one recitation has. The ring keeps its size: held
// twice or three times, the mantra runs closer together round the same ring,
// and the letters give way only once they would otherwise touch.
// Every two neighbours have the same air between their ink, whatever their
// widths: what is left of the ring once the letters are placed, shared out
// evenly (with a little more between one recitation and the next).
function ringLayout(ring, tokens, after, set, script, own = tokens.length) {
  const ink = tokens.map(t => set.get(t).width);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const circ = TAU * (ring.radius ?? 1);
  const ownInk = sum(ink.slice(0, own)) || 1, allInk = sum(ink) || 1, air = sum(after);
  // Em size in radii: 'auto' gives one recitation's ink `fill` of the ring
  // (a little less in phonetics, whose words are wide and low); a fixed size
  // is held back only where neighbours would come too close.
  let size;
  if (ring.letterSize === 'auto') {
    const fill = (ring.fill ?? 0.38) * (script === 'phonetics' ? 0.85 : 1), times = allInk / ownInk;
    size = (circ / ownInk) * fill * Math.min(1, 0.7 / (fill * times));
  } else size = Math.min(ring.letterSize, (circ * 0.7) / allInk);
  let centers;
  if (ring.spacing === 'even') {
    centers = tokens.map((_, i) => (i / tokens.length) * TAU);
  } else {
    const round = circ / size;                                   // the ring in em
    const gap = Math.max(0, (round - allInk - air) / tokens.length);
    let cum = 0;
    centers = ink.map((w, i) => { const c = ((cum + w / 2) / round) * TAU; cum += w + gap + after[i]; return c; });
    const c0 = centers[0];
    centers = centers.map(c => c - c0);
  }
  return { centers, size };
}

export class Stage {
  constructor({ mantra, settings }) {
    this.mantra = mantra;
    this.group = new THREE.Group();
    this.pal = mantra.palette;
    this.rings = [];
    this.disposables = [];
    this.front = null;   // { ring, index } of the syllable nearest the viewer

    const phon = settings.script === 'phonetics';
    mantra.rings.forEach((ring, ri) => {
      const script = phon ? 'phonetics' : 'tibetan';
      const syl = ringSyllables(ring, ri === 0 ? settings.repeat : 1);
      const tokens = phon ? syl.phonetics : syl.tibetan;
      const set = makeGlyphSet(tokens, { script, px: tokens.length > 40 ? 96 : 160, radius: ring.blur ?? 0.25 });
      this.disposables.push(set);
      const own = tibetanSyllables(ring.text).length;
      const { centers, size } = ringLayout(ring, tokens, syl.after, set, script, own);
      const items = tokens.map((t, i) => {
        const g = set.get(t);
        const material = glyphMaterial(g.texture, this.pal);
        this.disposables.push(material);
        const mesh = new THREE.Mesh(g.geometry, material);
        this.group.add(mesh);
        return { mesh, material, c: centers[i] };
      });
      const height = Math.max(...tokens.map(t => set.get(t).height));
      this.rings.push({ spec: ring, items, size, height, tibetan: syl.tibetan, phonetics: syl.phonetics });
    });
    // the turning syllables' positions: the same vectors, moved every frame
    this._sources = this.rings.filter(r => (r.spec.turns ?? 1) !== 0).flatMap(r => r.items.map(it => it.mesh.position));

    const seed = mantra.seed;
    const seedScript = phon && seed.phonetics ? 'phonetics' : 'tibetan';
    const seedText = seedScript === 'phonetics' ? seed.phonetics : seed.text;
    const seedSet = makeGlyphSet([seedText], { script: seedScript, px: 200, radius: seed.blur ?? 0.25 });
    this.disposables.push(seedSet);
    const sg = seedSet.get(seedText);
    this.seedMaterial = glyphMaterial(sg.texture, this.pal);
    this.disposables.push(this.seedMaterial);
    this.seed = new THREE.Mesh(sg.geometry, this.seedMaterial);
    this.seedSize = seed.size * (seedScript === 'phonetics' ? seed.phoneticsScale ?? 0.45 : 1);
    this.seedHeight = sg.height;
    this.seedBelow = sg.below;
    this.group.add(this.seed);

    this.seats = createSeats(this.group);
    this.disposables.push(this.seats);

    // light: a wide halo behind the seed, a pool under the ring
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softLightMaterial(this.pal.halo));
    this.halo.renderOrder = -2;
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softLightMaterial(this.pal.glow));
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.renderOrder = -3;
    this.group.add(this.halo, this.pool);
    this.disposables.push(this.halo.geometry, this.halo.material, this.pool.geometry, this.pool.material);

    this._cam = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._view = new THREE.Matrix4();
    this._seedView = new THREE.Vector3();
  }

  // Half the height the rings and seed need at scale 1, for framing the view.
  extent() {
    let half = 0;
    for (const r of this.rings) half = Math.max(half, (r.size * r.height) / 2);
    const seedTop = this.seedSize * (this.mantra.seed.lift + this.seedHeight / 2);
    const radius = Math.max(...this.mantra.rings.map(r => r.radius ?? 1));
    return { radius, half, seedTop };
  }

  // Where the turning syllables are now, in the stage's own space (for effects).
  sources() { return this._sources; }

  // The syllable at the front: its Tibetan and its phonetics.
  frontSyllable() {
    if (!this.front) return null;
    const r = this.rings[this.front.ring];
    return { tibetan: r.tibetan[this.front.index], phonetics: r.phonetics[this.front.index] || '' };
  }

  // Where a point falls in the view, as (x/z, y/z, z) in view space.
  _toView(p, out) {
    out.copy(p).applyMatrix4(this.group.matrixWorld).applyMatrix4(this._view);
    const z = Math.max(1e-3, -out.z);
    return out.set(out.x / z, out.y / z, z);
  }

  update({ rot, time, camera, settings }) {
    // the viewer, seen from the stage
    this.group.updateMatrixWorld();
    camera.updateMatrixWorld();
    this._view.copy(camera.matrixWorldInverse);
    camera.getWorldPosition(this._cam);
    this.group.worldToLocal(this._cam);
    camera.getWorldQuaternion(this._q);
    const front = Math.atan2(this._cam.x, this._cam.z);
    const ca = Math.cos(Math.atan2(this._cam.y, Math.hypot(this._cam.x, this._cam.z)));

    // the seed first: the syllables passing before it need to know where it is
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
    su.opacity.value = settings.seedOpacity;
    su.glow.value = settings.glow * (0.30 + 0.22 * breath + 0.5 * (this.absorb ?? 0));
    const seedView = this._toView(this.seed.position, this._seedView);
    const seedR = (seedEm * this.seedHeight * 0.5) / seedView.z;

    const spin = settings.spin === 'cw' ? -1 : 1;
    let best = Infinity;
    this.front = null;
    for (let ri = 0; ri < this.rings.length; ri++) {
      const r = this.rings[ri];
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
      for (let i = 0; i < r.items.length; i++) {
        const it = r.items[i];
        const phi = order * it.c + alpha;
        const m = it.mesh;
        m.position.set(radius * Math.sin(phi), (s.y ?? 0) * scale, radius * (s.depth ?? 1) * Math.cos(phi));
        const d = wrap(phi - front);
        if (turns !== 0 && Math.abs(d) < best) { best = Math.abs(d); this.front = { ring: ri, index: i }; }
        const cp = Math.cos(d);
        const c = op.tilt ? cp * ca : cp;
        const o = op.min + (op.max - op.min) * Math.min(1, Math.pow((c + 1) / 2, exp) / norm);
        const hl = hlSpec ? Math.exp(-(d * d) / (2 * hlSpec.sigma * hlSpec.sigma)) * settings.highlight : 0;
        const size = em * (1 + (hlSpec?.scale ?? 0) * hl);
        m.scale.setScalar(size);
        m.quaternion.copy(this._q);
        // a syllable nearer than the seed and over it veils it, however faint
        const v = this._toView(m.position, this._v);
        let veil = 0;
        if (v.z < seedView.z) {
          const lr = (size * r.height * 0.5) / v.z;
          const dist = Math.hypot(v.x - seedView.x, v.y - seedView.y);
          veil = settings.veil * Math.max(0, Math.min(1, (seedR + lr - dist) / lr));
        }
        const u = it.material.uniforms;
        u.opacity.value = Math.min(1, o * settings.opacity);
        u.veil.value = veil;
        u.mixHi.value = Math.min(1, hl);
        u.glow.value = settings.glow * ((s.glow ?? 0) + (hlSpec?.glow ?? 0) * hl);
      }
    }

    // The seat lies below both the seed and the garland's lowest letters,
    // so the garland turns above the discs, within their rim.
    const width = (this.mantra.rings[0]?.radius ?? 1) * settings.ringScale;
    const ringHalf = this.rings[0] ? this.rings[0].size * this.rings[0].height * settings.ringScale * settings.letterScale / 2 : 0;
    const seedBottom = this.seed.position.y - seedEm * this.seedBelow;
    const gap = Math.max(0.025 * width, 0.12 * seedEm);
    const seat = this.seats.update({ settings, top: Math.min(seedBottom, -ringHalf * 1.15) - gap, width });
    this.seat = seat;
    const seated = seat !== null;
    su.shade.value = seated ? 0.7 : 0;
    for (const r of this.rings) for (const it of r.items) it.material.uniforms.shade.value = seated ? 0.4 : 0;

    this.halo.position.copy(this.seed.position);
    this.halo.quaternion.copy(this._q);
    this.halo.scale.setScalar(Math.max(seedEm * 6, 1.2));
    this.halo.material.uniforms.opacity.value = settings.glow * (0.07 + 0.05 * breath) * (seated ? 0.35 : 1);
    const reach = Math.max(1.2, settings.ringScale, seat?.outer ?? 0) * 1.5;
    this.pool.position.set(0, Math.min(-ringHalf * 1.1, (seat?.bottom ?? 0) - 0.02), 0);
    this.pool.scale.set(reach * 2, reach * 2, 1);
    this.pool.material.uniforms.opacity.value = settings.glow * 0.08;
  }

  dispose() {
    this.group.removeFromParent();
    for (const d of this.disposables) d.dispose();
  }
}
