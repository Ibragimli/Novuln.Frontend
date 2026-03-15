import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MainLayout from './layouts/MainLayout'
import Onboarding from './pages/Onboarding/Onboarding'
import ScanProgress from './pages/ScanProgress/ScanProgress'
import CyberGap from './pages/CyberGap/CyberGap'
import AttackPath from './pages/AttackPath/AttackPath'
import FixPlan from './pages/FixPlan/FixPlan'
import Report from './pages/Report/Report'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<MainLayout />}>
            <Route path="/scan" element={<ScanProgress />} />
            <Route path="/gaps" element={<CyberGap />} />
            <Route path="/attack" element={<AttackPath />} />
            <Route path="/fixes" element={<FixPlan />} />
            <Route path="/report" element={<Report />} />
          </Route>
          <Route path="*" element={<Navigate to="/onboarding" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App