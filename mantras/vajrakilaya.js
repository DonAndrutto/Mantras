// Vajrakilaya: a dark blue mantra garland around a dark blue HUNG.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'vajrakilaya',
  name: 'Vajrakilaya',
  subtitle: 'Vajrakilaya mantra around HUNG',
  tibetanName: 'རྡོ་རྗེ་ཕུར་པ།',
  palette: 'blue',
  seed: { text: 'ཧཱུྂ', phonetics: 'hūṃ', opacity: 0.95, blur: 0.16 },
  rings: [ring({
    text: 'ཨོཾ་བཛྲ་ཀཱི་ལི་ཀཱི་ལ་ཡ་སརྦ་བིགྷྣཱན་བྂ་ཧཱུྂ་ཕཊ། ཛཿཧཱུྂ་ཨཱཿ',
    phonetics: 'om vajra kī li kī la ya sarva vighnān baṃ hūṃ phaṭ jaḥ hūṃ āḥ',
    fill: 0.4,
    blur: 0.16,
    opacity: { min: 0.42, max: 0.96, exp: 1.5, tilt: true },
  })],
  motion: { period: 8 },
  view: { angle: 32 },
});
