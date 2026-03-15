import { create } from 'zustand'

export const useScanStore = create((set) => ({
  domain:          '',
  scanId:          null,
  scanStatus:      'idle',
  discoveredNodes: [],
  progress:        {},
  setDomain:       (domain)     => set({ domain }),
  setScanId:       (scanId)     => set({ scanId }),
  setScanStatus:   (scanStatus) => set({ scanStatus }),
  addNode:         (node)       => set((s) => ({ discoveredNodes: [...s.discoveredNodes, node] })),
  updateProgress:  (source, data) => set((s) => ({ progress: { ...s.progress, [source]: data } })),
  reset:           () => set({ domain: '', scanId: null, scanStatus: 'idle', discoveredNodes: [], progress: {} }),
}))