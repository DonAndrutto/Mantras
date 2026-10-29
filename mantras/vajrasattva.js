// Vajrasattva: the hundred-syllable mantra turning around ཧཱུྃ, with the
// short mantra ཨོཾ་བཛྲ་སཏྭ་ཨཱཿ standing still around the seed.
// After the Claude Design "Mantra Garland" (design/vajrasattva/).

export default {
  id: 'vajrasattva',
  name: 'Vajrasattva',
  subtitle: 'Hundred-syllable mantra around HUNG',
  tibetanName: 'རྡོར་སེམས་ཡིག་བརྒྱ།',

  palette: {
    ink: '#f0ead6',          // the syllables
    hi: '#fffdf4',           // a syllable at the front
    glow: '#f0ead6',         // the halo around a syllable
    halo: '#d4a55a',         // the wide light behind the seed
    accent: '#d4a55a',       // controls
    muted: '#a89a7a',        // control labels
    text: '#f0ead6',         // control values
    bg: ['#182136', '#0d1424', '#0a0f1a'],
  },

  seed: {
    text: 'ཧཱུྃ',
    phonetics: 'hūṃ',
    size: 0.19,              // em, in garland radii
    lift: 0.14,              // em above the ring's plane
    opacity: 0.72,
    blur: 0.3,               // halo width, em
    phoneticsScale: 0.5,
    breath: { perRound: 3 }, // the glow swells three times a round
  },

  rings: [
    {
      id: 'hundred',
      text: 'ཨོཾ་བཛྲ་སཏྭ་ས་མ་ཡ། མ་ནུ་པཱ་ལ་ཡ། བཛྲ་སཏྭ་ཏྭེ་ནོ་པ་ཏིཥྛ། དྲྀ་ཌྷོ་མེ་བྷ་ཝ། སུ་ཏོ་ཥྱོ་མེ་བྷ་ཝ། སུ་པོ་ཥྱོ་མེ་བྷ་ཝ། ཨ་ནུ་རཀྟོ་མེ་བྷ་ཝ། སརྦ་སིདྡྷི་མྨེ་པྲ་ཡཙྪ། སརྦ་ཀརྨ་སུ་ཙ་མེ། ཙིཏྟཾ་ཤྲེ་ཡཿ་ཀུ་རུ་ཧཱུྃ། ཧ་ཧ་ཧ་ཧ་ཧོཿ བྷ་ག་ཝན། སརྦ་ཏ་ཐཱ་ག་ཏ། བཛྲ་མཱ་མེ་མུཉྩ། བཛྲཱི་བྷ་ཝ། མ་ཧཱ་ས་མ་ཡ་སཏྭ་ཨཱཿ',
      // one entry per syllable, after the transliteration in the Ngöndro app
      phonetics: 'om vajra sattva sa ma ya ma nu pā la ya vajra sattva te no pa tiṣṭha dṛ ḍho me bha va su to ṣyo me bha va su po ṣyo me bha va a nu rakto me bha va sarva siddhi mme pra yaccha sarva karma su ca me cittaṃ śri yaṃ ku ru hūṃ ha ha ha ha ho bha ga vān sarva ta thā ga ta vajra mā me muñca vajrī bha va ma hā sa ma ya sattva āḥ',
      radius: 1,
      letterSize: 0.064,     // em, in garland radii
      gap: 0.55,             // em between syllables before the ring is shared out
      gapPhonetics: 0.45,
      spacing: 'width',      // each syllable takes its own width of the ring
      order: 'ccw',          // seen from above, the next syllable stands counter-clockwise
      turns: 1,              // whole turns per round of the mantra
      blur: 0.29,
      highlight: { sigma: 0.085, scale: 0.26, glow: 0.5 },
      opacity: { min: 0.17, max: 0.70, exp: 1.6, tilt: true },
    },
    {
      id: 'short',
      text: 'ཨོཾ་བཛྲ་སཏྭ་ཨཱཿ',
      phonetics: 'om vajra sattva āḥ',
      radius: 0.36,
      depth: 1.55,           // front and back stand farther out, clear of ཧཱུྃ
      y: -0.02,
      letterSize: 0.103,
      spacing: 'even',       // one at each quarter: front, left, back, right
      order: 'cw',
      turns: 0,              // stands still
      scaleWith: 'seed',
      glow: 0.28,
      blur: 0.2,
      opacity: { min: 0.70, max: 0.70 },
    },
  ],

  motion: { period: 17, spin: 'cw' },
  view: { angle: 23, distance: 3.2, fill: 1.2 },   // the garland runs past the sides, as designed

  effects: [
    { id: 'nectar', label: 'Nectar falling', on: true, amount: 0.45 },
  ],
};
