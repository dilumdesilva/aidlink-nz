<script lang="ts">
  export let message = ''
  export let visible = false
</script>

{#if visible}
  <div
    class="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <div
      class="bg-white border border-gray-200 rounded-2xl shadow-2xl px-6 py-4 sm:px-8 sm:py-5 text-base sm:text-lg font-semibold text-gray-800 toast-anim max-w-[92vw]"
    >
      {message}
    </div>
  </div>
{/if}

<style>
  .toast-anim {
    animation: toast-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }
  @keyframes toast-pop {
    0% {
      opacity: 0;
      transform: scale(0.85);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast-anim {
      animation: none;
    }
  }
</style>
