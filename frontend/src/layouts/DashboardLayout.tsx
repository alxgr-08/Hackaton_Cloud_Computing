import type { ReactNode } from 'react'
import {
  GraduationCap,
  Database,
  Users,
  ClipboardList,
  Download,
  ChevronRight,
  Cpu,
} from 'lucide-react'
import type { Vista } from '../types'

interface NavItem {
  id: Vista
  label: string
  sublabel: string
  icon: typeof GraduationCap
}

const NAV_ITEMS: NavItem[] = [
  { id: 'upload',   label: 'Base de Datos', sublabel: 'Carga de CSV',          icon: Database },
  { id: 'lista',    label: 'Postulantes',   sublabel: 'Lista completa',         icon: Users },
  { id: 'revision', label: 'Revisión IA',   sublabel: 'Toma de decisiones',     icon: ClipboardList },
  { id: 'exportar', label: 'Exportación',   sublabel: 'Descargar reportes',     icon: Download },
]

interface Props {
  vista: Vista
  onNavegar: (v: Vista) => void
  children: ReactNode
}

export default function DashboardLayout({ vista, onNavegar, children }: Props) {
  const current = NAV_ITEMS.find(n => n.id === vista)!

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* ── Sidebar ── */}
      <aside className="flex w-64 shrink-0 flex-col bg-slate-900">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/40">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight tracking-tight">BecasAdmin</p>
            <p className="text-xs text-slate-400 leading-tight">Sistema de Selección</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Módulos
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = vista === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavegar(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">{item.label}</p>
                  <p className={`text-xs truncate leading-tight ${
                    active ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-400'
                  }`}>
                    {item.sublabel}
                  </p>
                </div>
                {active && <ChevronRight className="h-4 w-4 text-blue-200 shrink-0" />}
              </button>
            )
          })}
        </nav>

        {/* Footer badge */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
            <Cpu className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-300">Hackathon 2025</p>
              <p className="text-xs text-slate-500">Groq API · AWS SQS · Lambda</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm">
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">{current.label}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{current.sublabel}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Sistema activo</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
