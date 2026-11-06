const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { serve } = await import('./serve.mjs');
  const server = await serve(0);
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const out = process.env.SCREENSHOT_DIR;
  if (out) fs.mkdirSync(out,{recursive:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('mantras:install-answered','1'));
    await page.goto(`http://localhost:${server.address().port}/#vajra-guru`);
    await page.waitForSelector('body.ready');await page.locator('#enterBtn').click();
    await page.evaluate(async()=>{
      const {Stage}=await import('./js/stage.js');
      const update=Stage.prototype.update;
      Stage.prototype.update=function(args){update.call(this,args);window.sample={stage:this,...args};};
    });
    await page.waitForFunction(()=>window.sample);
    const before=await page.evaluate(()=>({rot:sample.rot, items:sample.stage.rings[0].items.length}));
    await page.locator('#phoneticsBtn').click();
    await page.waitForFunction(()=>sample.stage.rings[0].items.every(it=>it.phonetic));
    assert.equal(await page.locator('#phoneticsBtn').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>sample.stage.rings[0].items.length),before.items);
    assert.ok(await page.evaluate(rot=>sample.rot>=rot,before.rot),'toggling labels must not restart the clock');
    const verifyPairs=()=>page.evaluate(()=>sample.stage.rings.every(r=>r.items.every((it,i)=>{
      const label=it.phonetic;
      if(!label || !r.phonetics[i]) return false;
      const t=it.mesh.position.clone().project(sample.camera);
      const p=label.position.clone().project(sample.camera);
      return Math.abs(t.x-p.x)<1e-6 && p.y<t.y
        && label.material.uniforms.mixHi===it.material.uniforms.mixHi
        && label.scale.x<it.mesh.scale.x
        && Number.isFinite(p.x+p.y+p.z);
    })));
    assert.equal(await verifyPairs(),true);
    await page.locator('#settingsBtn').click();
    await page.locator('summary').filter({hasText:/^Script$/}).click();
    const outward = page.getByRole('switch', {name:'Face syllables away from the seed', exact:true});
    await outward.check();
    await page.waitForFunction(()=>sample.settings.faceOutward);
    assert.equal(await page.evaluate(async()=>{
      const THREE = await import('three');
      const {stage, settings, camera} = sample;
      const originalSpin = settings.spin;
      const originalCamera = camera.quaternion.clone();
      try {
        for (const spin of ['cw','ccw']) for (const rot of [0, .7, Math.PI, 5]) {
          settings.spin = spin;
          camera.lookAt(1, 2, -1);
          stage.update({...sample, rot});
          for (const r of stage.rings) for (const it of r.items) {
            const normal = new THREE.Vector3(0,0,1).applyQuaternion(it.mesh.quaternion);
            const radial = it.mesh.position.clone().setY(0).normalize();
            if (normal.distanceTo(radial)>1e-6) return false;
            if (it.phonetic.quaternion.angleTo(it.mesh.quaternion)>1e-6) return false;
            const delta = it.phonetic.position.clone().sub(it.mesh.position);
            if (Math.abs(delta.x)+Math.abs(delta.z)>1e-6 || delta.y>=0) return false;
          }
          if (stage.seed.quaternion.angleTo(camera.quaternion)>1e-6) return false;
        }
        return true;
      } finally { settings.spin=originalSpin; camera.quaternion.copy(originalCamera); }
    }),true,'syllables and labels face radially outward while seed follows camera');
    await outward.uncheck();
    await page.waitForFunction(()=>!sample.settings.faceOutward);
    await page.waitForFunction(()=>sample.stage.rings.every(r=>r.items.every(it=>
      it.mesh.quaternion.angleTo(sample.camera.quaternion)<1e-6)));
    await page.locator('summary').filter({hasText:/^Script$/}).click();
    await page.keyboard.press('Escape');
    const camera=()=>page.evaluate(()=>sample.camera.position.toArray());
    const fixed=await camera();
    await page.locator('#freeCameraBtn').click();await page.waitForTimeout(100);
    assert.ok((await camera()).every((v,i)=>Math.abs(v-fixed[i])<1e-6),'unlocking retains the current pose');
    await page.mouse.move(130,350);await page.mouse.down();await page.mouse.move(260,430,{steps:12});await page.mouse.up();
    await page.waitForTimeout(400);
    assert.notDeepEqual(await camera(),fixed);
    assert.equal(await verifyPairs(),true,'labels remain under Tibetan after orbiting');
    await page.locator('#fixedCameraBtn').click();await page.waitForTimeout(100);
    const reset=await camera();
    assert.ok(reset.every((v,i)=>Math.abs(v-fixed[i])<1e-6));
    await page.locator('#freeCameraBtn').click();await page.waitForTimeout(100);
    assert.ok((await camera()).every((v,i)=>Math.abs(v-reset[i])<1e-6),'no residual orbit jump');
    await page.reload();await page.waitForSelector('body.ready');await page.locator('#enterBtn').click();
    assert.equal(await page.locator('#phoneticsBtn').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#freeCameraBtn').getAttribute('aria-pressed'),'true');
    await page.locator('#fixedCameraBtn').click();
    for (const [width,height] of [[320,568],[390,844],[568,320],[844,390],[1440,1000]]) {
      await page.setViewportSize({width,height});
      const rects=await page.locator('#quickControls button, .chrome.bottom > button:not([hidden])').evaluateAll(nodes=>nodes.map(n=>{
        const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      }));
      for(const r of rects)assert.ok(r.x>=0 && r.right<=width && r.y>=0 && r.bottom<=height,'controls inside viewport');
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
        const a=rects[i],b=rects[j];assert.ok(a.right<=b.x || b.right<=a.x || a.bottom<=b.y || b.bottom<=a.y,`${width}: overlapping controls`);
      }
      if(out)await page.screenshot({path:path.join(out,`paired-${width}x${height}.png`)});
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#helpBtn').click();
    if(out)await page.screenshot({path:path.join(out,'paired-help.png')});
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{location.hash='vajrasattva';});
    await page.waitForFunction(()=>document.getElementById('nameBtn').textContent==='Vajrasattva');
    assert.equal(await page.locator('#phoneticsBtn').getAttribute('aria-pressed'),'true','labels persist across mantras');
    if(out)await page.screenshot({path:path.join(out,'paired-vajrasattva.png')});
    await page.locator('#phoneticsBtn').click();assert.equal(await page.locator('#phoneticsBtn').getAttribute('aria-pressed'),'false');
    await page.locator('#settingsBtn').click();
    await page.locator('summary').filter({hasText:/^Script$/}).click();
    await page.getByRole('button',{name:'Phonetics',exact:true}).click();
    await page.keyboard.press('Escape');
    await page.locator('#phoneticsBtn').click();
    assert.equal(await page.locator('#phoneticsBtn').getAttribute('aria-pressed'),'true','paired mode restores Tibetan from Latin-only mode');
    assert.deepEqual(errors,[]);
    console.log('Paired glyph alignment/highlight, rotation preservation, camera controls, persistence and responsive layouts passed.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
