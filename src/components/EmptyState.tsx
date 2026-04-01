interface Props {
  icon: React.ElementType
  title: string
  description: string
  action?: string
  onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, action, onAction }: Props) {
  return (
    <div className="card py-16 px-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-gray-700 flex items-center justify-center">
        <Icon size={28} className="text-slate-300 dark:text-gray-500" />
      </div>
      <h3 className="text-sm font-bold text-slate-700 dark:text-gray-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 dark:text-gray-500 max-w-xs mx-auto mb-5">{description}</p>
      {action && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}
