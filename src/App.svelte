<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Disclaimer from './components/Disclaimer.svelte'
  import TopBar from './components/TopBar.svelte'
  import Footer from './components/Footer.svelte'
  import Filters from './components/Filters.svelte'
  import Map from './components/Map.svelte'
  import StatsCard from './components/StatsCard.svelte'
  import AddPinModal from './components/AddPinModal.svelte'
  import Toast from './components/Toast.svelte'
  import IncidentPill from './components/IncidentPill.svelte'
  import { listActivePins, type Pin } from './lib/pins'
  import { freshPins } from './lib/staleness'
  import type { PinType } from './lib/categories'

  let allPins: Pin[] = []
  let visiblePins: Pin[] = []
  let filteredTypes: Set<PinType> = new Set<PinType>(['help', 'need'])
  let showAddModal = false
  let initialPosition: { lat: number; lng: number } | null = null
  let loading = true
  let errorMsg = ''
  let refreshTimer: number | undefined

  // Toast for community-action thank-yous
  let toastVisible = false
  let toastMessage = ''
  let toastTimer: number | undefined

  function showToast(message: string, ms = 3000) {
    toastMessage = message
    toastVisible = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toastVisible = false
    }, ms)
  }

  const REFRESH_MS = 60_000
  const CACHE_KEY = 'aidlink:pins-cache:v1'
  const CACHE_TTL_MS = 60_000

  // Live counts for the TopBar — derived from fresh (non-stale) pins so
  // the numbers match what you actually see on the map. Filter toggles
  // do NOT affect these counts; they are totals for the active incident.
  $: freshAll = freshPins(allPins)
  $: helpCount = freshAll.filter(p => p.type === 'help').length
  $: needCount = freshAll.filter(p => p.type === 'need').length

  function applyFilters() {
    visiblePins = freshPins(allPins).filter(p => filteredTypes.has(p.type))
  }

  async function refresh() {
    try {
      allPins = await listActivePins()
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            at: Date.now(),
            pins: allPins.map(p => ({
              ...p,
              createdAt: p.createdAt?.toISOString() ?? null,
              updatedAt: p.updatedAt?.toISOString() ?? null,
              expiresAt: p.expiresAt?.toISOString() ?? null,
            })),
          }),
        )
      } catch {
        // sessionStorage may be unavailable in private mode — non-fatal
      }
      errorMsg = ''
    } catch (e) {
      console.error(e)
      errorMsg = 'Map updates paused. Try again later.'
    } finally {
      loading = false
      applyFilters()
    }
  }

  function loadCache(): boolean {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw) as {
        at: number
        pins: Array<Record<string, unknown>>
      }
      if (Date.now() - parsed.at > CACHE_TTL_MS) return false
      allPins = parsed.pins.map(p => ({
        id: p.id as string,
        type: p.type as PinType,
        category: p.category as string,
        title: p.title as string,
        description: p.description as string,
        lat: p.lat as number,
        lng: p.lng as number,
        geohash: (p.geohash as string) ?? '',
        status: (p.status as Pin['status']) ?? 'active',
        confirmCount: (p.confirmCount as number) ?? 0,
        flagCount: (p.flagCount as number) ?? 0,
        createdAt: p.createdAt ? new Date(p.createdAt as string) : null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt as string) : null,
        expiresAt: p.expiresAt ? new Date(p.expiresAt as string) : null,
      }))
      loading = false
      applyFilters()
      return true
    } catch {
      return false
    }
  }

  async function tryGeolocate(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) return null
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }

  async function openAddFromButton() {
    initialPosition = await tryGeolocate()
    showAddModal = true
  }

  function openAddAt(coords: { lat: number; lng: number }) {
    initialPosition = coords
    showAddModal = true
  }

  function handleFilterChange(next: Set<PinType>) {
    filteredTypes = next
    applyFilters()
  }

  function handleCreated() {
    showAddModal = false
    refresh()
  }

  function handlePinUpdated(action: 'confirm' | 'resolve' | 'flag') {
    const messages: Record<typeof action, string> = {
      confirm: 'Thanks for helping the community ❤️',
      resolve: 'Thanks for helping the community ❤️',
      flag: 'Reported. Thanks for keeping the map accurate',
    }
    showToast(messages[action])
    refresh()
  }

  onMount(() => {
    loadCache()
    refresh()
    refreshTimer = window.setInterval(refresh, REFRESH_MS)
  })

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer)
    if (toastTimer) clearTimeout(toastTimer)
  })
</script>

<div class="flex flex-col h-full">
  <Disclaimer />
  <TopBar on:addPin={openAddFromButton} />
  <Filters {filteredTypes} on:change={e => handleFilterChange(e.detail)} />

  <div class="flex-1 relative">
    <Map
      pins={visiblePins}
      on:requestAdd={e => openAddAt(e.detail)}
      on:pinUpdated={e => handlePinUpdated(e.detail.action)}
    />

    <StatsCard {helpCount} {needCount} />
    <IncidentPill />

    {#if loading}
      <div
        class="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded shadow text-sm"
      >
        Loading map…
      </div>
    {/if}

    {#if errorMsg}
      <div
        class="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-400 px-3 py-1 rounded shadow text-sm text-amber-900"
      >
        {errorMsg}
      </div>
    {/if}
  </div>

  <Footer />
</div>

{#if showAddModal}
  <AddPinModal
    {initialPosition}
    on:close={() => (showAddModal = false)}
    on:created={handleCreated}
  />
{/if}

<Toast visible={toastVisible} message={toastMessage} />
