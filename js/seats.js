// Lotus and thin sun/moon seats. Geometry is shared within a tier; opacity
// never writes invisible depth, so translucent seats do not erase the mantra.
import * as THREE from 'three';

export const PETALS = [4, 8, 16, 1000];
export const SEATS = [
  { key: 'lotus', label: 'Lotus' }, { key: 'sun', label: 'Sun disc' }, { key: 'moon', label: 'Moon disc' },
];
const LIGHT = new THREE.Vector3(-0.35, 0.9, 0.65).normalize();
const COLORS = {
  pink: ['#a34263', '#edb6c5', '#f9e6df', '#873b59'],
  white: ['#a49593', '#f1e7da', '#fffaf0', '#b8a2a1'],
};

function paint(g, fn) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const colors = new Float32Array(p.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    fn(i, c);
    v.fromBufferAttribute(n, i);
    c.multiplyScalar(0.78 + 0.22 * Math.abs(v.dot(LIGHT)));
    c.toArray(colors, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

// Broad shoulders, a gently folded central vein, a fine dark outline, and
// an upturned tapered tip. Alternating tiers overlap like a painted lotus.
function tier({ count, offset, base, length, width, y, curl }, color, detail) {
  const U = detail === 'low' ? 14 : 24, V = detail === 'low' ? 8 : 14;
  const pos = [], uv = [], idx = [];
  for (let k = 0; k < count; k++) {
    const a = (k + offset) * Math.PI * 2 / count, start = pos.length / 3;
    for (let i = 0; i <= U; i++) {
      const u = i / U;
      const w = width * Math.pow(Math.sin(Math.PI * u), 0.72) * (0.82 + 0.18 * u);
      const r = base + length * u;
      for (let j = 0; j <= V; j++) {
        const v = j * 2 / V - 1;
        const height = y - 0.10 * Math.sin(Math.PI * u) + curl * Math.pow(u, 3)
          + 0.10 * v * v * Math.sin(Math.PI * u) + 0.035 * (1 - Math.abs(v)) * Math.sin(Math.PI * u);
        pos.push(Math.sin(a) * r + Math.cos(a) * v * w, height, Math.cos(a) * r - Math.sin(a) * v * w);
        uv.push(u, v);
      }
    }
    for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
      const x = start + i * (V + 1) + j, b = x + V + 1;
      idx.push(x, b, x + 1, b, b + 1, x + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const [root, mid, tip, edge] = COLORS[color].map(c => new THREE.Color(c));
  return paint(g, (i, c) => {
    const u = uv[2 * i], v = Math.abs(uv[2 * i + 1]);
    c.copy(root).lerp(mid, Math.min(1, u * 2.5)).lerp(tip, Math.pow(u, 2.5) * 0.65);
    c.lerp(edge, Math.pow(v, 18) * 0.58);
    c.lerp(tip, Math.exp(-v * v * 220) * Math.sin(Math.PI * u) * 0.22);
  });
}

function lotus(petals, color, detail) {
  const specs = petals === 1000
    // A dense symbolic thousand-petalled seat, rather than 1,000 meshes.
    ? Array.from({ length: 9 }, (_, i) => ({ count: 24 + i * 8, offset: i % 2 / 2,
      base: 0.30 + i * 0.055, length: 1.0 - i * 0.065, width: 0.14 - i * 0.007,
      y: -0.27 + i * 0.022, curl: 0.15 }))
    : Array.from({ length: petals === 16 ? 2 : 1 }, (_, i) => ({ count: petals === 16 ? 8 : petals,
      offset: i / 2, base: 0.30 + i * 0.08, length: 1.02 - i * 0.10,
      width: (petals === 4 ? 0.58 : 0.42) - i * 0.025, y: -0.24 + i * 0.09, curl: 0.22 - i * 0.025 }));
  const parts = specs.map(s => tier(s, color, detail));
  const pod = new THREE.CylinderGeometry(0.74, 0.48, 0.18, detail === 'low' ? 32 : 64);
  pod.translate(0, -0.11, 0);
  parts.push(paint(pod, (i, c) => c.set(pod.attributes.position.getY(i) > -0.03 ? '#dec58e' : '#a07a4e')));
  return parts;
}

function disc(center, rim, side) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 96, 1);
  const p = g.attributes.position, c0 = new THREE.Color(center), c1 = new THREE.Color(rim), c2 = new THREE.Color(side);
  return paint(g, (i, c) => {
    const y = p.getY(i), r = Math.hypot(p.getX(i), p.getZ(i));
    c.copy(y > 0.49 ? c0 : c2);
    if (y > 0.49) c.lerp(c1, Math.pow(r, 12) * 0.75);
  });
}

export function seatOpacity(settings, key) {
  if (settings['seat.appearance'] === 'solid') return 1;
  return settings[settings['seat.independent'] ? `seat.${key}.opacity` : 'seat.opacity'];
}

export function setOpacity(material, opacity) {
  const transparent = opacity < 0.999;
  if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
  material.opacity = opacity;
  material.depthWrite = !transparent;
  // Double-sided petals need one transparent pass, avoiding doubled opacity.
  material.forceSinglePass = true;
}

export function createSeats(parent) {
  const group = new THREE.Group(), lotusGroup = new THREE.Group();
  group.name = 'seats'; lotusGroup.name = 'lotus';
  const materials = Object.fromEntries(SEATS.map(({ key }) => [key,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })]));
  const sun = new THREE.Mesh(disc('#f4b05a', '#cf572c', '#9d3825'), materials.sun);
  const moon = new THREE.Mesh(disc('#fff9e9', '#d1ccc3', '#a6aab0'), materials.moon);
  sun.name = 'sun-disc'; moon.name = 'moon-disc';
  group.add(lotusGroup, sun, moon); parent.add(group);
  let signature = '', parts = [];
  return {
    group,
    update({ settings, top, width, quality = 'high' }) {
      const on = Object.fromEntries(SEATS.map(({ key }) => [key, settings[`seat.${key}`]]));
      group.visible = Object.values(on).some(Boolean);
      if (!group.visible) return null;
      let strength = 0;
      for (const { key } of SEATS) {
        const a = seatOpacity(settings, key);
        setOpacity(materials[key], a);
        if (on[key]) strength = Math.max(strength, a);
      }
      const discR = width * 1.08, thickness = width * 0.009;
      let y = top;
      for (const [key, mesh] of [['moon', moon], ['sun', sun]]) {
        mesh.visible = on[key] && materials[key].opacity > 0;
        if (!on[key]) continue;
        mesh.scale.set(discR, thickness, discR); mesh.position.y = y - thickness / 2; y -= thickness;
      }
      lotusGroup.visible = on.lotus && materials.lotus.opacity > 0;
      let outer = on.sun || on.moon ? discR : 0;
      if (on.lotus) {
        const next = `${settings['seat.petals']}/${settings['seat.color']}/${quality}`;
        if (next !== signature) {
          parts.forEach(g => g.dispose()); lotusGroup.clear();
          parts = lotus(settings['seat.petals'], settings['seat.color'], quality);
          parts.forEach(g => lotusGroup.add(new THREE.Mesh(g, materials.lotus))); signature = next;
        }
        lotusGroup.scale.setScalar(discR); lotusGroup.position.y = y;
        y -= 0.42 * discR; outer = 1.38 * discR;
      }
      return { bottom: y, outer, strength };
    },
    dispose() {
      group.removeFromParent(); parts.forEach(g => g.dispose());
      sun.geometry.dispose(); moon.geometry.dispose(); Object.values(materials).forEach(m => m.dispose());
    },
  };
}
