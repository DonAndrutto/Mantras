// The mantras, in the order the menu lists them. The first one opens when
// the address names none. A new mantra is one file in this folder and one line here.
import vajrasattva from './vajrasattva.js';
import vajraGuru from './vajra-guru.js';

export const MANTRAS = [vajrasattva, vajraGuru];

export function findMantra(id) {
  return MANTRAS.find(m => m.id === id) || null;
}
