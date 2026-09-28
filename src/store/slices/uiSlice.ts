import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import { getDarkMode } from '../persist'

export interface UiSlice {
  sidebarOpen: boolean
  darkMode:    boolean
  setSidebarOpen: (v: boolean) => void
  toggleDarkMode: () => void
}

const initialDark = getDarkMode()
if (initialDark) document.documentElement.classList.add('dark')

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  sidebarOpen: true,
  darkMode:    initialDark,

  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('erp_theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('erp_theme', 'light')
      }
      return { darkMode: next }
    }),
})
