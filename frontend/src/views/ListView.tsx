import { Sparkles, ArrowRight, AlertCircle, XCircle } from 'lucide-react'
import type { PostulanteCSV, Vista } from '../types'

interface Props {
  postulantes: PostulanteCSV[]
  procesando: boolean
  recibidas: number
  iaCompletada: boolean
  errorPipeline: string
  onActivar: () => void
  onNavegar: (v: Vista) => void
}

function SkeletonRow() {
  return (
    <tr className="border-t border-mist">
      <td className="px-4 py-3.5"><div className="h-6 w-20 animate-pulse rounded-md bg-mist" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-36 animate-pulse rounded bg-mist" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-20 animate-pulse rounded bg-mist" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-14 animate-pulse rounded bg-mist" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-56 animate-pulse rounded bg-mist" /></td>
    </tr>
  )
}

export default function ListView({
  postulantes, procesando, recibidas, iaCompletada, errorPipeline, onActivar, onNavegar,
}: Props) {
  const sinDatos = postulantes.length === 0
  const pct = Math.round((recibidas / Math.max(postulantes.length, 1)) * 100)
  const loteRechazado = /API Gateway respondió 4\d\d/.test(errorPipeline)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-steel">
          {sinDatos ? 'No hay datos cargados' : (
            <><span className="font-mono font-medium text-ink">{postulantes.length}</span> postulantes en base</>
          )}
        </p>
        <div className="flex items-center gap-2">
          {iaCompletada && (
            <button
              onClick={() => onNavegar('revision')}
              className="flex items-center gap-2 rounded-lg border border-mist bg-card px-4 py-2.5 text-sm font-medium text-ink transition hover:border-cobalt hover:text-cobalt active:scale-[0.98]"
            >
              Ver veredictos
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onActivar}
            disabled={procesando || sinDatos || iaCompletada}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] ${
              iaCompletada
                ? 'cursor-default bg-veraz'
                : procesando
                ? 'cursor-wait bg-cobalt/80'
                : sinDatos
                ? 'cursor-not-allowed bg-steel/40'
                : 'bg-cobalt hover:bg-cobalt/90'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {iaCompletada ? 'IA completada' : procesando ? 'Procesando…' : 'Activar filtrado con IA'}
          </button>
        </div>
      </div>

      {/* Error */}
      {errorPipeline && !procesando && (
        <div className="flex items-start gap-3 rounded-lg border border-riesgo/30 bg-riesgo/5 px-4 py-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-riesgo" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-riesgo">
              {loteRechazado ? 'Lote rechazado por validación' : 'No se pudo contactar al backend'}
            </p>
            <p className="mt-0.5 break-words font-mono text-xs text-riesgo/80">{errorPipeline}</p>
          </div>
        </div>
      )}

      {/* Traza del pipeline (motion) */}
      {procesando && (
        <div className="rounded-lg border border-cobalt/30 bg-cobalt-wash/60 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-medium text-ink">gateway → sqs → lambda → groq</p>
              <p className="mt-0.5 text-xs text-steel">
                Evaluando ensayos · <span className="font-mono tnum">{recibidas}/{postulantes.length}</span> procesados
              </p>
            </div>
            <span className="font-mono text-sm font-medium tnum text-cobalt">{pct}%</span>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-cobalt/15">
            <div className="h-full rounded-full bg-cobalt transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          {/* Escape ante backend lento/parcial: ver lo que ya llegó */}
          {recibidas > 0 && (
            <button
              onClick={() => onNavegar('revision')}
              className="mt-2.5 flex items-center gap-1.5 font-mono text-xs font-medium text-cobalt transition hover:opacity-80"
            >
              Ver {recibidas} resultado{recibidas !== 1 ? 's' : ''} ya disponible{recibidas !== 1 ? 's' : ''}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {sinDatos && !procesando && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-mist bg-card py-20 text-center">
          <p className="font-display text-lg font-medium text-ink">Sin padrón cargado</p>
          <p className="-mt-1 text-sm text-steel">Sube el CSV de Google Forms en la etapa de Ingesta.</p>
          <button
            onClick={() => onNavegar('upload')}
            className="mt-1 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-carbon"
          >
            Ir a Ingesta
          </button>
        </div>
      )}

      {/* Tabla */}
      {(postulantes.length > 0 || procesando) && (
        <div className="overflow-x-auto rounded-xl border border-mist bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-mist">
                {['ID', 'Nombre', 'DNI', 'Promedio', 'Motivación (extracto)'].map(c => (
                  <th key={c} className="px-4 py-3 text-left font-mono text-[11px] font-medium tracking-[0.08em] text-steel">
                    {c.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {procesando
                ? Array.from({ length: postulantes.length || 6 }).map((_, i) => <SkeletonRow key={i} />)
                : postulantes.map(p => (
                    <tr key={p.id_postulante} className="border-t border-mist transition-colors hover:bg-cobalt-wash/40">
                      <td className="px-4 py-3.5">
                        <span className="whitespace-nowrap rounded-md border border-mist bg-paper px-2 py-1 font-mono text-xs font-medium text-carbon">
                          {p.id_postulante}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-ink">{p.nombres} {p.apellidos}</p>
                        <p className="font-mono text-xs text-steel">{p.correo}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-steel">{p.dni}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-medium tnum text-ink">{p.promedio.toFixed(1)}</span>
                        <span className="ml-0.5 font-mono text-xs text-steel">/20</span>
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="truncate text-xs text-steel">{p.motivacion}</p>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota IA */}
      {!iaCompletada && !procesando && postulantes.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-mist bg-card px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
          <p className="text-xs leading-relaxed text-steel">
            Al activar la IA, el frontend envía solo <span className="font-mono text-ink">id_postulante, promedio, ensayo y logros</span>.
            Los datos personales y los links quedan en el cliente.
          </p>
        </div>
      )}
    </div>
  )
}
