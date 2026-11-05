// Installation is optional; the offline download is independent of installing.
const ASKED = 'mantras:install-answered';
const $ = id => document.getElementById(id);
const installed = () => matchMedia('(display-mode: standalone)').matches
  || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true
  || document.referrer.startsWith('android-app://');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function setupInstall(sheets) {
  let deferred = null, settled = false, timer;
  let answered = false;
  try { answered = localStorage.getItem(ASKED) === '1'; } catch { /* storage unavailable */ }
  function dismiss() {
    answered = true;
    try { localStorage.setItem(ASKED, '1'); } catch { /* session-only dismissal */ }
    if ($('installInvite').contains(document.activeElement)) $('helpBtn').focus({ preventScroll: true });
    $('installInvite').hidden = true;
    document.body.classList.remove('has-install-invite');
  }
  function offer() {
    if (!settled || answered || installed() || document.body.classList.contains('welcome')) return;
    $('installInvite').hidden = false;
    document.body.classList.add('has-install-invite');
  }
  function sync() {
    document.querySelectorAll('[data-install]').forEach(b => { b.hidden = installed(); });
    if (installed()) dismiss();
    $('nativeInstall').hidden = !deferred || installed();
    $('installSteps').textContent = installed() ? 'Mantras is already running as an installed app.'
      : deferred ? 'Choose Install Mantras below to open your browser’s installation prompt.'
      : isIOS ? 'In Safari, tap Share, then Add to Home Screen, then Add. If you are in another browser, open this page in Safari first.'
      : 'In Chrome or Edge, look for Install app in the address bar or browser menu. On Safari for Mac, use File → Add to Dock. If your browser offers no installation option, open this page in a supported browser. You can still use it here offline once the download is ready.';
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e; sync(); offer();
  });
  window.addEventListener('appinstalled', () => { deferred = null; dismiss(); sync(); });
  for (const mode of ['standalone', 'fullscreen']) matchMedia(`(display-mode: ${mode})`).addEventListener('change', sync);
  document.querySelectorAll('[data-install]').forEach(b => b.onclick = () => { dismiss(); sync(); sheets.open('install'); });
  $('dismissInstall').onclick = dismiss;
  $('nativeInstall').onclick = async () => {
    const prompt = deferred;
    if (!prompt) return;
    deferred = null; sync();
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { $('installSteps').textContent = 'The installation prompt expired. Reload the page or use your browser’s installation menu.'; return; }
    sync();
  };
  sync();

  const status = (short, detail) => {
    $('offlineStatus').textContent = short;
    document.querySelectorAll('[data-offline-detail]').forEach(n => { n.textContent = detail; });
  };
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' }).then(reg => {
      const ready = () => status('Ready offline', 'Ready offline — all eight mantras, the visualisation and fonts are saved on this device.');
      const watch = worker => {
        if (!worker) return;
        const changed = () => {
          if (worker.state === 'activated') ready();
          if (worker.state === 'installed' && navigator.serviceWorker.controller) status('Update ready', 'An update is downloaded. Close all Mantras windows and reopen to use it. Your counts and settings will remain.');
          if (worker.state === 'redundant' && !reg.active) status('Offline download incomplete', 'Keep this page online and reload to retry the offline download.');
        };
        worker.addEventListener('statechange', changed); changed();
      };
      if (reg.active) ready();
      watch(reg.installing || reg.waiting);
      reg.addEventListener('updatefound', () => watch(reg.installing));
    }).catch(() => status('Offline download unavailable', 'Offline storage could not be prepared. Check your connection and browser storage settings, then reload to retry.'));
  } else status('Online use only', 'Offline use requires a supported browser and an HTTPS connection (or localhost for development).');
  return { settled() {
    settled = true;
    clearTimeout(timer); timer = setTimeout(offer, 1800);
  } };
}
