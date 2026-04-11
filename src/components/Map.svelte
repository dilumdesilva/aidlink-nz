<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import maplibregl from 'maplibre-gl'
  import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl'
  import type { Pin } from '../lib/pins'
  import { confirmPin, resolvePin } from '../lib/pins'
  import { getCategory } from '../lib/categories'
  import { timeAgo } from '../lib/staleness'
  import { NZ_CENTER, isInNZ } from '../lib/geo'

  export let pins: Pin[] = []

  const dispatch = createEventDispatcher<{
    requestAdd: { lat: number; lng: number }
    pinUpdated: void
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
    const typeLabel = pin.type === 'help' ? 'Help available' : 'Need / issue'
    return `
      <div style="min-width:220px;max-width:260px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <div style="text-transform:uppercase;font-size:11px;font-weight:700;color:${colour};margin-bottom:4px;letter-spacing:0.04em">
          ${typeLabel} · ${escapeHtml(catLabel)}
        </div>
        <div style="font-weight:600;font-size:15px;line-height:1.3;color:#111">${escapeHtml(pin.title)}</div>
        ${
          pin.description
            ? `<div style="font-size:13px;line-height:1.4;margin-top:4px;white-space:pre-wrap;color:#333">${escapeHtml(pin.description)}</div>`
            : ''
        }
        <div style="font-size:11px;color:#666;margin-top:6px">${ago} · ${confirms}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button data-aid-action="confirm" data-aid-id="${pin.id}" style="flex:1;padding:6px 8px;border:1px solid #16a34a;background:#fff;color:#15803d;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">Still accurate</button>
          <button data-aid-action="resolve" data-aid-id="${pin.id}" style="flex:1;padding:6px 8px;border:1px solid #6b7280;background:#fff;color:#374151;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">Mark resolved</button>
        </div>
      </div>
    `
  }

  function attachPopupHandlers(popupEl: HTMLElement) {
    const buttons = popupEl.querySelectorAll<HTMLButtonElement>('button[data-aid-action]')
    buttons.forEach(btn => {
      if (btn.dataset.aidBound) return
      btn.dataset.aidBound = '1'
      btn.addEventListener('click', async () => {
        const action = btn.dataset.aidAction
        const id = btn.dataset.aidId
        if (!id) return
        const original = btn.textContent
        btn.disabled = true
        btn.textContent = 'Saving…'
        try {
          if (action === 'confirm') await confirmPin(id)
          else if (action === 'resolve') await resolvePin(id)
          dispatch('pinUpdated')
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
          closeButton: true,
          maxWidth: '280px',
        }).setHTML(popupHtml(pin))
        popup.on('open', () => {
          // Refresh popup contents with the latest pin data each time it opens.
          const latest = pinsById.get(pin.id) ?? pin
          popup.setHTML(popupHtml(latest))
          const popupEl = popup.getElement()
          if (popupEl) attachPopupHandlers(popupEl)
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
