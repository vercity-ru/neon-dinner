const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const root=path.resolve('dist');
  const server=http.createServer((req,res)=>{
    const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\/neon-dinner\//,'');
    const file=path.resolve(root,relative||'index.html');
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{const ext=path.extname(file),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};res.setHeader('Content-Type',types[ext]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],badAssets=[],loaded=new Set();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='warning'&&/animation unavailable|Could not play/.test(m.text()))errors.push(m.text());});
    page.on('response',r=>{if(r.url().includes('/symbols/')){if(!r.ok())badAssets.push(r.url());else loaded.add(r.url());}});
    await page.goto(`http://127.0.0.1:${server.address().port}/neon-dinner/`);
    await page.waitForSelector('#spin:not([disabled])');assert.equal(loaded.size,33);assert.deepEqual(badAssets,[]);
    await page.locator('#preview-open').click();await page.selectOption('#scenario','win');
    await page.locator('#preview-dialog [data-close]').click();await page.locator('#spin').click();
    await page.waitForFunction(()=>document.querySelectorAll('#reels [data-winning="true"]').length===3);
    await page.waitForTimeout(430);await page.screenshot({path:'test-results/production-win.png',fullPage:true});
    await page.locator('#spin').click();await page.waitForSelector('#spin:not([disabled])');
    assert.deepEqual(errors,[]);console.log('Production PASS: nested base URL, 33 symbol resources, win and next spin, no runtime/rig errors.');
  }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
