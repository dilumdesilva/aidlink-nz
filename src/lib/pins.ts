import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { geohashOf, isInNZ } from './geo'
import type { PinType } from './categories'

export type PinStatus = 'active' | 'resolved' | 'stale'

export interface PinInput {
  type: PinType
  category: string
  title: string
  description: string
  lat: number
  lng: number
}

export interface Pin {
  id: string
  type: PinType
  category: string
  title: string
  description: string
  lat: number
  lng: number
  geohash: string
  status: PinStatus
  confirmCount: number
  flagCount: number
  createdAt: Date | null
  updatedAt: Date | null
  expiresAt: Date | null
}

const PINS = collection(db, 'pins')
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

function tsToDate(t: unknown): Date | null {
  if (t instanceof Timestamp) return t.toDate()
  return null
}

export async function createPin(input: PinInput): Promise<string> {
  if (!isInNZ(input.lat, input.lng)) {
    throw new Error('Location must be inside New Zealand')
  }
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title || title.length > 80) {
    throw new Error('Title is required and must be 80 characters or fewer')
  }
  if (description.length > 280) {
    throw new Error('Description must be 280 characters or fewer')
  }
  const now = Date.now()
  const ref = await addDoc(PINS, {
    type: input.type,
    category: input.category,
    title,
    description,
    lat: input.lat,
    lng: input.lng,
    geohash: geohashOf(input.lat, input.lng),
    status: 'active' as PinStatus,
    confirmCount: 0,
    flagCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now + TWELVE_HOURS_MS),
    userAgent: navigator.userAgent.slice(0, 200),
  })
  return ref.id
}

export async function listActivePins(): Promise<Pin[]> {
  const q = query(PINS, where('status', '==', 'active'))
  const snap = await getDocs(q)
  const pins: Pin[] = []
  snap.forEach(d => {
    const data = d.data()
    pins.push({
      id: d.id,
      type: data.type,
      category: data.category,
      title: data.title ?? '',
      description: data.description ?? '',
      lat: data.lat,
      lng: data.lng,
      geohash: data.geohash ?? '',
      status: data.status ?? 'active',
      confirmCount: typeof data.confirmCount === 'number' ? data.confirmCount : 0,
      flagCount: typeof data.flagCount === 'number' ? data.flagCount : 0,
      createdAt: tsToDate(data.createdAt),
      updatedAt: tsToDate(data.updatedAt),
      expiresAt: tsToDate(data.expiresAt),
    })
  })
  return pins
}

export async function confirmPin(pinId: string): Promise<void> {
  await updateDoc(doc(PINS, pinId), {
    confirmCount: increment(1),
    updatedAt: serverTimestamp(),
  })
}

export async function resolvePin(pinId: string): Promise<void> {
  await updateDoc(doc(PINS, pinId), {
    status: 'resolved',
    updatedAt: serverTimestamp(),
  })
}

export async function flagPin(pinId: string): Promise<void> {
  await updateDoc(doc(PINS, pinId), {
    flagCount: increment(1),
    updatedAt: serverTimestamp(),
  })
}
