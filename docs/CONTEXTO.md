# Contexto de la problemática e impacto

## Problema

Los comités de becas revisan expedientes con información heterogénea: promedios,
ensayos de motivación y logros declarados. Cuando el volumen crece, la revisión
manual se vuelve lenta, dificulta priorizar casos que requieren atención y puede
producir criterios inconsistentes entre evaluadores.

## Solución propuesta

Selecta procesa lotes de postulaciones y usa un LLM como apoyo a la revisión,
no como reemplazo de la decisión humana. Para cada expediente produce un resumen,
un puntaje orientativo de 0 a 10 y un nivel de riesgo de veracidad. El comité
conserva las decisiones finales de aceptar, archivar o descartar.

## Casos de uso

1. **Priorización inicial:** identificar postulaciones con motivación clara y
   coherente para acelerar la primera revisión.
2. **Revisión de alertas:** marcar logros improbables como `AMARILLO` o `ROJO`
   para que una persona verifique los documentos de respaldo.
3. **Procesamiento masivo controlado:** recibir 20-30 postulaciones por lote sin
   bloquear al usuario mientras se evalúan de forma asíncrona.
4. **Trazabilidad operativa:** conservar resultados y errores en la cola/DLQ para
   que una falla temporal de la API no implique pérdida de expedientes.

## Impacto esperado y salvaguardas

- Reduce el tiempo de lectura inicial mediante resúmenes comparables.
- Dirige la atención humana hacia casos de mayor incertidumbre.
- Evita decisiones automáticas: el LLM solo recomienda; el comité decide.
- Minimiza datos enviados al backend: el frontend transmite únicamente ID,
  promedio, ensayo/motivación y logros; nombres, DNI, correo y enlaces se quedan
  en el cliente.
- Valida la respuesta del LLM antes de guardarla: puntaje numérico 0-10 y riesgo
  limitado a `VERDE`, `AMARILLO` o `ROJO`.

## Métricas de demostración

Durante la demo se registrarán: tamaño del lote, mensajes encolados, resultados
persistidos, mensajes reintentados por 429 y mensajes enviados a DLQ. El criterio
de éxito es procesar el lote sin perder mensajes y mostrar los resultados en el
frontend en tiempo real.
