<script lang="ts">
  import { CURRENT_INCIDENT } from '../lib/incident'

  const segments = [
    `This is a community-driven platform built to help fellow Kiwis during ${CURRENT_INCIDENT.shortName}`,
    'Please use the platform responsibly',
    'The developer does not take responsibility for the accuracy of data',
    'Built to help the community',
  ]
  const line = segments.join('  •  ')
</script>

<footer
  class="bg-yellow-300 text-black border-t-2 border-yellow-500 z-30 relative"
>
  <div class="marquee">
    <div class="marquee-track py-2 text-sm sm:text-base font-semibold">
      <span class="marquee-item">{line}</span>
      <span class="marquee-item" aria-hidden="true">{line}</span>
    </div>
  </div>
  <div
    class="text-center py-1.5 border-t border-yellow-500/60 text-[11px] font-medium text-black/80"
  >
    Developed by
    <a
      href="https://www.linkedin.com/in/dilumdesilva/"
      target="_blank"
      rel="noopener noreferrer"
      class="font-bold underline decoration-black/40 hover:decoration-black hover:text-black underline-offset-2"
    >
      Dilum De Silva
    </a>
    with
    <span class="mx-0.5" aria-label="black heart">🖤</span>
    for NZ
  </div>
</footer>

<style>
  .marquee {
    width: 100%;
    overflow: hidden;
  }
  .marquee-track {
    display: inline-flex;
    white-space: nowrap;
    animation: marquee-scroll 55s linear infinite;
    will-change: transform;
  }
  .marquee-item {
    flex-shrink: 0;
    padding: 0 2.5rem;
  }
  @keyframes marquee-scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .marquee-track {
      animation: none;
    }
  }
</style>
