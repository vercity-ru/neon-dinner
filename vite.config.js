import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import en from './src/game/common/locales/en.json' with { type: 'json' };

export default defineConfig({
  plugins: [vue(), {
    name: 'localized-html',
    transformIndexHtml(html) {
      return html.replace(/%TEXT_(\w+)%/g, (_, key) => {
        if (!(key in en)) throw new Error(`Missing HTML translation: ${key}`);
        return en[key].replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      });
    },
  }],
  base: './',
  build: { outDir: 'dist', rollupOptions: { output: { manualChunks: { pixi: ['pixi.js'] } } } },
});
