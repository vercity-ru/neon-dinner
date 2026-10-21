<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { NeonDinner } from '../NeonDinner.ts';
import { symbolById } from '../../common/symbols.js';
import { t } from '../../common/i18n.js';

const props = defineProps({ grid:Array, phase:String, winningCells:Array });
const emit = defineEmits(['ready','error','settled','win-complete']);
const host=ref(null), ready=ref(false), failed=ref(false);
const moving=computed(()=>['spinning','settling'].includes(props.phase));
const labels=computed(()=>props.grid.flat().map((id,i)=>t('symbolPosition',{symbol:t(symbolById[id].nameKey),reel:i%5+1,row:Math.floor(i/5)+1})));
let renderer, disposed=false;
function sync() {
  if(!ready.value) return;
  if(props.phase==='spinning') renderer.start();
  else if(props.phase==='settling') renderer.stopAt(props.grid);
  else renderer.show(props.grid,props.phase==='result'?props.winningCells:[]);
}
watch(()=>props.phase,sync);
onMounted(async()=>{
  try {
    renderer=new NeonDinner(host.value,props.grid,()=>emit('settled'),()=>emit('win-complete'));
    await renderer.init();
    if(disposed) return;
    ready.value=true; sync(); emit('ready');
  } catch {
    if(!disposed) { failed.value=true; emit('error'); }
  }
});
onBeforeUnmount(()=> { disposed=true; renderer?.destroy(); });
</script>
<template>
  <div id="reels" ref="host" class="pixi-reels" :data-ready="ready" :data-motion="moving?'moving':'idle'" :aria-busy="moving||!ready" :aria-label="t('reelsLabel')">
    <p v-if="failed" class="renderer-message" role="alert">{{ t('rendererError') }}</p>
    <p v-else-if="!ready" class="renderer-message">{{ t('loading') }}</p>
    <ol class="sr-only"><li v-for="(label,i) in labels" :key="i" :data-winning="phase==='result'&&winningCells.includes(i)">{{ label }}</li></ol>
  </div>
</template>
