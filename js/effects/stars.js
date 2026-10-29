// A sphere of faint stars far beyond the garland, for the "Stars" background.
// Lives in the scene, so it is there in VR and turns with a free camera.
import * as THREE from 'three';

export function createStars({ parent, count = 1800, radius = 40 }) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos.set([radius * s * Math.cos(a), radius * u, radius * s * Math.sin(a)], i * 3);
    const b = 0.35 + 0.65 * Math.pow(Math.random(), 3);
    col.set([b, b * 0.97, b * 0.9], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const material = new THREE.PointsMaterial({
    size: 1.6, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.8, depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = -10;
  parent.add(points);
  return {
    set visible(v) { points.visible = v; },
    update(dt) { points.rotation.y += dt * 0.004; },
    dispose() { points.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
