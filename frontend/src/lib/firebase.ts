import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig, FIREBASE_HABILITADO } from '../config'

/**
 * Inicializa Firebase solo si hay credenciales configuradas.
 * En modo demo (sin Firestore) estos valores quedan en null y la app
 * usa el pipeline simulado.
 */
let app: FirebaseApp | null = null
let db: Firestore | null = null

if (FIREBASE_HABILITADO) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
}

export { app, db }
