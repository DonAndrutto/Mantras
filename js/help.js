// Like Ngondro and BardoOS: label controls in place, with the scene stepped back.
const TARGETS = [
  ['homeBtn', 'Welcome', 'top'], ['pickerBtn', 'Choose mantra', 'top'],
  ['donateBtn', 'Support', 'top'], ['helpBtn', 'Help', 'top'], ['settingsBtn', 'Settings', 'top'],
  ['playBtn', 'Pause / play', 'bottom'], ['periodBtn', 'Pace', 'bottom'],
  ['tapBtn', 'Tap tempo', 'bottom'], ['countBtn', 'Counter', 'bottom'],
];
export function createControlHelp(sheets) {
  const labels = document.getElementById('helpLabels');
  const panel = document.getElementById('controlHelp');
  function layout() {
    if (panel.hidden) return;
    labels.replaceChildren();
    const targets = TARGETS.map(([id, text, zone]) => ({ node: document.getElementById(id), text, zone }));
    document.querySelectorAll('[data-vajra-view]').forEach(node => targets.push({ node, text: node.textContent, zone: 'bottom' }));
    const rows = { top: [], bottom: [] };
    const width = document.documentElement.clientWidth;
    for (const { node, text, zone } of targets) {
      if (!node || node.hidden || node.closest('[hidden]')) continue;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const chip = document.createElement('span');
      chip.className = 'help-chip'; chip.textContent = text; labels.append(chip);
      const w = chip.offsetWidth;
      const x = Math.max(8, Math.min(width - w - 8, r.x + r.width / 2 - w / 2));
      let row = 0;
      while (rows[zone][row]?.some(([a, b]) => x < b + 8 && x + w + 8 > a)) row++;
      (rows[zone][row] ||= []).push([x, x + w]);
      const edge = zone === 'top' ? r.bottom : r.top;
      const y = zone === 'top' ? edge + 12 + row * 30 : edge - 38 - row * 30;
      Object.assign(chip.style, { left: `${x}px`, top: `${y}px` });
      const line = document.createElement('span'); line.className = 'help-line';
      Object.assign(line.style, { left: `${r.x + r.width / 2}px`, top: `${zone === 'top' ? edge + 3 : y + 24}px`, height: `${9 + row * 30}px` });
      labels.append(line);
    }
  }
  window.addEventListener('resize', layout);
  // Returning from the guide after rotating the device needs a fresh layout.
  new MutationObserver(layout).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  panel.addEventListener('click', e => { if (!e.target.closest('button')) sheets.close(); });
  return { open() {
    document.body.classList.remove('bare');
    sheets.open('controlHelp');
    layout();
  } };
}
