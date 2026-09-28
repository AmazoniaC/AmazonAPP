import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { CompanySettings } from '../types'
import { defaultCompanySettings } from '../defaults'
import { lsSet } from '../persist'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface SettingsSlice {
  companySettings: CompanySettings
  saveCompanySettings: (s: CompanySettings) => Promise<void>
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  companySettings: defaultCompanySettings,

  saveCompanySettings: async (settings) => {
    await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) })
    lsSet('erp_logo', settings.logo)
    set({ companySettings: settings })
    toast.success('Configuración guardada')
  },
})
