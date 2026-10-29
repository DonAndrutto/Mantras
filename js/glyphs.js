// Syllables drawn once into textures. Red carries the letter, green its
// blurred halo, so one texture and one draw give both, and the halo can
// brighten without the letter growing. The halo is stored as its square root,
// so its faint outer reach keeps enough steps to be turned up smoothly.
// Sizes are in em.
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

// A set shares one vertical frame, so every syllable in a ring hangs from
// the same head line, as written.
export function makeGlyphSet(tokens, { script = 'tibetan', px = 128, blur = 0.3, renderer } = {}) {
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
  const blurPx = blur * px;
  const pad = Math.ceil(blurPx * 2.4 + 4);   // room for the whole tail of the halo
  const maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;

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
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    // the halo: only the shadow lands on the canvas
    ctx.shadowColor = 'rgb(0,255,0)';
    ctx.shadowBlur = blurPx;
    ctx.shadowOffsetX = w + 4000;
    ctx.fillStyle = 'rgb(0,255,0)';
    ctx.fillText(t, ox - (w + 4000), baseline);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0;
    // the letter, added into red
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgb(255,0,0)';
    ctx.fillText(t, ox, baseline);
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 1; i < d.length; i += 4) d[i] = SQRT[d[i]];
    ctx.putImageData(img, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = maxAniso;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

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

const SQRT = Uint8Array.from({ length: 256 }, (_, i) => Math.round(255 * Math.sqrt(i / 255)));

// veil: how much of what lies behind the letter it hides, whatever its own
// brightness — a faint syllable in front of the seed still passes before it.
// shade: a soft dark ground under the halo, so a letter reads against a bright seat.
// The halo eases towards white-hot rather than clipping, and a touch of noise
// keeps a wide, faint halo from showing steps.
const FRAG = /* glsl */`
  uniform sampler2D map;
  uniform vec3 ink, hi, glowColor;
  uniform float mixHi, opacity, glow, veil, shade;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec4 t = texture2D(map, vUv);
    float halo = t.g * t.g;
    float a = t.r * opacity;
    float h = 1.0 - exp(-halo * glow * 1.6);
    vec3 rgb = mix(ink, hi, mixHi) * a + glowColor * h;
    rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * step(0.001, h);
    float alpha = max(max(a, t.r * veil), halo * shade);
    if (alpha + h < 0.002) discard;
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

// Soft round light, white; tinted by the material that uses it.
export function radialTexture(size = 256, stops = [[0, 1], [0.35, 0.45], [1, 0]]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
