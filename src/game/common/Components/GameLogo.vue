<script setup>
import { t } from '../i18n.js';
defineProps({ compact: Boolean });
</script>
<template>
  <div class="sign" :class="{ 'dialog-logo': compact }">
    <component :is="compact ? 'div' : 'h1'" class="brand-title"><span>{{ t('gameNameFirst') }}</span> <span>{{ t('gameNameSecond') }}</span></component>
    <div class="midnight"><i></i>{{ t('gameEdition') }}<i></i></div>
  </div>
</template>
