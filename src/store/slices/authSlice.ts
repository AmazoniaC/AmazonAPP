import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { AuthUser } from '../types'
import { getAuth } from '../persist'

export interface AuthSlice {
  isAuthenticated: boolean
  user: AuthUser | null
  lastActivity: number
  login:        (user: AuthUser) => void
  logout:       () => void
  touchSession: () => void
}

const initialAuth = getAuth()

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  isAuthenticated: initialAuth.isAuthenticated,
  user:            initialAuth.user,
  lastActivity:    Date.now(),

  login: (user) => {
    localStorage.setItem('erp_auth', JSON.stringify(user))
    set({ isAuthenticated: true, user, lastActivity: Date.now() })
  },

  logout: () => {
    localStorage.removeItem('erp_auth')
    set({ isAuthenticated: false, user: null, dataLoaded: false, lastActivity: 0 })
  },

  touchSession: () => set({ lastActivity: Date.now() }),
})
