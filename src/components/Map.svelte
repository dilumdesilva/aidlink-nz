<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import maplibregl from 'maplibre-gl'
  import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl'
  import type { Pin } from '../lib/pins'
  import { confirmPin, resolvePin, flagPin } from '../lib/pins'
  import { getCategory } from '../lib/categories'
  import { timeAgo } from '../lib/staleness'
  import { NZ_CENTER, isInNZ } from '../lib/geo'

  export let pins: Pin[] = []

  const dispatch = createEventDispatcher<{
    requestAdd: { lat: number; lng: number }
    pinUpdated: { action: 'confirm' | 'resolve' | 'flag' }
  }>()

  let container: HTMLDivElement
  let map: MlMap | null = null
  const markers: Map<string, MlMarker> = new Map()
  const pinsById: Map<string, Pin> = new Map()
  let mapReady = false

  // Style: OSM raster tiles. Free, no API key. LINZ vector tiles are a v1.1
  // upgrade.
  const STYLE = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  } as unknown as maplibregl.StyleSpecification

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function makeMarkerEl(pin: Pin): HTMLElement {
    const el = document.createElement('div')
    el.style.width = '22px'
    el.style.height = '22px'
    el.style.borderRadius = '50%'
    el.style.border = '3px solid #ffffff'
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.45)'
    el.style.cursor = 'pointer'
    el.style.background = pin.type === 'help' ? '#16a34a' : '#ea580c'
    return el
  }

  function popupHtml(pin: Pin): string {
    const cat = getCategory(pin.category)
    const catLabel = cat ? cat.label : pin.category
    const colour = pin.type === 'help' ? '#15803d' : '#c2410c'
    const ago = timeAgo(pin.createdAt)
    const confirms =
      pin.confirmCount === 1 ? '1 confirmation' : `${pin.confirmCount} confirmations`
    const reportsCount = pin.flagCount ?? 0
    const reports = reportsCount === 1 ? '1 report' : `${reportsCount} reports`
    // Highlight in red if anyone has flagged this pin so it draws the eye.
    const reportsHtml =
      reportsCount > 0
        ? `<span style="color:#dc2626;font-weight:700">${reports}</span>`
        : reports
    const typeLabel = pin.type === 'help' ? 'Help available' : 'Need / issue'
    // Layout: outer wrapper is `position:relative` so the close button can
    // anchor to its top-right. The inner header/body wrapper has
    // `padding-right:2.5rem` — 28px close button + 12px gap = 40px total
    // pushes text away from the close button. The buttons row sits OUTSIDE
    // that inner wrapper so it gets full popup width and "Still accurate"
    // / "Mark resolved" stay on one line.
    return `
      <div style="position:relative;min-width:320px;max-width:360px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <button
          data-aid-action="close"
          data-aid-id="${pin.id}"
          aria-label="Close"
          style="position:absolute;top:0;right:0;width:1.75rem;height:1.75rem;border-radius:9999px;background:#dc2626;color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.25);padding:0;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:0.875rem;height:0.875rem">
            <path fill-rule="evenodd" d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z" clip-rule="evenodd"/>
          </svg>
        </button>
        <div style="padding-right:2.5rem">
          <div style="text-transform:uppercase;font-size:0.6875rem;font-weight:800;color:${colour};letter-spacing:0.05em;line-height:1.2">
            ${typeLabel}
          </div>
          <div style="text-transform:uppercase;font-size:0.6875rem;font-weight:600;color:${colour};opacity:0.85;letter-spacing:0.03em;line-height:1.2;margin-top:0.1rem">
            ${escapeHtml(catLabel)}
          </div>
          <div style="font-weight:700;font-size:1.0625rem;line-height:1.3;color:#111;margin-top:0.45rem">${escapeHtml(pin.title)}</div>
          ${
            pin.description
              ? `<div style="font-size:0.875rem;line-height:1.45;margin-top:0.4rem;white-space:pre-wrap;color:#333">${escapeHtml(pin.description)}</div>`
              : ''
          }
          <div style="font-size:0.75rem;color:#666;margin-top:0.55rem">${ago} · ${confirms} · ${reportsHtml}</div>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.85rem">
          <button
            data-aid-action="confirm"
            data-aid-id="${pin.id}"
            style="flex:1;min-height:44px;padding:0.55rem 0.5rem;border:2px solid #16a34a;background:#fff;color:#15803d;border-radius:0.5rem;font-size:0.875rem;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 1px 2px rgba(0,0,0,0.04);white-space:nowrap"
          >Still accurate</button>
          <button
            data-aid-action="resolve"
            data-aid-id="${pin.id}"
            style="flex:1;min-height:44px;padding:0.55rem 0.5rem;border:2px solid #9ca3af;background:#fff;color:#374151;border-radius:0.5rem;font-size:0.875rem;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 1px 2px rgba(0,0,0,0.04);white-space:nowrap"
          >Mark resolved</button>
        </div>
        <button
          data-aid-action="flag"
          data-aid-id="${pin.id}"
          style="display:block;width:100%;margin-top:0.65rem;padding:0.4rem 0;background:transparent;border:none;color:#dc2626;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(220,38,38,0.4)"
        >Report as not accurate</button>
      </div>
    `
  }

  function attachPopupHandlers(popupEl: HTMLElement, popup: maplibregl.Popup) {
    const buttons = popupEl.querySelectorAll<HTMLButtonElement>('button[data-aid-action]')
    buttons.forEach(btn => {
      if (btn.dataset.aidBound) return
      btn.dataset.aidBound = '1'
      btn.addEventListener('click', async () => {
        const action = btn.dataset.aidAction
        const id = btn.dataset.aidId
        if (!id) return

        if (action === 'close') {
          popup.remove()
          return
        }

        const original = btn.textContent
        btn.disabled = true
        btn.textContent = 'Saving…'
        try {
          if (action === 'confirm') {
            await confirmPin(id)
            dispatch('pinUpdated', { action: 'confirm' })
          } else if (action === 'resolve') {
            await resolvePin(id)
            dispatch('pinUpdated', { action: 'resolve' })
          } else if (action === 'flag') {
            await flagPin(id)
            dispatch('pinUpdated', { action: 'flag' })
          }
          popup.remove()
        } catch (err) {
          console.error(err)
          btn.disabled = false
          btn.textContent = original ?? 'Retry'
        }
      })
    })
  }

  function renderPins(currentPins: Pin[]) {
    if (!map || !mapReady) return
    pinsById.clear()
    const seen = new Set<string>()
    for (const pin of currentPins) {
      pinsById.set(pin.id, pin)
      seen.add(pin.id)
      let marker = markers.get(pin.id)
      if (!marker) {
        const el = makeMarkerEl(pin)
        const popup = new maplibregl.Popup({
          offset: 18,
          closeButton: false,
          maxWidth: '360px',
        }).setHTML(popupHtml(pin))
        popup.on('open', () => {
          // Refresh popup contents with the latest pin data each time it opens.
          const latest = pinsById.get(pin.id) ?? pin
          popup.setHTML(popupHtml(latest))
          const popupEl = popup.getElement()
          if (popupEl) attachPopupHandlers(popupEl, popup)
        })
        marker = new maplibregl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .setPopup(popup)
          .addTo(map)
        markers.set(pin.id, marker)
      } else {
        marker.setLngLat([pin.lng, pin.lat])
        const inner = marker.getElement()
        if (inner) {
          inner.style.background = pin.type === 'help' ? '#16a34a' : '#ea580c'
        }
      }
    }
    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    }
  }

  // Re-render whenever pins change AND map is ready
  $: if (mapReady) renderPins(pins)

  onMount(() => {
    map = new maplibregl.Map({
      container,
      style: STYLE,
      center: NZ_CENTER,
      zoom: 5,
      maxBounds: [
        [160, -50],
        [183, -32],
      ],
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right',
    )

    // Desktop: right-click → request add
    map.on('contextmenu', e => {
      const { lat, lng } = e.lngLat
      if (isInNZ(lat, lng)) {
        dispatch('requestAdd', { lat, lng })
      }
    })

    // Mobile: long-press → request add
    let pressTimer: number | undefined
    let pressStart: { lat: number; lng: number } | null = null
    map.on('touchstart', e => {
      if (e.originalEvent.touches.length !== 1) return
      pressStart = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      pressTimer = window.setTimeout(() => {
        if (pressStart && isInNZ(pressStart.lat, pressStart.lng)) {
          dispatch('requestAdd', pressStart)
        }
      }, 600)
    })
    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = undefined
      }
      pressStart = null
    }
    map.on('touchend', cancelPress)
    map.on('touchcancel', cancelPress)
    map.on('touchmove', cancelPress)

    map.on('load', () => {
      mapReady = true
      renderPins(pins)
    })
  })

  onDestroy(() => {
    if (map) {
      markers.forEach(m => m.remove())
      markers.clear()
      map.remove()
      map = null
    }
  })
</script>

<div bind:this={container} class="w-full h-full" />
