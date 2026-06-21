# Arquitectura basada en eventos

```mermaid
flowchart LR
    U["Comité de becas"] --> F["Frontend React\nFirebase Hosting"]
    F -->|"POST: lote de postulantes"| API["API Gateway\n/upload"]
    API --> I["Lambda de ingesta\nPython"]
    I -->|"1 mensaje por postulación"| Q["SQS\nbecas-ingesta-queue"]
    Q -->|"lotes de 25\nventana 5 s"| L["Lambda IA\nNode.js 20"]
    L -->|"evaluar"| G["API LLM\nOpenAI (activo) / Groq (opcional)"]
    G --> L
    L -->|"resultado validado"| DB["Cloud Firestore\nevaluaciones"]
    DB -->|"onSnapshot"| F
    L -->|"429 u otro fallo\nbatchItemFailures"| Q
    Q -->|"3 intentos fallidos"| DLQ["SQS DLQ\nbecas-dlq"]
```

## Controles de resiliencia

| Control | Implementación |
|---|---|
| Procesamiento masivo | Event source mapping SQS con `batchSize: 25`. |
| Presión contra LLM | `reservedConcurrency: 5` y `maximumConcurrency: 5`. |
| Rate limit | El cliente LLM distingue HTTP 429 y el handler devuelve fallos individuales. |
| Reintentos | `ReportBatchItemFailures`; SQS reintenta solo el mensaje fallido. |
| Aislamiento | La DLQ conserva mensajes que exceden `maxReceiveCount: 3`. |
| Idempotencia | Firestore actualiza el documento del mismo postulante en vez de duplicarlo. |
