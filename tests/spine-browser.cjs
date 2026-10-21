// Integration tests use the real renderer and official Spine runtime.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  fs.mkdirSync('test-results',{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.QA_URL||'http://127.0.0.1:4173');
    await page.waitForSelector('#spin:not([disabled])');
    await page.evaluate(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/pixi/NeonDinner.ts')).name;
      const {NeonDinner}=await import(url),paint=NeonDinner.prototype.paint;
      NeonDinner.prototype.paint=function(){window.qaRenderer=this;paint.call(this)};
    });
    await page.setViewportSize({width:1300,height:1000});
    await page.waitForFunction(()=>!!window.qaRenderer);
    assert.deepEqual(await page.evaluate(()=>({ready:qaRenderer.rigReady.size,rigs:qaRenderer.winViews.size})),{ready:11,rigs:0});
    // Actual controller spin -> result replaces precisely the three winning cells.
    await page.locator('#preview-open').click();await page.selectOption('#scenario','win');
    await page.locator('#preview-dialog [data-close]').click();await page.locator('#spin').click();
    assert.equal(await page.evaluate(()=>qaRenderer.winViews.size),0);
    await page.waitForFunction(()=>qaRenderer.winViews.size===3);
    assert.deepEqual(await page.evaluate(()=>Array.from(qaRenderer.winViews.keys()).sort((a,b)=>a-b)),[5,6,7]);
    assert.equal(await page.evaluate(()=>qaRenderer.reels.flatMap(r=>r.views).filter(v=>!v.container.visible).length),3);
    await page.waitForFunction(()=>!qaRenderer.winPlaying);
    assert.equal(await page.evaluate(()=>qaRenderer.app.ticker.started),false);
    // One atlas texture is shared by sprites and rigs; no shared-ticker animation.
    assert(await page.evaluate(()=>[...qaRenderer.winViews.values()].every(v=>!v.spine.autoUpdate && v.spine.skeleton.findSlot('artwork').getAttachment().region.texture.texture.source===qaRenderer.textures[v.id].source)));
    await page.locator('#spin').click();
    assert.equal(await page.evaluate(()=>qaRenderer.winViews.size),0);
    assert(await page.evaluate(()=>qaRenderer.reels.every(r=>r.views.every(v=>v.container.visible))));
    await page.waitForFunction(()=>qaRenderer.winViews.size===3);
    // Every symbol, outer rows, duplicate cell IDs and invalid indices.
    const all=await page.evaluate(()=>{
      const r=qaRenderer,ids=Array.from(r.rigReady),grid=Array.from({length:3},(_,row)=>Array.from({length:5},(_,col)=>ids[(row*5+col)%ids.length]));
      r.show(grid,[...Array(15).keys(),0,-1,15,1.5]);r.app.stop();
      const aligned=[...r.winViews].every(([index,v])=>{
        const sprite=r.reels[index%5].views[Math.floor(index/5)+1].sprite;
        const frame=sprite.texture.frame;
        const sourceCorner=v.spine.toGlobal({x:frame.x-4-320,y:frame.y-4-320});
        const staticCorner=sprite.toGlobal({x:0,y:0});
        return Math.hypot(sourceCorner.x-staticCorner.x,sourceCorner.y-staticCorner.y)<.01;
      });
      return {count:r.winViews.size,ids:new Set([...r.winViews.values()].map(v=>v.id)).size,aligned};
    });
    assert.deepEqual(all,{count:15,ids:11,aligned:true});
    for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      const state=await page.evaluate(()=>{
        const r=qaRenderer;r.app.stop();
        for(const {spine} of r.winViews.values()){spine.state.setAnimation(0,'win',false);spine.update(.4);}
        r.app.render();
        const rect=r.app.screen;
        return {count:r.winViews.size,unmasked:r.winLayer.mask==null,inside:[...r.winViews.values()].every(v=>{const b=v.spine.getBounds();return b.minX>=0&&b.minY>=0&&b.maxX<=rect.width&&b.maxY<=rect.height;}),pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
      });
      assert.equal(state.count,15);assert(state.unmasked);assert(state.inside,'150% must fit backing canvas');
      assert(state.pageWidth<=state.viewport,JSON.stringify(state));
      await page.screenshot({path:`test-results/spine-win-${viewport.width}.png`,fullPage:true});
    }
    // Starting mid-win destroys every instance; repeated wins do not accumulate.
    assert(await page.evaluate(()=>{const r=qaRenderer,old=[...r.winViews.values()].map(v=>v.spine);r.start();return r.winViews.size===0&&old.every(s=>s.destroyed)&&r.reels.every(reel=>reel.views.every(v=>v.container.visible));}));
    assert.equal(await page.evaluate(()=>{const r=qaRenderer;for(let n=0;n<6;n++){r.show(r.grid,[0,4,10,14]);r.start();}r.show(r.grid);return r.winLayer.children.length;}),0);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>{qaRenderer.show(qaRenderer.grid,[0,4,10,14]);return qaRenderer.winViews.size;}),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    // Missing rig data keeps a visible static winning symbol.
    assert(await page.evaluate(()=>{const r=qaRenderer,id=r.grid[0][0];r.rigReady.delete(id);r.show(r.grid,[0]);const okay=r.winViews.size===0&&r.reels[0].views[1].container.visible;r.rigReady.add(id);return okay;}));
    await page.evaluate(()=>{qaRenderer.show(qaRenderer.grid,[0,4]);qaRenderer.destroy();});
    assert.deepEqual(errors,[]);
    console.log('PASS: real win, static-only spins, 11 rigs, shared textures, alignment, 150% bounds, responsive canvas, interrupted wins, disposal, reduced motion and fallback.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
