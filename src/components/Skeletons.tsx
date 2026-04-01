export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden animate-pulse">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-gray-700 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-3 bg-slate-200 dark:bg-gray-700 rounded ${i === 0 ? 'w-16' : i === cols - 1 ? 'w-12 ml-auto' : 'w-24'}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-slate-50 dark:border-gray-700/50 px-4 py-4 flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-3 bg-slate-100 dark:bg-gray-700/60 rounded ${j === 0 ? 'w-20' : j === cols - 1 ? 'w-16 ml-auto' : 'w-28'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-gray-700" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-6 w-24 bg-slate-100 dark:bg-gray-700/60 rounded" />
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="h-4 w-32 bg-slate-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-100 dark:bg-gray-700/60 rounded" />
            </div>
            <div className="h-5 w-14 bg-slate-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 dark:bg-gray-700/60 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 dark:bg-gray-700/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton count={4} />
      <div className="card p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-9 flex-1 bg-slate-100 dark:bg-gray-700/60 rounded-lg" />
          <div className="h-9 w-32 bg-slate-100 dark:bg-gray-700/60 rounded-lg" />
          <div className="h-9 w-36 bg-slate-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
      <TableSkeleton />
    </div>
  )
}
