import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { Expense, Return } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface FinanceSlice {
  expenses: Expense[]
  returns:  Return[]

  addExpense:     (e: Expense)  => Promise<void>
  updateExpense:  (e: Expense)  => Promise<void>
  deleteExpense:  (id: string)  => Promise<void>
  materializeRecurringExpenses: () => Promise<{ created: number }>
  addReturn:    (r: Return) => Promise<void>
  updateReturn: (r: Return) => Promise<void>
  deleteReturn: (id: string) => Promise<void>
}

export const createFinanceSlice: StateCreator<AppState, [], [], FinanceSlice> = (set, get) => ({
  expenses: [],
  returns:  [],

  addExpense: async (e) => {
    await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(e) })
    set((s) => ({ expenses: [e, ...s.expenses] }))
    toast.success('Gasto registrado')
  },
  updateExpense: async (e) => {
    await apiFetch(`/api/expenses/${e.id}`, { method: 'PUT', body: JSON.stringify(e) })
    set((s) => ({ expenses: s.expenses.map((x) => x.id === e.id ? e : x) }))
    toast.success('Gasto actualizado')
  },
  deleteExpense: async (id) => {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
    set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) }))
    toast.success('Gasto eliminado')
  },
  materializeRecurringExpenses: async () => {
    const s = get()
    const todayStr = new Date().toISOString().split('T')[0]

    // Compute the next occurrence date from a base ISO date + period.
    const computeNext = (baseISO: string, period: Expense['period']): string => {
      const d = new Date(baseISO + 'T12:00:00')
      switch (period) {
        case 'weekly':
          d.setDate(d.getDate() + 7)
          break
        case 'annual':
          d.setFullYear(d.getFullYear() + 1)
          break
        case 'monthly':
        default:
          d.setMonth(d.getMonth() + 1)
          break
      }
      return d.toISOString().split('T')[0]
    }

    // Recipe key groups occurrences of the same recurring template.
    const key = (e: Expense) =>
      `${e.category}|${e.description.trim().toLowerCase()}|${(e.beneficiary ?? '').trim().toLowerCase()}|${e.amount}`

    // Group all expenses by recipe.
    const groups = new Map<string, Expense[]>()
    for (const e of s.expenses) {
      const k = key(e)
      const arr = groups.get(k) ?? []
      arr.push(e)
      groups.set(k, arr)
    }

    const toCreate: Expense[] = []
    for (const [, occs] of groups) {
      // Only materialize for groups whose *latest* entry is flagged recurring.
      const sorted = [...occs].sort((a, b) => a.date.localeCompare(b.date))
      const latest = sorted[sorted.length - 1]
      if (!latest.recurring) continue
      const period: Expense['period'] =
        latest.period && latest.period !== 'once' ? latest.period : 'monthly'

      const expectedNext = computeNext(latest.date, period)
      // Only if the expected date is already due.
      if (todayStr < expectedNext) continue
      // Skip if an occurrence at or after expectedNext already exists.
      const alreadyMaterialized = sorted.some((o) => o.date >= expectedNext)
      if (alreadyMaterialized) continue

      const noteBase = latest.notes ? `${latest.notes} ` : ''
      const newExpense: Expense = {
        id: `exp${Date.now()}${Math.floor(Math.random() * 10000)}`,
        date: expectedNext,
        category: latest.category,
        description: latest.description,
        amount: latest.amount,
        beneficiary: latest.beneficiary,
        paymentMethod: latest.paymentMethod,
        notes: `${noteBase}(Generado automáticamente)`.trim(),
        recurring: true,
        period,
      }
      toCreate.push(newExpense)
    }

    for (const exp of toCreate) {
      try {
        await get().addExpense(exp)
      } catch (err) {
        console.error('No se pudo materializar gasto recurrente:', err)
      }
    }
    return { created: toCreate.length }
  },

  // ── Returns ─────────────────────────────────────────────────────────────
  addReturn: async (r) => {
    await apiFetch('/api/returns', { method: 'POST', body: JSON.stringify(r) })
    set((st) => ({ returns: [r, ...st.returns] }))
    toast.success('Devolución registrada')
  },
  updateReturn: async (r) => {
    await apiFetch(`/api/returns/${r.id}`, { method: 'PUT', body: JSON.stringify(r) })
    set((st) => ({ returns: st.returns.map((x) => x.id === r.id ? r : x) }))
    toast.success('Devolución actualizada')
  },
  deleteReturn: async (id) => {
    await apiFetch(`/api/returns/${id}`, { method: 'DELETE' })
    set((st) => ({ returns: st.returns.filter((x) => x.id !== id) }))
    toast.success('Devolución eliminada')
  },
})
