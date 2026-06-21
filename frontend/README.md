# 🎓 Selecta — Dashboard de Selección de Becas

Frontend del sistema de selección de becas con **arquitectura basada en eventos**.
Sube postulantes desde un CSV de Google Forms, dispara un pipeline serverless
(**AWS API Gateway → SQS → Lambda → Groq LLM**) y visualiza los resultados en
**tiempo real** mediante **Firestore**.

- **Stack:** React 19 · TypeScript · Tailwind CSS v4 · Firebase (Firestore + Hosting)
- **Rol:** Frontend y Experiencia (GCP)

---

## 🚀 Inicio rápido (desarrollo local)

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

Por defecto arranca en **Modo demo** (`VITE_USE_MOCK=true`): simula todo el
pipeline localmente, sin necesitar AWS ni Firebase. Ideal para desarrollar la UI.

Hay un CSV de prueba en [`public/test-becas.csv`](public/test-becas.csv) con el
formato exacto de exportación de Google Forms.

---

## 🌐 Conectar a la nube real

1. Pide al **Rol 2** la URL de invocación de API Gateway.
2. Crea el proyecto en [Firebase Console](https://console.firebase.google.com) y
   copia la config del SDK.
3. Edita `.env`:

   ```env
   VITE_USE_MOCK=false
   VITE_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com/prod/evaluar
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

4. `npm run dev` y el badge cambiará de **"Modo demo"** a **"Conectado a AWS"**.

El **contrato exacto** de datos entre frontend y backend está en
[`docs/CONTRATO_INTEGRACION.md`](docs/CONTRATO_INTEGRACION.md) — compártelo con tu equipo.

---

## ☁️ Despliegue en Firebase Hosting (URL pública — entregable obligatorio)

```bash
# 1. Instala la CLI (una sola vez)
npm install -g firebase-tools

# 2. Inicia sesión
firebase login

# 3. Apunta al proyecto: edita .firebaserc y reemplaza el project-id,
#    o ejecuta:
firebase use --add

# 4. Compila y publica
npm run build
firebase deploy --only hosting
```

Al terminar, la CLI imprime la **URL pública** (ej.
`https://tu-proyecto.web.app`). Esa es la URL que va en la entrega de la hackathon.

### Publicar las reglas de Firestore (lectura pública para el dashboard)

```bash
firebase deploy --only firestore:rules
```

---

## 📁 Estructura

```
src/
├── config.ts               ← lee variables de entorno (.env)
├── lib/
│   ├── firebase.ts         ← init de Firebase/Firestore
│   └── api.ts              ← POST a API Gateway + suscripción Firestore
├── types/index.ts          ← contratos TS (PostulanteCSV, PayloadIA, EvaluacionIA)
├── data/mock.ts            ← datos demo
├── layouts/DashboardLayout.tsx
├── components/  (BadgeVeracidad, Dropzone)
└── views/       (Upload, List, Review, Export)
```

---

## 🧪 Flujo de la demo

1. **Base de Datos** → arrastra `test-becas.csv` (o "Cargar datos demo").
2. **Postulantes** → "Activar filtrado con IA" → POST a AWS, barra de progreso en
   tiempo real conforme Firestore recibe resultados.
3. **Revisión IA** → decide Aceptar / Archivar / Eliminar, abre PDFs de Drive.
4. **Exportación** → descarga CSV limpio (compatible con Excel) por categoría.

## 🛠️ Scripts

| Comando           | Acción                          |
|-------------------|---------------------------------|
| `npm run dev`     | Servidor de desarrollo          |
| `npm run build`   | Compila a `dist/`               |
| `npm run preview` | Previsualiza el build de prod   |
