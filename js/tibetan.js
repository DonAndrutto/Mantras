// Splitting a mantra into the tokens that stand around a ring.
// No DOM: shared by the page and the Node tests.

// Tibetan syllables. A visarga (ཿ) or terma mark (༔) ends a syllable even
// without a tsheg after it: ཧྲཱིཿསྭཱ་ཧཱ gives ཧྲཱིཿ + སྭཱ + ཧཱ. With keepMarks each
// token keeps the tsheg or shad that follows it; without, only the syllables remain.
export function tibetanSyllables(str, { keepMarks = false } = {}) {
  const tokens = (String(str || '').match(/[^་།\s]+[་།]*/g) || [])
    .flatMap(chunk => chunk.split(/(?<=[ཿ༔])(?=[^་།])/))
    .filter(Boolean);
  return keepMarks ? tokens : tokens.map(t => t.replace(/[་།]+$/, ''));
}

// Phonetics are written one entry per Tibetan syllable, separated by spaces.
export function phoneticWords(str) {
  return String(str || '').split(/\s+/).filter(Boolean);
}

export function ringTokens(ring, script) {
  if (script === 'phonetics' && ring.phonetics) return phoneticWords(ring.phonetics);
  return tibetanSyllables(ring.text, { keepMarks: !!ring.keepMarks });
}
