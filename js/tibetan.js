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

// The air between one recitation of the mantra and the next, when the
// garland holds it more than once, in em.
export const BETWEEN = 0.6;

// The syllables of a ring holding its mantra `times` times over: Tibetan,
// phonetics (one per syllable; the Tibetan stands in where they are missing),
// and the extra air after each syllable.
export function ringSyllables(ring, times = 1) {
  const t = tibetanSyllables(ring.text);
  const p = phoneticWords(ring.phonetics);
  const ph = p.length === t.length ? p : t;
  const tibetan = [], phonetics = [], after = [];
  for (let k = 0; k < times; k++) {
    tibetan.push(...t);
    phonetics.push(...ph);
    after.push(...t.map((_, i) => (times > 1 && i === t.length - 1 ? BETWEEN : 0)));
  }
  return { tibetan, phonetics, after };
}
