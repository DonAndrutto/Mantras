// The doorway remains usable even if WebGL or the scene module cannot start.
import { createSheets } from './dialogs.js';
import { createControlHelp } from './help.js';
import { setupInstall } from './install.js';

const $ = id => document.getElementById(id);
export let welcoming = true;
export let previewPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const sheets = createSheets();
const DONATE_URL = 'https://www.paypal.com/donate/?business=JZS5LVZKPPY5J&no_recurring=0&item_name=Help+fund+Dharma+translation+projects.&currency_code=USD';
document.querySelectorAll('[data-donate]').forEach(a => { a.href = DONATE_URL; });
for (const node of document.querySelectorAll('#guidePanel .guide-content, #guide .guide-content')) {
  node.append($('guideCopy').content.cloneNode(true));
}
const help = createControlHelp(sheets);
$('helpBtn').onclick = () => help.open();
$('fullGuideBtn').onclick = () => sheets.open('guide');
for (const b of document.querySelectorAll('.sheet-close')) b.onclick = () => sheets.close();
$('scrim').onclick = () => sheets.close();
window.addEventListener('keydown', e => {
  if (sheets.keydown(e)) { e.stopImmediatePropagation(); return; }
  if (e.key === '?' && !welcoming && !e.target.closest('input, textarea, select')) {
    e.preventDefault(); help.open();
  }
});

function selectTab(id, focus = false) {
  for (const tab of document.querySelectorAll('.welcome-tabs [role=tab]')) {
    const selected = tab.id === id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !selected;
    if (selected && focus) tab.focus();
  }
  document.body.classList.toggle('welcome-guide', id === 'guideTab');
}
for (const tab of document.querySelectorAll('.welcome-tabs [role=tab]')) {
  tab.onclick = () => selectTab(tab.id);
  tab.onkeydown = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    selectTab(e.key === 'Home' ? 'exploreTab' : e.key === 'End' ? 'guideTab' : tab.id === 'exploreTab' ? 'guideTab' : 'exploreTab', true);
  };
}
function updatePreviewButton() {
  $('previewPause').textContent = previewPaused ? 'Play preview' : 'Pause preview';
  $('previewPause').setAttribute('aria-pressed', String(previewPaused));
}
$('previewPause').onclick = () => { previewPaused = !previewPaused; updatePreviewButton(); };
updatePreviewButton();
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
  previewPaused = e.matches; updatePreviewButton();
});
const install = setupInstall(sheets);
function enter() {
  if (!$('enterBtn').disabled) {
    welcoming = false;
    $('welcome').hidden = true;
    document.body.classList.remove('welcome', 'welcome-guide', 'bare');
    window.dispatchEvent(new Event('mantras:enter'));
    sheets.refresh();
    $('pickerBtn').focus({ preventScroll: true });
    install.settled();
  }
}
$('enterBtn').onclick = enter;
document.querySelector('#guidePanel .guide-enter').onclick = enter;
$('homeBtn').onclick = () => {
  welcoming = true;
  $('welcome').hidden = false;
  document.body.classList.add('welcome');
  document.body.classList.remove('bare');
  selectTab('exploreTab');
  window.dispatchEvent(new Event('mantras:welcome'));
  sheets.refresh();
  $('enterBtn').focus({ preventScroll: true });
};
sheets.refresh();

export function sceneReady() {
  for (const b of document.querySelectorAll('#enterBtn, .guide-enter')) {
    b.disabled = false; b.textContent = 'Tap to explore';
  }
  $('loadStatus').textContent = 'A visual companion to your own recitation';
  install.settled();
}
function sceneFailed(error) {
  console.warn('Mantras could not start:', error);
  $('loadStatus').textContent = 'The visualisation could not start. Please reload, or try a browser with WebGL enabled.';
  $('enterBtn').textContent = 'Reload visualisation';
  $('enterBtn').disabled = false;
  $('enterBtn').onclick = () => location.reload();
  $('previewPause').hidden = true;
  document.body.classList.add('scene-failed');
  install.settled();
}
// Also catches constructor errors (for example, WebGL unavailable).
import('./app.js').then(app => app.start()).catch(sceneFailed);
