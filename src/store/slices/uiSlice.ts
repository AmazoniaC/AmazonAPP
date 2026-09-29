import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import { getDarkMode } from '../persist'

export interface UiSlice {
  /** Desktop sidebar: expanded (labels + groups) vs collapsed (icon rail). */
  sidebarOpen: boolean
  darkMode:    boolean
  setSidebarOpen: (v: boolean) => void
  toggleDarkMode: () => void
}

const initialDark = getDarkMode()
if (initialDark) document.documentElement.classList.add('dark')

// Defaults to expanded; only remembers an explicit collapse so a first visit
// still shows labels.
const initialSidebarOpen = localStorage.getItem('erp_sidebar_open') !== 'false'

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  sidebarOpen: initialSidebarOpen,
  darkMode:    initialDark,

  setSidebarOpen: (v) => {
    localStorage.setItem('erp_sidebar_open', String(v))
    set({ sidebarOpen: v })
  },

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
