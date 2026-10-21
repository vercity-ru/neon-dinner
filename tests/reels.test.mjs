import test from 'node:test';
import assert from 'node:assert/strict';
import { ReelMotion, visibleSlots, symbolForSlot } from '../src/game/pixi/utils/ReelMotion.js';
import { symbolGeometry } from '../src/game/pixi/utils/symbolGeometry.js';
import { reelMetrics } from '../src/game/pixi/utils/reelLayout.js';
import bounds from '../src/game/assets/symbol-rigs.json' with {type:'json'};
import { GameController } from '../src/game/common/GameController.js';
import { PreviewAdapter } from '../src/game/api/PreviewAdapter.js';

test('visible art, including asymmetric atlas padding, is centered and contained at every viewport',()=>{
  for(const [width,height] of [[1090,495],[750,492],[350,229],[290,190],[1800,818]]) {
    const {cellWidth,cellHeight}=reelMetrics(width,height);
    for(const b of Object.values(bounds)) for(let row=0;row<3;row++) {
      const centerY=(row+.5)*cellHeight;
      const g=symbolGeometry(b,cellWidth,cellHeight,centerY,height);
      assert.equal(g.centerX,cellWidth/2); assert.equal(g.centerY,centerY);
      assert(b.width*g.scaleX<=cellWidth*.82+.001);
      assert(b.height*g.scaleY<=cellHeight*.82+.001);
      assert(b.x>=0&&b.y>=0&&b.x+b.width<=b.canvasSize&&b.y+b.height<=b.canvasSize);
    }
  }
});

test('continuous travel is independent of 30/60/120 Hz and never resets at row boundaries',()=>{
  const positions=[];
  for(const hz of [30,60,120]) {
    const motion=new ReelMotion(); motion.start();
    let last=0;
    for(let i=0;i<hz*2;i++) {
      motion.update(1/hz);
      assert(motion.position>=last);
      assert(motion.position-last<=motion.speed/hz+.00001);
      // Adjacent centers always remain one row apart; recycle only outside the mask.
      const slots=visibleSlots(motion.position), first=slots[0]+motion.position+.5, lastCenter=slots.at(-1)+motion.position+.5;
      assert(first<=-.5); assert(lastCenter>=3.5);
      last=motion.position;
    }
    positions.push(motion.position);
  }
  assert(Math.max(...positions)-Math.min(...positions)<1e-9);
});

test('all reels decelerate without a jump and finish on the exact supplied rows',()=>{
  const initial=['burger','seven','coffee'], target=['cherries','wild','pie'], decoration=['fries','sundae'];
  const stopTimes=[];
  for(let column=0;column<5;column++) {
    const motion=new ReelMotion(column); motion.start();
    for(let n=0;n<100;n++) motion.update(1/60);
    motion.requestStop(); motion.update(1/60);
    const {start,end,duration}=motion.plan;
    assert(end-start>=5);
    assert(Math.abs(3*(end-start)/duration-motion.speed)<1e-9);
    for(let row=0;row<3;row++) assert(row-end+start+.5<0,'Result must enter from above the mask');
    let previous=motion.position, previousDelta=Infinity, frames=0;
    while(motion.active && frames++<300) {
      motion.update(1/120); const delta=motion.position-previous;
      assert(delta>=-1e-9 && delta<=previousDelta+1e-9);
      previous=motion.position; previousDelta=delta;
    }
    assert(!motion.active); assert.equal(motion.position,end);
    assert.deepEqual([0,1,2].map(row=>symbolForSlot(row-end,motion,initial,target,decoration)),target);
    stopTimes.push(duration);
  }
  assert(stopTimes.every((time,i)=>i===0||time>stopTimes[i-1]));
});

test('autoplay waits for presentation and Stop during deceleration submits no next wager',async()=>{
  const api=new PreviewAdapter({latency:1,storage:null});
  const game=new GameController(api,{autoDelay:1,waitForPresentation:true});
  await game.initialize(); game.startAuto(5);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(game.state.phase,'settling'); assert.equal(game.state.history.length,1);
  assert.equal(game.state.balanceCents,99990);
  assert.equal(game.setBet(100),false);
  await game.spin(); assert.equal(game.state.history.length,1);
  game.stopAuto(); assert.equal(game.state.stopping,true);
  game.completePresentation(); game.completePresentation();
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(game.state.history.length,1); assert.equal(game.state.phase,'result');
  assert.equal(game.state.stopping,false); game.dispose();
});

test('autoplay waits for win completion once; a manual next spin cancels the old win gate',async()=>{
  const api=new PreviewAdapter({latency:1,storage:null}); api.setScenario('win');
  const game=new GameController(api,{autoDelay:1,waitForPresentation:true,waitForWinPresentation:true});
  await game.initialize(); game.startAuto(5);
  await new Promise(r=>setTimeout(r,20)); game.completePresentation();
  await new Promise(r=>setTimeout(r,20));
  assert.equal(game.state.history.length,1); assert.equal(game.state.phase,'result');
  game.completeWinPresentation(); game.completeWinPresentation();
  await new Promise(r=>setTimeout(r,20));
  assert.equal(game.state.history.length,2); assert.equal(game.state.phase,'settling');
  game.stopAuto(); game.completePresentation();
  const next=game.spin(); game.completeWinPresentation(); await next;
  await new Promise(r=>setTimeout(r,20));
  assert.equal(game.state.history.length,3); assert.equal(game.state.phase,'settling');
  game.dispose();
});
