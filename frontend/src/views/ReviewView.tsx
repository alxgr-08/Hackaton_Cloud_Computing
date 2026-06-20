import { useState } from 'react'
import { FileText, Award, Check, Archive, Trash2, Filter, ClipboardList, ExternalLink } from 'lucide-react'
import BadgeVeracidad from '../components/BadgeVeracidad'
import type { PostulanteCSV, EvaluacionIA, EstadoPostulante, Vista } from '../types'

interface Props {
  postulantes: PostulanteCSV[]
  evaluaciones: EvaluacionIA[]
  estados: Record<string, EstadoPostulante>
  onCambiarEstado: (id: string, estado: EstadoPostulante) => void
  onNavegar: (v: Vista) => void
}

type Filtro = 'todos' | 'pendiente' | 'aceptado' | 'archivado'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos',     label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aceptado',  label: 'Aceptados' },
  { id: 'archivado', label: 'Archivados' },
]

/** Abre un enlace en nueva pestaña o muestra alerta si está vacío. */
function abrirLink(url: string, etiqueta: string) {
  if (!url) { alert(`Sin ${etiqueta} adjunto para este postulante.`); return }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function ReviewView({ postulantes, evaluaciones, estados, onCambiarEstado, onNavegar }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos')

  if (evaluaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <ClipboardList className="h-7 w-7 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-600">Sin evaluaciones disponibles</p>
          <p className="mt-1 text-sm text-slate-400">Activa el filtrado con IA desde la vista de Postulantes</p>
        </div>
        <button
          onClick={() => onNavegar('lista')}
          className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Ir a Postulantes
        </button>
      </div>
    )
  }

  // Cruza evaluaciones con datos completos del postulante
  const combinados = evaluaciones
    .map(ev => ({
      ...ev,
      postulante: postulantes.find(p => p.id_postulante === ev.id_postulante),
      estado: estados[ev.id_postulante] ?? 'pendiente' as EstadoPostulante,
    }))
    .filter(c => c.postulante !== undefined)
    .sort((a, b) => b.puntaje_valorado - a.puntaje_valorado)

  const filtrados = filtro === 'todos'
    ? combinados
    : combinados.filter(c => c.estado === filtro)

  const conteos = {
    pendiente: combinados.filter(c => c.estado === 'pendiente').length,
    aceptado:  combinados.filter(c => c.estado === 'aceptado').length,
    archivado: combinados.filter(c => c.estado === 'archivado').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{conteos.pendiente}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Pendientes</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{conteos.aceptado}</p>
          <p className="text-xs font-medium text-emerald-600 mt-0.5">Aceptados</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{conteos.archivado}</p>
          <p className="text-xs font-medium text-amber-600 mt-0.5">Archivados</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{filtrados.length} registros</span>
      </div>

      {/* Decision table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {['Postulante', 'Resumen IA', 'Puntaje', 'Veracidad', 'Documentos', 'Acción'].map(col => (
                  <th
                    key={col}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      ['Puntaje', 'Veracidad', 'Documentos', 'Acción'].includes(col)
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map(item => {
                const p = item.postulante!
                return (
                  <tr
                    key={item.id_postulante}
                    className={`group transition-colors hover:bg-slate-50/60 ${
                      item.estado === 'aceptado'  ? 'bg-emerald-50/30' :
                      item.estado === 'archivado' ? 'bg-amber-50/30'   : ''
                    }`}
                  >
                    {/* Postulante: nombre + DNI */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                          {item.id_postulante.replace('P-', '')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs leading-tight">
                            {p.nombres} {p.apellidos}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">{p.dni}</p>
                          <p className="text-xs text-slate-400">Prom {p.promedio.toFixed(1)}/20</p>
                        </div>
                      </div>
                    </td>

                    {/* Resumen IA */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{item.resumen_ensayo}</p>
                    </td>

                    {/* Puntaje */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
                        item.puntaje_valorado >= 8 ? 'bg-emerald-50 text-emerald-700' :
                        item.puntaje_valorado >= 6 ? 'bg-amber-50 text-amber-700'   :
                                                     'bg-red-50 text-red-700'
                      }`}>
                        {item.puntaje_valorado.toFixed(2)}
                      </span>
                    </td>

                    {/* Badge veracidad */}
                    <td className="px-4 py-3.5 text-center">
                      <BadgeVeracidad nivel={item.nivel_riesgo_veracidad} />
                    </td>

                    {/* Documentos — abre los links de Drive */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => abrirLink(p.linkNotas, 'PDF de notas')}
                          title={p.linkNotas ? 'Abrir PDF de notas' : 'Sin notas adjuntas'}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            p.linkNotas
                              ? 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                              : 'border-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Notas
                          {p.linkNotas && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
                        </button>
                        <button
                          onClick={() => abrirLink(p.linkLogros, 'PDF de certificados')}
                          title={p.linkLogros ? 'Abrir PDF de certificados' : 'Sin certificados adjuntos'}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            p.linkLogros
                              ? 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                              : 'border-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <Award className="h-3.5 w-3.5" />
                          Certs
                          {p.linkLogros && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
                        </button>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onCambiarEstado(item.id_postulante, 'aceptado')}
                          title="Aceptar postulante"
                          className={`rounded-lg p-2 transition-all ${
                            item.estado === 'aceptado'
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                              : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onCambiarEstado(item.id_postulante, 'archivado')}
                          title="Archivar postulante"
                          className={`rounded-lg p-2 transition-all ${
                            item.estado === 'archivado'
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                              : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                          }`}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onCambiarEstado(item.id_postulante, 'eliminado')}
                          title="Eliminar postulante"
                          className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
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
            <div className="py-12 text-center text-sm text-slate-400">
              No hay postulantes con el filtro seleccionado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
