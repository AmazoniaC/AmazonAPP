import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { Customer, CustomerActivity, Opportunity } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface CrmSlice {
  customers:  Customer[]
  activities: CustomerActivity[]
  opportunities: Opportunity[]

  addCustomer:  (c: Customer)  => Promise<void>
  updateCustomer:(c: Customer) => Promise<void>
  deleteCustomer:(id: string)  => Promise<void>
  addActivity:      (a: CustomerActivity) => Promise<void>
  updateActivity:   (a: CustomerActivity) => Promise<void>
  deleteActivity:   (id: string)          => Promise<void>
  addOpportunity:    (o: Opportunity) => Promise<void>
  updateOpportunity: (o: Opportunity) => Promise<void>
  deleteOpportunity: (id: string)     => Promise<void>
}

export const createCrmSlice: StateCreator<AppState, [], [], CrmSlice> = (set) => ({
  customers:  [],
  activities: [],
  opportunities: [],

  addCustomer: async (customer) => {
    await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(customer) })
    set((s) => ({ customers: [...s.customers, customer] }))
    toast.success('Cliente creado correctamente')
  },
  updateCustomer: async (customer) => {
    await apiFetch(`/api/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify(customer) })
    set((s) => ({ customers: s.customers.map((x) => x.id === customer.id ? customer : x) }))
    toast.success('Cliente actualizado')
  },
  deleteCustomer: async (id) => {
    await apiFetch(`/api/customers/${id}`, { method: 'DELETE' })
    set((s) => ({ customers: s.customers.filter((x) => x.id !== id) }))
    toast.success('Cliente eliminado')
  },

  addActivity: async (activity) => {
    await apiFetch('/api/customer-activities', { method: 'POST', body: JSON.stringify(activity) })
    set((s) => ({ activities: [activity, ...s.activities] }))
  },
  updateActivity: async (activity) => {
    await apiFetch(`/api/customer-activities/${activity.id}`, { method: 'PUT', body: JSON.stringify(activity) })
    set((s) => ({ activities: s.activities.map((x) => x.id === activity.id ? activity : x) }))
  },
  deleteActivity: async (id) => {
    await apiFetch(`/api/customer-activities/${id}`, { method: 'DELETE' })
    set((s) => ({ activities: s.activities.filter((x) => x.id !== id) }))
  },

  addOpportunity: async (o) => {
    await apiFetch('/api/opportunities', { method: 'POST', body: JSON.stringify(o) })
    set((s) => ({ opportunities: [o, ...s.opportunities] }))
    toast.success('Oportunidad creada')
  },
  updateOpportunity: async (o) => {
    await apiFetch(`/api/opportunities/${o.id}`, { method: 'PUT', body: JSON.stringify(o) })
    set((s) => ({ opportunities: s.opportunities.map((x) => x.id === o.id ? o : x) }))
    toast.success('Oportunidad actualizada')
  },
  deleteOpportunity: async (id) => {
    await apiFetch(`/api/opportunities/${id}`, { method: 'DELETE' })
    set((s) => ({ opportunities: s.opportunities.filter((x) => x.id !== id) }))
    toast.success('Oportunidad eliminada')
  },
})
