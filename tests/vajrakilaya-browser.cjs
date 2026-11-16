// Uses the same optional Playwright setup as tests/browser.cjs.
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    await page.addInitScript(() => localStorage.setItem('mantras:install-answered', '1'));
    await page.goto(`http://localhost:${server.address().port}/#vajrakilaya`);
    await page.waitForSelector('body.ready');
    await page.locator('#enterBtn').click();
    assert.equal(await page.locator('#nameBtn').innerText(), 'Vajrakilaya');
    assert.equal(await page.locator('#seedBtn').innerText(), 'ཧཱུྂ');
    await page.locator('#playBtn').click();
    await page.locator('#pickerBtn').click();
    assert.equal(await page.getByRole('button', { name: /Vajrakilaya.*HUNG/ }).count(), 1);
    await page.keyboard.press('Escape');

    // Check actual Jomolhari/Latin ink widths against the built ring, including
    // the closing pair, narrow and wide syllables, and recitation boundaries.
    const layouts = await page.evaluate(async () => {
      const { default: mantra } = await import('./mantras/vajrakilaya.js');
      const { Stage } = await import('./js/stage.js');
      const { defaultsFor } = await import('./js/settings.js');
      const { makeGlyphSet } = await import('./js/glyphs.js');
      const { BETWEEN } = await import('./js/tibetan.js');
      const rows = [];
      for (const script of ['tibetan', 'phonetics']) for (const repeat of [1, 2, 3]) {
        const settings = { ...defaultsFor(mantra), script, repeat };
        const stage = new Stage({ mantra, settings });
        const ring = stage.rings[0], tokens = ring[script];
        const glyphs = makeGlyphSet(tokens, { script, px: tokens.length > 40 ? 96 : 160, radius: ring.spec.blur });
        const gaps = ring.items.map((item, i) => {
          const next = (i + 1) % tokens.length;
          const angle = ring.items[next].c - item.c + (next === 0 ? Math.PI * 2 : 0);
          const ink = (glyphs.get(tokens[i]).width + glyphs.get(tokens[next]).width) * ring.size / 2;
          const boundary = repeat > 1 && (i + 1) % 15 === 0 ? BETWEEN * ring.size : 0;
          return angle * ring.spec.radius - ink - boundary;
        });
        const colors = [stage.seedMaterial, ...ring.items.map(item => item.material)].map(material =>
          ['ink', 'hi', 'glowColor'].map(key => material.uniforms[key].value.toArray()));
        rows.push({ script, repeat, count: tokens.length, gaps, colors });
        glyphs.dispose(); stage.dispose();
      }
      return rows;
    });
    for (const row of layouts) {
      assert.equal(row.count, 15 * row.repeat);
      assert.ok(Math.min(...row.gaps) > 0, `${row.script}/${row.repeat}: no touching syllables`);
      assert.ok(Math.max(...row.gaps) - Math.min(...row.gaps) < 1e-10,
        `${row.script}/${row.repeat}: equal ink-to-ink gaps, including the closing pair`);
      for (const colors of row.colors) {
        assert.deepEqual(colors, row.colors[0], 'HUNG and every syllable share the same palette');
        for (const [r, g, b] of colors) assert.ok(b > g && g > r && b < 0.65, 'ink, highlight and glow remain dark blue');
      }
    }

    for (const [width, height] of [[1440, 1000], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (out) await page.screenshot({ path: path.join(out, `vajrakilaya-${width}x${height}.png`) });
    }
    await page.locator('#phoneticsBtn').click();
    assert.equal(await page.locator('#phoneticsBtn').getAttribute('aria-pressed'), 'true');
    if (out) await page.screenshot({ path: path.join(out, 'vajrakilaya-paired.png') });
    assert.deepEqual(errors, []);
    console.log('Vajrakilaya passed: deep link, picker, HUNG, dark blue materials, equal measured gaps in both scripts and all repeats, responsive views.');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
