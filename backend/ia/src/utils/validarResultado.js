// Última línea de defensa antes de escribir el resultado del LLM en Firestore.

const VALORES_RIESGO_VALIDOS = ['VERDE', 'AMARILLO', 'ROJO']

/**
 * Valida y sanitiza el resultado crudo de Groq para cumplir el contrato del
 * frontend.
 */
function validarResultado(resultadoCrudo, idPostulanteEsperado) {
  // El ID siempre procede del mensaje SQS original, nunca de la respuesta LLM.
  const id_postulante = idPostulanteEsperado

  const resumen_ensayo =
    typeof resultadoCrudo.resumen_ensayo === 'string' &&
    resultadoCrudo.resumen_ensayo.trim().length > 0
      ? resultadoCrudo.resumen_ensayo.trim()
      : 'Resumen no disponible.'

  let puntaje_valorado = Number(resultadoCrudo.puntaje_valorado)
  if (Number.isNaN(puntaje_valorado)) {
    puntaje_valorado = 0
  }
  puntaje_valorado = Math.max(0, Math.min(10, puntaje_valorado))
  puntaje_valorado = Math.round(puntaje_valorado * 100) / 100

  let nivel_riesgo_veracidad = String(
    resultadoCrudo.nivel_riesgo_veracidad || '',
  )
    .trim()
    .toUpperCase()

  if (!VALORES_RIESGO_VALIDOS.includes(nivel_riesgo_veracidad)) {
    // Un valor inesperado del LLM debe revisarse, no convertirse en VERDE.
    nivel_riesgo_veracidad = 'AMARILLO'
  }

  return {
    id_postulante,
    resumen_ensayo,
    puntaje_valorado,
    nivel_riesgo_veracidad,
  }
}

module.exports = { validarResultado, VALORES_RIESGO_VALIDOS }
