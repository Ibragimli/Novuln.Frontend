import { create } from 'zustand'

export const useAlertStore = create((set) => ({
  alerts: [],
  unreadCount: 0,
  acknowledgedIds: [],
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts], unreadCount: s.unreadCount + 1 })),
  acknowledge: (id) => set((s) => ({
    acknowledgedIds: [...s.acknowledgedIds, id],
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
}))