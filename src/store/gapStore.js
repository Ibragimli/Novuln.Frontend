import { create } from 'zustand'

export const useGapStore = create((set) => ({
  gaps: [],
  nistScores: {},
  riskScore: 0,
  sectorBenchmark: [],
  setGaps: (gaps) => set({ gaps }),
  setNistScores: (nistScores) => set({ nistScores }),
  setRiskScore: (riskScore) => set({ riskScore }),
  setSectorBenchmark: (sectorBenchmark) => set({ sectorBenchmark }),
}))