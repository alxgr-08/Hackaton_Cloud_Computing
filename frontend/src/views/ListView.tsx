import { Sparkles, TrendingUp, Users, ArrowRight, AlertCircle, XCircle } from 'lucide-react'
import type { PostulanteCSV, Vista } from '../types'
import { USE_MOCK } from '../config'

interface Props {
  postulantes: PostulanteCSV[]
  procesando: boolean
  recibidas: number          // cuántas evaluaciones han llegado de Firestore
  iaCompletada: boolean
  errorPipeline: string
  onActivar: () => void
  onNavegar: (v: Vista) => void
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3.5"><div className="h-6 w-20 animate-pulse rounded-lg bg-slate-200" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 animate-pulse rounded bg-slate-200" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-56 animate-pulse rounded bg-slate-200" /></td>
    </tr>
  )
}

export default function ListView({
  postulantes, procesando, recibidas, iaCompletada, errorPipeline, onActivar, onNavegar,
}: Props) {
  const sinDatos = postulantes.length === 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <p className="text-sm text-slate-500">
            {sinDatos ? 'No hay datos cargados' : `${postulantes.length} postulantes en base de datos`}
          </p>
          {/* Badge del modo activo */}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            USE_MOCK
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {USE_MOCK ? 'Modo demo' : 'Conectado a AWS'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {iaCompletada && (
            <button
              onClick={() => onNavegar('revision')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Ver resultados IA
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onActivar}
            disabled={procesando || sinDatos || iaCompletada}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] ${
              iaCompletada
                ? 'bg-emerald-600 cursor-default opacity-90'
                : procesando
                ? 'bg-blue-500 cursor-wait'
                : sinDatos
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {iaCompletada ? 'IA Completada' : procesando ? 'Procesando en AWS…' : 'Activar filtrado con IA'}
          </button>
        </div>
      </div>

      {/* Error del pipeline */}
      {errorPipeline && !procesando && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800">No se pudo contactar al backend</p>
            <p className="text-xs text-red-600 mt-0.5 break-words">{errorPipeline}</p>
          </div>
        </div>
      )}

      {/* Pipeline banner con progreso en tiempo real */}
      {procesando && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-800">
                {USE_MOCK
                  ? 'Pipeline simulado · evaluando con IA local'
                  : 'Pipeline activo · API Gateway → SQS → Lambda → Groq'}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {USE_MOCK
                  ? `Evaluando ensayos… ${recibidas}/${postulantes.length} procesados`
                  : `Esperando resultados desde Firestore… ${recibidas}/${postulantes.length} recibidos`}
              </p>
            </div>
            <span className="text-sm font-bold text-blue-700 tabular-nums">
              {Math.round((recibidas / Math.max(postulantes.length, 1)) * 100)}%
            </span>
          </div>
          {/* Barra de progreso */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(recibidas / Math.max(postulantes.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {sinDatos && !procesando && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-600">Sin datos cargados</p>
            <p className="mt-1 text-sm text-slate-400">Ve a "Base de Datos" y sube el CSV de Google Forms</p>
          </div>
          <button
            onClick={() => onNavegar('upload')}
            className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Ir a Base de Datos
          </button>
        </div>
      )}

      {/* Table */}
      {(postulantes.length > 0 || procesando) && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {['ID', 'Nombre completo', 'DNI', 'Promedio', 'Motivación (extracto)'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procesando
                ? Array.from({ length: postulantes.length || 6 }).map((_, i) => <SkeletonRow key={i} />)
                : postulantes.map(p => (
                    <tr key={p.id_postulante} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700">
                          {p.id_postulante}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">{p.nombres} {p.apellidos}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.correo}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-slate-600">{p.dni}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className={`h-4 w-4 ${
                            p.promedio >= 17 ? 'text-emerald-500' :
                            p.promedio >= 15 ? 'text-amber-500' : 'text-red-400'
                          }`} />
                          <span className="font-semibold text-slate-800">{p.promedio.toFixed(1)}</span>
                          <span className="text-slate-400 text-xs">/20</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="truncate text-xs text-slate-500 leading-relaxed">{p.motivacion}</p>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alert IA */}
      {!iaCompletada && !procesando && postulantes.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-700">
            Datos listos. Al activar la IA, el frontend enviará únicamente{' '}
            <strong>id_postulante, promedio, ensayo y logros</strong> al pipeline serverless
            (los links y datos personales quedan solo en el cliente).
          </p>
        </div>
      )}
    </div>
  )
}
