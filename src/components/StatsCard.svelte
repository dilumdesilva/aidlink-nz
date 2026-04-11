<script lang="ts">
  export let helpCount = 0
  export let needCount = 0
</script>

<div
  class="absolute top-3 left-3 z-20 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 sm:px-5 sm:py-4 select-none"
>
  <div class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">
    Live counts
  </div>
  <div class="flex flex-col gap-2 sm:gap-3">
    <div class="flex items-baseline gap-2.5">
      <span
        class="text-3xl md:text-4xl font-extrabold text-orange-600 leading-none tabular-nums"
      >
        {needCount}
      </span>
      <span class="text-sm md:text-base text-gray-700 font-semibold">
        Needs reported
      </span>
    </div>
    <div class="flex items-baseline gap-2.5">
      <span
        class="text-3xl md:text-4xl font-extrabold text-green-600 leading-none tabular-nums"
      >
        {helpCount}
      </span>
      <span class="text-sm md:text-base text-gray-700 font-semibold">
        Help available
      </span>
    </div>
  </div>
</div>
