// Modal sheets share a focus trap and remember nested entry points.
export function createSheets() {
  let active = null;
  const stack = [];
  const surfaces = [...document.querySelectorAll('.chrome, #scene, #readout, #phase')];
  const focusable = sheet => [...sheet.querySelectorAll('button, input, select, summary, [tabindex="0"]')]
    .filter(n => {
      const closed = n.closest('details:not([open])');
      return n.tabIndex >= 0 && !n.matches(':disabled') && !n.closest('[inert]')
        && (!closed || n === closed.querySelector(':scope > summary')) && n.getClientRects().length;
    });
  function show() {
    document.querySelectorAll('.sheet').forEach(s => { s.hidden = s.id !== active?.id; });
    document.body.classList.toggle('sheet-open', !!active);
    surfaces.forEach(n => { n.inert = !!active || (n.classList.contains('chrome') && document.body.classList.contains('bare')); });
    const dialog = active && document.getElementById(active.id);
    // Variant changes rebuild the settings controls while the sheet stays open.
    if (dialog && !dialog.contains(document.activeElement)) dialog.querySelector('.sheet-close').focus({ preventScroll: true });
  }
  return {
    get isOpen() { return !!active; },
    open(id) {
      if (active?.id === id) return;
      if (active) stack.push(active);
      active = { id, opener: document.activeElement };
      show();
      document.getElementById(id).querySelector('.sheet-close').focus({ preventScroll: true });
    },
    close(all = false) {
      if (!active) return;
      const returning = all ? (stack[0]?.opener || active.opener) : active.opener;
      active = all ? null : stack.pop() || null;
      if (all) stack.length = 0;
      show();
      const fallback = document.getElementById('settingsBtn');
      (returning?.isConnected && returning.getClientRects().length ? returning : fallback).focus({ preventScroll: true });
    },
    keydown(e) {
      if (!active) return false;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); return true; }
      if (e.key !== 'Tab') return false;
      const nodes = focusable(document.getElementById(active.id));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !nodes.includes(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !nodes.includes(document.activeElement))) { e.preventDefault(); first?.focus(); }
      return true;
    },
    refresh: show,
  };
}
