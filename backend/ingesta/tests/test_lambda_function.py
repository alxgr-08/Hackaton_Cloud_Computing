import importlib.util
import sys
import types
import unittest
from pathlib import Path


# La prueba solo verifica la normalización del contrato y no hace llamadas AWS.
fake_boto3 = types.SimpleNamespace(client=lambda _service: object())
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


if __name__ == '__main__':
    unittest.main()
