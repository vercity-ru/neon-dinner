<script setup>
import { ref } from 'vue';
import { t } from '../i18n.js';
const props = defineProps({ id: String, title: String, eyebrow: String });
const element = ref(null);
const open = () => element.value.showModal();
const close = () => element.value.close();
function backdrop(event) {
  if (event.target !== element.value) return;
  const r = element.value.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
}
defineExpose({ open, close });
</script>
<template>
  <dialog :id="id" ref="element" :aria-labelledby="`${id}-title`" @click="backdrop">
    <div class="dialog-heading"><div><p class="eyebrow">{{ eyebrow }}</p><h2 :id="`${id}-title`">{{ title }}</h2></div>
      <button class="close-button" data-close type="button" :aria-label="t('closeDialog', { title: props.title })" @click="close">×</button>
    </div><slot />
  </dialog>
</template>
