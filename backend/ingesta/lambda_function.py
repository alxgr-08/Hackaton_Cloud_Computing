import json
import boto3

# Inicializar el cliente de SQS
sqs = boto3.client('sqs')

QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/247169770475/becas-ingesta-queue'


def normalizar_postulante(postulante):
    """Normaliza el contrato del frontend antes de publicar en SQS.

    El frontend histórico envía el ensayo como ``ensayo`` y algunas pruebas de
    integración lo envían como ``motivacion``. La Lambda IA trabaja con
    ``motivacion``; aceptar ambos evita que mensajes válidos terminen en la
    DLQ por un desacople de nombres.
    """
    if not isinstance(postulante, dict):
        raise ValueError('Cada postulación debe ser un objeto JSON.')

    id_postulante = postulante.get('id_postulante')
    motivacion = postulante.get('motivacion') or postulante.get('ensayo', '')

    if not id_postulante or not str(motivacion).strip():
        raise ValueError(
            'Cada postulación requiere id_postulante y motivacion (o ensayo).'
        )

    return {
        'id_postulante': id_postulante,
        'promedio': postulante.get('promedio'),
        'motivacion': str(motivacion).strip(),
        'logros': postulante.get('logros', ''),
    }


def lambda_handler(event, context):
    try:
        # 1. Verificar que el body exista
        if 'body' not in event or not event['body']:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'El cuerpo de la petición está vacío.'})
            }

        # 2. Transformar el texto JSON que envía el frontend a una lista de Python
        datos_postulantes = json.loads(event['body'])

        # 3. Validar de seguridad: asegurarse de que sea una lista (array)
        if not isinstance(datos_postulantes, list):
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Formato incorrecto. Se esperaba un array de objetos JSON.'})
            }

        # 4. Capa de seguridad: limitar a máximo 50 registros de golpe
        if len(datos_postulantes) > 50:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': (
                        f'Saturación prevenida. Se recibieron {len(datos_postulantes)} registros, '
                        'pero el límite máximo por lote es de 50.'
                    )
                })
            }

        # Normalizar y validar todo el lote antes de encolar. Así evitamos
        # enviar una parte del lote si una postulación no cumple el contrato.
        try:
            mensajes = [normalizar_postulante(p) for p in datos_postulantes]
        except ValueError as error:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(error)})
            }

        contador = 0

        # 5. Romper la lista e iterar postulante por postulante
        for postulante in mensajes:
            # Volver a convertir el postulante individual a texto JSON para SQS
            mensaje_json = json.dumps(postulante)

            # Disparar a la cola
            sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=mensaje_json
            )
            contador += 1

        # 6. Respuesta exitosa para el frontend
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'mensaje': f'Éxito absoluto. Se leyeron y encolaron {contador} postulaciones.',
                'estado': 'ok'
            })
        }

    except Exception as error:
        print(f'Error fatal procesando el JSON: {str(error)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Error interno del servidor al procesar la ingesta.'})
        }
