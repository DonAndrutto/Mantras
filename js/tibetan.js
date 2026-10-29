// Splitting a mantra into the tokens that stand around a ring.
// No DOM: shared by the page and the Node tests.

const TSHEG_SHAD = /[་།\s]+/;

// Tibetan syllables. With keepMarks each token keeps the tsheg or shad that
// follows it, and a visarga (ཿ) or terma mark (༔) ends a token even without
// a tsheg after it — ཨཱཿཧཱུྃ་ becomes ཨཱཿ + ཧཱུྃ་. Without keepMarks the marks
// are dropped and only the syllables remain.
export function tibetanSyllables(str, { keepMarks = false } = {}) {
  const text = String(str || '').trim();
  if (!keepMarks) return text.split(TSHEG_SHAD).filter(Boolean);
  return (text.match(/[^་།\s]+[་།]*/g) || [])
    .flatMap(chunk => chunk.split(/(?<=[ཿ༔])(?=[^་།])/))
    .filter(Boolean);
}

// Phonetics are written as words separated by spaces.
export function phoneticWords(str) {
  return String(str || '').split(/\s+/).filter(Boolean);
}

export function ringTokens(ring, script) {
  if (script === 'phonetics' && ring.phonetics) return phoneticWords(ring.phonetics);
  return tibetanSyllables(ring.text, { keepMarks: !!ring.keepMarks });
}
