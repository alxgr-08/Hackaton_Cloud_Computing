import { useState } from 'react'
import Papa from 'papaparse'
import { CheckCircle2, ArrowRight, Zap, AlertTriangle, Trash2 } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import type { PostulanteCSV, Vista } from '../types'
import { MOCK_POSTULANTES } from '../data/mock'

interface Props {
  onCargaCompleta: (postulantes: PostulanteCSV[]) => void
  onEliminarBase: () => void
  onNavegar: (v: Vista) => void
  yaCargado: boolean
}

/** Busca un valor en una fila por coincidencia parcial (case-insensitive) en la clave. */
function col(row: Record<string, string>, ...fragments: string[]): string {
  for (const frag of fragments) {
    const key = Object.keys(row).find(k =>
      k.trim().toLowerCase().includes(frag.toLowerCase())
    )
    if (key !== undefined) return row[key]?.trim() ?? ''
  }
  return ''
}

/**
 * Mapea una fila cruda del CSV de Google Forms a la interfaz PostulanteCSV.
 * Devuelve null si la fila no tiene DNI o promedio válido.
 */
function mapearFila(row: Record<string, string>, idx: number): PostulanteCSV | null {
  const dni = col(row, 'DNI').replace(/\D/g, '')
  if (!dni) return null

  const promedioStr = col(row, 'Promedio Ponderado', 'promedio').replace(',', '.')
  const promedio = parseFloat(promedioStr)
  if (isNaN(promedio)) return null

  // "Correo" (campo del form) tiene prioridad sobre "Dirección de correo electrónico" (login Google)
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

/** Parsea el archivo CSV de Google Forms usando PapaParse. */
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
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'exito' | 'error'>(
    yaCargado ? 'exito' : 'idle'
  )
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

  async function cargarDemo() {
    setEstado('cargando')
    await new Promise(r => setTimeout(r, 1200))
    onCargaCompleta(MOCK_POSTULANTES)
    setConteo(MOCK_POSTULANTES.length)
    setEstado('exito')
  }

  function reiniciar() {
    setArchivo(null)
    setEstado('idle')
    setErrorMsg('')
  }

  /** Elimina toda la base: limpia el estado global (postulantes, evaluaciones, decisiones). */
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
      {/* Main card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Cargar base de postulantes</h2>
        <p className="text-sm text-slate-500 mb-5">
          Sube la exportación CSV de Google Forms. El sistema mapeará automáticamente
          las cabeceras al formato interno.
        </p>

        {estado === 'exito' ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-8 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 text-base">Carga completada</p>
              <p className="mt-1 text-sm text-emerald-600">
                <span className="font-bold text-emerald-700">{conteo} registros</span>{' '}
                procesados correctamente
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['DNI validados', 'Promedios normalizados', 'IDs asignados', 'Listos para IA'].map(tag => (
                <span key={tag} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>
        ) : estado === 'error' ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-red-200 bg-red-50 px-8 py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <div>
              <p className="font-semibold text-red-800">Error al procesar el archivo</p>
              <p className="mt-1 text-sm text-red-600">{errorMsg}</p>
            </div>
            <button onClick={reiniciar} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition">
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <Dropzone archivo={archivo} onFile={setArchivo} onClear={reiniciar} />
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          {/* Botón demo */}
          {estado === 'idle' && (
            <button
              onClick={cargarDemo}
              className="flex items-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <Zap className="h-4 w-4" />
              Cargar datos demo
            </button>
          )}
          {(estado === 'cargando' || estado === 'error' || estado === 'exito') && <div />}

          {estado === 'exito' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavegar('lista')}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
              >
                Ver postulantes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : estado !== 'error' ? (
            <button
              onClick={cargar}
              disabled={!archivo || estado === 'cargando'}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {estado === 'cargando' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
                  Procesando…
                </>
              ) : (
                'Cargar CSV'
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Zona de peligro: eliminar toda la base */}
      {yaCargado && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800">Eliminar base de datos</p>
            <p className="text-xs text-red-600 mt-0.5">
              Borra todos los postulantes, las evaluaciones de IA y las decisiones. No se puede deshacer.
            </p>
          </div>
          <button
            onClick={eliminarBase}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar base
          </button>
        </div>
      )}
    </div>
  )
}
