/**
 * Datos completos del postulante mapeados desde el CSV crudo de Google Forms.
 * El id_postulante es generado automáticamente por el frontend (P-001, P-002…).
 */
export interface PostulanteCSV {
  id_postulante: string
  nombres: string
  apellidos: string
  dni: string
  correo: string
  promedio: number
  linkNotas: string     // URL Google Drive al PDF de notas
  motivacion: string    // Campo ensayo del formulario
  logros: string
  linkLogros: string    // URL Google Drive al PDF de certificados
}

/**
 * Payload reducido que el frontend envía al pipeline serverless.
 * Solo los 4 campos que el backend (Groq/Lambda) necesita para evaluar.
 *
 * El cuerpo POST completo a API Gateway es: { jobId: string, postulantes: PayloadIA[] }
 */
export interface PayloadIA {
  id_postulante: string
  promedio: number
  ensayo: string        // mapeado desde motivacion
  logros: string
}

/**
 * Lo que el backend (Groq/Lambda) devuelve al frontend.
 * La Lambda escribe un documento con esta forma + un campo `jobId`
 * en la colección de Firestore `evaluaciones`. El frontend lo lee en
 * tiempo real (onSnapshot).
 */
export interface EvaluacionIA {
  id_postulante: string
  resumen_ensayo: string
  puntaje_valorado: number
  nivel_riesgo_veracidad: 'VERDE' | 'AMARILLO' | 'ROJO'
}

export type NivelRiesgo = EvaluacionIA['nivel_riesgo_veracidad']

export type EstadoPostulante = 'pendiente' | 'aceptado' | 'archivado' | 'eliminado'

export type Vista = 'upload' | 'lista' | 'revision' | 'exportar'
