// The mantras, in the order the menu lists them. The first one opens when
// the address names none. A new mantra is one file in this folder and one line here.
import vajrasattva from './vajrasattva.js';
import vajraGuru from './vajra-guru.js';
import greenTara from './green-tara.js';
import whiteTara from './white-tara.js';
import dzambhala from './dzambhala.js';
import kurukulle from './kurukulle.js';

export const MANTRAS = [vajrasattva, vajraGuru, greenTara, whiteTara, dzambhala, kurukulle];

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

// Every mantra the page can show, each variant on its own, as 'id' or
// 'id/variant' — the choices for sharing one garland.
export function allMantraKeys() {
  return MANTRAS.flatMap(m => (m.variants?.length ? m.variants.map(v => ({ key: `${m.id}/${v.id}`, mantra: withVariant(m, v.id), label: `${m.name} · ${v.label}` }))
    : [{ key: m.id, mantra: m, label: m.name }]));
}

export function mantraByKey(key) {
  const [id, variant] = String(key).split('/');
  const m = findMantra(id);
  return m ? withVariant(m, variant) : null;
}
