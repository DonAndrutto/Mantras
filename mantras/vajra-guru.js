// Vajra Guru: the mantra of Guru Rinpoche turning around ཧྲཱིཿ.
// Colours and pace after the Claude Design "Vajra Guru Garland" (design/vajra-guru/).
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'vajra-guru',
  name: 'Vajra Guru',
  subtitle: 'Vajra Guru mantra around HRIH',
  tibetanName: 'བཛྲ་གུ་རུ།',
  palette: 'rose',
  seed: { text: 'ཧྲཱིཿ', phonetics: 'hrīḥ', size: 0.5, blur: 0.18, opacity: 0.8 },
  rings: [ring({
    text: 'ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ༔',
    phonetics: 'om āḥ hūṃ vajra gu ru padma siddhi hūṃ',
    keepMarks: true,
    blur: 0.1,
  })],
  motion: { period: 8 },
});
