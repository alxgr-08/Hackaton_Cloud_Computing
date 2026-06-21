// src/services/groqClient.js
//
// Wrapper sobre el cliente LLM. Su unica responsabilidad es llamar al modelo
// y, MUY IMPORTANTE: distinguir un error de rate limit (429) de cualquier
// otro error, para que el handler de la Lambda decida correctamente si
// debe reintentar via SQS o fallar de forma definitiva.
//
// COMPATIBLE CON GROQ Y OPENAI: Groq expone una API compatible con el
// formato de OpenAI, asi que usamos el SDK oficial "openai" apuntando a
// la base URL que corresponda. Cambiar de proveedor es solo cuestion de
// variables de entorno, sin tocar este archivo ni el resto del codigo.
//
// Variables de entorno relevantes:
//   LLM_PROVIDER=groq (default) | openai
//   GROQ_API_KEY / OPENAI_API_KEY
//   GROQ_MODEL (default: llama-3.3-70b-versatile) / OPENAI_MODEL (default: gpt-4o-mini)

const OpenAI = require("openai");
const { SYSTEM_PROMPT, buildUserPrompt } = require("./promptBuilder");

const PROVIDER = (process.env.LLM_PROVIDER || "groq").toLowerCase();

const PROVIDER_CONFIG = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
};

const config = PROVIDER_CONFIG[PROVIDER];

if (!config) {
  throw new Error(
    `LLM_PROVIDER invalido: "${PROVIDER}". Debe ser "groq" u "openai".`
  );
}

const client = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
});

// Error custom para que el handler pueda identificar un 429 de forma explicita
// (se mantiene el nombre GroqRateLimitError por compatibilidad con el resto
// del codigo que ya hace `instanceof GroqRateLimitError`, aunque el proveedor
// activo sea OpenAI)
class GroqRateLimitError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.name = "GroqRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Llama al LLM configurado (Groq u OpenAI) para evaluar una postulacion y
 * devuelve el JSON ya parseado.
 * Lanza GroqRateLimitError si el proveedor responde 429 (para que el caller
 * decida el reintento). Lanza Error normal para cualquier otro fallo.
 */
async function evaluarPostulacionConGroq(postulacion) {
  let completion;

  try {
    completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(postulacion) },
      ],
      temperature: 0.3, // baja temperatura: queremos evaluaciones consistentes, no creativas
      max_tokens: 500,
      response_format: { type: "json_object" }, // fuerza a devolver JSON valido
    });
  } catch (error) {
    // El SDK expone error.status con el codigo HTTP real (igual en Groq y OpenAI)
    if (error.status === 429) {
      const retryAfter = error.headers?.["retry-after"]
        ? parseInt(error.headers["retry-after"], 10)
        : 30;
      throw new GroqRateLimitError(
        `Rate limit alcanzado en ${PROVIDER} para postulante ${postulacion.id_postulante}`,
        retryAfter
      );
    }
    // Cualquier otro error (timeout, 5xx, etc.) se re-lanza tal cual
    throw error;
  }

  const rawContent = completion.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error(
      `${PROVIDER} no devolvio contenido para postulante ${postulacion.id_postulante}`
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseError) {
    throw new Error(
      `${PROVIDER} devolvio JSON invalido para postulante ${postulacion.id_postulante}: ${rawContent.slice(0, 200)}`
    );
  }

  return parsed;
}

module.exports = {
  evaluarPostulacionConGroq,
  GroqRateLimitError,
};
