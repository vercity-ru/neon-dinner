// Reproducible display metadata; source textures are never rewritten by this script.
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const fs = require('node:fs');
const path = require('node:path');
const folder = path.resolve(__dirname, '../src/game/assets/common');
(async () => {
  const bounds = {};
  for (const file of fs.readdirSync(folder).filter(f => f.endsWith('.webp'))) {
    const { data, info } = await sharp(path.join(folder, file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const { width:w, height:h, channels:c } = info, seen = new Uint8Array(w*h);
    let largest = [];
    // Ignore disconnected atlas bleed and faint antialias pixels when measuring the artwork.
    for (let i=0; i<w*h; i++) {
      if (seen[i] || data[i*c+3] < 24) continue;
      const component = [i]; seen[i] = 1;
      for (let p=0; p<component.length; p++) {
        const j=component[p], x=j%w, y=Math.floor(j/w);
        for (const k of [x>0?j-1:-1,x<w-1?j+1:-1,y>0?j-w:-1,y<h-1?j+w:-1]) {
          if(k>=0 && !seen[k] && data[k*c+3]>=24) { seen[k]=1; component.push(k); }
        }
      }
      if(component.length>largest.length) largest=component;
    }
    let left=w,top=h,right=0,bottom=0;
    for(const i of largest) { left=Math.min(left,i%w);right=Math.max(right,i%w);top=Math.min(top,Math.floor(i/w));bottom=Math.max(bottom,Math.floor(i/w)); }
    left=Math.max(0,left-2); top=Math.max(0,top-2); right=Math.min(w-1,right+2); bottom=Math.min(h-1,bottom+2);
    bounds[path.basename(file,'.webp')]={x:left,y:top,width:right-left+1,height:bottom-top+1};
  }
  fs.writeFileSync(path.join(folder,'symbolBounds.json'),JSON.stringify(bounds,null,2)+'\n');
  console.log(bounds);
})();
