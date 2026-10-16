// Optional visual QA. Pass an installed Playwright module path through PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('test-results',{recursive:true});
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    const response = await page.goto('http://127.0.0.1:4173'); assert.equal(response.status(),200);
    await page.waitForSelector('#spin:not([disabled])'); await page.evaluate(()=>document.fonts.ready);
    await page.locator('.symbol').first().waitFor(); await page.waitForTimeout(700);
    assert.equal(await page.locator('.symbol').count(),15);
    assert(await page.locator('.symbol').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
    await page.screenshot({path:'test-results/desktop.png',fullPage:true});
    await page.locator('#bet').fill('0,001'); await page.locator('#spin').click();
    assert.equal(await page.locator('#spin-status').innerText(),'Place a bet');
    assert.match(await page.locator('#bet-error').innerText(),/decimal/);
    await page.locator('#bet').fill('0,11'); await page.locator('#spin').click();
    assert.equal(await page.locator('#spin-status').innerText(),'Good luck');
    await page.waitForFunction(()=>document.querySelector('#spin-status').textContent==='Better luck next time');
    assert.match(await page.locator('#balance').innerText(),/999,89/);
    await page.locator('#preview-open').click(); await page.selectOption('#scenario','win');
    await page.locator('#preview-dialog [data-close]').click(); await page.locator('#spin').click();
    await page.waitForFunction(()=>document.querySelector('#spin-status').textContent.includes('You have won'));
    assert.equal(await page.locator('.is-winner').count(),3);
    await page.locator('#history-open').click(); assert.equal(await page.locator('#history-content tbody tr').count(),2);
    await page.screenshot({path:'test-results/history.png',fullPage:true});
    await page.keyboard.press('Escape'); await page.locator('#autoplay').click(); await page.locator('#auto-start').click();
    await page.locator('#autoplay').click(); await page.waitForFunction(()=>document.querySelector('#spin').disabled===false);
    assert.equal(await page.locator('#autoplay').innerText(),'AUTOPLAY');
    await page.locator('#preview-open').click(); await page.selectOption('#scenario','connection');
    await page.locator('#preview-dialog [data-close]').click(); await page.locator('#spin').click();
    await page.locator('#connection-overlay').waitFor({state:'visible'});
    assert.equal(await page.locator('#spin').isDisabled(),true);
    await page.locator('#reconnect').click(); await page.locator('#connection-overlay').waitFor({state:'hidden'});
    await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'test-results/mobile.png',fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.locator('#rules-open').click(); await page.screenshot({path:'test-results/rules-mobile.png',fullPage:true});
    await page.keyboard.press('Escape'); await page.setViewportSize({width:320,height:740});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    assert.deepEqual(errors,[]); console.log('Browser checks passed: loading, assets, validation, result, win, history, autoplay stop, reconnect, mobile 390/320, no runtime errors.');
  } finally { await browser.close(); }
})();
