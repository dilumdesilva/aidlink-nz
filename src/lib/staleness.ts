import type { Pin } from './pins'

export function isStale(pin: Pin, now = Date.now()): boolean {
  if (pin.status !== 'active') return true
  if (!pin.expiresAt) return false
  return pin.expiresAt.getTime() < now
}

export function freshPins(pins: Pin[], now = Date.now()): Pin[] {
  return pins.filter(p => !isStale(p, now))
}

export function timeAgo(date: Date | null): string {
  if (!date) return ''
  const ms = Date.now() - date.getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
