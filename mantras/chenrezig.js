// Chenrezig: the six-syllable mantra turning around ཧྲཱི༔.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'chenrezig',
  name: 'Chenrezig',
  subtitle: 'Om Mani Padme Hum around HRIH',
  tibetanName: 'སྤྱན་རས་གཟིགས།',
  palette: 'white',
  seed: { text: 'ཧྲཱི༔', phonetics: 'hrīḥ', size: 0.46 },
  rings: [ring({
    text: 'ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ',
    phonetics: 'om ma ṇi padme hūṃ',
    fill: 0.33,
  })],
  motion: { period: 3 },
});
