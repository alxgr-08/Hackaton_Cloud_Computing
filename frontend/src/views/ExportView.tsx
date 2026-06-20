import { Download, CheckCircle, Archive, FileSpreadsheet, Users } from 'lucide-react'
import type { EvaluacionIA, EstadoPostulante, PostulanteCSV } from '../types'

interface Props {
  postulantes: PostulanteCSV[]
  evaluaciones: EvaluacionIA[]
  estados: Record<string, EstadoPostulante>
}

/** Construye un CSV limpio combinando datos del postulante + evaluación IA. */
function buildCSV(
  rows: EvaluacionIA[],
  postulantes: PostulanteCSV[],
  estados: Record<string, EstadoPostulante>
): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`

  const header = [
    'id_postulante', 'nombres', 'apellidos', 'dni', 'correo',
    'promedio', 'puntaje_valorado', 'nivel_riesgo_veracidad',
    'resumen_ia', 'estado',
  ].join(',')

  const lines = rows.map(ev => {
    const p = postulantes.find(x => x.id_postulante === ev.id_postulante)
    return [
      ev.id_postulante,
      esc(p?.nombres    ?? ''),
      esc(p?.apellidos  ?? ''),
      p?.dni            ?? '',
      esc(p?.correo     ?? ''),
      p?.promedio.toFixed(1) ?? '',
      ev.puntaje_valorado.toFixed(2),
      ev.nivel_riesgo_veracidad,
      esc(ev.resumen_ensayo),
      estados[ev.id_postulante] ?? 'pendiente',
    ].join(',')
  })

  return [header, ...lines].join('\n')
}

function descargarCSV(nombre: string, contenido: string) {
  const bom = '﻿' // UTF-8 BOM para que Excel lo abra correctamente
  const blob = new Blob([bom + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportView({ postulantes, evaluaciones, estados }: Props) {
  const aceptados  = evaluaciones.filter(e => estados[e.id_postulante] === 'aceptado')
  const archivados = evaluaciones.filter(e => estados[e.id_postulante] === 'archivado')
  const total      = evaluaciones.length

  const tarjetas = [
    {
      titulo: 'Exportar Aceptados',
      desc:   'Postulantes aprobados para beca',
      count:  aceptados.length,
      icon:   CheckCircle,
      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      borderColor: 'border-emerald-200', bg: 'bg-emerald-50/20',
      ids: aceptados, nombre: 'becas_aceptados',
      pillColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      titulo: 'Exportar Archivados',
      desc:   'Postulantes en lista de espera',
      count:  archivados.length,
      icon:   Archive,
      iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      btnColor: 'bg-amber-500 hover:bg-amber-600',
      borderColor: 'border-amber-200', bg: 'bg-amber-50/20',
      ids: archivados, nombre: 'becas_archivados',
      pillColor: 'bg-amber-100 text-amber-700',
    },
    {
      titulo: 'Reporte Completo',
      desc:   'Todos los postulantes evaluados',
      count:  total,
      icon:   FileSpreadsheet,
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-200', bg: 'bg-blue-50/10',
      ids: evaluaciones, nombre: 'becas_reporte_completo',
      pillColor: 'bg-blue-100 text-blue-700',
    },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Evaluados',  value: total,             color: 'text-slate-900'   },
          { label: 'Aceptados',  value: aceptados.length,  color: 'text-emerald-700' },
          { label: 'Archivados', value: archivados.length, color: 'text-amber-700'   },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <Users className="h-4 w-4 text-slate-400 mx-auto mb-1" />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Columnas que incluye el CSV */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 mb-1.5">Columnas del CSV exportado</p>
        <div className="flex flex-wrap gap-1.5">
          {['id_postulante','nombres','apellidos','dni','correo','promedio','puntaje_valorado','nivel_riesgo_veracidad','resumen_ia','estado'].map(col => (
            <span key={col} className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-mono text-slate-600">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Export cards */}
      <div className="space-y-3">
        {tarjetas.map(t => {
          const Icon = t.icon
          return (
            <div key={t.titulo} className={`rounded-2xl border ${t.borderColor} ${t.bg} bg-white p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
                    <Icon className={`h-5 w-5 ${t.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{t.titulo}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">
                      {t.count} registro{t.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => descargarCSV(t.nombre, buildCSV(t.ids, postulantes, estados))}
                  disabled={t.count === 0}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${t.btnColor}`}
                >
                  <Download className="h-4 w-4" />
                  Descargar CSV
                </button>
              </div>

              {t.ids.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {t.ids.map(e => {
                    const p = postulantes.find(x => x.id_postulante === e.id_postulante)
                    return (
                      <span key={e.id_postulante} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.pillColor}`}>
                        {p ? `${p.nombres.split(' ')[0]} ${p.apellidos.split(' ')[0]}` : e.id_postulante}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {total === 0 && (
        <p className="text-center text-sm text-slate-400 pt-4">
          Completa la evaluación con IA y toma decisiones en Revisión para habilitar las exportaciones.
        </p>
      )}
    </div>
  )
}
