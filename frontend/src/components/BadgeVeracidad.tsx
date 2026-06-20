import type { NivelRiesgo } from '../types'

const CONFIG: Record<NivelRiesgo, { glifo: string; label: string; clase: string }> = {
  VERDE:    { glifo: '◆', label: 'veraz',   clase: 'text-veraz' },
  AMARILLO: { glifo: '◈', label: 'revisar', clase: 'text-revisar' },
  ROJO:     { glifo: '✕', label: 'riesgo',  clase: 'text-riesgo' },
}

/** Glifo + etiqueta de veracidad. El color es el único cromo semántico del dato. */
export default function BadgeVeracidad({ nivel }: { nivel: NivelRiesgo }) {
  const { glifo, label, clase } = CONFIG[nivel]
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${clase}`}>
      <span className="text-xs">{glifo}</span>
      {label}
    </span>
  )
}
