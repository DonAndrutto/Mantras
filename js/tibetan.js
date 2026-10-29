// Splitting a mantra into the syllables that stand around a ring.
// No DOM: shared by the page and the Node tests.

// Tibetan syllables, each keeping the marks written with it: the tsheg (་)
// or shad (།) that follows it, a visarga (ཿ) or terma mark (༔). A visarga or
// terma mark also ends a syllable when no tsheg follows: ཧྲཱིཿསྭཱ་ཧཱ། gives
// ཧྲཱིཿ + སྭཱ་ + ཧཱ།. Only spaces are left out.
export function tibetanSyllables(str) {
  return (String(str || '').match(/[^་།\s]+[་།]*/g) || [])
    .flatMap(chunk => chunk.split(/(?<=[ཿ༔])(?=[^་།])/))
    .filter(Boolean);
}

// Phonetics are written one entry per Tibetan syllable, separated by spaces.
export function phoneticWords(str) {
  return String(str || '').split(/\s+/).filter(Boolean);
}

export function ringTokens(ring, script) {
  if (script === 'phonetics' && ring.phonetics) return phoneticWords(ring.phonetics);
  return tibetanSyllables(ring.text);
}
