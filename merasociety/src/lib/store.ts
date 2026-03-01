import { create } from 'zustand'
import type { Member, Society } from './types'

interface AppStore {
  // Auth state
  currentMember: Member | null
  currentSociety: Society | null
  isLoading: boolean

  // Actions
  setCurrentMember: (member: Member | null) => void
  setCurrentSociety: (society: Society | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentMember: null,
  currentSociety: null,
  isLoading: true,

  setCurrentMember: (member) => set({ currentMember: member }),
  setCurrentSociety: (society) => set({ currentSociety: society }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({
    currentMember: null,
    currentSociety: null,
    isLoading: false,
  }),
}))
