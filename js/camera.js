// The two ways of looking: the fixed view of the design (an elevation above
// the ring, the whole garland framed) and a free camera, as in the World
// System: drag to turn round the garland, pinch or scroll to come nearer,
// two fingers to slide.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const _p = new THREE.Vector3();

// Framed so the ring and its letters fill `fill` of the width and leave the
// top and bottom bars clear. Returns the eye position and vertical fov.
export function fixedPose({ mantra, angle, aspect, extent }) {
  const e = (Math.max(0, Math.min(90, angle)) * Math.PI) / 180;
  const d = (mantra.view.distance ?? 3) * extent.radius;
  const eye = new THREE.Vector3(0, d * Math.sin(e), d * Math.cos(e) + 1e-6);
  const cam = new THREE.PerspectiveCamera(40, aspect, 0.01, 100);
  cam.position.copy(eye);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  let tx = 0, ty = 0;
  const probe = (x, y, z) => {
    _p.set(x, y, z).applyMatrix4(cam.matrixWorldInverse);
    const depth = Math.max(0.05, -_p.z);
    tx = Math.max(tx, Math.abs(_p.x) / depth);
    ty = Math.max(ty, Math.abs(_p.y) / depth);
  };
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const x = Math.sin(a) * extent.radius, z = Math.cos(a) * extent.radius;
    probe(x, extent.half, z);
    probe(x, -extent.half, z);
  }
  probe(0, extent.seedTop, 0);
  const fillW = mantra.view.fill ?? 0.9, fillV = 0.74;
  const tanV = Math.max(ty / fillV, tx / (fillW * aspect));
  return { eye, fov: (2 * Math.atan(tanV) * 180) / Math.PI };
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.9;
  controls.minDistance = 0.15;
  controls.maxDistance = 14;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.target.set(0, 0, 0);
  return controls;
}
