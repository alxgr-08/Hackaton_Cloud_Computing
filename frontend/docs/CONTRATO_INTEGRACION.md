# 🔌 Contrato de Integración — Frontend ↔ Backend

> Documento maestro para los 3 roles del equipo. Define **exactamente** cómo
> se comunican el frontend (GCP/Firebase) y el backend (AWS).
> Si todos respetamos este contrato, las piezas encajan sin reuniones extra.

---

## 🗺️ Flujo de datos end-to-end

```
┌─────────────────────────┐
│  FRONTEND (Rol 1)       │   React + TS + Firebase Hosting
│  - Sube CSV Google Forms│
│  - Parsea y genera IDs  │
└───────────┬─────────────┘
            │ 1) POST  { jobId, postulantes: [...] }
            ▼
┌─────────────────────────┐
│  API Gateway (Rol 2)    │   Puerta de entrada HTTP
└───────────┬─────────────┘
            │ 2) envía 1 mensaje por postulante
            ▼
┌─────────────────────────┐
│  Amazon SQS (Rol 2)     │   Cola de eventos (buffer)
└───────────┬─────────────┘
            │ 3) consume en lotes de 20–30
            ▼
┌─────────────────────────┐
│  AWS Lambda (Rol 3)     │   Node.js / Python
│  - Llama a Groq (LLM)   │
│  - Reintenta si hay 429 │
└───────────┬─────────────┘
            │ 4) escribe resultado (Firebase Admin SDK)
            ▼
┌─────────────────────────┐
│  Firestore (Rol 1+3)    │   Colección `evaluaciones`
└───────────┬─────────────┘
            │ 5) onSnapshot en tiempo real
            ▼
┌─────────────────────────┐
│  FRONTEND               │   El tablero se actualiza solo
└─────────────────────────┘
```

---

## 📤 1. Lo que el FRONTEND envía a API Gateway (Rol 1 → Rol 2)

**Endpoint (dev):** `POST https://gy8czltbi0.execute-api.us-east-1.amazonaws.com/dev/upload`
**Content-Type:** `application/json`
**Body:** un **ARRAY directo** de postulantes (sin envoltorio):

```json
[
  {
    "id_postulante": "P-001",
    "promedio": 14.0,
    "ensayo": "Quiero ganar la beca para apoyar a mi familia...",
    "logros": "Ganador de beca 18, trabajé en Sodimac full stack..."
  }
]
```

- Solo estos **4 campos** por postulante (nada de nombres, DNI ni links —
  esos se quedan en el navegador por privacidad).
- El frontend NO envía `jobId` (el endpoint no lo acepta).

> **Rol 2 (API Gateway + SQS):** lee este array y mete **un mensaje por cada
> postulante** en SQS.

**Respuesta real del endpoint (200):**
```json
{ "mensaje": "Éxito absoluto. Se leyeron y encolaron N postulaciones.", "estado": "ok" }
```

El frontend NO espera los resultados por aquí; los recibe por Firestore (sección 2).

> ⚠️ **CORS:** como el POST sale desde el navegador (https://hackaton-2fcba.web.app
> y http://localhost:5173), el API Gateway debe tener **CORS habilitado** para
> `POST` y `OPTIONS`, con `Access-Control-Allow-Origin: *` (o esos orígenes).
> Sin esto, el navegador bloquea la petición aunque el endpoint funcione.

---

## 🧠 2. Lo que la LAMBDA escribe en Firestore (Rol 3 → Rol 1)

Por **cada** postulante procesado, la Lambda hace un `set()` en la colección
`evaluaciones` usando el **Firebase Admin SDK**.

**Colección:** `evaluaciones`
**ID del documento:** usar el **`id_postulante`** (`P-001`, `P-002`…). Así, si se
reprocesa el mismo postulante, el documento se sobreescribe en vez de duplicarse.
**Forma del documento:**

```json
{
  "id_postulante": "P-001",
  "resumen_ensayo": "Motivación tecnológica clara orientada a impacto social.",
  "puntaje_valorado": 6.80,
  "nivel_riesgo_veracidad": "AMARILLO"
}
```

**Reglas estrictas de los campos:**

| Campo                     | Tipo    | Regla                                            |
|---------------------------|---------|--------------------------------------------------|
| `id_postulante`           | string  | El mismo que llegó (`P-001`, `P-002`…)           |
| `resumen_ensayo`          | string  | Resumen del LLM (1–2 frases)                     |
| `puntaje_valorado`        | number  | 0.0 – 10.0 (dos decimales)                       |
| `nivel_riesgo_veracidad`  | string  | **Solo** `"VERDE"`, `"AMARILLO"` o `"ROJO"`      |

> El frontend escucha toda la colección `evaluaciones` y empareja por
> `id_postulante` con los postulantes cargados. No necesita `jobId`.

> ⚠️ Si `nivel_riesgo_veracidad` llega con cualquier otro valor, el badge del
> frontend no pinta. Respetar las 3 mayúsculas exactas.

---

## 🔥 3. Cómo la Lambda escribe en Firestore (snippet para Rol 3)

La Lambda vive en AWS pero escribe en Firestore (GCP). El puente es el
**Firebase Admin SDK** con una cuenta de servicio.

**Node.js (Lambda):**
```js
const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json') // de Firebase

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
}
const db = admin.firestore()

// Por cada resultado de Groq (doc id = id_postulante):
await db.collection('evaluaciones').doc(id_postulante).set({
  id_postulante,
  resumen_ensayo,
  puntaje_valorado,
  nivel_riesgo_veracidad,
})
```

> El `serviceAccountKey.json` se descarga en:
> Firebase Console → ⚙️ Configuración del proyecto → Cuentas de servicio →
> "Generar nueva clave privada". **NO subir al repo** (va en variables de entorno
> o secrets de la Lambda).

---

## 📦 Resumen de quién entrega qué

| Necesito (Rol 1, Frontend) | Me lo da | Cuándo |
|----------------------------|----------|--------|
| URL de invocación de API Gateway | Rol 2 | Apenas exista el endpoint |
| Confirmar que SQS conserva el `jobId` | Rol 2 | Antes de la prueba conjunta |
| Que la Lambda escriba con la forma exacta de arriba | Rol 3 | Antes de la prueba conjunta |
| Acceso al proyecto Firebase (para el `serviceAccountKey`) | Rol 1 → Rol 3 | Al crear el proyecto |

| Yo entrego (Rol 1) | A quién |
|--------------------|---------|
| Forma del body POST (este doc) | Rol 2 |
| Nombre de colección + forma del doc Firestore | Rol 3 |
| `serviceAccountKey.json` de Firebase | Rol 3 |
| URL pública del dashboard desplegado | Todos |
