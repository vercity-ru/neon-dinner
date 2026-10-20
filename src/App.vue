<script setup>
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';
import ReelStage from './components/ReelStage.vue';
import GameDialog from './components/GameDialog.vue';
import GameRules from './components/GameRules.vue';
import { GameController } from './game-controller.js';
import { PreviewAdapter } from './preview-adapter.js';
import { parseMoney, formatMoney, inputMoney } from './money.js';
import { t } from './i18n.js';
const adapter = new PreviewAdapter(), game = new GameController(adapter);
const state = shallowRef(structuredClone(game.state));
const draftBet = ref('0,10'), rendererReady = ref(false), rendererFailed = ref(false);
const historyDialog = ref(), rulesDialog = ref(), autoDialog = ref(), previewDialog = ref();
const autoSpins = ref(5), scenario = ref('sequence');
const presets = [1,2,5,10,50,100], spinCounts = [5,10,25,50,100];
function sync() { state.value = structuredClone(game.state); }
game.addEventListener('change',sync);
const locked = computed(() => !rendererReady.value || ['loading','spinning','reconnecting','recovering','error'].includes(state.value.phase) || state.value.autoActive);
const busy = computed(() => ['spinning','recovering'].includes(state.value.phase));
const reconnecting = computed(() => ['reconnecting','recovering'].includes(state.value.phase));
const status = computed(() => {
  const s = state.value;
  if (rendererFailed.value) return t('rendererError');
  if (!rendererReady.value || s.phase === 'loading') return t('loading');
  if (s.phase === 'spinning') return t('goodLuck');
  if (reconnecting.value) return t('reconnecting');
  if (s.phase === 'error') return t('roundUnavailable');
  return s.result ? s.winCents > 0 ? t('spinWon',{amount:money(s.winCents)}) : t('spinLost') : t('placeBet');
});
const money = cents => formatMoney(cents, state.value.config?.currency || 'EUR');
const errorText = computed(() => state.value.error ? t(state.value.error.key, state.value.error.params) : '');
const autoLabel = computed(() => t(state.value.autoActive ? 'stopAutoplay' : state.value.stopping ? 'stopping' : 'autoplayButton'));
const autoCount = computed(() => state.value.stopping ? t('finishCurrentSpin') : state.value.autoActive ? t('spinsRemaining',{count:state.value.remaining}) : '');
function commitBet() {
  if (locked.value) return false;
  const valid=game.setBet(parseMoney(draftBet.value));
  if(valid) draftBet.value=inputMoney(game.state.betCents);
  return valid;
}
function selectBet(cents) { if(!locked.value && game.setBet(cents)) draftBet.value=inputMoney(cents); }
function stepBet(direction) { selectBet(Math.max(state.value.config.minBetCents,state.value.betCents+direction*state.value.config.betStepCents)); }
function spin() { if(commitBet()) game.spin(); }
function autoplay() {
  if(state.value.autoActive) return game.stopAuto();
  if(commitBet()) autoDialog.value.open();
}
function startAuto() { autoDialog.value.close(); game.startAuto(autoSpins.value); }
function keyboard(event) {
  if(event.key!=='Enter'||event.repeat||document.querySelector('dialog[open]')||['INPUT','SELECT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  event.preventDefault(); spin();
}
function historyStatus(row) { return t(row.status === 'Settled' ? 'statusSettled' : 'statusUnknown'); }
onMounted(() => { document.title=t('pageTitle'); game.initialize(); document.addEventListener('keydown',keyboard); });
onBeforeUnmount(() => { game.dispose(); game.removeEventListener('change',sync); document.removeEventListener('keydown',keyboard); });
</script>
<template>
  <div class="preview-ribbon"><span class="preview-dot"></span>{{ t('designPreview') }}<span class="ribbon-detail">{{ t('previewDisclaimer') }}</span><button id="preview-open" class="text-button" type="button" :disabled="locked" @click="previewDialog.open()">{{ t('previewControls') }} <span aria-hidden="true">⌘</span></button></div>
  <main class="game" :aria-label="t('gamePreview')">
    <header class="masthead"><div class="wings" aria-hidden="true"></div><div class="sign"><h1><span>{{ t('gameNameFirst') }}</span> <span>{{ t('gameNameSecond') }}</span></h1><div class="midnight"><i></i>{{ t('gameEdition') }}<i></i></div></div><div class="wings right" aria-hidden="true"></div></header>
    <div class="status-frame"><div id="spin-status" class="status" :class="{winning:state.phase==='result'&&state.winCents>0}" role="status" aria-live="polite">{{ status }}</div></div>
    <section class="reel-frame" :aria-label="t('reelsLabel')">
      <ReelStage :grid="state.grid" :spinning="state.phase==='spinning'" :winning-cells="state.winningCells" @ready="rendererReady=true" @error="rendererFailed=true" />
      <div id="connection-overlay" class="connection-overlay" :hidden="!reconnecting"><div><span class="connection-icon" aria-hidden="true">↻</span><h2>{{ t('reconnectTitle') }}</h2><p id="connection-message">{{ errorText }}</p><button id="reconnect" class="secondary-button" type="button" :disabled="state.phase==='recovering'" @click="game.recover()">{{ t(state.phase==='recovering'?'reconnecting':'reconnect') }}</button></div></div>
    </section>
    <section class="console" :aria-label="t('gameControls')">
      <div class="meter balance"><label>{{ t('balance') }}</label><output id="balance">{{ money(state.balanceCents) }}</output></div>
      <div class="bet-control"><label for="bet">{{ t('totalBet') }}</label><div class="bet-input"><button id="bet-minus" type="button" :disabled="locked" :aria-label="t('decreaseBet',{amount:money(state.config?.betStepCents||1)})" @click="stepBet(-1)">−</button><input id="bet" v-model="draftBet" type="text" inputmode="decimal" autocomplete="off" aria-describedby="bet-error" :aria-invalid="!!state.error&&!locked" :disabled="locked" @change="commitBet" @keydown.enter.prevent="commitBet"><span>{{ state.config?.currency || 'EUR' }}</span><button id="bet-plus" type="button" :disabled="locked" :aria-label="t('increaseBet',{amount:money(state.config?.betStepCents||1)})" @click="stepBet(1)">+</button></div></div>
      <div class="meter win"><label>{{ t('win') }}</label><output id="win">{{ money(state.winCents) }}</output></div>
      <div class="presets"><label>{{ t('betPresets') }}</label><div id="presets"><button v-for="bet in presets" :key="bet" type="button" :data-bet="bet" :disabled="locked" :aria-pressed="state.betCents===bet*100" @click="selectBet(bet*100)">{{ bet }}</button></div></div>
      <div class="spin-group"><button id="spin" class="spin-button" type="button" :disabled="locked" @click="spin">{{ t('spin') }}<span class="spin-arrow" aria-hidden="true">↻</span></button><button id="autoplay" class="autoplay-button" :class="{active:state.autoActive}" type="button" :disabled="!state.autoActive&&(locked||state.stopping)" @click="autoplay">{{ autoLabel }}</button><span id="auto-count" aria-live="polite">{{ autoCount }}</span></div>
    </section>
    <p id="bet-error" class="bet-error" role="alert">{{ reconnecting ? '' : errorText }}</p>
    <footer class="footer"><button id="history-open" class="secondary-button" type="button" :disabled="busy||state.autoActive" @click="historyDialog.open()"><span aria-hidden="true">◷</span>{{ t('betHistory') }}</button><button id="rules-open" class="secondary-button" type="button" :disabled="busy||state.autoActive" @click="rulesDialog.open()"><span aria-hidden="true">▤</span>{{ t('gameRules') }}</button></footer>
  </main>
  <GameDialog id="history-dialog" ref="historyDialog" :title="t('betHistory')" :eyebrow="t('yourSession')">
    <div id="history-content"><div v-if="!state.history.length" class="empty-history"><strong>{{ t('freshStart') }}</strong><p>{{ t('historyEmpty') }}</p></div>
      <div v-else class="table-scroll"><table><thead><tr><th v-for="key in ['historyTime','historyBet','historyMultiplier','historyPayout','historyStatus']" :key="key">{{ t(key) }}</th></tr></thead><tbody><tr v-for="row in state.history" :key="row.roundId"><td>{{ new Date(row.timestamp).toLocaleTimeString('en-GB') }}</td><td>{{ money(row.betCents) }}</td><td>{{ row.multiplier==null?t('notAvailable'):t('multiplierValue',{value:row.multiplier}) }}</td><td>{{ money(row.winCents) }}</td><td>{{ historyStatus(row) }}</td></tr></tbody></table></div>
    </div><p class="dialog-note">{{ t('historyNote') }}</p>
  </GameDialog>
  <GameDialog id="rules-dialog" ref="rulesDialog" :title="t('gameRules')" :eyebrow="t('gameName')"><GameRules /></GameDialog>
  <GameDialog id="auto-dialog" ref="autoDialog" :title="t('autoplay')" :eyebrow="t('setSession')">
    <p>{{ t('betPerSpin') }} <strong id="auto-bet">{{ money(state.betCents) }}</strong></p><label class="field-label" for="auto-spins">{{ t('numberOfSpins') }}</label><select id="auto-spins" v-model="autoSpins"><option v-for="count in spinCounts" :key="count" :value="count">{{ count }}</option></select><p class="dialog-note">{{ t('autoplayNote') }}</p><button id="auto-start" class="primary-button" type="button" @click="startAuto">{{ t('startAutoplay') }}</button>
  </GameDialog>
  <GameDialog id="preview-dialog" ref="previewDialog" :title="t('previewControls')" :eyebrow="t('frontendReview')">
    <p>{{ t('scenarioDescription') }}</p><label class="field-label" for="scenario">{{ t('nextSpin') }}</label><select id="scenario" v-model="scenario" :disabled="locked" @change="adapter.setScenario(scenario)"><option value="sequence">{{ t('scenarioSequence') }}</option><option value="win">{{ t('scenarioWin',{amount:money(200)}) }}</option><option value="loss">{{ t('scenarioLoss') }}</option><option value="connection">{{ t('scenarioConnection') }}</option></select><p class="dialog-note">{{ t('previewNote') }}</p>
  </GameDialog>
</template>
