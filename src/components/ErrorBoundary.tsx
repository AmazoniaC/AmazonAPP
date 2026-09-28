import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

/**
 * Generic render-error boundary. Rendered per-route (see Layout.tsx) so a
 * crash in one page doesn't take down the header/nav along with it — the
 * caller resets it on navigation by remounting with a `key` (e.g. the
 * pathname), since getDerivedStateFromError alone never clears on its own.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold">Algo salió mal</div>
          <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md text-center">
            {this.state.error?.message || 'Error inesperado en la aplicación'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="px-4 py-2 bg-amazonia-600 text-white rounded-lg hover:bg-amazonia-700 transition-colors text-sm"
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
