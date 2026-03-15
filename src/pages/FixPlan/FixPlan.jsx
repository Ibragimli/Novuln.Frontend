import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, Switch, Progress, Spin } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClockCircleOutlined, ApartmentOutlined, FilePdfOutlined,
  CheckCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { useScanStore } from '../../store/scanStore'
import { getFixPlan } from '../../services/api'

const SEVERITY_COLOR = { Critical: '#ff4d4f', High: '#fa8c16', Medium: '#fadb14', Low: '#52c41a' }

// ── Fix Card ───────────────────────────────────────────────
function FixCard({ fix, simulated, onToggle }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: simulated ? '#0d1f0d' : '#141414',
        borderRadius: 12,
        border: `1px solid ${simulated ? '#274916' : '#1f1f1f'}`,
        borderLeft: `4px solid ${simulated ? '#52c41a' : SEVERITY_COLOR[fix.severity] || '#888'}`,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'background 0.3s',
      }}
    >
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 16px', cursor: 'pointer' }}>

        {/* Row 1: severity + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Tag color={SEVERITY_COLOR[fix.severity]} style={{ margin: 0, fontWeight: 700, fontSize: 11 }}>
            {fix.severity}
          </Tag>
          <span style={{
            color: simulated ? '#52c41a' : '#fff',
            fontWeight: 600, fontSize: 14,
            textDecoration: simulated ? 'line-through' : 'none',
            flex: 1,
          }}>
            {simulated && '✅ '}{fix.title}
          </span>
          {fix.blocksOptimalPath && (
            <Tag color="red" style={{ fontSize: 10, margin: 0 }}>Blocks Optimal Path</Tag>
          )}
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} style={{ color: '#555', fontSize: 18, flexShrink: 0 }}>›</motion.span>
        </div>

        {/* Row 2: metrics + simulate toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: '#888', fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 3 }} />{fix.fixHours}h
            </span>
            <span style={{ color: '#888', fontSize: 12 }}>
              <ApartmentOutlined style={{ marginRight: 3 }} />{fix.eliminatedPaths} paths
            </span>
            <span style={{ color: '#1668dc', fontSize: 12, fontWeight: 600 }}>
              <ThunderboltOutlined style={{ marginRight: 3 }} />{parseFloat(fix.impactPercent || 0).toFixed(1)}% impact
            </span>
            {fix.roiScore != null && (
              <span style={{ color: '#52c41a', fontSize: 12 }}>
                ROI: {parseFloat(fix.roiScore).toFixed(1)}
              </span>
            )}
          </div>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#666', fontSize: 11 }}>Simulate</span>
            <Switch size="small" checked={simulated} onChange={onToggle}
              style={{ background: simulated ? '#52c41a' : undefined }} />
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderTop: '1px solid #1f1f1f' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>

                {/* Steps */}
                <div>
                  <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Fix Steps</div>
                  {fix.steps?.length > 0 ? fix.steps.map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '8px 10px',
                        background: simulated ? '#0d1f0d' : '#1a1a1a',
                        borderRadius: 6, marginBottom: 6, border: '1px solid #2a2a2a',
                      }}>
                      <CheckCircleOutlined style={{ color: simulated ? '#52c41a' : '#555', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ color: '#ccc', fontSize: 12, lineHeight: 1.5 }}>{step}</span>
                    </motion.div>
                  )) : (
                    <div style={{ color: '#444', fontSize: 12 }}>No steps provided</div>
                  )}
                </div>

                {/* Attack graph preview */}
                <div style={{ background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a', padding: 14 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>Attack Graph Preview</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    {['INTERNET', 'TARGET', 'INTERNAL', 'CROWN'].map((node, i, arr) => (
                      <div key={node} style={{ width: '100%', textAlign: 'center' }}>
                        <div style={{
                          padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#fff',
                          background: simulated && i === 1 ? '#162312' : '#1a1a1a',
                          border: `1px solid ${simulated && i === 1 ? '#52c41a' : '#2a2a2a'}`,
                          textDecoration: simulated && i === 1 ? 'line-through' : 'none',
                        }}>
                          {node}
                        </div>
                        {i < arr.length - 1 && (
                          <div style={{ color: simulated && i === 1 ? '#52c41a' : '#ff4d4f', fontSize: 16, lineHeight: '14px' }}>
                            {simulated && i === 1 ? '✕' : '↓'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {simulated && (
                    <div style={{ marginTop: 10, padding: 8, background: '#0d1f0d', borderRadius: 6, color: '#52c41a', fontSize: 11, textAlign: 'center' }}>
                      ✅ Path blocked
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Empty / Error state ────────────────────────────────────
function EmptyState({ scanId, onRetry }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔧</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {scanId ? 'Fix Plan Not Ready' : 'No Scan Found'}
        </div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          {scanId
            ? 'The fix plan is still being generated. Please wait for the scan to complete.'
            : 'No active scan ID found. Please start a new scan first.'}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {scanId && <Button type="primary" onClick={onRetry}>Retry</Button>}
          <Button onClick={() => navigate('/onboarding')}>Start New Scan</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function FixPlan() {
  const navigate  = useNavigate()
  const { scanId } = useScanStore()

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [fixes,       setFixes]       = useState([])
  const [totals,      setTotals]      = useState({ fixHours: 0, eliminated: 0, impact: 0 })
  const [simulated,   setSimulated]   = useState({})
  const [retryCount,  setRetryCount]  = useState(0)

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (!scanId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    getFixPlan(scanId)
      .then(data => {
        if (data.fixes?.length) {
          setFixes(data.fixes.map((f, i) => ({
            id:               f.gapId || String(i),
            gapId:            f.gapId,
            title:            f.title,
            severity:         f.severity,
            fixHours:         f.fixHours         || 0,
            eliminatedPaths:  f.eliminatedPaths  || 0,
            impactPercent:    f.impactPercent     || 0,
            roiScore:         f.roiScore,
            blocksOptimalPath:f.blocksOptimalPath || false,
            steps:            f.steps            || [],
          })))
        }
        setTotals({
          fixHours:  data.totalFixHours   || 0,
          eliminated:data.totalEliminated || 0,
          impact:    data.totalImpact     || 0,
        })
      })
      .catch(err => {
        console.error('Fix plan error:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [scanId, retryCount])

  // ── Simulation calculations ──
  const simulatedCount  = Object.values(simulated).filter(Boolean).length
  const simulatedHours  = fixes.filter(f => simulated[f.id]).reduce((a, f) => a + (f.fixHours || 0), 0)
  const simulatedImpact = Math.min(
    fixes.filter(f => simulated[f.id]).reduce((a, f) => a + (parseFloat(f.impactPercent) || 0), 0),
    100
  )
  const simulatedPaths = fixes.filter(f => simulated[f.id]).reduce((a, f) => a + (f.eliminatedPaths || 0), 0)

  // ── Loading ──
  if (loading) return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#888' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: 14 }}>Loading fix plan...</div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#444' }}>Scan ID: {scanId?.slice(0, 16)}...</div>
      </div>
    </div>
  )

  // ── No data ──
  if (!scanId || (error && fixes.length === 0)) {
    return <EmptyState scanId={scanId} onRetry={() => setRetryCount(c => c + 1)} />
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>🔧 Fix Plan</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            ROI-sorted — least effort, most impact first
            {error && <Tag color="orange" style={{ marginLeft: 8, fontSize: 10 }}>Partial data</Tag>}
          </div>
        </div>
        <Button type="primary" icon={<FilePdfOutlined />} onClick={() => navigate('/report')}>
          PDF Export
        </Button>
      </div>

      {/* Summary banner */}
      <div style={{ background: '#141414', borderRadius: 12, padding: '16px', border: '1px solid #1f1f1f', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Total Duration</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
              {totals.fixHours}<span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>hours</span>
            </div>
          </div>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Risk Reduction</div>
            <div style={{ color: '#52c41a', fontWeight: 800, fontSize: 22 }}>
              {parseFloat(totals.impact).toFixed(1)}<span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>%</span>
            </div>
          </div>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Paths Eliminated</div>
            <div style={{ color: '#fa8c16', fontWeight: 800, fontSize: 22 }}>{totals.eliminated}</div>
          </div>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Simulated</div>
            <div style={{ color: '#1668dc', fontWeight: 800, fontSize: 22 }}>
              {simulatedCount}<span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>fixes</span>
            </div>
          </div>
        </div>

        {/* Simulation progress */}
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 12 }}>Simulation Result</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#fa8c16', fontSize: 12 }}>{simulatedHours} hours</span>
              <span style={{ color: '#52c41a', fontSize: 12 }}>{simulatedImpact.toFixed(1)}% impact</span>
              <span style={{ color: '#1668dc', fontSize: 12 }}>{simulatedPaths} paths blocked</span>
            </div>
          </div>
          <Progress
            percent={simulatedImpact}
            strokeColor={simulatedImpact >= 70 ? '#52c41a' : simulatedImpact >= 40 ? '#fa8c16' : '#ff4d4f'}
            trailColor="#2a2a2a"
            showInfo={false}
            style={{ margin: 0 }}
          />
        </div>
      </div>

      {/* Fix cards */}
      <div>
        {fixes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', padding: '60px 0', fontSize: 13 }}>
            No fixes found
          </div>
        ) : (
          fixes.map(fix => (
            <FixCard
              key={fix.id}
              fix={fix}
              simulated={!!simulated[fix.id]}
              onToggle={() => setSimulated(s => ({ ...s, [fix.id]: !s[fix.id] }))}
            />
          ))
        )}
      </div>

      {/* CTA */}
      {fixes.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 24 }}>
          <Button type="primary" size="large" block icon={<FilePdfOutlined />}
            onClick={() => navigate('/report')}
            style={{ maxWidth: 400, height: 46, fontSize: 15 }}>
            Get PDF Report →
          </Button>
        </div>
      )}
    </div>
  )
}