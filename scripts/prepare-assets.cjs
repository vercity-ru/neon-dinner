const sharp = require(process.env.SHARP_MODULE || 'sharp');
(async()=>{
await sharp('docs/art-source/diner-background.png').webp({quality:88}).toFile('src/game/assets/desktop/diner-background.webp');
const boxes={seven:[0,65,320,390],burger:[320,90,320,365],fries:[657,90,303,365],shake:[990,35,280,420],coffee:[0,458,320,375],cherries:[333,470,300,363],pie:[640,480,320,353],sundae:[987,460,283,373],wild:[0,840,320,360],dollar:[346,840,280,360],star:[640,840,320,360]};
const normalized = await sharp('docs/art-source/symbol-atlas.png').resize(1280,1280).toBuffer();
for (const [name,[left,top,width,height]] of Object.entries(boxes)) await sharp(normalized).extract({left,top,width,height}).resize(360,360,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:92}).toFile('src/game/assets/common/'+name+'.webp');
console.log('Prepared 11 transparent symbols and background.');
})();




