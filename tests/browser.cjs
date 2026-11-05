// Optional browser regression suite. Install Playwright separately, then run:
//   PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/browser.cjs
// No browser dependency is needed to serve the site or run npm test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { serve } = await import('./serve.mjs');
  const server = await serve(0);
  let browser;
  const errors = [];
  const out = process.env.SCREENSHOT_DIR;
  if (out) fs.mkdirSync(out, { recursive: true });
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    const url = `http://localhost:${server.address().port}`;
    await page.goto(url);
    await page.waitForSelector('body.ready');
    const snap = async name => { if (out) await page.screenshot({ path: path.join(out, `${name}.png`) }); };
    const open = () => page.getByRole('button', { name: 'Settings', exact: true }).click();
    const close = () => page.locator('.sheet:not([hidden]) .sheet-close').click();
    const tab = name => page.getByRole('tab', { name, exact: true }).click();
    const group = title => page.locator('summary').filter({ hasText: title }).click();
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('mantras:settings:vajrasattva') || '{}'));
    const range = async (name, value) => page.getByRole('slider', { name, exact: true }).evaluate((n, v) => {
      n.value = v; n.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);

    // Existing storage must survive adding all new controls.
    await page.evaluate(() => {
      localStorage.setItem('mantras:settings:vajrasattva', JSON.stringify({ period: 23, repeat: 2, seedScale: 1.2 }));
      localStorage.setItem('mantras:count:vajrasattva', JSON.stringify({ total: 217 }));
    });
    await page.reload(); await page.waitForSelector('body.ready');
    assert.match(await page.locator('#periodBtn').innerText(), /23.00/);
    assert.match(await page.locator('#countBtn').innerText(), /1\/108[\s\S]*2/);

    // Direct pace panel, pinning, nested sheets and returning keyboard focus.
    await page.locator('#periodBtn').click();
    assert.equal(await page.getByRole('dialog', { name: 'Pace', exact: true }).isVisible(), true);
    await page.getByRole('switch', { name: 'Keep Tap tempo in the bottom bar' }).check();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'periodBtn');
    await open();
    await page.getByRole('button', { name: 'Pace & tap tempo', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Pace & tap tempo');
    await page.locator('#settings .sheet-close').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#settings')), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('sheet-close')), true);

    // Stillness is an actual scene freeze, not only stopped rotation.
    await page.getByRole('switch', { name: 'Stillness — stop all animation' }).check();
    await tab('Visualization');
    await group('Vajrasattva vajra');
    await page.getByRole('button', { name: 'Use Ngondro arrangement' }).click();
    await close();
    assert.equal((await saved()).repeat, 2); assert.equal((await saved()).period, 23);
    await page.evaluate(async () => {
      const { Stage } = await import('./js/stage.js');
      const original = Stage.prototype.update;
      Stage.prototype.update = function(args) {
        original.call(this, args);
        window.testFrame = { rot: args.rot, time: args.time, stage: this, camera: args.camera,
          radius: this.mantraExtent(args.settings).radius };
      };
    });
    await page.waitForFunction(() => !!window.testFrame);
    const frozen = await page.evaluate(() => [testFrame.rot, testFrame.time]);
    await page.waitForTimeout(400);
    assert.deepEqual(await page.evaluate(() => [testFrame.rot, testFrame.time]), frozen);
    const poses = [];
    for (const view of ['mantra', 'hub', 'whole']) {
      await page.locator(`[data-vajra-view="${view}"]`).click();
      await page.waitForTimeout(80);
      poses.push(await page.evaluate(() => testFrame.camera.position.length()));
      assert.deepEqual(await page.evaluate(() => [testFrame.rot, testFrame.time]), frozen);
      assert.equal((await saved())['vajra.view'] || 'mantra', view);
      await snap(`mobile-${view}`);
    }
    assert.ok(poses[0] < poses[1] && poses[1] < poses[2], `distinct increasing camera distances: ${poses}`);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total), 217);

    // Compact bars, including optional tap tempo, fit narrow portrait and landscape.
    for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      const rects = await page.locator('.bottom > button:not([hidden])').evaluateAll(nodes => nodes.map(n => {
        const b = n.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      }));
      for (const r of rects) assert.ok(r.left >= 0 && r.right <= width && r.bottom <= height, `${width}: ${JSON.stringify(r)}`);
      for (let i = 1; i < rects.length; i++) assert.ok(rects[i].left >= rects[i - 1].right, `${width}: controls overlap`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await snap(`whole-${width}x${height}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });

    // Seat appearance, independent materials, all petal choices and zero opacity.
    await open(); await tab('Visualization'); await group('Lotus & discs');
    await page.getByRole('switch', { name: 'Sun disc', exact: true }).check();
    await page.getByRole('button', { name: 'Translucent', exact: true }).click();
    await range('Seat opacity', 0.3);
    await page.getByRole('switch', { name: 'Adjust separately', exact: true }).check();
    await range('Sun disc opacity', 0);
    await range('Moon disc opacity', 0.55);
    for (const name of ['4', '8', '16', 'Thousand']) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.waitForTimeout(60);
    }
    await snap('seat-controls');
    await close();
    const materialState = await page.evaluate(() => {
      const seats = testFrame.stage.seats.group;
      return { sunVisible: seats.getObjectByName('sun-disc').visible,
        moonOpacity: seats.getObjectByName('moon-disc').material.opacity,
        depthWrite: seats.getObjectByName('moon-disc').material.depthWrite };
    });
    assert.deepEqual(materialState, { sunVisible: false, moonOpacity: 0.55, depthWrite: false });
    await page.reload(); await page.waitForSelector('body.ready');
    assert.equal((await saved())['seat.petals'], 1000); assert.equal((await saved())['seat.moon.opacity'], 0.55);

    // Counter remains usable in stillness; presets must not reset it.
    await page.locator('#countBtn').click();
    await page.getByRole('button', { name: 'By tapping', exact: true }).click();
    await page.getByRole('button', { name: '+1', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total), 218);
    await close();

    // Free camera: selecting the already active framing returns to a fixed view.
    await open(); await tab('View'); await group(/^View$/);
    await page.getByRole('button', { name: 'Free', exact: true }).click();
    assert.equal(await page.getByRole('slider', { name: 'Angle', exact: true }).isDisabled(), true);
    await close(); await page.locator('[data-vajra-view="whole"]').click();
    assert.equal((await saved()).camera || 'fixed', 'fixed');

    // Inspect lotus forms independently of the vajra, including an oblique view.
    await page.evaluate(() => {
      localStorage.setItem('mantras:settings:vajrasattva', JSON.stringify({
        'seat.lotus': true, 'seat.sun': true, 'seat.moon': true, angle: 28,
      }));
    });
    await page.reload(); await page.waitForSelector('body.ready');
    await open(); await tab('Visualization'); await group('Lotus & discs');
    for (const name of ['4', '8', '16', 'Thousand']) {
      await page.getByRole('button', { name, exact: true }).click(); await close();
      await page.waitForTimeout(60); await snap(`lotus-${name}`);
      await open();
    }
    await page.getByRole('button', { name: 'Translucent', exact: true }).click();
    await range('Seat opacity', 0.3); await close(); await snap('lotus-translucent');

    // Other mantras do not acquire Vajrasattva controls; all variants still load.
    for (const id of ['green-tara', 'white-tara', 'vajra-guru', 'kurukulle', 'chenrezig', 'amitabha', 'dzambhala']) {
      await page.goto(`${url}/#${id}`); await page.waitForFunction(id => location.hash === `#${id}` && document.body.classList.contains('ready'), id);
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#vajraViews').isVisible(), false);
      await open(); await tab('Visualization');
      assert.equal(await page.getByRole('switch', { name: 'Within a five-pronged vajra' }).count(), 0);
      if (id === 'kurukulle') {
        await tab('Practice'); await group(/^Mantra$/);
        await page.getByRole('button', { name: 'Accomplishment', exact: true }).click();
        assert.match(await page.locator('#nameBtn').innerText(), /Accomplishment/);
        assert.equal(await page.evaluate(() => !!document.activeElement.closest('#settings')), true);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => !!document.activeElement.closest('#settings')), true);
      }
      await close();
    }
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: mobile layouts, three views, state preservation, stillness, focus, seats, counting and all mantras.');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
