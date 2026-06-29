/**
 * Compact stat card used across module list pages (Inventario, Sales, etc).
 *
 *   <StatCard
 *     icon={Package}
 *     label="Total insumos"
 *     value={42}
 *     accent="#3b82f6"
 *   />
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  accent = '#527d36',
  hint,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  accent?: string
  hint?: string
}) {
  return (
    <div className="kpi-card group">
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500"
        style={{ background: accent }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
            boxShadow: `0 8px 20px -4px ${accent}55`,
          }}
        >
          <Icon size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {hint && <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{hint}</p>}
        </div>
      </div>
    </div>
  )
}
