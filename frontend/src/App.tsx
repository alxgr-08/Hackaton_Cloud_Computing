import { useEffect, useRef, useState } from 'react'
import DashboardLayout from './layouts/DashboardLayout'
import UploadView from './views/UploadView'
import ListView from './views/ListView'
import ReviewView from './views/ReviewView'
import ExportView from './views/ExportView'
import { USE_MOCK } from './config'
import { enviarLoteAEvaluar, suscribirEvaluaciones } from './lib/api'
import { evaluarMock } from './lib/mockIA'
import type {
  EvaluacionIA,
  EstadoPostulante,
  PayloadIA,
  PostulanteCSV,
  Vista,
} from './types'

/**
 * Persistencia local: el padrón cargado y las decisiones del comité viven en
 * el navegador (localStorage) para sobrevivir a un refresh. Los veredictos de
 * IA viven en Firestore; aquí se cachean para mostrarlos al recargar.
 */
const STORAGE_KEY = 'becas-estado-v1'

interface EstadoPersistido {
  vista: Vista
  postulantes: PostulanteCSV[]
  evaluaciones: EvaluacionIA[]
  estados: Record<string, EstadoPostulante>
}

function cargarPersistido(): Partial<EstadoPersistido> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EstadoPersistido) : {}
  } catch {
    return {}
  }
}

const inicial = cargarPersistido()

export default function App() {
  const [vista, setVista] = useState<Vista>(inicial.vista ?? 'upload')

  const [postulantes, setPostulantes]   = useState<PostulanteCSV[]>(inicial.postulantes ?? [])
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionIA[]>(inicial.evaluaciones ?? [])
  const [estados, setEstados]           = useState<Record<string, EstadoPostulante>>(inicial.estados ?? {})

  // Guarda el estado en cada cambio para sobrevivir al refresh.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ vista, postulantes, evaluaciones, estados }))
  }, [vista, postulantes, evaluaciones, estados])

  // Estado del pipeline asíncrono
  const [procesando, setProcesando] = useState(false)
  const [jobId, setJobId]           = useState<string | null>(null)
  const [errorPipeline, setError]   = useState<string>('')
  const desuscribir = useRef<(() => void) | null>(null)
  const navegoYa = useRef(false)

  /**
   * Suscripción a Firestore en tiempo real. La Lambda escribe los resultados
   * en la colección `evaluaciones`; aquí nos quedamos solo con los que
   * corresponden a los postulantes cargados (emparejando por id_postulante).
   * El tablero se actualiza solo a medida que llegan.
   */
  useEffect(() => {
    if (USE_MOCK || !jobId) return

    navegoYa.current = false
    const idsCargados = new Set(postulantes.map((p) => p.id_postulante))

    desuscribir.current = suscribirEvaluaciones((todas) => {
      const relevantes = todas.filter((e) => idsCargados.has(e.id_postulante))
      setEvaluaciones(relevantes)
      // Cuando llegan todos los resultados, finaliza y navega a Revisión.
      if (relevantes.length >= postulantes.length && postulantes.length > 0) {
        setProcesando(false)
        if (!navegoYa.current) {
          navegoYa.current = true
          setVista('revision')
        }
      }
    })

    return () => {
      desuscribir.current?.()
      desuscribir.current = null
    }
  }, [jobId, postulantes])

  /** Dispara el flujo: construye el payload reducido y lo envía a AWS. */
  async function iniciarEvaluacion() {
    setError('')
    setEvaluaciones([])
    setProcesando(true)

    const nuevoJobId = `job-${Date.now()}`
    const lote: PayloadIA[] = postulantes.map((p) => ({
      id_postulante: p.id_postulante,
      promedio: p.promedio,
      ensayo: p.motivacion,   // el backend espera la clave "ensayo"
      logros: p.logros,
    }))

    // ── Modo demo: simula el pipeline asíncrono SOBRE TUS DATOS REALES ──
    // Evalúa cada postulante con el simulador local (evaluarMock) y entrega
    // los resultados de a uno, imitando el stream de Firestore. Así el demo
    // refleja exactamente lo que hará Groq: 1 entrada → 1 evaluación.
    if (USE_MOCK) {
      console.debug('[demo] payload que se enviaría a AWS (array):', lote)
      const acumuladas: EvaluacionIA[] = []
      // Latencia simulada total ~1.8s repartida entre los registros, sin alargarse
      // demasiado aunque haya muchos postulantes.
      const pausa = Math.min(250, Math.floor(1800 / Math.max(postulantes.length, 1)))
      for (const p of postulantes) {
        await new Promise((r) => setTimeout(r, pausa))
        acumuladas.push(evaluarMock(p))
        setEvaluaciones([...acumuladas])   // dispara la barra de progreso
      }
      setProcesando(false)
      setVista('revision')
      return
    }

    // ── Modo real: POST (array) a API Gateway; resultados llegan vía Firestore ──
    try {
      setJobId(nuevoJobId)   // dispara la suscripción a Firestore (useEffect)
      await enviarLoteAEvaluar(lote)
      // No navegamos aquí: el useEffect de Firestore lo hará al recibir todo.
    } catch (e) {
      setProcesando(false)
      setJobId(null)
      setError(e instanceof Error ? e.message : 'Error al enviar el lote al backend.')
    }
  }

  function handleCambiarEstado(id: string, estado: EstadoPostulante) {
    setEstados((prev) => ({ ...prev, [id]: estado }))
  }

  /** Carga una base nueva: reemplaza postulantes y limpia cualquier resultado previo. */
  function handleCargaCompleta(nuevos: PostulanteCSV[]) {
    setPostulantes(nuevos)
    setEvaluaciones([])
    setEstados({})
    setProcesando(false)
    setJobId(null)
    setError('')
  }

  /** Elimina toda la base de datos y vuelve al estado inicial. */
  function handleEliminarBase() {
    desuscribir.current?.()
    desuscribir.current = null
    setPostulantes([])
    setEvaluaciones([])
    setEstados({})
    setProcesando(false)
    setJobId(null)
    setError('')
    localStorage.removeItem(STORAGE_KEY)
  }

  const progreso = {
    hayDatos: postulantes.length > 0,
    iaLista: evaluaciones.length > 0,
    hayDecisiones: Object.keys(estados).length > 0,
  }

  return (
    <DashboardLayout vista={vista} onNavegar={setVista} progreso={progreso}>
      {vista === 'upload' && (
        <UploadView
          onCargaCompleta={handleCargaCompleta}
          onEliminarBase={handleEliminarBase}
          onNavegar={setVista}
          yaCargado={postulantes.length > 0}
        />
      )}

      {vista === 'lista' && (
        <ListView
          postulantes={postulantes}
          procesando={procesando}
          recibidas={evaluaciones.length}
          iaCompletada={evaluaciones.length > 0 && !procesando}
          errorPipeline={errorPipeline}
          onActivar={iniciarEvaluacion}
          onNavegar={setVista}
        />
      )}

      {vista === 'revision' && (
        <ReviewView
          postulantes={postulantes}
          evaluaciones={evaluaciones}
          estados={estados}
          onCambiarEstado={handleCambiarEstado}
          onNavegar={setVista}
        />
      )}

      {vista === 'exportar' && (
        <ExportView
          postulantes={postulantes}
          evaluaciones={evaluaciones}
          estados={estados}
        />
      )}
    </DashboardLayout>
  )
}
