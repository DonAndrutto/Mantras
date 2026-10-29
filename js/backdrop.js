// The night behind the garland, drawn first in the scene itself, so the canvas
// is opaque. On a transparent canvas, light that is added (glow, rays,
// offering lights) carries no coverage of its own, and many desktop browsers
// drop it wherever nothing solid lies beneath: the lights would stop at the
// syllables and the rays at the disc. On an opaque canvas light is simply
// added to the sky, the same on every screen — and there is one layer less
// for the browser to blend each frame.
//
// The same radial gradients the page used in CSS (centred at 50% 44%, out to
// the farthest corner), the breathing glow at the centre, and a fine grain
// that also keeps the gradient from banding.
import * as THREE from 'three';
import { srgb } from './glyphs.js';

const FRAG = /* glsl */`
  uniform vec3 c0, c1, c2, glow;
  uniform float s1, s2, pulse, grain;
  uniform vec2 size;
  void main() {
    vec2 c = vec2(0.5, 0.56) * size;
    float t = length(gl_FragCoord.xy - c) / length(max(c, size - c));
    vec3 col = t < s1 ? mix(c0, c1, t / s1) : mix(c1, c2, clamp((t - s1) / (s2 - s1), 0.0, 1.0));
    col = mix(col, glow, 0.05 * pulse * max(0.0, 1.0 - t / 0.55));
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    gl_FragColor = vec4(col + (n - 0.5) * grain, 1.0);
  }`;

export function createBackdrop({ scene }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const u = {
    c0: { value: srgb('#000000') }, c1: { value: srgb('#000000') }, c2: { value: srgb('#000000') },
    glow: { value: srgb('#000000') }, s1: { value: 0.48 }, s2: { value: 0.78 },
    pulse: { value: 0.5 }, grain: { value: 0.006 }, size: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAG,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  scene.add(mesh);
  let breathes = true;

  return {
    set visible(v) { mesh.visible = v; },
    // background: 'night' | 'black' | 'stars'
    look(background, palette) {
      const [bg0, bg1, bg2] = palette.bg;
      const stops = {
        night: [bg0, bg1, bg2, 0.48, 0.78],
        stars: [bg1, `#${new THREE.Color(bg1).lerp(new THREE.Color('#05070d'), 0.5).getHexString()}`, '#05070d', 0.35, 0.7],
        black: ['#000000', '#000000', '#000000', 0.5, 1],
      }[background] || [bg0, bg1, bg2, 0.48, 0.78];
      u.c0.value = srgb(stops[0]); u.c1.value = srgb(stops[1]); u.c2.value = srgb(stops[2]);
      u.s1.value = stops[3]; u.s2.value = stops[4];
      u.glow.value = srgb(palette.glow);
      breathes = background !== 'black';
      u.grain.value = breathes ? 0.006 : 0;
    },
    update({ pulse, width, height }) {
      u.pulse.value = breathes ? pulse : 0;
      u.size.value.set(width, height);
    },
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
