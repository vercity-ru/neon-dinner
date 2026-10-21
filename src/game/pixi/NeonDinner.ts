import { Application, Assets, BlurFilter, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import bounds from '../assets/symbol-rigs.json';
import { ReelMotion, visibleSlots, symbolForSlot } from './utils/ReelMotion.js';
import { symbolGeometry } from './utils/symbolGeometry.js';
import { reelMetrics } from './utils/reelLayout.js';

const decorative = ['burger','cherries','seven','shake','coffee','pie','fries','sundae'];
const assetUrl = (id: string, extension: string) => new URL(`${import.meta.env.BASE_URL}symbols/${id}/${id}.${extension}`, document.baseURI).href;
type SymbolId = keyof typeof bounds;
type SymbolView = { container: Container; sprite: Sprite; id: string };
type WinningView = { id: SymbolId; container: Container; spine: Spine };
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
  private winLayer = new Container();
  private winViews = new Map<number, WinningView>();
  private rigReady = new Set<string>();
  private winPlaying = false;

  constructor(private host: HTMLElement, grid: string[][], private settled: () => void, private winComplete: () => void = () => {}) {
    this.grid = structuredClone(grid);
  }

  async init() {
    await this.app.init({ backgroundAlpha:0, antialias:true, resolution:Math.min(devicePixelRatio||1,2), autoDensity:true, preference:'webgl', autoStart:false });
    this.initialized = true;
    if(this.disposed) { this.app.destroy(true,{children:true}); return; }
    await Promise.all(Object.entries(bounds).map(async ([id, b]) => {
      const base = await Assets.load<Texture>(assetUrl(id, 'png'));
      if(this.disposed) return;
      // Static sprites and Spine share the same GPU texture and exact artwork.
      this.textures[id] = new Texture({ source:base.source, frame:new Rectangle(b.atlasX+b.x,b.atlasY+b.y,b.width,b.height) });
      try {
        await Promise.all([
          Assets.load(assetUrl(id, 'json')),
          Assets.load({src:assetUrl(id, 'atlas'),data:{images:base.source}}),
        ]);
        if(!this.disposed) this.rigReady.add(id);
      } catch(error) {
        // A missing animation must not hide a result or prevent another spin.
        console.warn(`Win animation unavailable for ${id}; using static artwork.`, error);
      }
    }));
    if(this.disposed) return;
    this.host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-hidden','true');
    for(let column=0; column<5; column++) {
      const group=new Container(), background=new Graphics(), content=new Container(), mask=new Graphics(), shade=new Graphics();
      const views=Array.from({length:6},()=> {
        const container=new Container(), sprite=new Sprite(this.textures.burger);
        container.addChild(sprite); content.addChild(container);
        return {container,sprite,id:''};
      });
      content.mask=mask;
      group.addChild(background,content,mask,shade); this.app.stage.addChild(group);
      const blur=new BlurFilter({strengthX:0,strengthY:0,quality:2,resolution:1});
      content.filters=[blur]; blur.enabled=false;
      this.reels.push({group,background,content,mask,shade,views,blur,motion:new ReelMotion(column),initial:this.grid.map(row=>row[column]),target:null});
    }
    // Winners render above every reel mask and above cylinder shading.
    this.app.stage.addChild(this.winLayer);
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
    else {
      const wasPlaying=this.winPlaying;
      this.clearWins(); this.app.stop(); this.paint(); this.app.render();
      if(wasPlaying) this.winComplete();
    }
  };

  start() {
    this.clearWins();
    this.waiting=true; this.finishing=false; this.winners=[];
    this.reels.forEach((reel,column)=>{
      reel.initial=this.grid.map(row=>row[column]); reel.target=null; reel.motion.start();
    });
    this.resize();
    if(!this.reduced.matches) this.app.start();
  }

  stopAt(grid: string[][]) {
    this.clearWins();
    this.grid=structuredClone(grid); this.waiting=false; this.finishing=true;
    if(this.reduced.matches) { this.finish(); return; }
    this.reels.forEach((reel,column)=> { reel.target=grid.map(row=>row[column]); reel.motion.requestStop(); });
    this.app.start();
  }

  show(grid: string[][], winners: number[] = []) {
    this.clearWins();
    this.waiting=false; this.finishing=false; this.grid=structuredClone(grid); this.winners=winners;
    this.app.stop();
    this.reels.forEach((reel,column)=>{
      reel.initial=grid.map(row=>row[column]); reel.target=null; reel.motion=new ReelMotion(column);
    });
    if(!this.reduced.matches) this.createWins();
    this.resize();
    if(this.winPlaying) this.app.start();
    else if(winners.length) this.winComplete();
  }

  private clearWins() {
    this.winPlaying=false;
    for(const view of this.winViews.values()) {
      this.winLayer.removeChild(view.container);
      view.container.destroy({children:true});
    }
    this.winViews.clear();
  }

  private createWins() {
    for(const index of new Set(this.winners)) {
      if(!Number.isInteger(index) || index<0 || index>=15) continue;
      const id=this.grid[Math.floor(index/5)]?.[index%5] as SymbolId;
      if(!this.rigReady.has(id)) continue;
      let spine: Spine | undefined;
      try {
        // No shared ticker: only these winners are advanced by our application.
        spine=Spine.from({skeleton:assetUrl(id,'json'),atlas:assetUrl(id,'atlas'),autoUpdate:false});
        spine.state.setAnimation(0,'win',false);
        spine.update(0);
        const container=new Container(); container.addChild(spine);
        this.winLayer.addChild(container); this.winViews.set(index,{id,container,spine});
      } catch(error) {
        spine?.destroy();
        console.warn(`Could not play ${id} win animation; retaining sprite.`,error);
      }
    }
    this.winPlaying=this.winViews.size>0;
  }

  private finish() {
    this.show(this.grid);
    this.settled();
  }

  private tick(dt: number) {
    this.reels.forEach(reel=>reel.motion.update(dt));
    if(this.winPlaying) {
      let playing=false;
      for(const {spine} of this.winViews.values()) {
        const track=spine.state.getCurrent(0);
        if(track && !track.isComplete()) spine.update(dt);
        if(track && !track.isComplete()) playing=true;
      }
      this.winPlaying=playing;
      if(!playing) this.winComplete();
    }
    this.paint();
    if(this.finishing && this.reels.every(reel=>!reel.motion.active)) this.finish();
    else if(!this.waiting && !this.finishing && !this.winPlaying) {
      this.app.stop(); this.app.render();
    }
  }

  private resize() {
    if(this.disposed || !this.reels.length) return;
    this.width=this.host.clientWidth; this.height=this.host.clientHeight;
    if(!this.width || !this.height) return;
    const {cellWidth,cellHeight:rowHeight}=reelMetrics(this.width,this.height);
    // The backing canvas also needs room for top/bottom/outer-column winners.
    const padding=Math.ceil(Math.max(cellWidth,rowHeight)*.75);
    this.app.renderer.resize(this.width+padding*2,this.height+padding*2);
    this.app.stage.position.set(padding,padding);
    Object.assign(this.app.canvas.style,{position:'absolute',left:`${-padding}px`,top:`${-padding}px`,width:`${this.width+padding*2}px`,height:`${this.height+padding*2}px`,pointerEvents:'none'});
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
    for(const [index,view] of this.winViews) {
      const b=bounds[view.id], row=Math.floor(index/5),column=index%5;
      const g=symbolGeometry(b,cellWidth,rowHeight,(row+.5)*rowHeight,this.height);
      view.container.position.set(column*(cellWidth+3)+g.centerX,g.centerY);
      view.container.scale.set(g.scaleX,g.scaleY);
      view.spine.position.set(b.canvasSize/2-b.x-b.width/2,b.canvasSize/2-b.y-b.height/2);
    }
    this.paint(); this.app.render();
  }

  private paint() {
    if(!this.height) return;
    const {cellWidth,cellHeight:rowHeight}=reelMetrics(this.width,this.height);
    this.reels.forEach((reel,column)=>{
      reel.blur.strengthY=Math.min(5,rowHeight*.025)*reel.motion.velocity/reel.motion.speed;
      reel.blur.enabled=reel.blur.strengthY>.1 && !this.reduced.matches;
      const slots=visibleSlots(reel.motion.position);
      reel.views.forEach((view,i)=>{
        const slot=slots[i], id=symbolForSlot(slot,reel.motion,reel.initial,reel.target,decorative) as SymbolId;
        const b=bounds[id];
        if(view.id!==id) {
          view.id=id; view.sprite.texture=this.textures[id];
          view.sprite.position.set(-b.width/2,-b.height/2);
        }
        // show() resets settled slots to row 0..2; moving reels never own rigs.
        view.container.visible=!(slot>=0 && slot<3 && this.winViews.has(slot*5+column));
        const centerY=(slot+reel.motion.position+.5)*rowHeight;
        const geometry=symbolGeometry(b,cellWidth,rowHeight,centerY,this.height);
        view.container.position.set(geometry.centerX,geometry.centerY);
        view.container.scale.set(geometry.scaleX,geometry.scaleY);
      });
    });
  }

  destroy() {
    this.disposed=true; this.observer?.disconnect();
    this.clearWins();
    this.reduced.removeEventListener('change',this.motionPreference);
    if(this.initialized) this.app.destroy(true,{children:true});
    this.reels.forEach(reel=>reel.blur.destroy());
    Object.values(this.textures).forEach(texture=>texture.destroy(false));
  }
}
