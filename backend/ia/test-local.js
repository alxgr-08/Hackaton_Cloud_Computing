// Simula un evento SQS para validar el flujo Groq -> validación -> Firestore
// sin desplegar ni publicar mensajes en la cola real.

require('dotenv').config()
const { handler } = require('./src/handlers/evaluarPostulacion')

const postulantesPrueba = [
  {
    id_postulante: 'TEST-001',
    promedio: 17.5,
    motivacion:
      'Desde que ingresé a la universidad he buscado aplicar la tecnología para resolver problemas logísticos en mi comunidad. Lideré un proyecto estudiantil de optimización de rutas para una pequeña empresa de delivery local, reduciendo sus tiempos de entrega en un 15%.',
    logros: 'Tercer puesto en hackathon interno UTEC 2025, promedio 17.5/20',
  },
  {
    id_postulante: 'TEST-002',
    promedio: 14.0,
    motivacion:
      'Quiero la beca porque necesito ayuda económica para continuar mis estudios. Mi familia no tiene muchos recursos.',
    logros: 'Gané el Premio Nobel de la Paz en 2023, descubrí una vacuna',
  },
  {
    id_postulante: 'TEST-003',
    promedio: 15.8,
    motivacion:
      'Mi interés en la inteligencia artificial nació cuando construí mi primer chatbot en el colegio. Desde entonces he participado en 2 hackathons y un curso online de Machine Learning, y quiero profundizar mis conocimientos en una maestría.',
    logros: 'Segundo puesto en feria de ciencias escolar, certificado de Coursera en ML',
  },
]

const eventoSimulado = {
  Records: postulantesPrueba.map((postulante, index) => ({
    messageId: `mensaje-prueba-${index}`,
    body: JSON.stringify(postulante),
  })),
}

async function main() {
  console.log('=== Iniciando prueba local ===\n')

  const resultado = await handler(eventoSimulado)

  console.log('\n=== Resultado final ===')
  console.log(JSON.stringify(resultado, null, 2))

  if (resultado.batchItemFailures.length === 0) {
    console.log('\n✅ Los 3 postulantes de prueba se procesaron y guardaron en Firestore.')
    console.log("   Revisa la colección 'evaluaciones' en la consola de Firebase para confirmar.")
  } else {
    console.log(
      `\n⚠️ ${resultado.batchItemFailures.length} mensaje(s) fallaron y se marcaron para reintento.`,
    )
  }
}

main().catch((error) => {
  console.error('❌ Error inesperado en la prueba:', error)
  process.exit(1)
})
