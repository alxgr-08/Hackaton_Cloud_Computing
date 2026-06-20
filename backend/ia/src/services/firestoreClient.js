// Inicializa firebase-admin con una cuenta de servicio almacenada como
// variable de entorno, nunca como archivo dentro del repositorio.

const admin = require('firebase-admin')

const COLECCION_EVALUACIONES = process.env.FIRESTORE_COLLECTION || 'evaluaciones'

let dbInstance = null

function getFirestoreDb() {
  if (dbInstance) return dbInstance

  if (!admin.apps.length) {
    const credentialsJson = process.env.FIREBASE_CREDENTIALS_JSON
    if (!credentialsJson) {
      throw new Error(
        'Falta la variable de entorno FIREBASE_CREDENTIALS_JSON con la cuenta de servicio',
      )
    }

    const serviceAccount = JSON.parse(credentialsJson)

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  dbInstance = admin.firestore()
  return dbInstance
}

/**
 * Guarda o sobrescribe el resultado de evaluación de un postulante. Usar el
 * identificador del postulante hace los reintentos idempotentes.
 */
async function guardarEvaluacion(resultado) {
  const db = getFirestoreDb()

  await db
    .collection(COLECCION_EVALUACIONES)
    .doc(resultado.id_postulante)
    .set(
      {
        id_postulante: resultado.id_postulante,
        resumen_ensayo: resultado.resumen_ensayo,
        puntaje_valorado: resultado.puntaje_valorado,
        nivel_riesgo_veracidad: resultado.nivel_riesgo_veracidad,
        actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
}

module.exports = { guardarEvaluacion, COLECCION_EVALUACIONES }
