import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into their own chunks so the app shell can
        // render before MapLibre and Firebase finish downloading.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore'],
          maplibre: ['maplibre-gl'],
        },
      },
    },
  },
})
