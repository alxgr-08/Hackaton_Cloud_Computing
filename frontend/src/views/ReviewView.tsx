import { useState } from 'react'
import { FileText, Award, Check, Archive, Trash2, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import BadgeVeracidad from '../components/BadgeVeracidad'
import ScoreRail from '../components/ScoreRail'
import type { PostulanteCSV, EvaluacionIA, EstadoPostulante, Vista } from '../types'

interface Props {
  postulantes: PostulanteCSV[]
  evaluaciones: EvaluacionIA[]
  estados: Record<string, EstadoPostulante>
  onCambiarEstado: (id: string, estado: EstadoPostulante) => void
  onNavegar: (v: Vista) => void
}

type Filtro = 'todos' | 'pendiente' | 'aceptado' | 'archivado'
type CampoOrden = 'puntaje' | 'postulante'
type DirOrden = 'asc' | 'desc'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos',     label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aceptado',  label: 'Aceptados' },
  { id: 'archivado', label: 'Archivados' },
]

function abrirLink(url: string, etiqueta: string) {
  if (!url) { alert(`Sin ${etiqueta} adjunto para este postulante.`); return }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function Metric({ valor, label, tono }: { valor: number; label: string; tono: 'ink' | 'veraz' | 'revisar' }) {
  const color = tono === 'veraz' ? 'text-veraz' : tono === 'revisar' ? 'text-revisar' : 'text-ink'
  return (
    <div className="rounded-lg border border-mist bg-card p-4">
      <p className={`font-display text-3xl font-semibold tnum ${color}`}>{valor}</p>
      <p className="mt-1 text-xs text-steel">{label}</p>
    </div>
  )
}

function SortHeader({ label, campo, orden, onClick, align = 'left' }: {
  label: string
  campo: CampoOrden
  orden: { campo: CampoOrden; dir: DirOrden }
  onClick: (c: CampoOrden) => void
  align?: 'left' | 'center'
}) {
  const activo = orden.campo === campo
  const Icono = activo ? (orden.dir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown
  return (
    <th className={`px-4 py-3 ${align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        onClick={() => onClick(campo)}
        className={`inline-flex items-center gap-1 font-mono text-[11px] font-medium tracking-[0.08em] transition-colors hover:text-ink ${activo ? 'text-ink' : 'text-steel'}`}
      >
        {label.toUpperCase()}
        <Icono className={`h-3.5 w-3.5 ${activo ? 'text-cobalt' : 'text-steel/50'}`} />
      </button>
    </th>
  )
}

export default function ReviewView({ postulantes, evaluaciones, estados, onCambiarEstado, onNavegar }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [orden, setOrden] = useState<{ campo: CampoOrden; dir: DirOrden }>({ campo: 'puntaje', dir: 'desc' })

  function toggleOrden(campo: CampoOrden) {
    setOrden(o => o.campo === campo ? { campo, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { campo, dir: 'desc' })
  }

  if (evaluaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-mist bg-card py-24 text-center">
        <p className="font-display text-lg font-medium text-ink">Sin veredictos todavía</p>
        <p className="-mt-2 text-sm text-steel">Activa el filtrado con IA desde Postulantes para emitir decisiones.</p>
        <button
          onClick={() => onNavegar('lista')}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-carbon active:scale-[0.98]"
        >
          Ir a Postulantes
        </button>
      </div>
    )
  }

  const combinados = evaluaciones
    .map(ev => ({
      ...ev,
      postulante: postulantes.find(p => p.id_postulante === ev.id_postulante),
      estado: estados[ev.id_postulante] ?? 'pendiente' as EstadoPostulante,
    }))
    .filter(c => c.postulante !== undefined)

  const ordenados = [...combinados].sort((a, b) => {
    const cmp = orden.campo === 'puntaje'
      ? a.puntaje_valorado - b.puntaje_valorado
      : `${a.postulante!.nombres} ${a.postulante!.apellidos}`.localeCompare(`${b.postulante!.nombres} ${b.postulante!.apellidos}`)
    return orden.dir === 'asc' ? cmp : -cmp
  })

  const filtrados = filtro === 'todos' ? ordenados : ordenados.filter(c => c.estado === filtro)

  const conteos = {
    pendiente: combinados.filter(c => c.estado === 'pendiente').length,
    aceptado:  combinados.filter(c => c.estado === 'aceptado').length,
    archivado: combinados.filter(c => c.estado === 'archivado').length,
  }

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Metric valor={conteos.pendiente} label="esperan decisión" tono="ink" />
        <Metric valor={conteos.aceptado}  label="aceptados"        tono="veraz" />
        <Metric valor={conteos.archivado} label="archivados"       tono="revisar" />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filtro === f.id
                ? 'bg-ink text-paper'
                : 'border border-mist bg-card text-steel hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-steel">{filtrados.length} registros</span>
      </div>

      {/* Tabla de veredictos */}
      <div className="overflow-x-auto rounded-xl border border-mist bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-mist">
              <SortHeader label="Postulante" campo="postulante" orden={orden} onClick={toggleOrden} />
              <th className="px-4 py-3 text-left font-mono text-[11px] font-medium tracking-[0.08em] text-steel">RESUMEN IA</th>
              <SortHeader label="Puntaje · 6·8" campo="puntaje" orden={orden} onClick={toggleOrden} />
              {['Veracidad', 'Documentos', 'Veredicto'].map(c => (
                <th key={c} className="px-4 py-3 text-center font-mono text-[11px] font-medium tracking-[0.08em] text-steel">
                  {c.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(item => {
              const p = item.postulante!
              const aceptado = item.estado === 'aceptado'
              const archivado = item.estado === 'archivado'
              return (
                <tr
                  key={item.id_postulante}
                  className="border-t border-mist transition-colors hover:bg-cobalt-wash/40"
                  style={{
                    boxShadow: aceptado ? 'inset 3px 0 0 var(--color-veraz)'
                      : archivado ? 'inset 3px 0 0 var(--color-revisar)' : undefined,
                    background: aceptado ? 'color-mix(in srgb, var(--color-veraz) 5%, transparent)'
                      : archivado ? 'color-mix(in srgb, var(--color-revisar) 5%, transparent)' : undefined,
                  }}
                >
                  {/* Postulante */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="whitespace-nowrap rounded-md border border-mist bg-paper px-2 py-1 font-mono text-xs font-medium text-carbon">
                        {item.id_postulante}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{p.nombres} {p.apellidos}</p>
                        <p className="font-mono text-xs text-steel">{p.dni} · {p.promedio.toFixed(1)}/20</p>
                      </div>
                    </div>
                  </td>

                  {/* Resumen IA */}
                  <td className="max-w-xs px-4 py-3.5">
                    <p className="line-clamp-2 text-xs leading-relaxed text-steel">{item.resumen_ensayo}</p>
                  </td>

                  {/* Puntaje (firma) */}
                  <td className="px-4 py-3.5">
                    <ScoreRail valor={item.puntaje_valorado} />
                  </td>

                  {/* Veracidad */}
                  <td className="px-4 py-3.5 text-center">
                    <BadgeVeracidad nivel={item.nivel_riesgo_veracidad} />
                  </td>

                  {/* Documentos */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {([
                        { url: p.linkNotas,  icon: FileText, label: 'Notas', etiq: 'PDF de notas' },
                        { url: p.linkLogros, icon: Award,    label: 'Certs', etiq: 'PDF de certificados' },
                      ] as const).map(({ url, icon: Icon, label, etiq }) => (
                        <button
                          key={label}
                          onClick={() => abrirLink(url, etiq)}
                          title={url ? `Abrir ${etiq}` : `Sin ${etiq}`}
                          className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                            url ? 'border-mist text-steel hover:border-cobalt hover:text-cobalt' : 'border-mist/60 text-mist cursor-not-allowed'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                          {url && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Veredicto (acciones) */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onCambiarEstado(item.id_postulante, 'aceptado')}
                        title="Aceptar"
                        className={`rounded-md p-2 transition ${aceptado ? 'bg-veraz text-white' : 'text-steel hover:bg-veraz/10 hover:text-veraz'}`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onCambiarEstado(item.id_postulante, 'archivado')}
                        title="Archivar"
                        className={`rounded-md p-2 transition ${archivado ? 'bg-revisar text-white' : 'text-steel hover:bg-revisar/10 hover:text-revisar'}`}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onCambiarEstado(item.id_postulante, 'eliminado')}
                        title="Descartar"
                        className="rounded-md p-2 text-steel transition hover:bg-riesgo/10 hover:text-riesgo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="py-12 text-center text-sm text-steel">Sin postulantes con este filtro</div>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-steel">
        <span className="inline-block h-px w-2.5 bg-cobalt" />
        Las marcas cobalto en el riel señalan los umbrales de decisión: 6.0 y 8.0.
      </p>
    </div>
  )
}
