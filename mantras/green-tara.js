// Green Tara: her mantra turning around ཏཱྃ.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'green-tara',
  name: 'Green Tara',
  subtitle: 'Tara mantra around TAM',
  tibetanName: 'སྒྲོལ་ལྗང་།',
  palette: 'green',
  seed: { text: 'ཏཱྃ', phonetics: 'tāṃ' },
  rings: [ring({
    text: 'ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་སྭཱཧཱ།',
    phonetics: 'om tā re tuttā re tu re svāhā',
  })],
  motion: { period: 4 },
});
