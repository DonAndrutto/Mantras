// Vajra Guru: the mantra written round the outside wall of a ring around ཧྲཱིཿ.
// Each syllable faces outward and turns with the garland.
// After the Claude Design "Vajra Guru Garland" (design/vajra-guru/).

export default {
  id: 'vajra-guru',
  name: 'Vajra Guru',
  subtitle: 'Vajra Guru mantra around HRIH',
  tibetanName: 'བཛྲ་གུ་རུ།',

  palette: {
    ink: '#ef7f96',
    hi: '#ffd6df',
    glow: '#ef7f96',
    halo: '#be4664',
    accent: '#ef7f96',
    muted: '#c99aa4',
    text: '#f6e8ea',
    bg: ['#182136', '#0d1424', '#0a0f1a'],
  },

  seed: {
    text: 'ཧྲཱིཿ',
    phonetics: 'HRIH',
    size: 0.5,
    lift: 0.06,
    opacity: 0.80,
    blur: 0.18,
    phoneticsScale: 0.4,
    onTop: true,             // held in front of the turning garland
    breath: { period: 6 },   // seconds per swell of the glow
  },

  rings: [
    {
      id: 'siddhi',
      text: 'ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ༔',
      phonetics: 'OM AH HUNG VAJRA GU RU PADMA SIDDHI HUNG',
      keepMarks: true,
      radius: 1,
      letterSize: 'auto',    // sized so the mantra closes the ring
      gap: 0.05,
      gapPhonetics: 0.34,
      spacing: 'width',
      facing: 'outward',     // written on the outside wall
      order: 'ccw',
      turns: 1,
      blur: 0.1,
      highlight: { sigma: 0.16, scale: 0, glow: 0.45 },
      opacity: { min: 0.18, max: 0.80, exp: 1.4, tilt: false },
    },
  ],

  motion: { period: 8, spin: 'cw' },
  view: { angle: 5, angleRange: [3, 45], distance: 3.0, fill: 0.8 },

  effects: [],
};
