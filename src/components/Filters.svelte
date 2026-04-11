<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { PinType } from '../lib/categories'

  export let filteredTypes: Set<PinType>

  const dispatch = createEventDispatcher<{ change: Set<PinType> }>()

  function toggle(t: PinType) {
    const next = new Set(filteredTypes)
    if (next.has(t)) {
      next.delete(t)
    } else {
      next.add(t)
    }
    dispatch('change', next)
  }
</script>

<div class="flex gap-2 px-3 py-2 bg-white border-b border-gray-200">
  <button
    type="button"
    class="flex-1 rounded-lg border-2 px-5 py-2.5 text-sm sm:text-base font-bold transition min-h-[44px] shadow-sm"
    class:bg-green-600={filteredTypes.has('help')}
    class:text-white={filteredTypes.has('help')}
    class:border-green-600={filteredTypes.has('help')}
    class:bg-white={!filteredTypes.has('help')}
    class:text-green-700={!filteredTypes.has('help')}
    class:border-green-300={!filteredTypes.has('help')}
    on:click={() => toggle('help')}
  >
    Help available
  </button>
  <button
    type="button"
    class="flex-1 rounded-lg border-2 px-5 py-2.5 text-sm sm:text-base font-bold transition min-h-[44px] shadow-sm"
    class:bg-orange-600={filteredTypes.has('need')}
    class:text-white={filteredTypes.has('need')}
    class:border-orange-600={filteredTypes.has('need')}
    class:bg-white={!filteredTypes.has('need')}
    class:text-orange-700={!filteredTypes.has('need')}
    class:border-orange-300={!filteredTypes.has('need')}
    on:click={() => toggle('need')}
  >
    Needs / issues
  </button>
</div>
