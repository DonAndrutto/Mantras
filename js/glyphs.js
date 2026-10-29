// Syllables as signed distance fields: each texel's red holds how far it lies
// from the letter's outline, not whether it is ink, and the shader draws the
// outline from that at whatever size the letter appears — sharp however near
// the camera comes. Green and blue hold the letter blurred, near and wide: the
// glow is light spread from the whole letter, as a real glow is, soft enough
// to be enlarged without showing texels, and it reaches zero well inside the
// texture's edge. Sizes are in em.
import * as THREE from 'three';

export const FONTS = {
  tibetan: "'Jomolhari', serif",
  phonetics: "'EB Garamond', Georgia, 'Times New Roman', serif",
};

export async function loadFonts() {
  await Promise.allSettled([
    document.fonts.load("100px 'Jomolhari'", 'ཧཱུྃ'),
    document.fonts.load("500 100px 'EB Garamond'", 'OM'),
  ]);
}

// The reach of the distance field beyond the outline, in em.
export const SPREAD = 0.35;

// Three box blurs make a gaussian of deviation sigma (in pixels), in place.
function blur(src, w, h, sigma) {
  if (sigma < 0.5) return src;
  const r = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2));
  const tmp = new Float32Array(src.length);
  const pass = (a, b, len, lines, step, lineStep) => {
    for (let l = 0; l < lines; l++) {
      const o = l * lineStep;
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += a[o + Math.min(len - 1, Math.max(0, i)) * step];
      for (let i = 0; i < len; i++) {
        b[o + i * step] = acc / (2 * r + 1);
        acc += a[o + Math.min(len - 1, i + r + 1) * step] - a[o + Math.max(0, i - r) * step];
      }
    }
  };
  for (let k = 0; k < 3; k++) { pass(src, tmp, w, h, 1, w); pass(tmp, src, h, w, w, 1); }
  return src;
}

// Squared distance transform along one line (Felzenszwalb & Huttenlocher).
function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
function edt(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), v = new Uint16Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

// Distance in pixels from the coverage of an anti-aliased raster, positive
// outside the letter, using the coverage for sub-pixel accuracy.
function distanceField(alpha, w, h) {
  const INF = 1e20, n = w * h;
  const outer = new Float64Array(n), inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    if (a >= 0.999) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0.001) { outer[i] = INF; inner[i] = 0; }
    else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
  }
  edt(outer, w, h); edt(inner, w, h);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  return out;
}

// A set shares one vertical frame, so every syllable in a ring hangs from
// the same head line, as written.
// radius: the glow's reach in em.
export function makeGlyphSet(tokens, { script = 'tibetan', px = 96, radius = 0.25 } = {}) {
  const family = FONTS[script] || FONTS.tibetan;
  const weight = script === 'phonetics' ? '500 ' : '';
  const font = `${weight}${px}px ${family}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;

  const unique = [...new Set(tokens)];
  const metrics = new Map(unique.map(t => [t, probe.measureText(t)]));
  const em = probe.measureText(script === 'phonetics' ? 'H' : 'ཨ');
  const emA = em.fontBoundingBoxAscent ?? px * 0.8;
  const emD = em.fontBoundingBoxDescent ?? px * 0.2;
  let ascent = emA * 0.5, descent = 0;
  for (const m of metrics.values()) {
    ascent = Math.max(ascent, m.actualBoundingBoxAscent ?? px * 0.8);
    descent = Math.max(descent, m.actualBoundingBoxDescent ?? px * 0.2);
  }
  const near = 0.07 * px, wide = Math.max(0.08, radius) * 0.75 * px;
  const pad = Math.ceil(Math.max(SPREAD * px, 3.4 * wide)) + 2;

  const glyphs = new Map();
  for (const t of unique) {
    const m = metrics.get(t);
    const left = Math.max(0, m.actualBoundingBoxLeft ?? 0);
    const right = Math.max(m.width, m.actualBoundingBoxRight ?? m.width);
    const w = Math.ceil(pad * 2 + left + right);
    const h = Math.ceil(pad * 2 + ascent + descent);
    const ox = pad + left, baseline = pad + ascent;

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';
    ctx.fillText(t, ox, baseline);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const alpha = new Float32Array(w * h);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3] / 255;
    const dist = distanceField(alpha, w, h);

    const nearGlow = blur(Float32Array.from(alpha), w, h, near);
    const wideGlow = blur(Float32Array.from(alpha), w, h, wide);

    // red: 0.5 on the outline, 0 at SPREAD outside it; green, blue: the glows,
    // as square roots so their faint reach keeps its steps; rows bottom-up
    const data = new Uint8Array(w * h * 4);
    const span = SPREAD * px;
    const enc = v => Math.round(255 * Math.sqrt(Math.max(0, Math.min(1, v))));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, o = ((h - 1 - y) * w + x) * 4;
      data[o] = Math.max(0, Math.min(255, Math.round((0.5 - dist[i] / (2 * span)) * 255)));
      data[o + 1] = enc(nearGlow[i] * 1.6);
      data[o + 2] = enc(wideGlow[i] * 2.2);
      data[o + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;

    // The anchor is the middle of the advance box and of the em box, as a
    // CSS line-height:1 box centred with translate(-50%,-50%) would be.
    const ax = ox + m.width / 2;
    const ay = baseline - (emA - emD) / 2;
    const geometry = new THREE.PlaneGeometry(w / px, h / px);
    geometry.translate((w / 2 - ax) / px, -(h / 2 - ay) / px, 0);

    glyphs.set(t, { texture, geometry, advance: m.width / px, height: (ascent + descent) / px, below: (baseline + descent - ay) / px });
  }
  return {
    get: t => glyphs.get(t),
    dispose() { for (const g of glyphs.values()) { g.texture.dispose(); g.geometry.dispose(); } },
  };
}

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

// d: distance from the outline in em, negative inside. The edge is drawn one
// screen pixel soft at any size. The glow is the near and the wide blur of the
// letter, eased so it whitens rather than clips, and faded out towards the
// quad's border so no edge can ever show.
// veil: how much of what lies behind the letter it hides, whatever its own
// brightness — a faint syllable in front of the seed still passes before it.
// shade: a soft dark ground under the halo, so a letter reads against a bright seat.
const FRAG = /* glsl */`
  uniform sampler2D map;
  uniform vec3 ink, hi, glowColor;
  uniform float mixHi, opacity, glow, veil, shade;
  varying vec2 vUv;
  const float SPREAD = ${SPREAD.toFixed(3)};
  void main() {
    vec4 t = texture2D(map, vUv);
    float d = (0.5 - t.r) * 2.0 * SPREAD;
    float aa = max(fwidth(d) * 0.7, 1e-4);
    float core = 1.0 - smoothstep(-aa, aa, d);
    vec2 e = min(vUv, 1.0 - vUv);
    float edge = smoothstep(0.0, 0.06, min(e.x, e.y));
    float halo = (0.55 * t.g * t.g + 0.45 * t.b * t.b) * edge;
    float a = core * opacity;
    float h = 1.0 - exp(-halo * glow * 1.3);
    vec3 rgb = mix(ink, hi, mixHi) * a + glowColor * h;
    float alpha = max(max(a, core * veil), halo * halo * shade);
    if (alpha + h < 0.001) discard;
    gl_FragColor = vec4(rgb, alpha);
  }`;

// The design's sRGB values as they are: the shader writes them straight out.
export function srgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255);
}

export function glyphMaterial(texture, palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      ink: { value: srgb(palette.ink) },
      hi: { value: srgb(palette.hi) },
      glowColor: { value: srgb(palette.glow) },
      mixHi: { value: 0 },
      opacity: { value: 1 },
      glow: { value: 0 },
      veil: { value: 0 },
      shade: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

// Soft round light computed per pixel (no texture to show its grain when near):
// a gaussian that reaches exactly zero at the quad's edge.
export function softLightMaterial(color, { opacity = 1, falloff = 4.5 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: srgb(color) }, opacity: { value: opacity }, falloff: { value: falloff } },
    vertexShader: VERT,
    fragmentShader: /* glsl */`
      uniform vec3 color; uniform float opacity, falloff;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float a = exp(-r * r * falloff) * (1.0 - smoothstep(0.8, 1.0, r)) * opacity;
        gl_FragColor = vec4(color * a, 0.0);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
}
