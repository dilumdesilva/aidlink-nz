<script lang="ts">
  import { CURRENT_INCIDENT } from '../lib/incident'
</script>

<!-- Floating pill, absolutely positioned at the bottom-center of the
     parent (the map's relative container in App.svelte) so it sits
     just above the yellow footer without taking a row in the layout.
     bottom-12 on mobile clears the MapLibre attribution at the bottom of
     the map; from md+ the attribution sits to the right of the centered
     pill so we can drop back to bottom-3. -->
<div
  class="absolute bottom-12 md:bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
>
  <div
    class="pointer-events-auto flex items-center gap-2 bg-white border border-red-200 rounded-xl shadow-lg px-3 py-2"
  >
    <span class="relative inline-flex h-3 w-3 shrink-0">
      <span
        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"
      ></span>
      <span
        class="relative inline-flex rounded-full h-3 w-3 bg-red-600 ring-2 ring-red-200"
      ></span>
    </span>
    <span class="text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
      Current incident:
      {#if CURRENT_INCIDENT.trackingUrl}
        <a
          href={CURRENT_INCIDENT.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="font-extrabold underline decoration-red-400 hover:decoration-red-700 underline-offset-2"
        >
          {CURRENT_INCIDENT.name}
        </a>
      {:else}
        <span class="font-extrabold">{CURRENT_INCIDENT.name}</span>
      {/if}
    </span>
  </div>
</div>
