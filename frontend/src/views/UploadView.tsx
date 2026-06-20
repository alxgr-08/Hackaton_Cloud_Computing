import { useState } from 'react'
import Papa from 'papaparse'
import { ArrowRight, Trash2 } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import type { PostulanteCSV, Vista } from '../types'

interface Props {
  onCargaCompleta: (postulantes: PostulanteCSV[]) => void
  onEliminarBase: () => void
  onNavegar: (v: Vista) => void
  yaCargado: boolean
}

/** Busca un valor en una fila por coincidencia parcial (case-insensitive) en la clave. */
function col(row: Record<string, string>, ...fragments: string[]): string {
  for (const frag of fragments) {
    const key = Object.keys(row).find(k => k.trim().toLowerCase().includes(frag.toLowerCase()))
    if (key !== undefined) return row[key]?.trim() ?? ''
  }
  return ''
}

function mapearFila(row: Record<string, string>, idx: number): PostulanteCSV | null {
  const dni = col(row, 'DNI').replace(/\D/g, '')
  if (!dni) return null

  const promedio = parseFloat(col(row, 'Promedio Ponderado', 'promedio').replace(',', '.'))
  if (isNaN(promedio)) return null

  const correoKey = Object.keys(row).find(k => k.trim() === 'Correo')
  const correo = correoKey
    ? row[correoKey]?.trim() ?? ''
    : col(row, 'Dirección de correo electrónico', 'correo electrónico')

  return {
    id_postulante: `P-${String(idx + 1).padStart(3, '0')}`,
    nombres:    col(row, 'Nombres'),
    apellidos:  col(row, 'Apellidos'),
    dni,
    correo,
    promedio,
    linkNotas:  col(row, 'notas oficiales'),
    motivacion: col(row, 'motivacion', 'motivación'),
    logros:     col(row, 'logros academicos', 'logros'),
    linkLogros: col(row, 'evidencia en formato pdf'),
  }
}

function parsearCSV(file: File): Promise<PostulanteCSV[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: ({ data }) => {
        let idx = 0
        const resultado: PostulanteCSV[] = []
        for (const row of data) {
          const p = mapearFila(row, idx)
          if (p) { resultado.push(p); idx++ }
        }
        resolve(resultado)
      },
      error: (err) => reject(new Error(err.message)),
    })
  })
}

export default function UploadView({ onCargaCompleta, onEliminarBase, onNavegar, yaCargado }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'exito' | 'error'>(yaCargado ? 'exito' : 'idle')
  const [conteo, setConteo] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  async function cargar() {
    if (!archivo) return
    setEstado('cargando')
    setErrorMsg('')
    try {
      const postulantes = await parsearCSV(archivo)
      if (postulantes.length === 0) {
        setErrorMsg('No se encontraron filas válidas. Verifica que el archivo tenga columnas DNI y Promedio Ponderado.')
        setEstado('error')
        return
      }
      onCargaCompleta(postulantes)
      setConteo(postulantes.length)
      setEstado('exito')
    } catch {
      setErrorMsg('Error al leer el archivo. Asegúrate de que sea un CSV válido.')
      setEstado('error')
    }
  }

  function reiniciar() {
    setArchivo(null)
    setEstado('idle')
    setErrorMsg('')
  }

  function eliminarBase() {
    const ok = window.confirm(
      '¿Eliminar toda la base de datos? Se perderán los postulantes cargados, las evaluaciones de IA y las decisiones tomadas.'
    )
    if (!ok) return
    onEliminarBase()
    reiniciar()
    setConteo(0)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-xl border border-mist bg-card p-6">
        <h2 className="text-sm font-medium text-ink">Cargar padrón de postulantes</h2>
        <p className="mb-5 mt-1 text-sm text-steel">
          Sube la exportación CSV de Google Forms. El sistema mapea las cabeceras al formato interno automáticamente.
        </p>

        {estado === 'exito' ? (
          <div className="flex flex-col items-center gap-5 rounded-xl border border-veraz/30 bg-veraz/5 px-8 py-14 text-center">
            <p className="font-display text-2xl font-semibold text-veraz tnum">{conteo}</p>
            <div className="-mt-3">
              <p className="font-medium text-ink">Padrón cargado</p>
              <p className="mt-0.5 text-sm text-steel">registros procesados y listos para evaluar</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {['DNI validados', 'Promedios normalizados', 'IDs asignados'].map(tag => (
                <span key={tag} className="rounded-full bg-veraz/10 px-3 py-1 font-mono text-xs text-veraz">✓ {tag}</span>
              ))}
            </div>
          </div>
        ) : estado === 'error' ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-riesgo/30 bg-riesgo/5 px-8 py-10 text-center">
            <p className="font-medium text-riesgo">Error al procesar el archivo</p>
            <p className="-mt-2 text-sm text-riesgo/80">{errorMsg}</p>
            <button onClick={reiniciar} className="rounded-lg border border-riesgo/30 px-4 py-2 text-sm font-medium text-riesgo transition hover:bg-riesgo/10">
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <Dropzone archivo={archivo} onFile={setArchivo} onClear={reiniciar} />
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          {estado === 'exito' ? (
            <button
              onClick={() => onNavegar('lista')}
              className="flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-carbon active:scale-[0.98]"
            >
              Ver postulantes
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : estado !== 'error' ? (
            <button
              onClick={cargar}
              disabled={!archivo || estado === 'cargando'}
              className="flex items-center gap-2 rounded-lg bg-cobalt px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobalt/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-steel/40"
            >
              {estado === 'cargando' ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Procesando…
                </>
              ) : 'Cargar CSV'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Eliminar base */}
      {yaCargado && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-riesgo/30 bg-riesgo/5 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-riesgo">Eliminar base de datos</p>
            <p className="mt-0.5 text-xs text-riesgo/80">Borra postulantes, evaluaciones y decisiones. No se puede deshacer.</p>
          </div>
          <button
            onClick={eliminarBase}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-riesgo px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
