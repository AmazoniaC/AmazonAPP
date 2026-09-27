/**
 * Compact stat card used across module list pages (Inventario, Sales, etc).
 *
 *   <StatCard icon={Package} label="Total insumos" value={42} />
 *   <StatCard icon={AlertTriangle} label="Bajo stock" value={2} tone="critical" />
 *
 * Colour carries meaning here and nowhere else: a card is neutral unless its
 * number is actually good or actually a problem. The old `accent` prop painted
 * every card a different hue, which made a low-stock warning look exactly as
 * urgent as a headcount — it is still accepted so existing call sites keep
 * compiling, but it no longer changes how the card looks.
 */
type Tone = 'neutral' | 'positive' | 'warning' | 'critical'

const TONE: Record<Tone, { icon: string; value: string }> = {
  neutral:  { icon: 'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-300', value: '' },
  positive: { icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', value: 'text-emerald-700 dark:text-emerald-400' },
  warning:  { icon: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',        value: 'text-amber-700 dark:text-amber-400' },
  critical: { icon: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',                value: 'text-red-700 dark:text-red-400' },
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  tone?: Tone
  /** @deprecated Colour is decided by `tone` now. Kept so old callers compile. */
  accent?: string
}) {
  const t = TONE[tone]
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[var(--app-mute)]">{label}</p>
          <p className={`stat-value mt-0.5 ${t.value}`}>{value}</p>
          {hint && <p className="truncate text-xs text-[var(--app-mute)]">{hint}</p>}
        </div>
      </div>
    </div>
  )
}
