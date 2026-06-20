// Lambda disparada por SQS (event source mapping configurado por el Rol 2).
// Procesa un lote de postulaciones (batch size 20-30, ver serverless.yml),
// llamando a Groq por cada una. Ante fallos, reporta mensajes individuales
// para que SQS los reintente sin volver a procesar los que ya tuvieron éxito.

const { evaluarPostulacionConGroq, GroqRateLimitError } = require('../services/groqClient')
const { guardarEvaluacion } = require('../services/firestoreClient')
const { validarResultado } = require('../utils/validarResultado')

/**
 * Parsea y valida la forma mínima esperada del mensaje SQS.
 * Formato acordado con el Rol 2: { id_postulante, promedio, motivacion, logros }
 */
function parsearMensaje(sqsRecord) {
  let body
  try {
    body = JSON.parse(sqsRecord.body)
  } catch {
    throw new Error(`Mensaje SQS con body no-JSON (messageId=${sqsRecord.messageId})`)
  }

  const { id_postulante, promedio, motivacion, logros } = body

  if (!id_postulante || !motivacion) {
    throw new Error(
      `Mensaje SQS incompleto, faltan campos obligatorios (messageId=${sqsRecord.messageId})`,
    )
  }

  return { id_postulante, promedio, motivacion, logros }
}

/**
 * Procesa un único registro SQS de principio a fin:
 * parsear -> evaluar con Groq -> validar -> guardar en Firestore.
 */
async function procesarRegistro(sqsRecord) {
  const postulacion = parsearMensaje(sqsRecord)

  console.log(`Procesando postulante ${postulacion.id_postulante}...`)

  const resultadoCrudo = await evaluarPostulacionConGroq(postulacion)
  const resultadoValidado = validarResultado(resultadoCrudo, postulacion.id_postulante)

  await guardarEvaluacion(resultadoValidado)

  console.log(
    `Postulante ${postulacion.id_postulante} evaluado: ` +
      `puntaje=${resultadoValidado.puntaje_valorado}, riesgo=${resultadoValidado.nivel_riesgo_veracidad}`,
  )

  return resultadoValidado
}

/**
 * Handler principal. Usa `ReportBatchItemFailures` para poder fallar mensajes
 * individuales sin tumbar el lote completo.
 */
exports.handler = async (event) => {
  const batchItemFailures = []
  const resultadosExitosos = []

  console.log(`Lote recibido: ${event.Records.length} mensaje(s)`)

  // Se procesa secuencialmente dentro de cada lote para no saturar Groq. El
  // paralelismo se limita con la concurrencia de Lambda configurada en IaC.
  for (const record of event.Records) {
    try {
      const resultado = await procesarRegistro(record)
      resultadosExitosos.push(resultado)
    } catch (error) {
      if (error instanceof GroqRateLimitError) {
        console.warn(
          `[RATE_LIMIT] ${error.message}. El mensaje volverá a la cola para reintento.`,
        )
      } else {
        console.error(
          `[ERROR] Fallo procesando messageId=${record.messageId}: ${error.message}`,
        )
      }

      batchItemFailures.push({ itemIdentifier: record.messageId })
    }
  }

  console.log(
    `Lote finalizado: ${resultadosExitosos.length} exitosos, ` +
      `${batchItemFailures.length} para reintento/DLQ`,
  )

  return { batchItemFailures }
}
