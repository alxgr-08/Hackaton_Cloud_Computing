# Evidencias de la demostración

Las capturas y el video de la demostración están en la siguiente carpeta:
https://drive.google.com/drive/folders/1wu_ZOw7Rn3UD-U9LBmlWi-qj7XimMPUv?usp=sharing

La demostración recorre el flujo completo de extremo a extremo:

- Frontend público en https://hackaton-2fcba.web.app.
- Carga del archivo `frontend/public/test-becas-30.csv`.
- Respuesta 200 de API Gateway con el conteo de postulaciones encoladas.
- Disparo de la Lambda de IA desde SQS en lotes de 25 con concurrencia 5.
- Logs de CloudWatch con el procesamiento y el manejo de límite de tasa.
- Documentos de resultados en Cloud Firestore.
- Revisión humana y exportación CSV desde el frontend.

Por seguridad, las evidencias no incluyen claves del proveedor LLM, archivos
`.env` ni credenciales de la cuenta de servicio de Firebase.
