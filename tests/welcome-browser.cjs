// Optional Playwright integration checks for the welcome, help and offline lifecycle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { serve } = await import('./serve.mjs');
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const servers = [];
  const errors = [];
  const out = process.env.SCREENSHOT_DIR;
  if (out) fs.mkdirSync(out, { recursive: true });
  const snap = async (page, name) => { if (out) await page.screenshot({ path: path.join(out, name + '.png') }); };
  const enter = async page => {
    await page.waitForSelector('body.ready');
    await page.locator('#enterBtn').click();
  };
  try {
    const server = await serve(0); servers.push(server);
    const url = `http://localhost:${server.address().port}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.waitForSelector('body.ready');
    await page.evaluate(() => {
      localStorage.setItem('mantras:last', JSON.stringify('vajrasattva'));
      localStorage.setItem('mantras:count:vajrasattva', JSON.stringify({ total: 217 }));
      localStorage.setItem('mantras:count:vajra-guru', JSON.stringify({ total: 9 }));
      localStorage.setItem('mantras:settings:vajra-guru', JSON.stringify({ period: .5, background: 'black' }));
    });
    await page.reload(); await page.waitForSelector('body.ready');
    await page.evaluate(async () => {
      const { Stage } = await import('./js/stage.js');
      const original = Stage.prototype.update;
      Stage.prototype.update = function(args) {
        window.frameSample = { id: this.mantra.id, rot: args.rot, time: args.time, period: args.settings.period };
        original.call(this, args);
      };
    });
    await page.waitForFunction(() => window.frameSample?.id === 'vajra-guru');
    assert.equal(await page.evaluate(() => frameSample.period), 16);
    await snap(page, 'welcome-mobile');
    // Let the preview complete a full revolution: it must never write counts.
    await page.waitForFunction(() => frameSample.rot > Math.PI * 2, null, { timeout: 40000 });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mantras:count:vajra-guru')).total), 9);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mantras:last'))), 'vajrasattva');
    await page.locator('#previewPause').click();
    await page.waitForTimeout(100);
    const stopped = await page.evaluate(() => frameSample.rot);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => frameSample.rot), stopped);
    await page.getByRole('tab', { name: 'How to use' }).click();
    assert.equal(await page.locator('#guidePanel').isVisible(), true);
    await page.getByRole('tab', { name: 'How to use' }).press('ArrowLeft');
    assert.equal(await page.locator('#exploreTab').getAttribute('aria-selected'), 'true');
    for (const [width, height] of [[320,568], [390,844], [844,390], [1024,1366], [1440,1000]]) {
      await page.setViewportSize({width,height});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await snap(page, `welcome-${width}x${height}`);
    }
    await page.setViewportSize({width:390,height:844});
    await enter(page);
    assert.equal(await page.locator('#nameBtn').innerText(), 'Vajrasattva');
    assert.match(await page.locator('#countBtn').innerText(), /1\/108[\s\S]*2/);
    await page.waitForSelector('#installInvite:not([hidden])');
    await page.locator('#dismissInstall').click();
    await page.locator('#helpBtn').click();
    await snap(page, 'controls-mobile');
    assert.equal(await page.locator('#topControls').evaluate(n => n.inert), true);
    assert.equal(await page.locator('#helpLabels .help-chip').count(), 11);
    await page.locator('#fullGuideBtn').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'fullGuideBtn');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'helpBtn');
    await page.locator('#scene').click({position:{x:195,y:350}});
    assert.equal(await page.evaluate(() => document.body.classList.contains('bare')), true);
    await page.keyboard.press('?');
    assert.equal(await page.locator('#controlHelp').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.match(await page.locator('#donateBtn').getAttribute('href'), /business=JZS5LVZKPPY5J/);
    await page.locator('#homeBtn').click();
    // A deferred native prompt is only invoked by an explicit click.
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', {cancelable:true});
      window.promptCalls = 0;
      e.prompt = async () => { window.promptCalls++; };
      e.userChoice = Promise.resolve({outcome:'dismissed'});
      dispatchEvent(e);
    });
    assert.equal(await page.evaluate(() => promptCalls), 0);
    await page.locator('.welcome-foot [data-install]').click();
    await page.locator('#nativeInstall').click();
    assert.equal(await page.evaluate(() => promptCalls), 1);
    await page.keyboard.press('Escape');
    await page.reload(); await enter(page);
    await page.waitForTimeout(2000);
    assert.equal(await page.locator('#installInvite').isVisible(), false);
    await context.close();

    // Fresh offline launches at root AND GitHub Pages-style subpaths.
    for (const basePath of ['/', '/Mantras/']) {
      const server = await serve(0, {basePath}); servers.push(server);
      const origin = `http://localhost:${server.address().port}`;
      const entry = origin + basePath;
      const ctx = await browser.newContext();
      let p = await ctx.newPage();
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(entry + '#green-tara');
      await p.waitForSelector('body.ready');
      await p.evaluate(async () => {
        await caches.open('bardo-os-unrelated');
        await navigator.serviceWorker.ready;
        localStorage.setItem('mantras:install-answered', '1');
        localStorage.setItem('mantras:count:green-tara', JSON.stringify({total:33}));
      });
      await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      assert.equal(await p.locator('#offlineStatus').innerText(), 'Ready offline');
      await p.close();
      await ctx.setOffline(true);
      p = await ctx.newPage();
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(entry + '?installed=1#green-tara');
      await enter(p);
      assert.equal(await p.locator('#nameBtn').innerText(), 'Green Tara');
      assert.match(await p.locator('#countBtn').innerText(), /33\/108/);
      assert.equal(await p.evaluate(() => document.fonts.check("100px 'Jomolhari'", 'ཧཱུྃ')), true);
      assert.equal(await p.evaluate(async () => (await caches.keys()).includes('bardo-os-unrelated')), true);
      for (const [id, name] of [['vajrasattva','Vajrasattva'],['white-tara','White Tara'],['vajra-guru','Vajra Guru'],['kurukulle','Kurukulle'],['chenrezig','Chenrezig'],['amitabha','Amitabha'],['dzambhala','Dzambhala']]) {
        await p.evaluate(id => { location.hash = id; }, id);
        await p.waitForFunction(name => document.getElementById('nameBtn').textContent.includes(name), name);
      }
      assert.equal(await p.evaluate(async () => (await fetch('fonts/EBGaramond-Medium-latin-ext.woff2')).ok), true);
      assert.equal(await p.evaluate(async () => (await fetch('icons/icon-512.png')).ok), true);
      await ctx.close();
    }
    // A downloaded update waits for the running session, then takes over offline.
    const overrides = new Map();
    const updateServer = await serve(0, {overrides}); servers.push(updateServer);
    const updateURL = `http://localhost:${updateServer.address().port}`;
    const updateContext = await browser.newContext();
    let up = await updateContext.newPage(); await up.goto(updateURL); await enter(up);
    await up.evaluate(async () => {
      await navigator.serviceWorker.ready;
      await caches.open('ngondro-keep');
      localStorage.setItem('mantras:count:vajra-guru', JSON.stringify({total:41}));
    });
    await up.waitForFunction(() => !!navigator.serviceWorker.controller);
    const worker = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
    overrides.set('sw.js', {body:worker.replace(/const VERSION = '[^']+';/, "const VERSION = 'test-release-2';")});
    overrides.set('app.css', {body:fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8') + '\n/* release-two-marker */'});
    await up.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await up.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    await up.waitForFunction(() => document.getElementById('offlineStatus').textContent === 'Update ready', null, {timeout:5000});
    assert.equal(await up.evaluate(async () => (await (await fetch('app.css')).text()).includes('release-two-marker')), false);
    await up.close();
    up = await updateContext.newPage(); await up.goto(updateURL); await enter(up);
    await up.waitForFunction(async () => (await (await fetch('app.css')).text()).includes('release-two-marker'));
    assert.match(await up.locator('#countBtn').innerText(), /41\/108/);
    assert.equal(await up.evaluate(async () => (await caches.keys()).includes('ngondro-keep')), true);
    await updateContext.setOffline(true);
    await up.reload(); await enter(up);
    assert.equal(await up.evaluate(async () => (await (await fetch('app.css')).text()).includes('release-two-marker')), true);
    await updateContext.close();

    // A missing required font must not report a complete offline download.
    const failedServer = await serve(0, {overrides:new Map([['fonts/Jomolhari-Regular.ttf', {status:503,body:'unavailable'}]])});
    servers.push(failedServer);
    const failedContext = await browser.newContext();
    const failedPage = await failedContext.newPage();
    await failedPage.goto(`http://localhost:${failedServer.address().port}`);
    await failedPage.waitForFunction(() => /incomplete|unavailable/.test(document.getElementById('offlineStatus').textContent));
    assert.equal(await failedPage.evaluate(() => !!navigator.serviceWorker.controller), false);
    await failedContext.close();

    const ios = await browser.newContext({ viewport: { width:390,height:844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', reducedMotion:'reduce' });
    const ip = await ios.newPage(); await ip.goto(url); await ip.waitForSelector('body.ready');
    assert.equal(await ip.locator('#previewPause').innerText(), 'Play preview');
    await ip.locator('.welcome-foot [data-install]').click();
    assert.match(await ip.locator('#installSteps').innerText(), /Share.*Add to Home Screen/);
    await ios.close();
    const standalone = await browser.newContext();
    await standalone.addInitScript(() => Object.defineProperty(navigator, 'standalone', {value:true}));
    const sp = await standalone.newPage();await sp.goto(url);await enter(sp);await sp.waitForTimeout(2000);
    assert.equal(await sp.locator('#installInvite').isVisible(), false);
    await standalone.close();
    // Failed renderer must leave the guide and a recovery action available.
    const failure = await browser.newContext({serviceWorkers:'block'});
    const fp = await failure.newPage();
    await fp.route('**/js/app.js', route => route.abort());
    await fp.goto(url);await fp.waitForSelector('body.scene-failed');
    await fp.getByRole('tab', {name:'How to use'}).click();
    assert.equal(await fp.locator('#guidePanel').isVisible(), true);
    await failure.close();
    assert.deepEqual(errors, []);
    console.log('Welcome, preview isolation, layouts, help/focus, installation, reduced motion, recovery and offline cold launches passed.');
  } finally { await browser.close(); for (const s of servers) s.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
