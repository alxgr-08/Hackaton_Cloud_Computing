/**
 * Configuración central leída desde variables de entorno (Vite).
 * Copia `.env.example` a `.env` y completa con tus valores reales.
 */

/** URL de invocación del endpoint POST de Amazon API Gateway (la da el equipo de AWS). */
export const API_URL = import.meta.env.VITE_API_URL ?? ''

/**
 * Modo demo: si es true, el frontend simula el pipeline localmente (sin AWS ni Firestore).
 * Útil para desarrollar y como red de seguridad durante la demo en vivo.
 * Se activa con VITE_USE_MOCK=true o automáticamente si no hay API_URL configurada.
 */
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || API_URL === ''

/** Configuración de Firebase (Firestore en tiempo real + Hosting). */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

/** Nombre de la colección de Firestore donde la Lambda escribe los resultados. */
export const COLECCION_EVALUACIONES = 'evaluaciones'

/** ¿Hay credenciales de Firebase configuradas? */
export const FIREBASE_HABILITADO = firebaseConfig.projectId !== ''
