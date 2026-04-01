import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLORS = {
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
}

const ICON_COLORS = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

// Global toast state
let listeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function notify(toasts: Toast[]) {
  listeners.forEach(l => l(toasts))
}

export const toast = {
  success: (message: string, duration = 3000) => {
    const t: Toast = { id: crypto.randomUUID(), type: 'success', message, duration }
    toasts = [...toasts, t]
    notify(toasts)
  },
  error: (message: string, duration = 5000) => {
    const t: Toast = { id: crypto.randomUUID(), type: 'error', message, duration }
    toasts = [...toasts, t]
    notify(toasts)
  },
  warning: (message: string, duration = 4000) => {
    const t: Toast = { id: crypto.randomUUID(), type: 'warning', message, duration }
    toasts = [...toasts, t]
    notify(toasts)
  },
  info: (message: string, duration = 3000) => {
    const t: Toast = { id: crypto.randomUUID(), type: 'info', message, duration }
    toasts = [...toasts, t]
    notify(toasts)
  },
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false)
  const Icon = ICONS[t.type]

  useEffect(() => {
    if (!t.duration) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(t.id), 200)
    }, t.duration)
    return () => clearTimeout(timer)
  }, [t.id, t.duration, onRemove])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm max-w-sm w-full transition-all duration-200 ${
        COLORS[t.type]
      } ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
      style={{ animation: 'toastIn 0.25s ease-out' }}
    >
      <Icon size={18} className={`${ICON_COLORS[t.type]} flex-shrink-0`} />
      <p className="text-sm font-medium flex-1">{t.message}</p>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onRemove(t.id), 200) }}
        className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(l => l !== setItems) }
  }, [])

  const remove = useCallback((id: string) => {
    toasts = toasts.filter(t => t.id !== id)
    notify(toasts)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={remove} />
        </div>
      ))}
    </div>
  )
}
