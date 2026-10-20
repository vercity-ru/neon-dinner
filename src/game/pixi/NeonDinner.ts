import { Application, Assets, BlurFilter, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import manifest from '../assets/common.pixi.manifest.json';
import bounds from '../assets/common/symbolBounds.json';
import { t } from '../common/i18n.js';
import { ReelMotion, visibleSlots, symbolForSlot } from './utils/ReelMotion.js';
import { symbolGeometry } from './utils/symbolGeometry.js';
import { reelMetrics } from './utils/reelLayout.js';

const assetUrls = import.meta.glob('../assets/common/*.webp', { eager: true, query: '?url', import: 'default' });
const decorative = ['burger','cherries','seven','shake','coffee','pie','fries','sundae'];
type SymbolId = keyof typeof bounds;
type SymbolView = { container: Container; sprite: Sprite; cover: Graphics; label: Text; id: string };
type Reel = {
  group: Container; background: Graphics; content: Container; mask: Graphics; shade: Graphics;
  views: SymbolView[]; motion: ReelMotion; initial: string[]; target: string[] | null;
  blur: BlurFilter;
};

/** Presentation only. The supplied grid is the sole source of a settled result. */
export class NeonDinner {
  private app = new Application();
  private textures: Record<string, Texture> = {};
  private reels: Reel[] = [];
  private observer?: ResizeObserver;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private disposed = false;
  private initialized = false;
  private waiting = false;
  private finishing = false;
  private grid: string[][];
  private winners: number[] = [];
  private width = 0;
  private height = 0;

  constructor(private host: HTMLElement, grid: string[][], private settled: () => void) {
    this.grid = structuredClone(grid);
  }

  async init() {
    await this.app.init({ backgroundAlpha:0, antialias:true, resolution:Math.min(devicePixelRatio||1,2), autoDensity:true, preference:'webgl', autoStart:false });
    this.initialized = true;
    if(this.disposed) { this.app.destroy(true,{children:true}); return; }
    await Promise.all(manifest.bundles[0].assets.map(async asset => {
      const base = await Assets.load<Texture>(assetUrls[`../assets/${asset.src}`] as string);
      if(this.disposed) return;
      const b = bounds[asset.alias as SymbolId];
      // Trim transparent atlas padding, then center the drawing, not its source square.
      this.textures[asset.alias] = new Texture({ source:base.source, frame:new Rectangle(b.x,b.y,b.width,b.height) });
    }));
    if(this.disposed) return;
    this.host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-hidden','true');
    for(let column=0; column<5; column++) {
      const group=new Container(), background=new Graphics(), content=new Container(), mask=new Graphics(), shade=new Graphics();
      const views=Array.from({length:6},()=> {
        const container=new Container(), sprite=new Sprite(this.textures.burger), cover=new Graphics();
        const label=new Text({text:t('wildLabel'),style:{fontFamily:'Arial',fontSize:48,fontWeight:'bold',fill:0xffedc6}});
        label.anchor.set(.5); container.addChild(sprite,cover,label); content.addChild(container);
        return {container,sprite,cover,label,id:''};
      });
      content.mask=mask;
      group.addChild(background,content,mask,shade); this.app.stage.addChild(group);
      const blur=new BlurFilter({strengthX:0,strengthY:0,quality:2,resolution:1});
      content.filters=[blur]; blur.enabled=false;
      this.reels.push({group,background,content,mask,shade,views,blur,motion:new ReelMotion(column),initial:this.grid.map(row=>row[column]),target:null});
    }
    this.app.ticker.add(ticker=>this.tick(Math.min(ticker.elapsedMS/1000,.05)));
    this.observer=new ResizeObserver(()=>this.resize());
    this.observer.observe(this.host);
    this.reduced.addEventListener('change',this.motionPreference);
    this.resize();
  }

  private motionPreference = () => {
    if(!this.reduced.matches) { if(this.waiting) this.start(); return; }
    if(this.finishing) this.finish();
    else if(this.waiting) { this.show(this.grid); this.waiting=true; }
    else { this.app.stop(); this.paint(); this.app.render(); }
  };

  start() {
    this.waiting=true; this.finishing=false; this.winners=[];
    this.reels.forEach((reel,column)=>{
      reel.initial=this.grid.map(row=>row[column]); reel.target=null; reel.motion.start();
    });
    this.resize();
    if(!this.reduced.matches) this.app.start();
  }

  stopAt(grid: string[][]) {
    this.grid=structuredClone(grid); this.waiting=false; this.finishing=true;
    if(this.reduced.matches) { this.finish(); return; }
    this.reels.forEach((reel,column)=> { reel.target=grid.map(row=>row[column]); reel.motion.requestStop(); });
    this.app.start();
  }

  show(grid: string[][], winners: number[] = []) {
    this.waiting=false; this.finishing=false; this.grid=structuredClone(grid); this.winners=winners;
    this.app.stop();
    this.reels.forEach((reel,column)=>{
      reel.initial=grid.map(row=>row[column]); reel.target=null; reel.motion=new ReelMotion(column);
    });
    this.resize();
  }

  private finish() {
    this.show(this.grid);
    this.settled();
  }

  private tick(dt: number) {
    this.reels.forEach(reel=>reel.motion.update(dt));
    this.paint();
    if(this.finishing && this.reels.every(reel=>!reel.motion.active)) this.finish();
  }

  private resize() {
    if(this.disposed || !this.reels.length) return;
    this.width=this.host.clientWidth; this.height=this.host.clientHeight;
    if(!this.width || !this.height) return;
    this.app.renderer.resize(this.width,this.height);
    const {cellWidth,cellHeight:rowHeight}=reelMetrics(this.width,this.height);
    this.reels.forEach((reel,column)=>{
      reel.group.x=column*(cellWidth+3);
      reel.background.clear().roundRect(0,0,cellWidth,this.height,6).fill(0x24566a).stroke({width:1,color:0x7096a1});
      for(let row=0;row<3;row++) {
        if(this.winners.includes(row*5+column)) reel.background.roundRect(2,row*rowHeight+2,cellWidth-4,rowHeight-4,5).fill({color:0x8b9369,alpha:.55}).stroke({width:2,color:0xffe6a6});
        if(row>0) reel.background.rect(1,row*rowHeight,cellWidth-2,1).fill({color:0xb0d4d9,alpha:.18});
      }
      reel.mask.clear().roundRect(1,1,cellWidth-2,this.height-2,6).fill(0xffffff);
      // Soft cylinder lighting, built in geometry, without external overlay artwork.
      reel.shade.clear();
      for(let i=0;i<60;i++) {
        const distance=Math.abs((i+.5)/60-.5)*2;
        reel.shade.rect(1,i*this.height/60,cellWidth-2,this.height/60+.1)
          .fill({color:distance>.45?0x021c2b:0xa8eced,alpha:distance>.45?.22*distance**3:.035*(1-distance/.45)});
      }
      reel.shade.rect(1,1,3,this.height-2).fill({color:0x061c2a,alpha:.22});
      reel.shade.rect(cellWidth-4,1,3,this.height-2).fill({color:0x061c2a,alpha:.22});
    });
    this.paint(); this.app.render();
  }

  private paint() {
    if(!this.height) return;
    const {cellWidth,cellHeight:rowHeight}=reelMetrics(this.width,this.height);
    this.reels.forEach(reel=>{
      reel.blur.strengthY=Math.min(5,rowHeight*.025)*reel.motion.velocity/reel.motion.speed;
      reel.blur.enabled=reel.blur.strengthY>.1 && !this.reduced.matches;
      const slots=visibleSlots(reel.motion.position);
      reel.views.forEach((view,i)=>{
        const slot=slots[i], id=symbolForSlot(slot,reel.motion,reel.initial,reel.target,decorative) as SymbolId;
        const b=bounds[id];
        if(view.id!==id) {
          view.id=id; view.sprite.texture=this.textures[id];
          view.sprite.position.set(-b.width/2,-b.height/2);
          view.cover.visible=view.label.visible=id==='wild';
          if(id==='wild') {
            const x=106-b.x-b.width/2, y=207-b.y-b.height/2;
            view.cover.clear().roundRect(x,y,178,67,3).fill(0x35230f);
            view.label.position.set(x+89,y+33.5);
          }
        }
        const centerY=(slot+reel.motion.position+.5)*rowHeight;
        const geometry=symbolGeometry(b,cellWidth,rowHeight,centerY,this.height);
        view.container.position.set(geometry.centerX,geometry.centerY);
        view.container.scale.set(geometry.scaleX,geometry.scaleY);
      });
    });
  }

  destroy() {
    this.disposed=true; this.observer?.disconnect();
    this.reduced.removeEventListener('change',this.motionPreference);
    if(this.initialized) this.app.destroy(true,{children:true});
    this.reels.forEach(reel=>reel.blur.destroy());
    Object.values(this.textures).forEach(texture=>texture.destroy(false));
  }
}
