// Focused animation integration QA against the Vite development server.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173'); await page.waitForSelector('#spin:not([disabled])');
    // Inspect the real renderer without adding debug globals or hooks to production code.
    await page.evaluate(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/pixi/NeonDinner.ts')).name;
      const {NeonDinner}=await import(url);
      const paint=NeonDinner.prototype.paint;
      NeonDinner.prototype.paint=function() { window.qaRenderer=this; paint.call(this); };
      window.qaCanvas=document.querySelector('#reels canvas');
    });
    await page.setViewportSize({width:1200,height:1000});
    await page.waitForFunction(()=>!!window.qaRenderer);
    const centers=await page.evaluate(()=>{
      const r=window.qaRenderer;
      return r.reels.map(reel=>({
        masked:reel.content.mask===reel.mask,
        centers:reel.views.slice(1,4).map(v=>({x:v.container.x,y:v.container.y})),
        width:(r.width-12)/5,height:r.height
      }));
    });
    assert.equal(centers.length,5);
    for(const reel of centers) {
      assert(reel.masked);
      reel.centers.forEach((c,row)=>{
        assert(Math.abs(c.x-reel.width/2)<.01);
        assert(Math.abs(c.y-(row+.5)*reel.height/3)<.01);
      });
    }
    await page.locator('#spin').click();
    await page.waitForTimeout(400);
    await page.screenshot({path:'test-results/spin-moving.png',fullPage:true});
    const travel=await page.evaluate(async()=>{
      const frames=[];
      for(let n=0;n<25;n++) {
        await new Promise(requestAnimationFrame);
        frames.push(window.qaRenderer.reels.map(r=>r.motion.position));
      }
      return frames;
    });
    assert(travel.at(-1)[0]>travel[0][0]);
    for(let i=1;i<travel.length;i++) for(let col=0;col<5;col++) {
      assert(travel[i][col]>=travel[i-1][col]);
      assert(travel[i][col]-travel[i-1][col]<=.75001);
    }
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>window.qaCanvas===document.querySelector('#reels canvas')));
    await page.waitForSelector('#spin:not([disabled])');
    assert.equal(await page.locator('#reels').getAttribute('data-motion'),'idle');
    assert(await page.evaluate(()=>window.qaRenderer.reels.every(r=>r.motion.position===0)));
    // New round with no animation still delivers and unlocks the same result.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#spin').click(); await page.waitForTimeout(300);
    assert(await page.evaluate(()=>window.qaRenderer.reels.every(r=>r.motion.position===0)));
    await page.waitForSelector('#spin:not([disabled])');
    assert.match(await page.locator('#spin-status').innerText(),/You have won/);
    // Changing the preference during deceleration must also release the presentation gate.
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#spin').click();
    await page.waitForFunction(()=>window.qaRenderer.finishing);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForSelector('#spin:not([disabled])');
    assert.deepEqual(errors,[]);
    console.log('Motion checks passed: real sprite centers, five reel masks, continuous travel, resize during spin, reduced motion, preference change during stop.');
  } finally { await browser.close(); }
})();
