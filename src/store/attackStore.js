import { create } from 'zustand'

export const useAttackStore = create((set) => ({
  nodes: [],
  edges: [],
  optimalPath: [],
  chokepoints: [],
  blastRadius: [],
  setGraph: (nodes, edges) => set({ nodes, edges }),
  setOptimalPath: (optimalPath) => set({ optimalPath }),
  setChokepoints: (chokepoints) => set({ chokepoints }),
  setBlastRadius: (blastRadius) => set({ blastRadius }),
}))