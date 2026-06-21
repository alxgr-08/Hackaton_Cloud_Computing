import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { db } from './firebase'
import { API_URL, COLECCION_EVALUACIONES } from '../config'
import type { EvaluacionIA, PayloadIA } from '../types'

/**
 * Envía el lote de postulantes al pipeline serverless de AWS.
 *
 *   Frontend → POST API Gateway → SQS → Lambda (lotes 20-30) → Groq LLM
 *
 * El backend responde 202 (Accepted) de inmediato; los resultados llegan
 * después de forma asíncrona y se leen vía Firestore (suscribirEvaluaciones).
 *
 * @param jobId  Identificador único de esta corrida (agrupa los resultados).
 * @param lote   Payload reducido: solo id_postulante, promedio, ensayo, logros.
 */
export async function enviarLoteAEvaluar(lote: PayloadIA[]): Promise<void> {
  if (!API_URL) {
    throw new Error('No hay URL de API Gateway configurada (VITE_API_URL).')
  }

  // Timeout de 15 s para no quedar "cargando" para siempre si el endpoint no responde.
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 15_000)

  try {
    // El endpoint de ingesta (Rol 2) espera un ARRAY directo de postulantes.
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lote),
      signal: ctrl.signal,
    })

    if (!resp.ok) {
      let detalle = 'No se recibió el detalle del error.'
      try {
        const cuerpo = await resp.json() as { error?: unknown }
        detalle = typeof cuerpo.error === 'string' ? cuerpo.error : JSON.stringify(cuerpo)
      } catch {
        detalle = await resp.text().catch(() => detalle)
      }
      throw new Error(`API Gateway respondió ${resp.status}. ${detalle}`)
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('El backend no respondió a tiempo (timeout de 15 s).')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Se suscribe en tiempo real a la colección de resultados que la Lambda va
 * escribiendo en Firestore. Cada vez que llega una evaluación nueva, dispara
 * el callback con TODAS las evaluaciones de la colección; App.tsx se encarga
 * de quedarse solo con las que corresponden a los postulantes cargados
 * (emparejando por id_postulante).
 *
 * Devuelve una función para cancelar la suscripción.
 */
export function suscribirEvaluaciones(
  desde: Date,
  onActualizar: (evaluaciones: EvaluacionIA[]) => void,
): () => void {
  if (!db) {
    console.warn('[api] Firestore no está configurado; no se puede suscribir.')
    return () => {}
  }

  // Solo interesan documentos actualizados durante la corrida actual. Esto
  // evita reutilizar veredictos persistentes de una carga anterior con los
  // mismos IDs de postulante.
  const evaluacionesRecientes = query(
    collection(db, COLECCION_EVALUACIONES),
    where('actualizado_en', '>=', Timestamp.fromDate(desde)),
  )

  return onSnapshot(
    evaluacionesRecientes,
    (snapshot) => {
      const evaluaciones = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id_postulante: data.id_postulante,
          resumen_ensayo: data.resumen_ensayo,
          puntaje_valorado: data.puntaje_valorado,
          nivel_riesgo_veracidad: data.nivel_riesgo_veracidad,
        } as EvaluacionIA
      })
      onActualizar(evaluaciones)
    },
    (error) => {
      console.error('[api] Error en la suscripción a Firestore:', error)
    },
  )
}
