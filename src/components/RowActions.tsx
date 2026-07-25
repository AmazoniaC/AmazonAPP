// ─────────────────────────────────────────────────────────────────────────────
// Row actions — one visible primary action plus an overflow menu.
//
// Replaces rows of up to ten coloured icon buttons: the colours competed with
// each other and none of them meant anything. Here colour is spent only on the
// destructive item, and everything else reads as plain text with an icon.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Loader2 } from 'lucide-react'

export interface RowAction {
  label: string
  icon?: React.ElementType
  onClick: () => void
  /** Red styling — reserve for actions that destroy data. */
  danger?: boolean
  disabled?: boolean
  loading?: boolean
  /** Short text shown right-aligned, e.g. an invoice number. */
  hint?: string
}

/** Falsy entries are dropped, so callers can write `cond && { … }` inline. */
type MaybeAction = RowAction | false | 0 | '' | null | undefined

export default function RowActions({
  primary, actions, align = 'right',
}: {
  primary?: { label: string; onClick: () => void }
  actions: MaybeAction[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const items = actions.filter((a): a is RowAction => Boolean(a))

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="flex items-center justify-end gap-1.5" ref={boxRef}>
      {primary && (
        <button className="btn btn-sm btn-secondary" onClick={primary.onClick}>
          {primary.label}
        </button>
      )}

      {items.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Más acciones"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors
                       hover:bg-slate-100 hover:text-slate-800 dark:text-gray-400
                       dark:hover:bg-gray-700 dark:hover:text-white">
            <MoreHorizontal size={16} />
          </button>

          {open && (
            <div
              role="menu"
              className={`absolute z-50 mt-1 w-60 overflow-hidden rounded-xl border border-slate-200
                          bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800
                          ${align === 'right' ? 'right-0' : 'left-0'}`}>
              {items.map((a) => (
                <button
                  key={a.label}
                  role="menuitem"
                  disabled={a.disabled || a.loading}
                  onClick={() => { setOpen(false); a.onClick() }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors
                              disabled:cursor-not-allowed disabled:opacity-50 ${
                    a.danger
                      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/25'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  {a.loading
                    ? <Loader2 size={15} className="flex-shrink-0 animate-spin" />
                    : a.icon && <a.icon size={15} className="flex-shrink-0 opacity-75" />}
                  <span className="flex-1">{a.label}</span>
                  {a.hint && (
                    <span className="font-mono text-[11px] text-slate-400 dark:text-gray-500">{a.hint}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
