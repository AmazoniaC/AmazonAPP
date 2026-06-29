import { ReactNode } from 'react'

/**
 * Modern page header used across modules.
 *
 *   <PageHeader
 *     icon={Package}
 *     title="Inventario"
 *     subtitle="Gestión de insumos y materias primas"
 *     accent="rgba(82, 125, 54, 0.2)"
 *     actions={<><button>...</button></>}
 *   />
 */
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  accent = 'rgba(82, 125, 54, 0.18)',
}: {
  icon?: React.ElementType
  title: string
  subtitle?: string
  actions?: ReactNode
  accent?: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4 border border-slate-200/60 dark:border-gray-700/60"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.85) 100%)' }}
    >
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #527d36 0%, #2d4a1e 100%)',
                boxShadow: '0 8px 20px -4px rgba(45, 74, 30, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}
            >
              <Icon size={20} className="text-white" strokeWidth={2.3} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  )
}
