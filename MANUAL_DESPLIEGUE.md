# Manual de despliegue de Selecta

Sistema de selección de becas. Procesa postulaciones de forma masiva y asíncrona
mediante una arquitectura basada en eventos, integrando un LLM (Groq) para evaluar
los ensayos y estimar el riesgo de veracidad.

Este documento describe cómo levantar la solución completa desde cero: backend en
AWS, base de datos y hosting en Firebase, y frontend en React.

## 1. Arquitectura

```
Frontend (React, Firebase Hosting)
   |
   | 1. POST con el lote de postulantes (JSON, array)
   v
Amazon API Gateway
   |
   | 2. encola un mensaje por postulante
   v
Amazon SQS
   |
   | 3. evento de cola dispara la función
   v
AWS Lambda
   |
   | 4. evalúa cada ensayo con la API de Groq
   | 5. escribe el resultado en Firestore (Firebase Admin SDK)
   v
Cloud Firestore (colección "evaluaciones")
   ^
   | 6. el frontend lee en tiempo real (onSnapshot, SDK web)
Frontend
```

La Lambda se activa por eventos de SQS, no por peticiones HTTP. El frontend nunca
consulta el resultado por HTTP: lo recibe leyendo Firestore en tiempo real.

## 2. Requisitos previos

- Node.js 18 o superior y npm.
- Una cuenta de Google con acceso a la consola de Firebase.
- Una cuenta de AWS con permisos para API Gateway, SQS, Lambda e IAM.
- Una API key de Groq (https://console.groq.com/keys).
- Firebase CLI: `npm install -g firebase-tools`.

## 3. Estructura del repositorio

```
Hackaton_Cloud_Computing/
  frontend/              Aplicacion React (este manual cubre su despliegue)
  backend/               Codigo de la Lambda y configuracion de la cola
  MANUAL_DESPLIEGUE.md   Este archivo
```

## 4. Firebase (Firestore y Hosting)

1. Crear un proyecto en https://console.firebase.google.com.
2. Registrar una aplicación web y copiar el objeto `firebaseConfig`. Esos valores
   se usan en el paso 6.
3. Activar Firestore Database. Elegir una región (por ejemplo `nam5` o
   `southamerica-east1`) e iniciar en modo de prueba para la fase de desarrollo.
4. Activar Hosting.
5. Generar una clave de cuenta de servicio para que la Lambda pueda escribir en
   Firestore: Configuración del proyecto, pestaña Cuentas de servicio, Generar
   nueva clave privada. El archivo JSON descargado se entrega al backend (paso 5).
   No debe subirse al repositorio.

### Reglas de seguridad de Firestore

El frontend solo necesita leer. La escritura la realiza la Lambda con el Admin
SDK, que omite las reglas. Reglas mínimas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /evaluaciones/{docId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Publicarlas con `firebase deploy --only firestore:rules`.

## 5. Backend en AWS

El backend está formado por API Gateway, SQS y Lambda. Configuración requerida:

### API Gateway

- Un recurso con método POST (por ejemplo `/upload`).
- Integración que coloca el cuerpo recibido en la cola de SQS.
- CORS habilitado para los métodos POST y OPTIONS, con
  `Access-Control-Allow-Origin` para el dominio del frontend (o `*` en desarrollo)
  y `Access-Control-Allow-Headers: Content-Type`.

Contrato de entrada. El frontend envía un array JSON, sin envoltorio:

```json
[
  {
    "id_postulante": "P-001",
    "promedio": 14.0,
    "ensayo": "texto de la motivacion del postulante",
    "logros": "texto de los logros"
  }
]
```

Respuesta esperada: `200` con un cuerpo de confirmación. El frontend no usa el
cuerpo de la respuesta.

### SQS

- Una cola principal que recibe un mensaje por postulante (cada mensaje conserva
  el `id_postulante`).
- Una Dead Letter Queue asociada con `maxReceiveCount` (por ejemplo 3) para los
  mensajes que fallan de forma repetida.
- `Visibility Timeout` mayor o igual al timeout de la Lambda, para que un mensaje
  no procesado vuelva a la cola y se reintente.

### Lambda

- Disparada por eventos de la cola de SQS, con un tamaño de lote de 20 a 30
  mensajes.
- Variables de entorno: la API key de Groq y las credenciales de la cuenta de
  servicio de Firebase (paso 4).
- Permisos IAM para leer y borrar mensajes de la cola
  (`sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`).
- Manejo de errores: si Groq responde con límite de peticiones (429), el mensaje
  no se debe eliminar de la cola, de modo que se reintente más tarde. Los fallos
  persistentes terminan en la Dead Letter Queue sin perder datos.

Salida. Por cada postulante procesado, la Lambda escribe un documento en la
colección `evaluaciones`, usando el `id_postulante` como identificador del
documento:

```json
{
  "id_postulante": "P-001",
  "resumen_ensayo": "resumen generado por el modelo",
  "puntaje_valorado": 8.75,
  "nivel_riesgo_veracidad": "VERDE"
}
```

El campo `nivel_riesgo_veracidad` solo admite los valores `VERDE`, `AMARILLO` o
`ROJO`. El campo `puntaje_valorado` es numérico entre 0 y 10.

## 6. Frontend

Desde la carpeta `frontend`:

```bash
npm install
cp .env.example .env
```

Editar `.env` con los valores reales:

```
VITE_USE_MOCK=false
VITE_API_URL=https://<id>.execute-api.<region>.amazonaws.com/<stage>/upload

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<proyecto>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<proyecto>
VITE_FIREBASE_STORAGE_BUCKET=<proyecto>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`VITE_API_URL` es la URL de invocación de API Gateway (paso 5). Los valores de
Firebase provienen del `firebaseConfig` (paso 4).

`VITE_USE_MOCK` controla el modo de ejecución:
- `false`: modo real. Envía el lote a AWS y lee los resultados de Firestore.
- `true`: modo demo. Simula el procesamiento de forma local, sin tocar la nube.
  Útil para desarrollar la interfaz o presentar el flujo sin backend.

Desarrollo local:

```bash
npm run dev
```

Compilación y despliegue:

```bash
npm run build
firebase login
firebase use <proyecto>
firebase deploy --only hosting
```

Al finalizar, la CLI imprime la URL pública (por ejemplo
`https://<proyecto>.web.app`).

## 7. Verificación end to end

1. Abrir la URL pública. El indicador de la cabecera debe mostrar "conectado a
   aws".
2. Subir un archivo CSV con el formato de exportación de Google Forms. Las
   cabeceras esperadas incluyen: Nombres, Apellidos, DNI, Correo, Promedio
   Ponderado, el enlace a las notas, la motivación y los logros.
3. En la vista de postulantes, ejecutar "Activar filtrado con IA". El frontend
   envía el lote a API Gateway.
4. La barra de progreso avanza a medida que la Lambda escribe resultados en
   Firestore y el frontend los lee en tiempo real.
5. En la vista de revisión se muestran el puntaje, el nivel de veracidad y los
   accesos a los documentos. Las decisiones (aceptar, archivar, descartar) se
   guardan en el navegador y sobreviven a una recarga.
6. En la vista de exportación se descargan los resultados en CSV.

Para confirmar el estado de la base de datos sin el frontend, se puede consultar
la colección por REST:

```bash
curl "https://firestore.googleapis.com/v1/projects/<proyecto>/databases/(default)/documents/evaluaciones?key=<VITE_FIREBASE_API_KEY>"
```

## 8. Formato del archivo de entrada

El sistema acepta la exportación CSV directa de Google Forms. El frontend mapea
las cabeceras al formato interno por coincidencia parcial, de modo que tolera
variaciones menores en el texto de los encabezados. Hay un archivo de ejemplo en
`frontend/public/test-becas.csv`.

## 9. Problemas frecuentes

- La interfaz queda en "Procesando" y no avanza: la Lambda no está escribiendo en
  Firestore. Revisar los logs en CloudWatch y la cuota de la API de Groq. El
  frontend ofrece un botón para ver los resultados parciales ya recibidos.
- El navegador bloquea la petición con un error de CORS: falta habilitar CORS en
  API Gateway para POST y OPTIONS.
- Los veredictos mostrados no corresponden a los postulantes cargados: la
  colección `evaluaciones` contiene documentos de corridas anteriores. Vaciar la
  colección antes de una corrida nueva.
- La interfaz no sale del modo demo: `VITE_USE_MOCK` debe ser `false` y
  `VITE_API_URL` no puede estar vacío. Reiniciar el servidor o recompilar después
  de editar `.env`.
```
