import { isInNZ } from './geo'

// Cached geofence state for the current browser session. We only run
// browser geolocation once per session and reuse the result for every
// subsequent gate (Add Pin, Still accurate, Mark resolved, Report).
//
// `coordsAttempted` makes denial sticky — we don't keep re-prompting if
// the user denied access the first time.

let cachedCoords: { lat: number; lng: number } | null = null
let coordsAttempted = false
let inFlight: Promise<{ lat: number; lng: number } | null> | null = null

export async function getUserCoords(): Promise<
  { lat: number; lng: number } | null
> {
  if (coordsAttempted) return cachedCoords
  if (inFlight) return inFlight

  if (!navigator.geolocation) {
    coordsAttempted = true
    return null
  }

  inFlight = new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        cachedCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        coordsAttempted = true
        inFlight = null
        resolve(cachedCoords)
      },
      () => {
        // Permission denied, timeout, or unavailable — leave cachedCoords
        // null so callers treat the user as "unknown" and fall through
        // rather than blocking forever.
        coordsAttempted = true
        inFlight = null
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })

  return inFlight
}

export type GeofenceStatus = 'in' | 'out' | 'unknown'

export async function checkUserInNZ(): Promise<GeofenceStatus> {
  const coords = await getUserCoords()
  if (!coords) return 'unknown'
  return isInNZ(coords.lat, coords.lng) ? 'in' : 'out'
}
