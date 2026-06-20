import { useState, useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface Props {
  archivo: File | null
  onFile: (file: File) => void
  onClear: () => void
}

export default function Dropzone({ archivo, onFile, onClear }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !archivo && inputRef.current?.click()}
      role="button"
      tabIndex={archivo ? -1 : 0}
      onKeyDown={(e) => { if (!archivo && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click() }}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-8 py-16 text-center transition ${
        archivo
          ? 'cursor-default border-cobalt/40 bg-cobalt-wash/40'
          : dragOver
          ? 'cursor-copy border-cobalt bg-cobalt-wash/60'
          : 'cursor-pointer border-mist bg-paper hover:border-cobalt/50'
      }`}
    >
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleChange} />

      {archivo ? (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cobalt-wash">
            <FileText className="h-7 w-7 text-cobalt" />
          </div>
          <div>
            <p className="font-medium text-ink">{archivo.name}</p>
            <p className="mt-1 font-mono text-xs text-steel">{(archivo.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            aria-label="Quitar archivo"
            className="absolute right-4 top-4 rounded-md p-1.5 text-steel transition hover:bg-mist hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${dragOver ? 'bg-cobalt-wash' : 'border border-mist bg-card'}`}>
            <Upload className={`h-7 w-7 transition-colors ${dragOver ? 'text-cobalt' : 'text-steel'}`} />
          </div>
          <div>
            <p className="font-medium text-ink">
              {dragOver ? 'Suelta el archivo aquí' : 'Arrastra tu CSV aquí'}
            </p>
            <p className="mt-1 text-sm text-steel">o haz clic para seleccionarlo</p>
            <p className="mt-3 inline-block rounded-full bg-paper px-3 py-1 font-mono text-xs text-steel">.csv</p>
          </div>
        </>
      )}
    </div>
  )
}
