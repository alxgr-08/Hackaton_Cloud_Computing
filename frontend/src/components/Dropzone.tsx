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
      className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all duration-200 ${
        archivo
          ? 'border-blue-300 bg-blue-50/60 cursor-default'
          : dragOver
          ? 'border-blue-500 bg-blue-50 scale-[1.01] cursor-copy'
          : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleChange}
      />

      {archivo ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{archivo.name}</p>
            <p className="mt-1 text-sm text-slate-500">{(archivo.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
            dragOver ? 'bg-blue-100' : 'bg-white border border-slate-200'
          }`}>
            <Upload className={`h-8 w-8 transition-colors ${dragOver ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="font-semibold text-slate-700">
              {dragOver ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV aquí'}
            </p>
            <p className="mt-1 text-sm text-slate-500">o haz clic para seleccionarlo</p>
            <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              Formato: .csv
            </p>
          </div>
        </>
      )}
    </div>
  )
}
