import { Download } from 'lucide-react'
import type { EvaluacionIA, EstadoPostulante, PostulanteCSV } from '../types'

interface Props {
  postulantes: PostulanteCSV[]
  evaluaciones: EvaluacionIA[]
  estados: Record<string, EstadoPostulante>
}

function buildCSV(rows: EvaluacionIA[], postulantes: PostulanteCSV[], estados: Record<string, EstadoPostulante>): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = [
    'id_postulante', 'nombres', 'apellidos', 'dni', 'correo',
    'promedio', 'puntaje_valorado', 'nivel_riesgo_veracidad', 'resumen_ia', 'estado',
  ].join(',')
  const lines = rows.map(ev => {
    const p = postulantes.find(x => x.id_postulante === ev.id_postulante)
    return [
      ev.id_postulante,
      esc(p?.nombres ?? ''),
      esc(p?.apellidos ?? ''),
      p?.dni ?? '',
      esc(p?.correo ?? ''),
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
  const bom = '﻿'
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
    { titulo: 'Aceptados',       desc: 'Postulantes aprobados para beca',  ids: aceptados,    nombre: 'becas_aceptados',         acento: 'veraz' as const },
    { titulo: 'Archivados',      desc: 'En lista de espera',               ids: archivados,   nombre: 'becas_archivados',        acento: 'revisar' as const },
    { titulo: 'Reporte completo','desc': 'Todos los postulantes evaluados', ids: evaluaciones, nombre: 'becas_reporte_completo',  acento: 'cobalt' as const },
  ]

  const acentoBtn: Record<string, string> = {
    veraz: 'bg-veraz', revisar: 'bg-revisar', cobalt: 'bg-cobalt',
  }
  const acentoPill: Record<string, string> = {
    veraz: 'bg-veraz/10 text-veraz', revisar: 'bg-revisar/10 text-revisar', cobalt: 'bg-cobalt-wash text-cobalt',
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'evaluados',  value: total,             color: 'text-ink' },
          { label: 'aceptados',  value: aceptados.length,  color: 'text-veraz' },
          { label: 'archivados', value: archivados.length, color: 'text-revisar' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-mist bg-card p-4 text-center">
            <p className={`font-display text-3xl font-semibold tnum ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-steel">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Columnas del CSV */}
      <div className="rounded-lg border border-mist bg-card px-4 py-3">
        <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-steel">COLUMNAS DEL CSV</p>
        <div className="flex flex-wrap gap-1.5">
          {['id_postulante','nombres','apellidos','dni','correo','promedio','puntaje_valorado','nivel_riesgo_veracidad','resumen_ia','estado'].map(c => (
            <span key={c} className="rounded-md border border-mist bg-paper px-2 py-0.5 font-mono text-xs text-steel">{c}</span>
          ))}
        </div>
      </div>

      {/* Tarjetas de exportación */}
      <div className="space-y-3">
        {tarjetas.map(t => (
          <div key={t.titulo} className="rounded-xl border border-mist bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-medium text-ink">{t.titulo}</h3>
                <p className="mt-0.5 text-xs text-steel">{t.desc}</p>
                <p className="mt-1.5 font-mono text-xs text-ink">
                  {t.ids.length} registro{t.ids.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => descargarCSV(t.nombre, buildCSV(t.ids, postulantes, estados))}
                disabled={t.ids.length === 0}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 ${acentoBtn[t.acento]}`}
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
                    <span key={e.id_postulante} className={`rounded-full px-2.5 py-0.5 font-mono text-xs ${acentoPill[t.acento]}`}>
                      {p ? `${p.nombres.split(' ')[0]} ${p.apellidos.split(' ')[0]}` : e.id_postulante}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="pt-4 text-center text-sm text-steel">
          Completa la evaluación y emite veredictos en Revisión para habilitar las exportaciones.
        </p>
      )}
    </div>
  )
}
