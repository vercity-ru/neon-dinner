<script setup>
import { t } from '../i18n.js';
const rows = [
  { keys: ['symbolSeven'], values: [10,50,200,3000] },
  { keys: ['symbolBurger','symbolFries'], values: [null,40,100,500] },
  { keys: ['symbolShake'], values: [null,20,50,200] },
  { keys: ['symbolCoffee','symbolCherries','symbolPie','symbolSundae'], values: [null,10,30,100] },
  { keys: ['symbolDollar'], values: [null,15,100,500] },
  { keys: ['symbolStar'], values: [null,80,100,120] },
];
</script>
<template>
  <div class="rules-copy">
    <p>{{ t('rulesIntro') }}</p><h3>{{ t('lineWins') }}</h3><p>{{ t('lineWinsDescription') }}</p>
    <div class="paylines" :aria-label="t('paylinePaths')"><span v-for="key in ['paylineMiddle','paylineTop','paylineBottom','paylineV','paylineInvertedV']" :key="key">{{ t(key) }}</span></div>
    <h3>{{ t('specialSymbols') }}</h3><p>{{ t('wildRule') }}</p><p>{{ t('scatterRule') }}</p>
    <h3>{{ t('paytable') }}</h3><p class="dialog-note">{{ t('paytableNote') }}</p>
    <div class="table-scroll"><table><thead><tr><th>{{ t('symbol') }}</th><th v-for="n in [2,3,4,5]" :key="n">{{ n }}</th></tr></thead><tbody><tr v-for="row in rows" :key="row.keys[0]"><td>{{ row.keys.map(k => t(k)).join(t('symbolSeparator')) }}</td><td v-for="(value, i) in row.values" :key="i">{{ value === null ? t('notAvailable') : t('multiplierValue', { value }) }}</td></tr></tbody></table></div>
    <h3>{{ t('autoplayConnection') }}</h3><p>{{ t('autoplayRule') }}</p><p>{{ t('connectionRule') }}</p><p class="preview-explanation">{{ t('rulesPreviewNote') }}</p>
  </div>
</template>
