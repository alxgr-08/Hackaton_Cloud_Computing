# Manual - Rol 3: Ingeniero de IA y Resiliencia

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

```bash
copy .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

Completa en `.env`:

- `LLM_PROVIDER=openai`: selecciona OpenAI como proveedor activo.
- `OPENAI_API_KEY`: clave de OpenAI.
- `OPENAI_MODEL=gpt-4o-mini`: modelo usado por la evaluación.
- Si se necesita usar Groq como alternativa compatible, cambiar a
  `LLM_PROVIDER=groq` y completar `GROQ_API_KEY` y `GROQ_MODEL`.
- `FIREBASE_CREDENTIALS_JSON`: JSON completo de la cuenta de servicio de
  Firebase en una sola línea. Los saltos de línea del `private_key` deben
  quedar escapados como `\n`.

## 3. Probar el flujo en local

Esta prueba llama al LLM configurado y escribe en Firestore sin pasar por AWS Lambda ni
SQS. Necesita credenciales LLM válidas.

```bash
npm run test:local
```

Confirma en Firestore que aparecen los documentos `TEST-001`, `TEST-002` y
`TEST-003`. El segundo contiene un logro deliberadamente inverosímil y debe
ser marcado como `ROJO` con un puntaje bajo.

## 4. Configurar credenciales de AWS Academy

Cada vez que expire la sesión del Learner Lab:

1. Abre AWS Academy, inicia el laboratorio y copia el bloque `[default]` de
   AWS Details.
2. Reemplaza el contenido de `C:\Users\TU_USUARIO\.aws\credentials`.
3. Verifica la identidad con `aws sts get-caller-identity`.

## 5. Desplegar a AWS

El archivo `serverless.yml` carga las variables desde `.env` mediante
`serverless-dotenv-plugin`.

```bash
npm run deploy
```

Al terminar, confirma el nombre de la función en AWS Lambda.

## 6. Verificar el trigger SQS

En AWS Lambda:

1. Abre la función `evaluarPostulacion`.
2. Ve a Configuration -> Triggers.
3. Confirma que `becas-ingesta-queue` aparece como trigger con `Batch size = 25`.

## 7. Prueba de carga y reintentos

Envía un lote limpio de 25-30 postulaciones cuando la API del LLM tenga crédito.
Durante el procesamiento:

1. Abre CloudWatch y el grupo de logs de la Lambda.
2. Verifica los eventos `[RATE_LIMIT]` cuando el proveedor responda 429.
3. Confirma que SQS reintenta solo los mensajes fallidos y que los fallos
   persistentes llegan a la DLQ.
4. Comprueba en Firestore que los resultados exitosos se almacenan sin
   duplicarse.

## 8. Logs en vivo

```bash
npm run logs
```

Este comando sigue los logs en tiempo real y es útil para grabar la
demostración técnica.
