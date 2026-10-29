// garland-guru.jsx — Vajra Guru (Siddhi) mantra garland around ཧྲཱིཿ, 9:16
// The syllables are written on the outside wall of a cylinder: each one faces outward,
// so it turns with the garland instead of billboarding toward the viewer.
// Requires globals from animations-v2.jsx and tweaks-panel.jsx (loaded first).
const { SceneStage } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio, TweakSlider } = window;

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;
const ROSE = '#ef7f96';
const C_ROSE = [239, 127, 150], C_ROSE_HI = [255, 214, 223];
const JOMO = "'Jomolhari', serif";
const LATIN = "'EB Garamond', Georgia, serif";

const GRAIN_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='300' height='300' filter='url(#n)'/></svg>";
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

// Each token keeps the mark that follows it (tsheg ་, shad །, ཿ, ༔).
function syllables(str) {
  return (str.match(/[^་།\s]+[་།]?/g) || [])
    .flatMap(chunk => chunk.split(/(?<=[ཿ༔])(?=[\s\S])/))
    .filter(Boolean);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function rgbMix(c1, c2, t) {
  return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
}

// Measured advance widths (em) — the ring circumference is the sum of them, so the
// syllables sit almost shoulder to shoulder around the wall.
function useSyllableEms(toks, font, needsLoad) {
  const [ready, setReady] = React.useState(() => !needsLoad || document.fonts.check('100px Jomolhari'));
  React.useEffect(() => {
    if (!ready) document.fonts.load('100px Jomolhari').then(() => setReady(true));
  }, [ready]);
  return React.useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '100px ' + font;
    return toks.map(t => (ready ? ctx.measureText(t).width : 60) / 100);
  }, [toks, ready, font]);
}

const DIST = 3.0;      // camera distance in ring radii
const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20];

// Rotation accumulates across scene loops so the period is exact and the seam never pops.
function useClock(localTime, dur, period) {
  const rot = React.useRef(0), el = React.useRef(0), last = React.useRef(null);
  let dt = last.current === null ? 0 : localTime - last.current;
  if (dt < 0) dt += dur;
  if (dt < 0 || dt > 1) dt = 0;
  last.current = localTime;
  el.current += dt;
  rot.current += (dt / Math.max(0.2, period)) * TAU;
  return { rot: rot.current, elapsed: el.current };
}

function GarlandField({ w, h, scene, theta, breath, dir, viewAngle, latin }) {
  const face = latin ? LATIN : JOMO;
  const gap = latin ? 0.34 : 0.05;   // the only air between neighbours
  const toks = React.useMemo(
    () => (latin ? String(scene.mantraLatin || '').split(/\s+/).filter(Boolean) : syllables(scene.mantra)),
    [scene.mantra, scene.mantraLatin, latin]);
  const ems = useSyllableEms(toks, latin ? "'EB Garamond', Georgia, serif" : 'Jomolhari, serif', !latin);
  const u = w / 540;
  const cx = w / 2, cy = h * 0.47;

  const elev = Math.max(3, Math.min(45, viewAngle));
  const sinE = Math.sin(elev / DEG);

  const centers = React.useMemo(() => {
    const slots = ems.map(e => e + gap);
    const sum = slots.reduce((a, b) => a + b, 0) || 1;
    let cum = 0;
    return slots.map(sl => { const c = (cum + sl / 2) / sum * TAU; cum += sl; return c; });
  }, [ems, gap]);
  const total = ems.reduce((a, e) => a + e + gap, 0) || 1;

  // Ring sized to whichever way the frame is tight — the letters stand 1.4× their size
  // above the ring line, so a low elevation can afford a wider ring than a steep one.
  const R = Math.min(0.40 * w, (0.92 * h) / (2.4 * sinE + 1.5));
  const fsG = (TAU * R) / total;       // type sized so the mantra closes the ring
  const P = DIST * R;
  const fsC = (latin ? 0.20 : 0.5) * R; // seed at the hub, held in front of the turning garland

  const flip = dir === 'counter' ? -1 : 1;
  const sigma = 0.16;

  const els = toks.map((t, i) => {
    const phi = (centers[i] - (centers[0] || 0) - theta) * flip;
    const cp = Math.cos(phi);
    const a = Math.atan2(Math.sin(phi), cp);
    const g = Math.exp(-(a * a) / (2 * sigma * sigma));
    const op = 0.18 + 0.62 * Math.pow((cp + 1) / 2, 1.4);
    return (
      <div key={i} style={{
        position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
        transform: `rotateY(${(phi * DEG).toFixed(2)}deg) translateZ(${R.toFixed(1)}px) translate(-50%,-50%)`,
        fontFamily: face, fontSize: fsG, lineHeight: 1,
        letterSpacing: latin ? '0.04em' : 'normal',
        color: rgbMix(C_ROSE, C_ROSE_HI, g), opacity: Math.min(op, 0.80),
        textShadow: `0 0 ${(20 * g).toFixed(1)}px rgba(239,127,150,${(0.45 * g).toFixed(2)})`,
        whiteSpace: 'nowrap',
      }}>{t}</div>
    );
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: cx, top: cy + R * sinE * 0.9, width: '120%', height: 420,
        transform: 'translate(-50%,-50%)', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(239,127,150,0.06) 0%, rgba(239,127,150,0) 68%)',
      }}></div>
      <div style={{
        position: 'absolute', left: cx, top: cy, width: 560 * u, height: 460 * u,
        transform: 'translate(-50%,-50%)', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(239,127,150,0.06) 0%, rgba(239,127,150,0) 65%)',
      }}></div>
      <div style={{
        position: 'absolute', inset: 0, perspective: `${P.toFixed(0)}px`,
        perspectiveOrigin: `${cx}px ${cy}px`,
      }}>
        <div style={{
          position: 'absolute', left: cx, top: cy, width: 0, height: 0,
          transformStyle: 'preserve-3d', transform: `rotateX(${(-elev).toFixed(2)}deg)`,
        }}>
          {els}
        </div>
      </div>
      <div style={{
        position: 'absolute', left: cx, top: cy,
        transform: 'translate(-50%,-56%)',
        fontFamily: face, fontSize: fsC, lineHeight: 1, color: ROSE,
        letterSpacing: latin ? '0.06em' : 'normal',
        opacity: 0.80, whiteSpace: 'nowrap',
        textShadow: `0 0 ${(30 + 18 * breath).toFixed(1)}px rgba(239,127,150,${(0.26 + 0.16 * breath).toFixed(2)}), 0 0 ${(90 * u).toFixed(0)}px rgba(190,70,100,0.20)`,
      }}>{latin ? (scene.centerLatin || 'HRIH') : scene.center}</div>
    </div>
  );
}

function Rotation(props) {
  const { scene, localTime, dur } = props;
  const period = props.period || 8;
  const { rot, elapsed } = useClock(localTime, dur, period);
  const breath = 0.5 + 0.5 * Math.sin((TAU * elapsed) / 6);
  const pulse = 0.5 + 0.2 * Math.sin((TAU * elapsed) / 9);
  return (
    <div data-screen-label={`t=${Math.floor(localTime)}s`} style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(circle at 50% 44%, #182136 0%, #0d1424 48%, #0a0f1a 78%)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: pulse,
        background: 'radial-gradient(circle at 50% 44%, rgba(239,127,150,0.05) 0%, rgba(239,127,150,0) 55%)',
      }}></div>
      <div style={{
        position: 'absolute', inset: 0, backgroundImage: GRAIN_URL,
        opacity: 0.05, mixBlendMode: 'overlay',
      }}></div>
      <GarlandField w={props.w || 1080} h={props.h || 1920} scene={scene} theta={rot} breath={breath}
        dir={props.dir || 'clockwise'} viewAngle={props.viewAngle || 20} latin={!!props.latin} />
    </div>
  );
}

function RegRow({ label, value, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c99aa4' }}>{label}</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 400, color: '#f6e8ea', opacity: 0.8 }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

function ScriptSwitch({ latin, onChange }) {
  const btn = (on) => ({
    flex: 1, padding: '5px 0', cursor: 'pointer', borderRadius: 6,
    border: `1px solid ${on ? 'rgba(239,127,150,0.45)' : 'rgba(239,127,150,0.14)'}`,
    background: on ? 'rgba(239,127,150,0.14)' : 'transparent',
    color: on ? '#ffd6df' : '#c99aa4', fontSize: 12, lineHeight: '18px',
  });
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={() => onChange(false)} style={{ ...btn(!latin), fontFamily: JOMO }}>བོད་ཡིག</button>
      <button onClick={() => onChange(true)} style={{ ...btn(latin), fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em', fontSize: 10 }}>LATIN</button>
    </div>
  );
}

function GuruGarland() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [vp, setVp] = React.useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  React.useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  const latin = t.script === 'latin';
  const children = React.useMemo(
    () => ({ Rotation: (p) => React.createElement(Rotation, { ...p, w: vp.w, h: vp.h, dir: t.direction, viewAngle: t.viewAngle, period: t.period, latin }) }),
    [t.direction, t.viewAngle, t.period, latin, vp.w, vp.h]
  );
  const spIdx = SPEEDS.reduce((best, v, i) => (Math.abs(v - t.period) < Math.abs(SPEEDS[best] - t.period) ? i : best), 0);
  const minimize = () => {
    if (typeof window.MantraGarlandOnMinimize === 'function') window.MantraGarlandOnMinimize();
    else if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'mantra-garland:minimize' }, '*');
    else if (window.history.length > 1) window.history.back();
  };
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a', overflow: 'hidden' }}>
      <SceneStage width={vp.w} height={vp.h} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#0a0f1a">
        {children}
      </SceneStage>
      <button onClick={minimize} aria-label="Minimise" title="Return" style={{
        position: 'fixed', top: 16, right: 16, width: 44, height: 44, zIndex: 1000,
        borderRadius: 9999, border: '1px solid rgba(239,127,150,0.20)',
        background: 'rgba(13,19,33,0.55)', color: '#c99aa4', fontSize: 22,
        lineHeight: '40px', textAlign: 'center', cursor: 'pointer', padding: 0,
      }}>−</button>
      <div style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 1000, minWidth: 176,
        display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px',
        background: 'rgba(13,19,33,0.72)', border: '1px solid rgba(239,127,150,0.14)', borderRadius: 9,
      }}>
        <RegRow label="Angle" value={`${t.viewAngle}°`}>
          <input className="om-reg" type="range" min="5" max="45" step="1" value={t.viewAngle}
            onChange={(e) => setTweak('viewAngle', Number(e.target.value))} aria-label="View angle" />
        </RegRow>
        <RegRow label="Speed" value={`${t.period}s / round`}>
          <input className="om-reg" type="range" min="0" max={SPEEDS.length - 1} step="1" value={spIdx}
            onChange={(e) => setTweak('period', SPEEDS[Number(e.target.value)])} aria-label="Seconds per round" />
        </RegRow>
        <ScriptSwitch latin={latin} onChange={(v) => setTweak('script', v ? 'latin' : 'tibetan')} />
      </div>
      <TweaksPanel>
        <TweakSection label="View" />
        <TweakSlider label="View angle" value={t.viewAngle} min={5} max={45} step={1} unit="°" onChange={(v) => setTweak('viewAngle', v)} />
        <TweakSection label="Motion" />
        <TweakSlider label="Seconds per round" value={t.period} min={1} max={20} step={0.25} unit="s" onChange={(v) => setTweak('period', v)} />
        <TweakRadio label="Rotation" value={t.direction} options={['clockwise', 'counter']} onChange={(v) => setTweak('direction', v)} />
        <TweakSection label="Script" />
        <TweakRadio label="Syllables" value={t.script || 'tibetan'} options={['tibetan', 'latin']} onChange={(v) => setTweak('script', v)} />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}
window.GuruGarland = GuruGarland;
