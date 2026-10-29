// Vajrasattva's nectar: milk-white drops welling from the syllables and the
// seed and falling below the garland. Amount 0…1 sets how many.
import * as THREE from 'three';

const MAX = 700;

const VERT = /* glsl */`
  attribute float size;
  attribute float alpha;
  uniform float scale;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / max(0.05, -mv.z);
    vAlpha = alpha;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */`
  uniform vec3 color;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    // a drop: round below, drawn out above
    p.y *= p.y < 0.0 ? 1.6 : 1.0;
    float r = length(p);
    float a = smoothstep(1.0, 0.0, r);
    a = a * a * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(color * a, a);
  }`;

export function createNectar({ stage }) {
  const pos = new Float32Array(MAX * 3);
  const vel = new Float32Array(MAX);
  const life = new Float32Array(MAX);
  const size = new Float32Array(MAX);
  const alpha = new Float32Array(MAX);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    uniforms: { scale: { value: 600 }, color: { value: new THREE.Vector3(1, 0.985, 0.94) } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  stage.group.add(points);

  let carry = 0, next = 0;
  function spawn(src, spread) {
    for (let n = 0; n < MAX; n++) {
      const i = (next + n) % MAX;
      if (life[i] > 0) continue;
      next = i + 1;
      pos[i * 3] = src.x + (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = src.y - spread * 0.6;
      pos[i * 3 + 2] = src.z + (Math.random() - 0.5) * spread;
      vel[i] = 0.05 + Math.random() * 0.1;
      life[i] = 1e-6;
      size[i] = 0.018 + Math.random() * 0.03;
      return;
    }
  }

  return {
    update({ dt, settings, viewportHeight, fov }) {
      const on = settings['fx.nectar'];
      const amount = settings['fx.nectar.amount'];
      const ring = settings.ringScale;
      material.uniforms.scale.value = viewportHeight / (2 * Math.tan((fov * Math.PI) / 360));
      if (on && amount > 0) {
        carry += dt * (4 + 60 * amount * amount);
        const sources = stage.sources();
        while (carry >= 1) {
          carry -= 1;
          if (Math.random() < 0.3 || !sources.length) spawn(stage.seed.position, 0.06 * settings.seedScale);
          else spawn(sources[(Math.random() * sources.length) | 0], 0.03 * ring);
        }
      }
      const floor = -1.8 * Math.max(1, ring);
      let alive = 0;
      for (let i = 0; i < MAX; i++) {
        if (life[i] <= 0) { alpha[i] = 0; continue; }
        alive++;
        life[i] += dt;
        // a slow welling, then a fall that gathers pace
        vel[i] = Math.min(1.1 * ring, vel[i] + dt * (life[i] < 0.5 ? 0.15 : 0.9) * ring);
        pos[i * 3 + 1] -= vel[i] * dt;
        const y = pos[i * 3 + 1];
        const fadeIn = Math.min(1, life[i] / 0.5);
        const fadeOut = Math.min(1, Math.max(0, (y - floor) / (0.8 * ring)));
        alpha[i] = 0.85 * fadeIn * fadeOut;
        if (y < floor) life[i] = 0;
      }
      points.visible = alive > 0;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
    },
    dispose() { points.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
