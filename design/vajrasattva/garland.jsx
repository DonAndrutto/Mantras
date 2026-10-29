// garland.jsx — Vajrasattva hundred-syllable mantra garland (final, 9:16)
// Requires globals from animations-v2.jsx and tweaks-panel.jsx (loaded first).
const { SceneStage, useScene } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio, TweakSlider } = window;

const TAU = Math.PI * 2;
const BONE = '#f0ead6';
const C_BONE = [240, 234, 214], C_BRIGHT = [255, 253, 244];
const JOMO = "'Jomolhari', serif";

const GRAIN_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='300' height='300' filter='url(#n)'/></svg>";
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

function syllables(str) { return str.split(/[་།\s]+/).filter(Boolean); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function rgbMix(c1, c2, t) {
  return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
}

// Measured widths (em units) so gaps between syllables are even — a file of ants.
function useSyllableEms(toks) {
  const [ready, setReady] = React.useState(() => document.fonts.check('100px Jomolhari'));
  React.useEffect(() => {
    if (!ready) document.fonts.load('100px Jomolhari').then(() => setReady(true));
  }, [ready]);
  return React.useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '100px Jomolhari, serif';
    return toks.map(t => (ready ? ctx.measureText(t).width : 60) / 100);
  }, [toks, ready]);
}

const D = 3.2; // camera distance in units of garland radius

// Whole revolutions per scene, snapped so the loop seam is always seamless.
function revolutions(dur, period) {
  return Math.max(1, Math.round(dur / Math.max(1, period)));
}

function GarlandField({ w, h, scene, progress, dur, dir, viewAngle, period }) {
  const toks = React.useMemo(() => syllables(scene.mantra), [scene.mantra]);
  const ems = useSyllableEms(toks);
  const u = w / 540;
  const cx = w / 2, cy = h * 0.45;

  // Tilt: 90° = straight down (flat circle), ~5° = floor level (front row occults the center).
  const rad = (viewAngle * Math.PI) / 180;
  const s = Math.sin(rad), ca = Math.cos(rad);
  const t2 = clamp01((s - 0.5) / 0.5);       // only shrink toward top-down so the full circle fits
  const K = w * lerp(1.95, 1.53, t2);
  const fsG = 21 * u * lerp(1, 0.70, t2);
  const opNorm = Math.pow((ca + 1) / 2, 1.6);

  const flip = dir === 'counter' ? -1 : 1;
  const revs = revolutions(dur, period);
  const theta = TAU * revs * progress;        // integer revolutions per scene — loop-safe
  const sigma = 0.085;
  const breath = 0.5 + 0.5 * Math.sin(3 * theta); // 3 cycles per revolution

  const GAP_EM = 0.55;
  const centers = React.useMemo(() => {
    const slots = ems.map(e => e + GAP_EM);
    const total = slots.reduce((a, b) => a + b, 0);
    let cum = 0;
    return slots.map(sl => { const c = (cum + sl / 2) / total * TAU; cum += sl; return c; });
  }, [ems]);
  const theta0 = centers[0] || 0;

  const els = toks.map((t, i) => {
    const phi = (centers[i] - theta0 - theta) * flip;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    const den = D - cp * ca;
    const x = cx + K * sp / den, y = cy + K * cp * s / den;
    const m = D / den;
    const op = 0.17 + 0.53 * Math.pow((cp * ca + 1) / 2, 1.6) / opNorm;
    const a = Math.atan2(sp, cp);
    const g = Math.exp(-(a * a) / (2 * sigma * sigma));
    return (
      <div key={i} style={{
        position: 'absolute', left: x, top: y,
        transform: `translate(-50%,-50%) scale(${m * (1 + 0.26 * g)})`,
        fontFamily: JOMO, fontSize: fsG, lineHeight: 1,
        color: rgbMix(C_BONE, C_BRIGHT, g), opacity: Math.min(op, 0.70),
        zIndex: 400 + Math.round(cp * ca * 90),
        textShadow: `0 0 ${(12 * g).toFixed(1)}px rgba(240,234,214,${(0.5 * g).toFixed(2)})`,
        whiteSpace: 'nowrap',
      }}>{t}</div>
    );
  });

  const seeds = [
    [scene.seedFront, 0], [scene.seedRight, Math.PI / 2],
    [scene.seedBack, Math.PI], [scene.seedLeft, -Math.PI / 2],
  ];
  // Mid-tilt vertical boost keeps the seeds clear of ཧཱུྃ; fades out at both extremes.
  const rhoY = 0.34 * (1 + 0.53 * Math.exp(-((s - 0.5) * (s - 0.5)) / 0.0648));
  const seedEls = seeds.map(([t, phi], i) => {
    const sp = Math.sin(phi), cp = Math.cos(phi);
    const den = D - 0.38 * cp * ca;
    const x = cx + K * 0.34 * sp / den, y = cy + K * rhoY * cp * s / den;
    const m = D / den;
    return (
      <div key={'s' + i} style={{
        position: 'absolute', left: x, top: y,
        transform: `translate(-50%,-50%) scale(${m})`,
        fontFamily: JOMO, fontSize: 34 * u, lineHeight: 1,
        color: BONE, opacity: 0.70, // uniform luminescence
        zIndex: 400 + Math.round(0.38 * cp * ca * 90),
        textShadow: '0 0 14px rgba(240,234,214,0.28)', whiteSpace: 'nowrap',
      }}>{t}</div>
    );
  });

  const frontY = cy + K * s / (D - ca), backY = cy - K * s / (D + ca);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: cx, top: frontY, width: '130%', height: 500,
        transform: 'translate(-50%,-50%)', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(240,234,214,0.05) 0%, rgba(240,234,214,0) 68%)',
      }}></div>
      <div style={{
        position: 'absolute', left: cx, top: backY, width: '110%', height: 340,
        transform: 'translate(-50%,-50%)', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(240,234,214,0.03) 0%, rgba(240,234,214,0) 68%)',
      }}></div>
      <div style={{
        position: 'absolute', left: cx, top: cy, width: 480 * u, height: 400 * u,
        transform: 'translate(-50%,-50%)', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(240,234,214,0.05) 0%, rgba(240,234,214,0) 65%)',
        zIndex: 300,
      }}></div>
      <div style={{
        position: 'absolute', left: cx, top: cy,
        transform: 'translate(-50%,-64%)',
        fontFamily: JOMO, fontSize: 62 * u, lineHeight: 1, color: BONE,
        opacity: 0.72, zIndex: 400, whiteSpace: 'nowrap',
        textShadow: `0 0 ${(28 + 16 * breath).toFixed(1)}px rgba(240,234,214,${(0.22 + 0.14 * breath).toFixed(2)}), 0 0 ${(90 * u).toFixed(0)}px rgba(212,165,90,0.16)`,
      }}>{scene.center}</div>
      {seedEls}
      {els}
    </div>
  );
}

function Rotation(props) {
  const { scene, localTime, progress, dur } = props;
  const revs = revolutions(dur, props.period || 20);
  const pulse = 0.5 + 0.2 * Math.sin(2 * TAU * revs * progress); // 2 cycles / revolution — loop-safe
  return (
    <div data-screen-label={`t=${Math.floor(localTime)}s`} style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(circle at 50% 44%, #182136 0%, #0d1424 48%, #0a0f1a 78%)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: pulse,
        background: 'radial-gradient(circle at 50% 44%, rgba(235,228,205,0.045) 0%, rgba(235,228,205,0) 55%)',
      }}></div>
      <div style={{
        position: 'absolute', inset: 0, backgroundImage: GRAIN_URL,
        opacity: 0.05, mixBlendMode: 'overlay',
      }}></div>
      <GarlandField w={1080} h={1920} scene={scene} progress={progress} dur={dur}
        dir={props.dir || 'clockwise'} viewAngle={props.viewAngle || 29} period={props.period || 20} />
    </div>
  );
}

function RegRow({ label, value, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89a7a' }}>{label}</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 400, color: '#f0ead6', opacity: 0.8 }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

function MantraGarland() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const children = React.useMemo(
    () => ({ Rotation: (p) => React.createElement(Rotation, { ...p, dir: t.direction, viewAngle: t.viewAngle, period: t.period }) }),
    [t.direction, t.viewAngle, t.period]
  );
  const minimize = () => {
    if (typeof window.MantraGarlandOnMinimize === 'function') window.MantraGarlandOnMinimize();
    else if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'mantra-garland:minimize' }, '*');
    else if (window.history.length > 1) window.history.back();
  };
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a', overflow: 'hidden' }}>
      <SceneStage width={1080} height={1920} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#0a0f1a">
        {children}
      </SceneStage>
      <button onClick={minimize} aria-label="Minimise" title="Return" style={{
        position: 'fixed', top: 16, right: 16, width: 44, height: 44, zIndex: 1000,
        borderRadius: 9999, border: '1px solid rgba(240,234,214,0.18)',
        background: 'rgba(13,19,33,0.55)', color: '#a89a7a', fontSize: 22,
        lineHeight: '40px', textAlign: 'center', cursor: 'pointer', padding: 0,
      }}>−</button>
      <div style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 1000, minWidth: 176,
        display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px',
        background: 'rgba(13,19,33,0.72)', border: '1px solid rgba(240,234,214,0.12)', borderRadius: 9,
      }}>
        <RegRow label="Angle" value={`${t.viewAngle}°`}>
          <input className="om-reg" type="range" min="5" max="90" step="1" value={t.viewAngle}
            onChange={(e) => setTweak('viewAngle', Number(e.target.value))} aria-label="View angle" />
        </RegRow>
        <RegRow label="Speed" value={`${t.period}s / round`}>
          <input className="om-reg" type="range" min="7" max="27" step="1" value={t.period}
            onChange={(e) => setTweak('period', Number(e.target.value))} aria-label="Seconds per round" />
        </RegRow>
      </div>
      <TweaksPanel>
        <TweakSection label="View" />
        <TweakSlider label="View angle" value={t.viewAngle} min={5} max={90} step={1} unit="°" onChange={(v) => setTweak('viewAngle', v)} />
        <TweakSection label="Motion" />
        <TweakSlider label="Seconds per round" value={t.period} min={7} max={27} step={1} unit="s" onChange={(v) => setTweak('period', v)} />
        <TweakRadio label="Rotation" value={t.direction} options={['clockwise', 'counter']} onChange={(v) => setTweak('direction', v)} />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}
window.MantraGarland = MantraGarland;
