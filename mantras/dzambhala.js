// Dzambhala: his mantra turning around ཛྃ.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'dzambhala',
  name: 'Dzambhala',
  subtitle: 'Dzambhala mantra around JAM',
  tibetanName: 'ཛམ་བྷ་ལ།',
  palette: 'gold',
  seed: { text: 'ཛྃ', phonetics: 'jaṃ' },
  rings: [ring({
    text: 'ཨོཾ་ཛམྦྷ་ལ་ཛ་ལེནྡྲཱ་ཡེ་སྭཱ་ཧཱ།',
    phonetics: 'om jambha la ja lendrā ye svā hā',
  })],
  motion: { period: 4.5 },
});
