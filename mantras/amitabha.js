// Amitabha: Om Ami Dewa Hrih turning around ཧྲཱི༔.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'amitabha',
  name: 'Amitabha',
  subtitle: 'Om Ami Dewa Hrih around HRIH',
  tibetanName: 'འོད་དཔག་མེད།',
  palette: 'red',
  seed: { text: 'ཧྲཱི༔', phonetics: 'hrīḥ', size: 0.46 },
  rings: [ring({
    text: 'ༀ་ཨ་མི་དྷེ་ཝ་ཧྲཱི༔',
    phonetics: 'om a mi dhe va hrīḥ',
    fill: 0.35,
  })],
  motion: { period: 3.5 },
});
