// The seat of the seed syllable: a lotus, a sun disc and a moon disc, stacked
// in that order from the bottom, any of them on or off. The discs are paper
// thin and a little wider than the garland, so the garland turns above them,
// within their rim; the lotus opens beyond them. The seed hovers just above
// whichever seat is uppermost, without touching it.
//
// The lotus has 4, 8, 16 or a thousand petals (very many, in rising tiers),
// as texts specify. Built at unit size and scaled to the garland each frame.
// Solid, so it hides the syllables behind it.
import * as THREE from 'three';

const LIGHT = new THREE.Vector3(0.35, 1, 0.55).normalize();

// Vertex colours lit by a fixed light from above and in front, so the forms
// read as forms without any lights in the scene.
function shade(geometry, colorAt) {
  geometry.computeVertexNormals();
  const pos = geometry.attributes.position, nor = geometry.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(nor, i);
    const lit = 0.62 + 0.38 * Math.abs(n.dot(LIGHT));
    colorAt(i, c);
    col.set([c.r * lit, c.g * lit, c.b * lit], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geometry;
}

// One tier of petals as one geometry: pointed blades rising from the pod,
// their sides curling up.
function tier({ count, offset = 0, base, length, width, rise, tilt, cup, colors }) {
  const U = 12, V = 6;
  const pos = [], uv = [], idx = [];
  for (let k = 0; k < count; k++) {
    const angle = ((k + offset) / count) * Math.PI * 2;
    const r = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const t = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const first = pos.length / 3;
    let rho = base, y = rise, prev = 0;
    for (let i = 0; i <= U; i++) {
      const u = i / U;
      if (i > 0) {
        const e = tilt[0] + (tilt[1] - tilt[0]) * Math.pow(u, 1.6);
        const ds = (u - prev) * length;
        rho += Math.cos(e) * ds; y += Math.sin(e) * ds;
      }
      prev = u;
      const w = width * Math.pow(Math.sin(Math.PI * Math.min(u, 0.999)), 0.65) * (1 - 0.25 * u);
      for (let j = 0; j <= V; j++) {
        const v = (j / V) * 2 - 1;
        const p = r.clone().multiplyScalar(rho).addScaledVector(t, v * w);
        pos.push(p.x, y + cup * v * v * w, p.z);
        uv.push(u, v);
      }
    }
    for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
      const a = first + i * (V + 1) + j, b = a + V + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const [cBase, cMid, cTip, cEdge] = colors.map(h => new THREE.Color(h));
  return shade(g, (i, c) => {
    const u = uv[i * 2], v = Math.abs(uv[i * 2 + 1]);
    c.copy(u < 0.5 ? cBase.clone().lerp(cMid, u / 0.5) : cMid.clone().lerp(cTip, (u - 0.5) / 0.5));
    c.lerp(cEdge, Math.pow(v, 3) * 0.55);
  });
}

const OUTER = ['#e9bccb', '#dc8aa4', '#c7587c', '#f3d6e0'];
const INNER = ['#efcad6', '#e29cb2', '#cf6b8d', '#f6e0e8'];

// Petal tiers for each lotus, outermost first.
const LOTUSES = {
  4: [{ count: 4, base: 0.3, length: 0.78, width: 0.52, rise: -0.16, tilt: [0.05, 0.7], cup: 0.28, colors: OUTER }],
  8: [{ count: 8, base: 0.3, length: 0.74, width: 0.34, rise: -0.16, tilt: [0.05, 0.72], cup: 0.32, colors: OUTER }],
  16: [
    { count: 8, base: 0.32, length: 0.72, width: 0.32, rise: -0.16, tilt: [0.04, 0.7], cup: 0.32, colors: OUTER },
    { count: 8, offset: 0.5, base: 0.36, length: 0.62, width: 0.3, rise: -0.15, tilt: [0.12, 0.8], cup: 0.36, colors: INNER },
  ],
  // tiers stepping inward and upward, each opening outward past the discs'
  // rim, so none rises through the discs or over the garland
  1000: [
    { count: 24, base: 0.3, length: 0.78, width: 0.15, rise: -0.22, tilt: [0.0, 0.35], cup: 0.4, colors: OUTER },
    { count: 32, offset: 0.5, base: 0.38, length: 0.68, width: 0.13, rise: -0.17, tilt: [0.05, 0.42], cup: 0.42, colors: OUTER },
    { count: 40, base: 0.46, length: 0.58, width: 0.11, rise: -0.12, tilt: [0.1, 0.5], cup: 0.44, colors: INNER },
    { count: 48, offset: 0.5, base: 0.54, length: 0.48, width: 0.095, rise: -0.07, tilt: [0.15, 0.58], cup: 0.46, colors: INNER },
    { count: 56, base: 0.6, length: 0.4, width: 0.08, rise: -0.03, tilt: [0.2, 0.65], cup: 0.48, colors: INNER },
  ],
};
export const PETALS = [4, 8, 16, 1000];

function lotus(petals) {
  const parts = (LOTUSES[petals] || LOTUSES[16]).map(tier);
  // the pod the discs rest on, its top at y = 0
  const pod = new THREE.CylinderGeometry(0.42, 0.34, 0.12, 48, 1);
  pod.translate(0, -0.06, 0);
  const cTop = new THREE.Color('#f6d77a'), cSide = new THREE.Color('#c99a3e');
  parts.push(shade(pod, (i, c) => c.copy(pod.attributes.position.getY(i) > -0.01 ? cTop : cSide)));
  return parts;
}

function disc(center, edge, side) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 96, 1);
  const cC = new THREE.Color(center), cE = new THREE.Color(edge), cS = new THREE.Color(side);
  const p = g.attributes.position;
  return shade(g, (i, c) => {
    const y = p.getY(i), rad = Math.hypot(p.getX(i), p.getZ(i));
    if (Math.abs(y) > 0.49 && rad < 0.999) c.copy(cC).lerp(cE, Math.pow(rad, 1.6));
    else if (y > 0.49) c.copy(cE);
    else c.copy(cS);
  });
}

export const SEATS = [
  { key: 'lotus', label: 'Lotus' },
  { key: 'sun', label: 'Sun disc' },
  { key: 'moon', label: 'Moon disc' },
];

export function createSeats(parent) {
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const lotusGroup = new THREE.Group();
  let petals = null, lotusParts = [];
  const sunGeo = disc('#ffd66b', '#ec8f22', '#b85f17');
  const moonGeo = disc('#dfe7f3', '#a9bbd6', '#7f93b3');
  const sun = new THREE.Mesh(sunGeo, material);
  const moon = new THREE.Mesh(moonGeo, material);
  group.add(lotusGroup, sun, moon);
  parent.add(group);

  function buildLotus(n) {
    for (const g of lotusParts) g.dispose();
    lotusGroup.clear();
    lotusParts = lotus(n);
    for (const g of lotusParts) lotusGroup.add(new THREE.Mesh(g, material));
    petals = n;
  }

  return {
    // top: the highest the stack may reach; width: the garland's radius.
    // Returns the stack's bottom and its outer radius, or null when empty.
    update({ settings, top, width }) {
      const on = { lotus: settings['seat.lotus'], sun: settings['seat.sun'], moon: settings['seat.moon'] };
      group.visible = on.lotus || on.sun || on.moon;
      if (!group.visible) return null;
      const discR = 1.08 * width, discT = 0.008 * width;
      let y = top;
      for (const [key, mesh] of [['moon', moon], ['sun', sun]]) {
        mesh.visible = on[key];
        if (!on[key]) continue;
        mesh.scale.set(discR, discT, discR);
        mesh.position.set(0, y - discT / 2, 0);
        y -= discT;
      }
      lotusGroup.visible = on.lotus;
      let outer = on.sun || on.moon ? discR : 0;
      if (on.lotus) {
        if (petals !== settings['seat.petals']) buildLotus(settings['seat.petals']);
        const L = discR * 1.3;
        lotusGroup.scale.set(L, L * 0.8, L);
        lotusGroup.position.set(0, y, 0);
        y -= 0.2 * L;
        outer = L;
      }
      return { bottom: y, outer };
    },
    dispose() {
      group.removeFromParent();
      material.dispose();
      for (const g of [...lotusParts, sunGeo, moonGeo]) g.dispose();
    },
  };
}
