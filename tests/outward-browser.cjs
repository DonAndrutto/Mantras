// Integration coverage for the outward-facing option, including the elliptical
// Vajrasattva ring. Uses the same optional Playwright setup as browser.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { serve } = await import('./serve.mjs');
  const server = await serve(0, { basePath: '/Mantras/' });
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    let page = await context.newPage();
    const errors = [];
    const watch = p => p.on('pageerror', e => errors.push(e.message));
    watch(page);
    await context.addInitScript(() => localStorage.setItem('mantras:install-answered', '1'));
    const url = process.env.APP_URL || `http://localhost:${server.address().port}/Mantras/`;
    const enter = async () => {
      await page.waitForSelector('body.ready');
      await page.locator('#enterBtn').click();
      await page.evaluate(async () => {
        const { Stage } = await import('./js/stage.js');
        const update = Stage.prototype.update;
        Stage.prototype.update = function(args) {
          update.call(this, args);
          window.outwardFrame = { stage: this, ...args };
        };
      });
      await page.waitForFunction(() => window.outwardFrame);
    };
    const scriptPanel = async () => {
      await page.locator('#settingsBtn').click();
      await page.getByRole('tab', { name: 'Practice', exact: true }).click();
      const group = page.locator('#settings details').filter({ has: page.locator('summary', { hasText: /^Script$/ }) });
      if (await group.getAttribute('open') === null) await group.locator('summary').click();
    };
    const outward = () => page.getByRole('button', { name: 'Away from seed', exact: true });
    const close = () => page.keyboard.press('Escape');
    const count = () => page.locator('#countBtn').innerText();
    const switchMantra = async id => {
      await page.evaluate(id => { location.hash = id; }, id);
      await page.waitForFunction(id => outwardFrame.stage.mantra.id === id, id);
    };
    await page.goto(url + '#vajrasattva');
    await enter();
    // There is one direction control, inside the initially expanded Script
    // section of Practice. It must disappear with that tab, not float above it.
    await page.locator('#settingsBtn').click();
    assert.equal(await page.getByRole('tab', { name: 'Practice', exact: true }).getAttribute('aria-selected'), 'true');
    const direction = page.getByRole('group', { name: 'Syllable facing direction', exact: true });
    assert.equal(await direction.count(), 1);
    assert.equal(await page.locator('#panel-practice details[open]').filter({
      has: direction }).locator('summary').innerText(), 'Script');
    for (const tab of ['Visualization', 'View']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      assert.equal(await outward().isVisible(), false, `direction belongs only to Practice, not ${tab}`);
    }
    await page.getByRole('tab', { name: 'Practice', exact: true }).click();
    for (const [width, height] of [[320,568], [390,844], [568,320], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      for (const name of ['Away from seed', 'Toward viewer']) {
        const button = direction.getByRole('button', { name, exact: true });
        await button.tap();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        const rect = await button.boundingBox();
        assert.ok(rect.width >= 44 && rect.height >= 44, 'at least 44 px touch targets');
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.y >= 0
          && rect.y + rect.height <= height, `${width}×${height}: direction button within viewport`);
      }
      assert.equal(await page.locator('#settingsBody').evaluate(n => n.scrollWidth <= n.clientWidth), true,
        'settings have no horizontal overflow');
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `script-${width}x${height}.png`) });
      }
    }
    await outward().focus(); await page.keyboard.press('Space');
    assert.equal(await outward().getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Toward viewer', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await outward().getAttribute('aria-pressed'), 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    await close();
    // Seed a nonzero counter using the real counter controls.
    await page.locator('#countBtn').click();
    await page.getByRole('button', { name: 'By tapping', exact: true }).click();
    await page.getByRole('button', { name: '+1', exact: true }).click();
    await close();
    await page.locator('#phoneticsBtn').click();
    await page.waitForFunction(() => outwardFrame.rot > .2);
    await scriptPanel();
    assert.equal((await outward().getAttribute('aria-pressed') === 'true'), false);
    await page.evaluate(() => {
      window.beforeOutward = { stage: outwardFrame.stage, rot: outwardFrame.rot,
        scripture: JSON.stringify(outwardFrame.stage.mantra), period: outwardFrame.settings.period };
    });
    const beforeCount = await count();
    await outward().click();
    await page.waitForFunction(() => outwardFrame.settings.faceOutward);
    assert.equal(await page.evaluate(() => outwardFrame.stage === beforeOutward.stage
      && outwardFrame.rot === beforeOutward.rot
      && outwardFrame.settings.period === beforeOutward.period
      && JSON.stringify(outwardFrame.stage.mantra) === beforeOutward.scripture), true);
    assert.equal(await count(), beforeCount);
    await close();

    // Both scripts, actual fixed/free controls, and an orbit away from the
    // default camera. The seed follows the camera; the garland stays upright.
    for (const mode of ['fixed', 'free']) {
      await page.locator(`#${mode}CameraBtn`).click();
      if (mode === 'free') {
        await page.mouse.move(120, 340); await page.mouse.down();
        await page.mouse.move(270, 440, { steps: 12 }); await page.mouse.up();
      }
      for (const script of ['tibetan', 'phonetics']) {
        if (script === 'phonetics') {
          await scriptPanel();
          await page.getByRole('button', { name: 'Phonetics', exact: true }).click();
          await close();
        } else if (!(await page.locator('#phoneticsBtn').getAttribute('aria-pressed') === 'true')) {
          await page.locator('#phoneticsBtn').click();
        }
        const checks = await page.evaluate(async () => {
          const THREE = await import('three');
          const { stage, camera, settings } = outwardFrame;
          const results = [];
          // Test copies, preserving live settings and restoring the live frame.
          try {
            for (const spin of ['cw', 'ccw']) for (const order of ['cw', 'ccw'])
              for (const rot of [0, .7, Math.PI, 5, Math.PI * 2 + .7]) {
                stage.update({ ...outwardFrame, rot, settings: { ...settings, spin, order } });
                for (const ring of stage.rings) for (const it of ring.items) {
                  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(it.mesh.quaternion);
                  const radial = it.mesh.position.clone().setY(0).normalize();
                  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(it.mesh.quaternion);
                  results.push(normal.distanceTo(radial) < 1e-6 && up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6);
                  if (settings.phoneticsBelow) {
                    const label = it.phonetic;
                    const delta = label.position.clone().sub(it.mesh.position);
                    results.push(label.quaternion.angleTo(it.mesh.quaternion) < 1e-6
                      && Math.abs(delta.x) + Math.abs(delta.z) < 1e-6 && delta.y < 0
                      && label.material.uniforms.mixHi === it.material.uniforms.mixHi);
                  }
                }
                results.push(stage.seed.quaternion.angleTo(camera.quaternion) < 1e-6);
              }
          } finally { stage.update(outwardFrame); }
          return { elliptical: stage.rings.some(r => r.spec.depth === 1.55), passed: results.every(Boolean), checks: results.length };
        });
        assert.equal(checks.elliptical, true, 'must exercise the actual elliptical Vajrasattva ring');
        assert.equal(checks.passed, true, `${mode}/${script}: ${checks.checks} orientation checks`);
      }
      await page.locator('#phoneticsBtn').click();
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `outward-${mode}.png`) });
      }
    }
    // A paused session must remain paused, with exactly the same phase/count,
    // including after returning to viewer-facing presentation.
    await page.locator('#playBtn').click();
    await scriptPanel();
    await page.evaluate(() => { window.pausedRot = outwardFrame.rot; });
    await page.getByRole('button', { name: 'Toward viewer', exact: true }).click();
    await page.waitForFunction(() => outwardFrame.stage.rings.every(r => r.items.every(it =>
      it.mesh.quaternion.angleTo(outwardFrame.camera.quaternion) < 1e-6
      && it.phonetic.quaternion.angleTo(outwardFrame.camera.quaternion) < 1e-6)));
    await outward().click();
    assert.equal(await page.evaluate(() => outwardFrame.rot === pausedRot), true);
    assert.equal(await page.locator('#playBtn').getAttribute('aria-pressed'), 'true');
    assert.equal(await count(), beforeCount);
    await close();

    // Automatic counting resumes from the same phase after the settings sheet
    // closes. The existing sheet pause must not lose or duplicate a round.
    await page.locator('#countBtn').click();
    await page.getByRole('button', { name: 'Each round', exact: true }).click();
    await close();
    await page.locator('#periodBtn').click();
    await page.locator('input[type="number"][aria-label="Seconds per recitation"]').fill('0.5');
    await page.locator('input[type="number"][aria-label="Seconds per recitation"]').press('Tab');
    await close();
    await page.locator('#playBtn').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total > 1);
    await scriptPanel();
    const autoBefore = await page.evaluate(() => ({ rot: outwardFrame.rot,
      total: JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total }));
    await page.getByRole('button', { name: 'Toward viewer', exact: true }).click(); await outward().click();
    assert.deepEqual(await page.evaluate(() => ({ rot: outwardFrame.rot,
      total: JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total })), autoBefore);
    await close();
    await page.waitForFunction(total => JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total > total, autoBefore.total);
    await page.locator('#playBtn').click();
    const autoAfter = await page.evaluate(() => ({ rot: outwardFrame.rot,
      total: JSON.parse(localStorage.getItem('mantras:count:vajrasattva')).total }));
    assert.equal(autoAfter.total - autoBefore.total,
      Math.floor(autoAfter.rot / (2 * Math.PI)) - Math.floor(autoBefore.rot / (2 * Math.PI)));
    // Restore manual counting so switching/reloading cannot change the fixture.
    await page.locator('#countBtn').click();
    await page.getByRole('button', { name: 'By tapping', exact: true }).click();
    await close();
    const persistedCount = await count();
    await switchMantra('green-tara');
    assert.equal(await page.evaluate(() => outwardFrame.settings.faceOutward), false);
    await switchMantra('vajrasattva');
    assert.equal(await page.evaluate(() => outwardFrame.settings.faceOutward), true);
    assert.equal(await count(), persistedCount);

    // A cold offline launch retains the per-mantra choice and downloaded code.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.close();
    await context.setOffline(true);
    page = await context.newPage(); watch(page);
    await page.goto(url + '?installed=1#vajrasattva'); await enter();
    assert.equal(await page.evaluate(() => outwardFrame.settings.faceOutward), true);
    assert.equal(await count(), persistedCount);
    await scriptPanel(); assert.equal((await outward().getAttribute('aria-pressed') === 'true'), true); await close();
    await switchMantra('green-tara');
    assert.equal(await page.evaluate(() => outwardFrame.settings.faceOutward), false);
    assert.deepEqual(errors, []);
    console.log('Outward integration passed: ellipse, both spins/orders/scripts/cameras, labels, live/paused state, per-mantra persistence and offline cold launch.');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
