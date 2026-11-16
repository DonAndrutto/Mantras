// Regression coverage for shared counts, slow-frame timing and wake-lock races.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { serve } = await import('./serve.mjs');
  const server = await serve(0);
  let browser;
  const errors = [];
  const enter = async (page, url) => {
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForSelector('body.ready');
    await page.locator('#enterBtn').click();
  };
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const url = `http://localhost:${server.address().port}/#vajrakilaya`;
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('mantras:install-answered', '1');
      localStorage.setItem('mantras:settings:vajrakilaya', JSON.stringify({ countMode: 'manual' }));
      localStorage.setItem('mantras:prefs', JSON.stringify({ stillness: true, keepAwake: false }));
    });
    const a = await context.newPage(), b = await context.newPage();
    await enter(a, url);
    await a.evaluate(() => localStorage.setItem('mantras:count:vajrakilaya', '{"total":37}'));
    await enter(b, url);
    for (const p of [a, b]) await p.locator('#countBtn').click();
    const countIs = async (p, n) => p.waitForFunction(n =>
      JSON.parse(localStorage.getItem('mantras:count:vajrakilaya') || '{}').total === n, n, { polling: 20 });
    const taps = (p, n) => p.evaluate(n => {
      const plus = [...document.querySelectorAll('#counter button')].find(b => b.textContent === '+1');
      for (let i = 0; i < n; i++) plus.click();
    }, n);
    await Promise.all([taps(a, 1), taps(b, 1)]); await countIs(a, 39);
    await Promise.all([taps(a, 20), taps(b, 20)]); await countIs(a, 79);
    for (const p of [a, b]) await p.waitForFunction(() => document.getElementById('countBead').textContent === '79/108');
    await a.getByRole('button', { name: '−1', exact: true }).click(); await countIs(b, 78);
    a.once('dialog', d => d.accept());
    await a.getByRole('button', { name: 'Reset', exact: true }).click(); await countIs(b, 0);
    await b.waitForFunction(() => document.getElementById('countBead').textContent === '0/108');

    // Hold the lock while the user changes mantras. The queued click belongs
    // to Vajrakilaya, and must not change Green Tara's counter or UI.
    await a.evaluate(async () => {
      window.lockHeld = false;
      navigator.locks.request('mantras:count:vajrakilaya', () => new Promise(resolve => {
        window.unlockCount = resolve; window.lockHeld = true;
      }));
    });
    await a.waitForFunction(() => lockHeld);
    await taps(a, 1);
    await a.keyboard.press('Escape');
    await a.evaluate(() => { location.hash = 'green-tara'; });
    await a.waitForFunction(() => document.getElementById('nameBtn').textContent === 'Green Tara');
    await a.evaluate(() => unlockCount()); await countIs(b, 1);
    assert.equal(await a.locator('#countBead').innerText(), '0/108');
    await b.waitForFunction(() => document.getElementById('countBead').textContent === '1/108');
    await context.close();
    console.log('Counters passed: existing totals, simultaneous tabs, live UI sync, decrement/reset and queued mantra switching.');

    const timing = await browser.newContext();
    await timing.addInitScript(() => {
      localStorage.setItem('mantras:install-answered', '1');
      localStorage.setItem('mantras:settings:vajrakilaya', JSON.stringify({ period: 1 }));
      localStorage.setItem('mantras:prefs', JSON.stringify({ keepAwake: false }));
      const raf = requestAnimationFrame.bind(window);
      window.frameQueue = []; window.controlFrames = false;
      window.requestAnimationFrame = callback => raf(time => {
        if (window.controlFrames) frameQueue.push(callback); else callback(time);
      });
    });
    const p = await timing.newPage(); await enter(p, url);
    await p.evaluate(async () => {
      const { Stage } = await import('./js/stage.js');
      const update = Stage.prototype.update;
      Stage.prototype.update = function(args) { update.call(this, args); window.frameSample = args; };
      window.frameTime = performance.now(); window.controlFrames = true;
    });
    const step = async ms => {
      await p.waitForFunction(() => frameQueue.length > 0, null, { polling: 10 });
      return p.evaluate(ms => {
        frameTime += ms;
        const callbacks = frameQueue.splice(0);
        for (const callback of callbacks) callback(frameTime);
        return { rot: frameSample.rot, time: frameSample.time };
      }, ms);
    };
    await step(0);
    for (const [repeat, label] of [[1, 'Once'], [2, 'Twice'], [3, 'Three times']]) {
      await p.evaluate(label => [...document.querySelectorAll('#settings button')].find(b => b.textContent === label).click(), label);
      const before = await step(0);
      let after;
      for (let i = 0; i < 8; i++) after = await step(250);
      assert.ok(Math.abs((after.rot - before.rot) * repeat / (2 * Math.PI) - 2) < 1e-8,
        `${repeat} repeats: eight 250 ms frames are exactly two recitations`);
      assert.ok(after.time - before.time < 0.81, 'particle simulation remains bounded');
      const long = await step(1500);
      assert.ok(Math.abs((long.rot - after.rot) * repeat / (2 * Math.PI) - 1.5) < 1e-8,
        'a long visible frame also preserves the pace');
    }
    const beforePause = await p.evaluate(() => frameSample.rot);
    await p.evaluate(() => document.getElementById('playBtn').click());
    assert.equal((await step(10000)).rot, beforePause);
    await p.evaluate(() => document.getElementById('playBtn').click());
    assert.equal((await step(10000)).rot, beforePause, 'resume does not count paused time');
    const resumed = await step(250);
    assert.ok(Math.abs((resumed.rot - beforePause) * 3 / (2 * Math.PI) - .25) < 1e-8);
    await p.evaluate(() => {
      document.getElementById('settingsBtn').click();
      document.querySelector('#settings .sheet-close').click();
    });
    assert.equal((await step(10000)).rot, resumed.rot, 'opening and closing a panel between frames cannot add recitations');
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal((await step(10000)).rot, resumed.rot);
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal((await step(10000)).rot, resumed.rot, 'hidden time is excluded on return');
    // Changing repeats intentionally rebases the counter, so verify a fresh
    // uninterrupted segment instead of inferring totals from the final angle.
    const storedBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('mantras:count:vajrakilaya')).total);
    await step(1000);
    await p.waitForFunction(n => JSON.parse(localStorage.getItem('mantras:count:vajrakilaya')).total === n + 1,
      storedBefore, { polling: 20 });
    await timing.close();
    console.log('Timing passed: 4 FPS and long frames, all repeat settings, automatic counts, pause/resume, panels and hidden tabs.');

    const wake = await browser.newContext();
    await wake.addInitScript(() => {
      localStorage.setItem('mantras:install-answered', '1');
      window.wakeRequests = [];
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request() {
        return new Promise(resolve => {
          const sentinel = new EventTarget(); sentinel.released = false;
          sentinel.release = async () => { sentinel.released = true; sentinel.dispatchEvent(new Event('release')); };
          wakeRequests.push({ sentinel, resolve });
        });
      } } });
    });
    const w = await wake.newPage(); await enter(w, url);
    await w.waitForFunction(() => wakeRequests.length === 1);
    await w.locator('#freeCameraBtn').click(); await w.locator('#fixedCameraBtn').click();
    assert.equal(await w.evaluate(() => wakeRequests.length), 1, 'settings changes share the pending request');
    await w.locator('#playBtn').click();
    await w.evaluate(() => wakeRequests[0].resolve(wakeRequests[0].sentinel));
    await w.waitForFunction(() => wakeRequests[0].sentinel.released);
    await w.locator('#playBtn').click();
    await w.waitForFunction(() => wakeRequests.length === 2);
    await w.locator('#homeBtn').click();
    await w.evaluate(() => wakeRequests[1].resolve(wakeRequests[1].sentinel));
    await w.waitForFunction(() => wakeRequests[1].sentinel.released);
    await wake.close();
    console.log('Wake locks passed: no duplicate requests and late grants released after pause or leaving practice.');
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
