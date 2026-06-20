/**
 * Elemento de firma: riel de puntaje 0–10 con las marcas de umbral (6.0 y 8.0)
 * en cobalto y la cifra en mono. Se lee como una línea de instrumento.
 */
export default function ScoreRail({ valor }: { valor: number }) {
  const pct = Math.max(0, Math.min(100, (valor / 10) * 100))
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-2 w-full min-w-[72px] max-w-[140px]">
        <div className="absolute inset-0 rounded-full bg-mist" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
        {/* umbrales de decisión */}
        <div className="absolute -top-0.5 -bottom-0.5 w-px bg-cobalt" style={{ left: '60%' }} />
        <div className="absolute -top-0.5 -bottom-0.5 w-px bg-cobalt" style={{ left: '80%' }} />
      </div>
      <span className="tnum min-w-[34px] font-mono text-sm font-medium text-ink">
        {valor.toFixed(2)}
      </span>
    </div>
  )
}
