// Wrapper sobre el SDK de Groq. Distingue los errores de rate limit (429)
// para que el handler decida si el mensaje debe reintentarse mediante SQS.

const Groq = require('groq-sdk')
const { SYSTEM_PROMPT, buildUserPrompt } = require('./promptBuilder')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

class GroqRateLimitError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message)
    this.name = 'GroqRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Llama a Groq para evaluar una postulación y devuelve el JSON ya parseado.
 * Lanza GroqRateLimitError si Groq responde 429; otros errores se propagan.
 */
async function evaluarPostulacionConGroq(postulacion) {
  let completion

  try {
    completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(postulacion) },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })
  } catch (error) {
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after']
        ? parseInt(error.headers['retry-after'], 10)
        : 30
      throw new GroqRateLimitError(
        `Rate limit alcanzado en Groq para postulante ${postulacion.id_postulante}`,
        retryAfter,
      )
    }
    throw error
  }

  const rawContent = completion.choices?.[0]?.message?.content

  if (!rawContent) {
    throw new Error(
      `Groq no devolvió contenido para postulante ${postulacion.id_postulante}`,
    )
  }

  let parsed
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw new Error(
      `Groq devolvió JSON inválido para postulante ${postulacion.id_postulante}: ${rawContent.slice(0, 200)}`,
    )
  }

  return parsed
}

module.exports = {
  evaluarPostulacionConGroq,
  GroqRateLimitError,
}
