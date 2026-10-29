// The seat of the seed syllable: a lotus, a sun disc and a moon disc, stacked
// in that order from the bottom, any of them on or off. The stack is as wide as
// the garland and is built beneath the seed, so the seed hovers just above
// whichever seat is uppermost without touching it.
//
// Built at unit size (outer radius 1) and scaled to the garland each frame.
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

// One petal: a pointed blade rising from the pod, its sides curling up.
function petal({ angle, base, length, width, rise, tilt, cup, colors }) {
  const U = 14, V = 8;
  const pos = [], uv = [], idx = [];
  const r = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  const t = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
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
      p.y = y + cup * v * v * w;
      pos.push(p.x, p.y, p.z);
      uv.push(u, v);
    }
  }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
    const a = i * (V + 1) + j, b = a + V + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const [cBase, cMid, cTip, cEdge] = colors.map(h => new THREE.Color(h));
  return shade(g, (i, c) => {
    const u = uv[i * 2], v = Math.abs(uv[i * 2 + 1]);
    c.copy(u < 0.5 ? cBase.clone().lerp(cMid, u / 0.5) : cMid.clone().lerp(cTip, (u - 0.5) / 0.5));
    c.lerp(cEdge, Math.pow(v, 3) * 0.55);
  });
}

function lotus() {
  const parts = [];
  const outer = ['#e9bccb', '#dc8aa4', '#c7587c', '#f3d6e0'];
  const inner = ['#efcad6', '#e29cb2', '#cf6b8d', '#f6e0e8'];
  for (let k = 0; k < 16; k++) parts.push(petal({
    angle: (k / 16) * Math.PI * 2, base: 0.32, length: 0.72, width: 0.2, rise: -0.16,
    tilt: [0.05, 0.75], cup: 0.35, colors: outer,
  }));
  for (let k = 0; k < 8; k++) parts.push(petal({
    angle: ((k + 0.5) / 8) * Math.PI * 2, base: 0.28, length: 0.56, width: 0.24, rise: -0.1,
    tilt: [0.35, 1.15], cup: 0.4, colors: inner,
  }));
  // the pod the discs rest on, its top at y = 0
  const pod = new THREE.CylinderGeometry(0.42, 0.34, 0.12, 48, 1);
  pod.translate(0, -0.06, 0);
  const cTop = new THREE.Color('#f6d77a'), cSide = new THREE.Color('#c99a3e');
  parts.push(shade(pod, (i, c) => c.copy(pod.attributes.position.getY(i) > -0.01 ? cTop : cSide)));
  return parts;
}

function disc(center, edge, side) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 72, 1);
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
  const lotusParts = lotus();
  for (const g of lotusParts) lotusGroup.add(new THREE.Mesh(g, material));
  const sunGeo = disc('#ffd66b', '#ec8f22', '#b85f17');
  const moonGeo = disc('#dfe7f3', '#a9bbd6', '#7f93b3');
  const sun = new THREE.Mesh(sunGeo, material);
  const moon = new THREE.Mesh(moonGeo, material);
  group.add(lotusGroup, sun, moon);
  parent.add(group);

  return {
    // top: the height of the seed's lowest point; width: the garland's radius
    update({ settings, top, width, gap }) {
      const on = { lotus: settings['seat.lotus'], sun: settings['seat.sun'], moon: settings['seat.moon'] };
      group.visible = on.lotus || on.sun || on.moon;
      if (!group.visible) return null;
      const discR = 0.62 * width, discT = 0.045 * width;
      let y = top - gap;
      for (const [key, mesh] of [['moon', moon], ['sun', sun]]) {
        mesh.visible = on[key];
        if (!on[key]) continue;
        mesh.scale.set(discR, discT, discR);
        mesh.position.set(0, y - discT / 2, 0);
        y -= discT;
      }
      lotusGroup.visible = on.lotus;
      if (on.lotus) {
        lotusGroup.scale.set(width, width * 0.8, width);
        lotusGroup.position.set(0, y, 0);
        y -= 0.2 * width;
      }
      return y;    // the bottom of the stack
    },
    dispose() {
      group.removeFromParent();
      material.dispose();
      for (const g of [...lotusParts, sunGeo, moonGeo]) g.dispose();
    },
  };
}
