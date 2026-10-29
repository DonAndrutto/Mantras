// The common shape of a short mantra: one turning ring of upright syllables
// around a seed. A mantra file passes only what is its own; anything here can
// be overridden there.

export const PALETTES = {
  bone:  { ink: '#f0ead6', hi: '#fffdf4', glow: '#f0ead6', halo: '#d4a55a', accent: '#d4a55a', muted: '#a89a7a', text: '#f0ead6' },
  rose:  { ink: '#ef7f96', hi: '#ffd6df', glow: '#ef7f96', halo: '#be4664', accent: '#ef7f96', muted: '#c99aa4', text: '#f6e8ea' },
  green: { ink: '#62d39a', hi: '#d9ffea', glow: '#62d39a', halo: '#23935e', accent: '#5cc890', muted: '#8fb8a0', text: '#e4f5eb' },
  white: { ink: '#eef3fa', hi: '#ffffff', glow: '#dce8f7', halo: '#9ab6da', accent: '#c6d7ee', muted: '#98a5b6', text: '#f2f5fa' },
  gold:  { ink: '#f2c94c', hi: '#fff2c4', glow: '#f2c94c', halo: '#d39a1d', accent: '#e9b949', muted: '#b9a374', text: '#f7eed6' },
  red:   { ink: '#f2645a', hi: '#ffd2ca', glow: '#f2645a', halo: '#c2322b', accent: '#ef6a5f', muted: '#c99a94', text: '#f8e6e3' },
};
const NIGHT = ['#182136', '#0d1424', '#0a0f1a'];

export function ring({ text, phonetics, ...rest }) {
  return {
    id: 'mantra',
    text,
    phonetics,               // one entry per Tibetan syllable
    radius: 1,
    letterSize: 'auto',      // sized from the ring: `fill` of it is ink, the rest even air
    fill: 0.38,
    spacing: 'width',
    order: 'ccw',            // seen from above, the next syllable stands counter-clockwise
    turns: 1,
    blur: 0.22,
    highlight: { sigma: 0.16, scale: 0.18, glow: 0.45 },
    opacity: { min: 0.18, max: 0.82, exp: 1.5, tilt: true },
    ...rest,
  };
}

export function shortMantra({ palette, seed, rings, motion, view, ...rest }) {
  return {
    palette: { ...PALETTES[palette] || palette, bg: NIGHT },
    seed: { size: 0.5, lift: 0.06, opacity: 0.85, blur: 0.2, phoneticsScale: 0.45, breath: { period: 6 }, ...seed },
    rings,
    motion: { period: 6, spin: 'cw', ...motion },
    view: { angle: 22, distance: 3.0, fill: 0.86, ...view },
    effects: [],
    ...rest,
  };
}
