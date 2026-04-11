import ngeohash from 'ngeohash'

// Rough NZ bounding box. Mirrored in firestore.rules so the rule and the
// client agree on what counts as "inside NZ".
export const NZ_BOUNDS = {
  minLat: -47.5,
  maxLat: -34.0,
  minLng: 166.0,
  maxLng: 179.0,
}

// MapLibre uses [lng, lat] order
export const NZ_CENTER: [number, number] = [172.5, -41.0]

export function isInNZ(lat: number, lng: number): boolean {
  return (
    lat >= NZ_BOUNDS.minLat &&
    lat <= NZ_BOUNDS.maxLat &&
    lng >= NZ_BOUNDS.minLng &&
    lng <= NZ_BOUNDS.maxLng
  )
}

export function geohashOf(lat: number, lng: number, precision = 7): string {
  return ngeohash.encode(lat, lng, precision)
}
