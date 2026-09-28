import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { Dispatch } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface DispatchSlice {
  dispatches: Dispatch[]
  addDispatch:    (d: Dispatch) => Promise<void>
  updateDispatch: (d: Dispatch) => Promise<void>
  deleteDispatch: (id: string)  => Promise<void>
}

export const createDispatchSlice: StateCreator<AppState, [], [], DispatchSlice> = (set) => ({
  dispatches: [],

  addDispatch: async (d) => {
    await apiFetch('/api/dispatches', { method: 'POST', body: JSON.stringify(d) })
    set((s) => ({ dispatches: [d, ...s.dispatches] }))
    toast.success('Despacho creado')
  },
  updateDispatch: async (d) => {
    await apiFetch(`/api/dispatches/${d.id}`, { method: 'PUT', body: JSON.stringify(d) })
    set((s) => ({ dispatches: s.dispatches.map((x) => x.id === d.id ? d : x) }))
    toast.success('Despacho actualizado')
  },
  deleteDispatch: async (id) => {
    await apiFetch(`/api/dispatches/${id}`, { method: 'DELETE' })
    set((s) => ({ dispatches: s.dispatches.filter((x) => x.id !== id) }))
    toast.success('Despacho eliminado')
  },
})
