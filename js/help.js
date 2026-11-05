// Like Ngondro and BardoOS: label controls in place, with the scene stepped back.
const TARGETS = [
  ['homeBtn', 'Welcome', 'top'], ['pickerBtn', 'Choose mantra', 'top'],
  ['donateBtn', 'Support', 'top'], ['helpBtn', 'Help', 'top'], ['settingsBtn', 'Settings', 'top'],
  ['playBtn', 'Pause / play', 'bottom'], ['periodBtn', 'Pace', 'bottom'],
  ['phoneticsBtn', 'Latin below Tibetan', 'bottom'], ['fixedCameraBtn', 'Recenter', 'bottom'], ['freeCameraBtn', 'Drag to turn', 'bottom'],
  ['tapBtn', 'Tap tempo', 'bottom'], ['countBtn', 'Counter', 'bottom'],
];
export function createControlHelp(sheets) {
  const labels = document.getElementById('helpLabels');
  const panel = document.getElementById('controlHelp');
  function layout() {
    if (panel.hidden) return;
    labels.replaceChildren();
    const targets = TARGETS.map(([id, text, zone]) => ({ node: document.getElementById(id), text, zone }));
    document.querySelectorAll('[data-vajra-view]').forEach(node => targets.push({ node, text: node.textContent, zone: 'top' }));
    const occupied = [];
    const controls = targets.filter(({node}) => node && !node.hidden && !node.closest('[hidden]'))
      .map(({node}) => node.getBoundingClientRect()).filter(r => r.width && r.height);
    const overlaps = (a, b) => a.left < b.right + 5 && a.right + 5 > b.left && a.top < b.bottom + 5 && a.bottom + 5 > b.top;
    const width = document.documentElement.clientWidth;
    for (const { node, text, zone } of targets) {
      if (!node || node.hidden || node.closest('[hidden]')) continue;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const chip = document.createElement('span');
      chip.className = 'help-chip'; chip.textContent = text; labels.append(chip);
      const w = chip.offsetWidth;
      const x = Math.max(8, Math.min(width - w - 8, r.x + r.width / 2 - w / 2));
      const edge = zone === 'top' ? r.bottom : r.top;
      let y = zone === 'top' ? edge + 12 : edge - 38;
      const h = chip.offsetHeight;
      let box = {left:x, right:x+w, top:y, bottom:y+h};
      while ([...controls, ...occupied].some(other => overlaps(box, other))) {
        y += zone === 'top' ? 30 : -30;
        box = {left:x, right:x+w, top:y, bottom:y+h};
      }
      occupied.push(box);
      Object.assign(chip.style, { left: `${x}px`, top: `${y}px` });
      const line = document.createElement('span'); line.className = 'help-line';
      Object.assign(line.style, { left: `${r.x + r.width / 2}px`, top: `${zone === 'top' ? edge + 3 : y + h}px`, height: `${zone === 'top' ? y - edge - 3 : edge - y - h - 3}px` });
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
