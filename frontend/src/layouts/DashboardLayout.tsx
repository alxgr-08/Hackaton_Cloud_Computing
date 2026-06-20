import type { ReactNode } from 'react'
import type { Vista } from '../types'
import { USE_MOCK } from '../config'

interface Progreso {
  hayDatos: boolean
  iaLista: boolean
  hayDecisiones: boolean
}

interface Props {
  vista: Vista
  onNavegar: (v: Vista) => void
  progreso: Progreso
  children: ReactNode
}

interface Etapa {
  id: Vista
  n: string
  nombre: string
  tagline: string
  titulo?: string   // título de la página (si difiere del nombre corto del riel)
}

const ETAPAS: Etapa[] = [
  { id: 'upload',   n: '01', nombre: 'Ingesta',     tagline: 'Sube el padrón de postulantes' },
  { id: 'lista',    n: '02', nombre: 'Postulantes', tagline: 'Cola de evaluación' },
  { id: 'revision', n: '03', nombre: 'Revisión',    tagline: 'Emite las decisiones', titulo: 'Sistema de revisión de postulantes' },
  { id: 'exportar', n: '04', nombre: 'Exportar',    tagline: 'Descarga los reportes' },
]

type EstadoEtapa = 'done' | 'active' | 'pending'

function estadoDe(id: Vista, vista: Vista, p: Progreso): EstadoEtapa {
  if (id === vista) return 'active'
  if (id === 'upload'   && p.hayDatos)      return 'done'
  if (id === 'lista'    && p.iaLista)       return 'done'
  if (id === 'revision' && p.hayDecisiones) return 'done'
  return 'pending'
}

function glifo(e: EstadoEtapa): string {
  return e === 'done' ? '✓' : e === 'active' ? '◉' : '·'
}

export default function DashboardLayout({ vista, onNavegar, progreso, children }: Props) {
  const actual = ETAPAS.find(e => e.id === vista)!

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* ── Riel de pipeline (desktop) ── */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink px-5 py-7 text-paper md:flex">
        <div className="mb-9">
          <p className="font-display text-xl font-semibold tracking-tight text-paper">VEREDICTO</p>
          <p className="mt-0.5 text-[13px] text-steel">comité de becas</p>
        </div>

        <p className="mb-3.5 font-mono text-[11px] tracking-[0.12em] text-steel">ETAPA</p>
        <nav className="flex flex-col gap-0.5">
          {ETAPAS.map(e => {
            const st = estadoDe(e.id, vista, progreso)
            const activo = st === 'active'
            return (
              <button
                key={e.id}
                onClick={() => onNavegar(e.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activo
                    ? 'bg-cobalt text-white'
                    : st === 'done'
                    ? 'text-paper hover:bg-white/8'
                    : 'text-steel hover:bg-white/8'
                }`}
              >
                <span className={`font-mono text-xs font-medium ${activo ? 'opacity-80' : 'opacity-50'}`}>{e.n}</span>
                <span className="flex-1 text-sm font-medium">{e.nombre}</span>
                <span className="text-[13px]">{glifo(st)}</span>
              </button>
            )
          })}
        </nav>

        <div className="my-7 h-px bg-white/10" />

        <p className="mb-2.5 font-mono text-[11px] tracking-[0.12em] text-steel">TRAZA</p>
        <p className="mb-1.5 font-mono text-xs text-paper">gateway → groq</p>
        <p className="flex items-center gap-2 font-mono text-xs text-steel">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${USE_MOCK ? 'bg-revisar' : 'bg-cobalt'}`} />
          {USE_MOCK ? 'modo demo' : 'conectado a aws'}
        </p>
      </aside>

      {/* ── Área principal ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra de etapas (móvil) */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-mist bg-ink px-3 py-2.5 md:hidden">
          {ETAPAS.map(e => {
            const st = estadoDe(e.id, vista, progreso)
            const activo = st === 'active'
            return (
              <button
                key={e.id}
                onClick={() => onNavegar(e.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activo ? 'bg-cobalt text-white' : 'text-steel'
                }`}
              >
                <span className="font-mono opacity-70">{e.n}</span>
                {e.nombre}
              </button>
            )
          })}
        </div>

        {/* Encabezado */}
        <header className="flex items-end justify-between gap-4 border-b border-mist bg-paper px-6 py-5">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{actual.titulo ?? actual.nombre}</h1>
            <p className="mt-1 text-sm text-steel">{actual.tagline}</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-steel">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${USE_MOCK ? 'bg-revisar' : 'bg-cobalt'}`} />
            {USE_MOCK ? 'modo demo' : 'conectado a aws'}
          </div>
        </header>

        {/* Contenido (entrada orquestada por vista) */}
        <main key={vista} className="rise min-w-0 flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
