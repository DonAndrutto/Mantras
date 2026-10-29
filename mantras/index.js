// The mantras, in the order the menu lists them. The first one opens when
// the address names none. A new mantra is one file in this folder and one line here.
import vajrasattva from './vajrasattva.js';
import vajraGuru from './vajra-guru.js';
import greenTara from './green-tara.js';
import whiteTara from './white-tara.js';
import dzambhala from './dzambhala.js';
import kurukulle from './kurukulle.js';
import chenrezig from './chenrezig.js';
import amitabha from './amitabha.js';

export const MANTRAS = [vajrasattva, vajraGuru, greenTara, whiteTara, dzambhala, kurukulle, chenrezig, amitabha];

export function findMantra(id) {
  return MANTRAS.find(m => m.id === id) || null;
}

// A mantra with variants (Kurukulle's approach and accomplishment) is the
// mantra with the chosen variant's rings and pace laid over it.
export function withVariant(mantra, variantId) {
  if (!mantra.variants?.length) return mantra;
  const v = mantra.variants.find(x => x.id === variantId) || mantra.variants[0];
  return {
    ...mantra, ...v,
    id: mantra.id, name: mantra.name, variant: v.id,
    motion: { ...mantra.motion, ...v.motion },
    view: { ...mantra.view, ...v.view },
  };
}

