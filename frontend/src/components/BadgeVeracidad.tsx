import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import type { NivelRiesgo } from '../types'

const CONFIG: Record<NivelRiesgo, {
  label: string
  icon: typeof ShieldCheck
  className: string
}> = {
  VERDE: {
    label: 'Veraz',
    icon: ShieldCheck,
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  AMARILLO: {
    label: 'Revisar',
    icon: ShieldAlert,
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  ROJO: {
    label: 'Riesgo',
    icon: ShieldX,
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
}

export default function BadgeVeracidad({ nivel }: { nivel: NivelRiesgo }) {
  const { label, icon: Icon, className } = CONFIG[nivel]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}
