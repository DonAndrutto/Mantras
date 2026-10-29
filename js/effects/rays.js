// Light rays from the seed, turning slowly behind it. Shared by every mantra;
// they take the mantra's halo colour.
import * as THREE from 'three';

function raysTexture(size = 512, count = 28) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = size / 2;
  ctx.translate(r, r);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const w = (i % 2 ? 0.035 : 0.06) * Math.PI;
    const len = r * (i % 2 ? 0.78 : 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, a - w / 2, a + w / 2);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createRays({ stage }) {
  const texture = raysTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture, color: new THREE.Color(stage.pal.halo).lerp(new THREE.Color(stage.pal.hi), 0.35),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = -1;
  stage.group.add(mesh);
  return {
    update({ time, settings, camera }) {
      const amount = settings.rays;
      mesh.visible = amount > 0;
      if (!mesh.visible) return;
      camera.getWorldQuaternion(mesh.quaternion);
      mesh.rotateZ(time * 0.05);
      mesh.position.copy(stage.seed.position);
      mesh.scale.setScalar((1.2 + 1.6 * amount) * Math.max(1, settings.ringScale));
      material.opacity = amount * (0.22 + 0.08 * (stage.breath ?? 0.5));
    },
    dispose() { mesh.removeFromParent(); mesh.geometry.dispose(); material.dispose(); texture.dispose(); },
  };
}
