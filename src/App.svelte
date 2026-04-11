<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Disclaimer from './components/Disclaimer.svelte'
  import Filters from './components/Filters.svelte'
  import Map from './components/Map.svelte'
  import AddPinModal from './components/AddPinModal.svelte'
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

  const REFRESH_MS = 60_000
  const CACHE_KEY = 'aidlink:pins-cache:v1'
  const CACHE_TTL_MS = 60_000

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

  onMount(() => {
    loadCache()
    refresh()
    refreshTimer = window.setInterval(refresh, REFRESH_MS)
  })

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer)
  })
</script>

<div class="flex flex-col h-full">
  <Disclaimer />
  <Filters {filteredTypes} on:change={e => handleFilterChange(e.detail)} />

  <div class="flex-1 relative">
    <Map
      pins={visiblePins}
      on:requestAdd={e => openAddAt(e.detail)}
      on:pinUpdated={refresh}
    />

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

    <button
      type="button"
      class="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-full shadow-lg px-5 py-3 z-30"
      on:click={openAddFromButton}
    >
      + Add a pin
    </button>
  </div>
</div>

{#if showAddModal}
  <AddPinModal
    {initialPosition}
    on:close={() => (showAddModal = false)}
    on:created={handleCreated}
  />
{/if}
