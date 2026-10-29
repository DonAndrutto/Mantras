// Offering lights, in three phases that follow one another for as long as the
// effect is on, each lasting the chosen time (10 s, 30 s or a minute):
//   1. offering — lights rise from the seed and the syllables to the buddhas above;
//   2. return   — lights come back down from above and are absorbed into the
//                 seed and the syllables;
//   3. to beings — lights go out from the seed and the syllables downwards,
//                 spreading wide, towards beings in saṃsāra.
// Shared by every mantra; the lights take the mantra's colours. Each light
// draws a short fading trail behind it.
import * as THREE from 'three';
import { srgb } from '../glyphs.js';

const MAX = 360, TRAIL = 7, STEP = 0.028;

export const PHASES = [
  { id: 'offering', label: 'Offering', hint: 'lights rise to the buddhas' },
  { id: 'return', label: 'Returning', hint: 'lights dissolve into the seed and mantra' },
  { id: 'beings', label: 'To beings', hint: 'lights go down to saṃsāra' },
];

const VERT = /* glsl */`
  attribute float size;
  attribute float alpha;
  attribute vec3 tint;
  uniform float scale;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(size * scale / max(0.05, -mv.z), 1.0, 96.0);
    vAlpha = alpha; vTint = tint;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */`
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    float r = length(gl_PointCoord * 2.0 - 1.0);
    float a = (exp(-r * r * 9.0) + 0.35 * exp(-r * r * 2.5)) * (1.0 - smoothstep(0.8, 1.0, r)) * vAlpha;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vTint * a, 0.0);
  }`;

const easeIn = u => u * u * (1.6 - 0.6 * u);
const easeOut = u => 1 - (1 - u) * (1 - u);

export function createOfferings({ stage }) {
  const n = MAX * TRAIL;
  const pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), tint = new Float32Array(n * 3);
  const geometry = new THREE.BufferGeometry();
  for (const [name, arr, k] of [['position', pos, 3], ['size', size, 1], ['alpha', alpha, 1], ['tint', tint, 3]])
    geometry.setAttribute(name, new THREE.BufferAttribute(arr, k).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    uniforms: { scale: { value: 600 } }, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  stage.group.add(points);

  const colors = [srgb(stage.pal.hi), srgb(stage.pal.glow), srgb('#fff4d6')];
  const lights = Array.from({ length: MAX }, () => ({
    on: false, kind: 0, t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), arc: new THREE.Vector3(),
    target: -2, size: 0.03, color: colors[0],
  }));
  let carry = 0, elapsed = 0, wasOn = false, alive = 0, free = 0;
  const status = { phase: 0, progress: 0, on: false };
  const _b = new THREE.Vector3(), _p = new THREE.Vector3();

  // a point of the seed or a turning syllable, now
  const sources = stage.sources();
  const source = i => (i < 0 ? stage.seed.position : sources[i] || stage.seed.position);
  const pick = () => (Math.random() < 0.35 ? -1 : (Math.random() * sources.length) | 0);

  function spawn(kind, reach) {
    let l = null;
    for (let n = 0; n < MAX && !l; n++) { const c = lights[(free + n) % MAX]; if (!c.on) { l = c; free = (free + n + 1) % MAX; } }
    if (!l) return;
    l.on = true; l.kind = kind; l.t = 0;
    l.size = (0.025 + Math.random() * 0.035) * reach;
    l.color = colors[(Math.random() * colors.length) | 0];
    const ang = Math.random() * Math.PI * 2;
    if (kind === 0) {                       // up, to the buddhas
      l.target = pick();
      l.from.copy(source(l.target));
      const spread = (0.4 + Math.random() * 1.6) * reach;
      l.to.set(l.from.x * 0.6 + Math.cos(ang) * spread, (4.5 + Math.random() * 2.5) * reach, l.from.z * 0.6 + Math.sin(ang) * spread);
      l.dur = 2.4 + Math.random() * 1.4;
    } else if (kind === 1) {                // down from above, into the seed and syllables
      l.target = pick();
      const spread = (0.6 + Math.random() * 2.2) * reach;
      l.from.set(Math.cos(ang) * spread, (4.5 + Math.random() * 2.5) * reach, Math.sin(ang) * spread);
      l.dur = 2.2 + Math.random() * 1.2;
    } else {                                // down and wide, to beings
      l.target = pick();
      l.from.copy(source(l.target));
      const spread = (1.5 + Math.random() * 3.5) * reach;
      l.to.set(Math.cos(ang) * spread, -(4 + Math.random() * 3) * reach, Math.sin(ang) * spread);
      l.dur = 2.6 + Math.random() * 1.4;
    }
    l.arc.set((Math.random() - 0.5), 0, (Math.random() - 0.5)).multiplyScalar(0.6 * reach);
  }

  function at(l, u, out) {
    if (l.kind === 1) {
      _b.copy(source(l.target));
      return out.copy(l.from).lerp(_b, easeOut(u)).addScaledVector(l.arc, Math.sin(Math.PI * u));
    }
    return out.copy(l.from).lerp(l.to, easeIn(u)).addScaledVector(l.arc, Math.sin(Math.PI * u));
  }

  return {
    status,
    update({ dt, realDt = dt, settings, viewportHeight, fov }) {
      const on = settings.lights;
      if (on && !wasOn) elapsed = 0;          // each time they are turned on, they begin with the offering
      wasOn = on;
      const phaseLen = settings['lights.phase'];
      if (on) elapsed += realDt;            // phases keep real time, however slowly frames come
      const phase = Math.floor(elapsed / phaseLen) % 3;
      Object.assign(status, { on, phase, progress: (elapsed % phaseLen) / phaseLen });
      material.uniforms.scale.value = viewportHeight / (2 * Math.tan((fov * Math.PI) / 360));

      const reach = Math.max(1, settings.ringScale);
      if (on) {
        carry += dt * (6 + 70 * settings['lights.amount']);
        while (carry >= 1) { carry -= 1; spawn(phase, reach); }
      }

      // nothing to move and nothing to send while every light is out
      if (alive || on) {
        alive = 0;
        for (let i = 0; i < MAX; i++) {
          const l = lights[i];
          if (l.on) { l.t += dt; if (l.t >= l.dur) l.on = false; }
          if (!l.on) { alpha.fill(0, i * TRAIL, (i + 1) * TRAIL); continue; }
          alive++;
          for (let j = 0; j < TRAIL; j++) {
            const k = i * TRAIL + j;
            const u = l.t / l.dur - j * STEP;
            if (u <= 0) { alpha[k] = 0; continue; }
            at(l, u, _p);
            pos[k * 3] = _p.x; pos[k * 3 + 1] = _p.y; pos[k * 3 + 2] = _p.z;
            const life = Math.min(1, u / 0.12) * Math.min(1, (1 - u) / (l.kind === 1 ? 0.08 : 0.25));
            alpha[k] = 0.9 * life * (1 - j / TRAIL);
            size[k] = l.size * (1 - j * 0.1);
            tint[k * 3] = l.color.x; tint[k * 3 + 1] = l.color.y; tint[k * 3 + 2] = l.color.z;
          }
        }
        for (const a of ['position', 'size', 'alpha', 'tint']) geometry.attributes[a].needsUpdate = true;
      }
      points.visible = alive > 0;
      // the seed brightens as blessings are absorbed into it
      stage.absorb = on && phase === 1 ? Math.min(1, status.progress * 4) : Math.max(0, (stage.absorb ?? 0) - dt);
    },
    dispose() { points.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
