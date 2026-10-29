// White Tara: the long-life mantra turning around ཏཱྃ.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'white-tara',
  name: 'White Tara',
  subtitle: 'Long-life mantra around TAM',
  tibetanName: 'སྒྲོལ་དཀར།',
  palette: 'white',
  seed: { text: 'ཏཱྃ', phonetics: 'tāṃ' },
  rings: [ring({
    text: 'ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་མམ་ཨཱ་ཡུརྫྙཱ་ནཱ་པུཎྱེ་པུཥྚིཾ་ཀུ་རུ་སྭཱ་ཧཱ།',
    phonetics: 'om tā re tuttā re tu re mama ā yurjñā nā puṇye puṣṭiṃ ku ru svā hā',
    fill: 0.5,
  })],
  motion: { period: 7 },
});
