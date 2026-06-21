import type { EvaluacionIA, NivelRiesgo, PostulanteCSV } from '../types'

/**
 * Simulador local del LLM para el MODO DEMO.
 *
 * Reproduce —con una heurística simple— lo que la Lambda + el LLM harán en
 * producción: recibe UN postulante real (los que tú subiste) y devuelve una
 * EvaluacionIA con la MISMA forma exacta que escribirá la Lambda en Firestore.
 *
 * Gracias a esto, el demo evalúa tus datos reales (no datos inventados) y el
 * día que conectes el LLM real NO cambia nada en el frontend: mismo contrato.
 */
export function evaluarMock(p: PostulanteCSV): EvaluacionIA {
  const ensayo = (p.motivacion ?? '').trim()
  const logros = (p.logros ?? '').trim()
  const palabras = ensayo ? ensayo.split(/\s+/).filter(Boolean).length : 0

  // ── Puntaje 0–10 ──
  const notaBase     = (p.promedio / 20) * 5                 // 0–5  (rendimiento académico)
  const calidadEnsayo = Math.min(palabras / 80, 1) * 3        // 0–3  (≥80 palabras = máximo)
  const aporteLogros  = logros.length > 30 ? 2 : logros.length > 0 ? 1 : 0  // 0–2
  const puntaje = Math.round((notaBase + calidadEnsayo + aporteLogros) * 100) / 100

  // ── Nivel de riesgo de veracidad ──
  // Heurística: ensayos muy cortos, sin logros o promedios bajos son más sospechosos.
  const sinLogros = logros.length === 0
  let nivel: NivelRiesgo
  if (palabras < 18) {
    nivel = 'ROJO'           // texto demasiado breve → posible relleno/IA
  } else if (palabras < 32 || p.promedio < 14 || sinLogros) {
    nivel = 'AMARILLO'       // requiere revisión manual
  } else {
    nivel = 'VERDE'          // consistente
  }

  // ── Resumen del ensayo (primeras ~14 palabras) ──
  const resumen = ensayo
    ? ensayo.split(/\s+/).slice(0, 14).join(' ') + (palabras > 14 ? '…' : '')
    : 'Sin ensayo proporcionado por el postulante.'

  return {
    id_postulante: p.id_postulante,
    resumen_ensayo: resumen,
    puntaje_valorado: puntaje,
    nivel_riesgo_veracidad: nivel,
  }
}
