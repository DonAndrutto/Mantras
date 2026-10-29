// Kurukulle: two mantras around ཧྲཱིཿ, chosen in the settings — the approach
// and the accomplishment. Each keeps its own pace and its own count.
import { shortMantra, ring } from './shared.js';

export default shortMantra({
  id: 'kurukulle',
  name: 'Kurukulle',
  subtitle: 'Approach and accomplishment mantras around HRIH',
  tibetanName: 'ཀུ་རུ་ཀུལླེ།',
  palette: 'red',
  seed: { text: 'ཧྲཱིཿ', phonetics: 'hrīḥ', size: 0.46 },
  rings: [],
  variants: [
    {
      id: 'approach',
      label: 'Approach',
      rings: [ring({
        text: 'ཨོཾ་པདྨ་ཌཱ་ཀི་ནཱི་ཀུ་རུ་ཀུལླེ་ཧྲཱིཿསྭཱ་ཧཱ།',
        phonetics: 'om padma ḍā ki nī ku ru kulle hrīḥ svā hā',
      })],
      motion: { period: 5 },
    },
    {
      id: 'accomplishment',
      label: 'Accomplishment',
      rings: [ring({
        text: 'ཨོཾ་པདྨ་ཌཱ་ཀི་ནཱི་ཀུ་རུ་ཀུལླེ་ཧ་རི་ནི་ས་སརྦ་སིདྡྷི་ལོ་ཀ་ཝཱ་ཤཾ་ཀུ་རུ་ཧྲཱིཿསྭཱ་ཧཱ།',
        phonetics: 'om padma ḍā ki nī ku ru kulle ha ri ni sa sarva siddhi lo ka vā śaṃ ku ru hrīḥ svā hā',
        fill: 0.47,
      })],
      motion: { period: 9 },
    },
  ],
});
