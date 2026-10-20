<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import { symbols, symbolById } from '../symbols.js';
import { reelLayout } from '../reel-layout.js';
import { t } from '../i18n.js';
const props = defineProps({ grid: Array, spinning: Boolean, winningCells: Array });
const emit = defineEmits(['ready','error']);
const host = ref(null), ready = ref(false), failed = ref(false);
const labels = computed(() => props.grid.flat().map((id, i) => t('symbolPosition', { symbol: t(symbolById[id].nameKey), reel: i % 5 + 1, row: Math.floor(i / 5) + 1 })));
const textures = {}, items = [];
let app, observer, disposed = false, initialized = false, elapsed = 0;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const art = import.meta.glob('../../assets/*.webp', { eager: true, query: '?url', import: 'default' });
function draw() {
  if (!initialized || disposed || !items.length) return;
  const width = host.value.clientWidth, height = host.value.clientHeight;
  if (!width || !height) return;
  app.renderer.resize(width, height);
  const layout = reelLayout(width, height);
  props.grid.flat().forEach((id, i) => {
    const item = items[i], box = layout[i];
    const winner = props.winningCells.includes(i) && !props.spinning;
    item.box = box;
    item.container.position.set(box.x, box.y);
    item.background.clear().roundRect(0,0,box.width,box.height,6).fill(winner ? 0x526f64 : 0x1c5065).stroke({width: winner ? 3 : 1, color: winner ? 0xffe6a6 : 0x7096a1});
    item.mask.clear().rect(2,2,box.width-4,box.height-4).fill(0xffffff);
    item.sprite.texture = textures[id]; item.sprite.width = box.size; item.sprite.height = box.size;
    item.sprite.position.set(box.width/2,box.height/2); item.content.y = 0; item.content.alpha = 1;
    // Cover the English label baked into the legacy art with a localized Pixi Text.
    const labelY = box.height/2 + box.size * .16;
    item.labelCover.clear().roundRect(box.width/2-box.size*.27,labelY-box.size*.10,box.size*.54,box.size*.20,2).fill(0x35230f);
    item.labelCover.visible = id === 'wild'; item.label.visible = id === 'wild';
    item.label.text = t('wildLabel'); item.label.style.fontSize = box.size*.12; item.label.position.set(box.width/2,labelY);
  });
  app.render();
}
function tick(ticker) {
  if (!props.spinning || reduced.matches) return;
  elapsed += ticker.deltaMS;
  for (let i=0;i<items.length;i++) {
    const item=items[i], offset=((elapsed*(.7+(i%5)*.07))%item.box.height)-item.box.height/2;
    item.content.y=offset; item.content.alpha=.75;
  }
}
watch(() => [props.grid, props.spinning, props.winningCells], () => {
  elapsed=0; draw(); if (initialized) { if (props.spinning && !reduced.matches) app.start(); else { app.stop(); app.render(); } }
}, { deep: true });
function motionChange() { draw(); if(initialized) { if(props.spinning && !reduced.matches) app.start(); else app.stop(); } }
onMounted(async () => {
  try {
    app = new Application();
    await app.init({ backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl', autoStart: false });
    initialized = true;
    if (disposed) { app.destroy(true, { children: true }); return; }
    await Promise.all(symbols.map(async s => { textures[s.id] = await Assets.load(art[`../../assets/${s.id}.webp`]); }));
    if (disposed) return;
    host.value.append(app.canvas); app.canvas.setAttribute('aria-hidden','true');
    for (let i=0;i<15;i++) {
      const container=new Container(), background=new Graphics(), content=new Container(), mask=new Graphics();
      const sprite=new Sprite(textures[props.grid.flat()[i]]); sprite.anchor.set(.5);
      const labelCover=new Graphics(), label=new Text({text:t('wildLabel'),style:{fontFamily:'Arial',fontWeight:'bold',fill:0xffedc6}}); label.anchor.set(.5);
      content.addChild(sprite,labelCover,label); content.mask=mask; container.addChild(background,content,mask); app.stage.addChild(container);
      items.push({container,background,content,mask,sprite,labelCover,label});
    }
    app.ticker.add(tick); observer = new ResizeObserver(draw); observer.observe(host.value);
    reduced.addEventListener('change',motionChange); draw(); ready.value=true; emit('ready');
  } catch { if (!disposed) { failed.value=true; emit('error'); } }
});
onBeforeUnmount(() => {
  disposed=true; observer?.disconnect(); reduced.removeEventListener('change',motionChange);
  if (initialized) app.destroy(true,{children:true});
});
</script>
<template>
  <div id="reels" ref="host" class="pixi-reels" :data-ready="ready" :aria-busy="spinning || !ready" :aria-label="t('reelsLabel')">
    <p v-if="failed" class="renderer-message" role="alert">{{ t('rendererError') }}</p>
    <p v-else-if="!ready" class="renderer-message">{{ t('loading') }}</p>
    <ol class="sr-only"><li v-for="(label,i) in labels" :key="i" :data-winning="winningCells.includes(i)">{{ label }}</li></ol>
  </div>
</template>
