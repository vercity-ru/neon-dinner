<script setup>
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';
import GameConsole from './Components/GameConsole.vue';
import ReelStage from '../pixi/Components/ReelStage.vue';
import GameDialog from '../common/Components/GameDialog.vue';
import GameRules from '../common/Components/GameRules.vue';
import { GameController } from '../common/GameController.js';
import { createGameApi } from '../api/index.ts';
import { parseMoney, formatMoney, inputMoney } from '../utils/money.js';
import { t } from '../common/i18n.js';
const adapter = createGameApi(), game = new GameController(adapter, { waitForPresentation: true });
const state = shallowRef(structuredClone(game.state));
const draftBet = ref('0,10'), rendererReady = ref(false), rendererFailed = ref(false);
const historyDialog = ref(), rulesDialog = ref(), autoDialog = ref(), previewDialog = ref();
const autoSpins = ref(5), scenario = ref('sequence');
const spinCounts = [5,10,25,50,100];
function sync() { state.value = structuredClone(game.state); }
game.addEventListener('change',sync);
const locked = computed(() => !rendererReady.value || ['loading','spinning','settling','reconnecting','recovering','error'].includes(state.value.phase) || state.value.autoActive);
const busy = computed(() => ['spinning','settling','recovering'].includes(state.value.phase));
const reconnecting = computed(() => ['reconnecting','recovering'].includes(state.value.phase));
const status = computed(() => {
  const s = state.value;
  if (rendererFailed.value) return t('rendererError');
  if (!rendererReady.value || s.phase === 'loading') return t('loading');
  if (['spinning','settling'].includes(s.phase)) return t('goodLuck');
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
    <div class="status-toolbar">
      <button id="history-open" class="utility-button" type="button" :title="t('betHistory')" :aria-label="t('betHistory')" aria-haspopup="dialog" aria-controls="history-dialog" :disabled="busy||state.autoActive" @click="historyDialog.open()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 1.8 7.5M3 4v6h6M12 7v5l3 2"/></svg>
      </button>
      <div class="status-frame"><div id="spin-status" class="status" :class="{winning:state.phase==='result'&&state.winCents>0}" role="status" aria-live="polite">{{ status }}</div></div>
      <button id="rules-open" class="utility-button" type="button" :title="t('gameRules')" :aria-label="t('gameRules')" aria-haspopup="dialog" aria-controls="rules-dialog" :disabled="busy||state.autoActive" @click="rulesDialog.open()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15M5.5 7.5l3 .5m-3 3.5 3 .5m7-4 3-.5m-3 4.5 3-.5"/></svg>
      </button>
    </div>
    <section class="reel-frame" :aria-label="t('reelsLabel')">
      <ReelStage :grid="state.grid" :phase="state.phase" :winning-cells="state.winningCells" @ready="rendererReady=true" @error="rendererFailed=true" @settled="game.completePresentation()" />
      <div id="connection-overlay" class="connection-overlay" :hidden="!reconnecting"><div><span class="connection-icon" aria-hidden="true">↻</span><h2>{{ t('reconnectTitle') }}</h2><p id="connection-message">{{ errorText }}</p><button id="reconnect" class="secondary-button" type="button" :disabled="state.phase==='recovering'" @click="game.recover()">{{ t(state.phase==='recovering'?'reconnecting':'reconnect') }}</button></div></div>
    </section>
    <GameConsole v-model:draft-bet="draftBet" :state="state" :locked="locked" :money="money" :auto-label="autoLabel" :auto-count="autoCount" @step-bet="stepBet" @commit-bet="commitBet" @select-bet="selectBet" @spin="spin" @autoplay="autoplay" />
    <p id="bet-error" class="bet-error" role="alert">{{ reconnecting ? '' : errorText }}</p>
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
