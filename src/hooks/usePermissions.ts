import { useStore } from '../store/useStore'

// Every module that actually gates an edit/delete action somewhere in the
// app. Until now, five of these (dispatch, quotations, purchases, expenses,
// pipeline) didn't have their own entry — their pages borrowed the closest
// unrelated bucket instead (Expenses/Dispatch checked 'sales', Pipeline
// checked 'crm', PurchaseOrders checked 'supplies'), so toggling e.g.
// "Ventas can edit Sales" silently also controlled whether Ventas could
// edit Quotations, with no way to configure them separately.
export type AppModule =
  | 'supplies' | 'products' | 'customers' | 'sales' | 'production' | 'crm'
  | 'dispatch' | 'quotations' | 'purchases' | 'expenses' | 'pipeline'

export const ALL_MODULES: AppModule[] = [
  'supplies', 'products', 'customers', 'sales', 'production', 'crm',
  'dispatch', 'quotations', 'purchases', 'expenses', 'pipeline',
]

export const MODULE_LABELS: Record<AppModule, string> = {
  supplies: 'Insumos', products: 'Catálogo', customers: 'Clientes',
  sales: 'Ventas', production: 'Producción', crm: 'CRM',
  dispatch: 'Despachos', quotations: 'Cotizaciones', purchases: 'Compras',
  expenses: 'Gastos', pipeline: 'Pipeline',
}

export interface RolePerms {
  edit:   AppModule[]
  delete: AppModule[]
}

// Starting point for a fresh install, and the fallback while companySettings
// hasn't loaded yet. Admin is always full access. The default edit set for
// each role mirrors which modules that role can even see in the sidebar
// (config/modules.ts), and delete defaults to Administrador-only — both
// adjustable afterward from Configuración → Seguridad.
export const DEFAULT_ROLE_PERMS: Record<string, RolePerms> = {
  Administrador: {
    edit:   [...ALL_MODULES],
    delete: [...ALL_MODULES],
  },
  Producción: {
    edit:   ['production', 'supplies', 'dispatch'],
    delete: [],
  },
  Ventas: {
    edit:   ['sales', 'customers', 'crm', 'dispatch', 'quotations', 'pipeline'],
    delete: ['crm'],
  },
  Inventario: {
    edit:   ['supplies', 'products', 'purchases'],
    delete: [],
  },
  Contabilidad: {
    edit:   ['purchases', 'expenses'],
    delete: [],
  },
}

export function usePermissions() {
  const { user, companySettings } = useStore()
  const role = user?.role ?? 'Contabilidad'
  const allRoles = companySettings.rolePermissions ?? DEFAULT_ROLE_PERMS
  const perms = allRoles[role] ?? { edit: [], delete: [] }

  return {
    role,
    canEdit:   (module: AppModule) => perms.edit.includes(module),
    canDelete: (module: AppModule) => perms.delete.includes(module),
    // Expose the full map for the settings matrix
    allRoles,
  }
}
