const assert = require('node:assert/strict')
const { validarResultado } = require('../src/utils/validarResultado')

function ejecutar(nombre, prueba) {
  try {
    prueba()
    console.log(`✓ ${nombre}`)
  } catch (error) {
    console.error(`✗ ${nombre}`)
    throw error
  }
}

ejecutar('conserva el ID confiable del mensaje SQS', () => {
  const resultado = validarResultado(
    {
      id_postulante: 'ID-ALUCINADO',
      resumen_ensayo: 'Resumen válido.',
      puntaje_valorado: 8.2,
      nivel_riesgo_veracidad: 'VERDE',
    },
    'P-001',
  )

  assert.equal(resultado.id_postulante, 'P-001')
})

ejecutar('normaliza puntajes y redondea a dos decimales', () => {
  const resultado = validarResultado(
    {
      resumen_ensayo: 'Texto.',
      puntaje_valorado: '12.678',
      nivel_riesgo_veracidad: 'ROJO',
    },
    'P-002',
  )

  assert.equal(resultado.puntaje_valorado, 10)
})

ejecutar('convierte un riesgo desconocido en revisión humana', () => {
  const resultado = validarResultado(
    {
      resumen_ensayo: '',
      puntaje_valorado: 'no-numérico',
      nivel_riesgo_veracidad: 'AZUL',
    },
    'P-003',
  )

  assert.equal(resultado.resumen_ensayo, 'Resumen no disponible.')
  assert.equal(resultado.puntaje_valorado, 0)
  assert.equal(resultado.nivel_riesgo_veracidad, 'AMARILLO')
})
