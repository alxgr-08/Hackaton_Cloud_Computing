import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path


# La prueba valida el contrato sin hacer llamadas a AWS.
class FakeSqs:
    def __init__(self):
        self.mensajes = []

    def send_message(self, **kwargs):
        self.mensajes.append(kwargs)
        return {'MessageId': str(len(self.mensajes))}


fake_sqs = FakeSqs()
fake_boto3 = types.SimpleNamespace(client=lambda _service: fake_sqs)
sys.modules.setdefault('boto3', fake_boto3)

SOURCE = Path(__file__).resolve().parents[1] / 'lambda_function.py'
SPEC = importlib.util.spec_from_file_location('lambda_function', SOURCE)
lambda_function = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(lambda_function)


class NormalizarPostulanteTests(unittest.TestCase):
    def test_acepta_ensayo_del_frontend(self):
        resultado = lambda_function.normalizar_postulante({
            'id_postulante': 'P-001',
            'promedio': 17.5,
            'ensayo': 'Quiero estudiar ingeniería para apoyar a mi comunidad.',
            'logros': 'Voluntariado STEM.',
        })

        self.assertEqual(resultado['motivacion'], 'Quiero estudiar ingeniería para apoyar a mi comunidad.')
        self.assertNotIn('ensayo', resultado)

    def test_acepta_motivacion_de_pruebas_aws(self):
        resultado = lambda_function.normalizar_postulante({
            'id_postulante': 'P-002',
            'promedio': 16,
            'motivacion': 'Deseo aportar a la investigación médica.',
            'logros': 'Feria científica.',
        })

        self.assertEqual(resultado['motivacion'], 'Deseo aportar a la investigación médica.')

    def test_rechaza_registro_sin_ensayo_ni_motivacion(self):
        with self.assertRaises(ValueError):
            lambda_function.normalizar_postulante({
                'id_postulante': 'P-003',
                'promedio': 15,
            })

    def test_lote_sobre_el_limite_no_encola_ningun_mensaje(self):
        fake_sqs.mensajes.clear()
        postulantes = [
            {
                'id_postulante': f'P-{indice:03d}',
                'promedio': 15,
                'ensayo': 'Quiero continuar mis estudios.',
                'logros': 'Participación en feria académica.',
            }
            for indice in range(1, 102)
        ]

        respuesta = lambda_function.lambda_handler({
            'body': json.dumps(postulantes),
        }, None)

        self.assertEqual(respuesta['statusCode'], 400)
        self.assertIn('Saturación prevenida', json.loads(respuesta['body'])['error'])
        self.assertEqual(fake_sqs.mensajes, [])


if __name__ == '__main__':
    unittest.main()
