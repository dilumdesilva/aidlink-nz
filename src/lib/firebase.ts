import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// If VITE_FIREBASE_PROJECT_ID is set in .env, talk to the real project.
// Otherwise fall back to the local Firestore emulator using a "demo-*"
// project ID, which Firebase recognises as emulator-only and will refuse
// to connect to any production service.
const realProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

const useEmulator = !realProjectId

const firebaseConfig: FirebaseOptions = useEmulator
  ? { projectId: 'demo-aidlink', apiKey: 'demo' }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: realProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

if (useEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  // eslint-disable-next-line no-console
  console.info('[AidLink] Connected to Firestore emulator at 127.0.0.1:8080')
}
