// test-local.js
//
// Simula un evento de SQS con 3 postulantes de prueba, para validar TODO
// el flujo (Groq + validacion + Firestore) sin necesidad de desplegar a
// AWS ni de que la cola real tenga mensajes.
//
// Uso:
//   1. Completa tu archivo .env (copia .env.example -> .env)
//   2. Carga las variables de entorno en tu sesion de terminal (ver abajo)
//   3. node test-local.js

require("dotenv").config();
const { handler } = require("./src/handlers/evaluarPostulacion");

// 3 postulantes de prueba: uno normal, uno con logro sospechoso, uno con
// motivacion muy debil - para ver los 3 niveles de riesgo en accion.
const postulantesPrueba = [
  {
    id_postulante: "TEST-001",
    promedio: 17.5,
    motivacion:
      "Desde que ingrese a la universidad he buscado aplicar la tecnologia para resolver problemas logisticos en mi comunidad. Lidere un proyecto estudiantil de optimizacion de rutas para una pequeña empresa de delivery local, reduciendo sus tiempos de entrega en un 15%.",
    logros: "Tercer puesto en hackathon interno UTEC 2025, promedio 17.5/20",
  },
  {
    id_postulante: "TEST-002",
    promedio: 14.0,
    motivacion:
      "Quiero la beca porque necesito ayuda economica para continuar mis estudios. Mi familia no tiene muchos recursos.",
    logros: "Gane el Premio Nobel de la Paz en 2023, descubri una vacuna",
  },
  {
    id_postulante: "TEST-003",
    promedio: 15.8,
    motivacion:
      "Mi interes en la inteligencia artificial nacio cuando construi mi primer chatbot en el colegio. Desde entonces he participado en 2 hackathons y un curso online de Machine Learning, y quiero profundizar mis conocimientos en una maestria.",
    logros: "Segundo puesto en feria de ciencias escolar, certificado de Coursera en ML",
  },
];

// Simula la forma exacta de un evento real de SQS->Lambda
const eventoSimulado = {
  Records: postulantesPrueba.map((p, i) => ({
    messageId: `mensaje-prueba-${i}`,
    body: JSON.stringify(p),
  })),
};

async function main() {
  console.log("=== Iniciando prueba local ===\n");

  const resultado = await handler(eventoSimulado);

  console.log("\n=== Resultado final ===");
  console.log(JSON.stringify(resultado, null, 2));

  if (resultado.batchItemFailures.length === 0) {
    console.log("\n✅ Los 3 postulantes de prueba se procesaron y guardaron en Firestore.");
    console.log("   Revisa la coleccion 'evaluaciones' en la consola de Firebase para confirmar.");
  } else {
    console.log(
      `\n⚠️ ${resultado.batchItemFailures.length} mensaje(s) fallaron y se marcaron para reintento.`
    );
  }
}

main().catch((err) => {
  console.error("❌ Error inesperado en la prueba:", err);
  process.exit(1);
});
