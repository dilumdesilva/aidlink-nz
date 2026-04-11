<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher<{ addPin: void }>()
</script>

<header
  class="bg-white border-b border-gray-200 px-3 py-3 sm:px-5 sm:py-3 shadow-sm z-30 relative"
>
  <!-- Single row: logo absolutely centered, Add Pin button on the right. -->
  <div class="relative flex items-center justify-end min-h-[44px]">
    <!-- Logo: AidLink wordmark + tagline, absolutely centered horizontally -->
    <div
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex flex-col items-center"
    >
      <div
        class="font-bold text-xl sm:text-2xl tracking-tight leading-none text-black"
      >
        AidLink
      </div>
      <div
        class="text-xs italic font-medium text-gray-600 mt-0.5 leading-tight tracking-tight whitespace-nowrap"
      >
        For a stronger Aotearoa
      </div>
    </div>

    <!-- Add Pin button: right edge, matches filter button height -->
    <button
      type="button"
      class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg shadow-md px-5 py-2.5 text-sm sm:text-base flex items-center gap-1.5 min-h-[44px]"
      on:click={() => dispatch('addPin')}
    >
      <span class="text-xl leading-none">+</span>
      <span>Add a pin</span>
    </button>
  </div>
</header>
