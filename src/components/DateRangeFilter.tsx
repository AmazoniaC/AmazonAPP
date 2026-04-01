import { useState } from 'react'
import { Calendar, X } from 'lucide-react'

interface Props {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

const PRESETS: { label: string; days: number }[] = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().split('T')[0]
}

export default function DateRangeFilter({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const hasFilter = from || to

  const clear = () => { onChange('', ''); setOpen(false) }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`btn btn-secondary btn-sm flex items-center gap-1.5 ${hasFilter ? 'ring-2 ring-amazonia-500' : ''}`}
      >
        <Calendar size={14} />
        {hasFilter ? (
          <span className="text-xs">
            {from && to ? `${from} — ${to}` : from ? `Desde ${from}` : `Hasta ${to}`}
          </span>
        ) : (
          <span>Fechas</span>
        )}
        {hasFilter && (
          <button onClick={e => { e.stopPropagation(); clear() }} className="ml-1 hover:text-red-500">
            <X size={12} />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl z-50 p-4 w-72 animate-fadeIn">
          <div className="flex items-center gap-2 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { onChange(daysAgo(p.days), today); setOpen(false) }}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-amazonia-100 dark:hover:bg-amazonia-900/30 hover:text-amazonia-700 dark:hover:text-amazonia-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Desde</label>
              <input type="date" className="input text-xs" value={from} onChange={e => onChange(e.target.value, to)} />
            </div>
            <div>
              <label className="label text-xs">Hasta</label>
              <input type="date" className="input text-xs" value={to} onChange={e => onChange(from, e.target.value)} />
            </div>
          </div>
          <div className="flex justify-between mt-3">
            <button onClick={clear} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">Limpiar</button>
            <button onClick={() => setOpen(false)} className="text-xs text-amazonia-600 dark:text-amazonia-400 font-medium">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  )
}
