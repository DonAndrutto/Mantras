// Light rays from the seed, turning slowly behind it. Shared by every mantra;
// they take the mantra's halo colour. Computed per pixel, so they stay smooth
// however near the camera comes.
import * as THREE from 'three';
import { srgb } from '../glyphs.js';

const FRAG = /* glsl */`
  uniform vec3 color; uniform float opacity, turn;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float a = atan(p.y, p.x) + turn;
    float longRays = pow(max(0.0, cos(a * 14.0)), 28.0) * exp(-r * 2.0);
    float shortRays = pow(max(0.0, -cos(a * 14.0)), 36.0) * exp(-r * 3.6);
    float core = exp(-r * r * 9.0) * 0.5;
    float v = (longRays + 0.7 * shortRays + core) * (1.0 - smoothstep(0.75, 1.0, r)) * opacity;
    gl_FragColor = vec4(color * v, 0.0);
  }`;

export function createRays({ stage }) {
  const c = new THREE.Color(stage.pal.halo).lerp(new THREE.Color(stage.pal.hi), 0.35);
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: srgb(`#${c.getHexString()}`) }, opacity: { value: 0 }, turn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: FRAG,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
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
      mesh.position.copy(stage.seed.position);
      mesh.scale.setScalar((1.2 + 1.6 * amount) * Math.max(1, settings.ringScale));
      material.uniforms.turn.value = time * 0.05;
      material.uniforms.opacity.value = amount * (0.55 + 0.2 * (stage.breath ?? 0.5));
    },
    dispose() { mesh.removeFromParent(); mesh.geometry.dispose(); material.dispose(); },
  };
}
