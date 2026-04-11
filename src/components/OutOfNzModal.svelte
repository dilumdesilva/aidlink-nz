<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher<{ close: void }>()
</script>

<div
  class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
  on:click|self={() => dispatch('close')}
  role="presentation"
>
  <div
    class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="oonz-title"
  >
    <div class="text-4xl mb-3" aria-hidden="true">🇳🇿</div>
    <h2 id="oonz-title" class="font-bold text-lg sm:text-xl mb-2 text-gray-900">
      AidLink is for Aotearoa
    </h2>
    <p class="text-sm sm:text-base text-gray-700 mb-5 leading-relaxed">
      You appear to be outside New Zealand. Adding pins is only available to
      people currently in Aotearoa during the active incident.
    </p>
    <p class="text-xs sm:text-sm text-gray-500 mb-5">
      You can still browse the map to see what help and needs have been
      reported across the country.
    </p>
    <button
      type="button"
      class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg px-6 py-2.5 text-sm sm:text-base shadow min-h-[44px]"
      on:click={() => dispatch('close')}
    >
      Got it
    </button>
  </div>
</div>
