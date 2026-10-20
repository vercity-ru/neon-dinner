<script setup>
import { t } from '../../common/i18n.js';
defineProps({state:Object,locked:Boolean,money:Function,draftBet:String,autoLabel:String,autoCount:String});
const emit=defineEmits(['update:draftBet','stepBet','commitBet','selectBet','spin','autoplay']);
const presets=[1,2,5,10,50,100];
</script>
<template>
    <section class="console" :aria-label="t('gameControls')">
      <div class="meter balance"><label>{{ t('balance') }}</label><output id="balance">{{ money(state.balanceCents) }}</output></div>
      <div class="bet-control"><label for="bet">{{ t('totalBet') }}</label><div class="bet-input"><button id="bet-minus" type="button" :disabled="locked" :aria-label="t('decreaseBet',{amount:money(state.config?.betStepCents||1)})" @click="emit('stepBet',-1)">−</button><input id="bet" :value="draftBet" @input="emit('update:draftBet',$event.target.value)" type="text" inputmode="decimal" autocomplete="off" aria-describedby="bet-error" :aria-invalid="!!state.error&&!locked" :disabled="locked" @change="emit('commitBet')" @keydown.enter.prevent="emit('commitBet')"><span>{{ state.config?.currency || 'EUR' }}</span><button id="bet-plus" type="button" :disabled="locked" :aria-label="t('increaseBet',{amount:money(state.config?.betStepCents||1)})" @click="emit('stepBet',1)">+</button></div></div>
      <div class="meter win"><label>{{ t('win') }}</label><output id="win">{{ money(state.phase==='settling'?0:state.winCents) }}</output></div>
      <div class="presets"><label>{{ t('betPresets') }}</label><div id="presets"><button v-for="bet in presets" :key="bet" type="button" :data-bet="bet" :disabled="locked" :aria-pressed="state.betCents===bet*100" @click="emit('selectBet',bet*100)">{{ bet }}</button></div></div>
      <div class="spin-group"><button id="spin" class="spin-button" type="button" :disabled="locked" @click="emit('spin')">{{ t('spin') }}<span class="spin-arrow" aria-hidden="true">↻</span></button><button id="autoplay" class="autoplay-button" :class="{active:state.autoActive}" type="button" :disabled="!state.autoActive&&(locked||state.stopping)" @click="emit('autoplay')">{{ autoLabel }}</button><span id="auto-count" aria-live="polite">{{ autoCount }}</span></div>
    </section>
</template>
