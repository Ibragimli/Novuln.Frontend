import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { useScanStore } from '../../store/scanStore'
import { createScanSSE } from '../../services/api'

// ── Backend SSE source name → display label ────────────────
const SOURCE_CONFIG = {
  DNS:    { label: 'DNS Records',         color: '#52c41a' },
  CrtSh:  { label: 'Certificate Search',  color: '#52c41a' },
  Shodan: { label: 'Shodan Scan',         color: '#fa8c16' },
  HTTP:   { label: 'HTTP Analysis',       color: '#1668dc' },
  HIBP:   { label: 'Breach Check',        color: '#ff4d4f' },
  NVD:    { label: 'CVE Database',        color: '#ff4d4f' },
}
const SOURCE_ORDER = ['DNS', 'CrtSh', 'Shodan', 'HTTP', 'HIBP', 'NVD']

function ProgressBar({ percent, status }) {
  const color = status === 'done' ? '#52c41a' : status === 'running' ? '#1668dc' : '#2a2a2a'
  return (
    <div style={{ background: '#1f1f1f', borderRadius: 4, height: 6, overflow: 'hidden', flex: 1 }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.4 }}
        style={{ height: '100%', background: color, borderRadius: 4 }} />
    </div>
  )
}

export default function ScanProgress() {
  const navigate   = useNavigate()
  const { domain, scanId } = useScanStore()

  // ── State ──
  const [sources,     setSources]     = useState({})   // { DNS: {status, nodeCount}, ... }
  const [nodes,       setNodes]       = useState([])   // discovered node feed
  const [done,        setDone]        = useState(false)
  const [failed,      setFailed]      = useState(null) // error message
  const [elapsed,     setElapsed]     = useState(0)
  const [riskScore,   setRiskScore]   = useState(null)
  const [showNodes,   setShowNodes]   = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const timerRef = useRef(null)
  const esRef    = useRef(null)

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isDesktop = windowWidth >= 700

  // ── SSE Connection ──
  useEffect(() => {
    if (!scanId) {
      setFailed('No scan ID found. Please go back and start a new scan.')
      return
    }

    // Start elapsed timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    const es = createScanSSE(scanId)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        // ── scan_progress ──
        if (event.type === 'scan_progress') {
          const src = event.source  // "DNS", "CrtSh", etc.

          setSources(prev => ({
            ...prev,
            [src]: {
              status:    event.status === 'done' ? 'done' : 'running',
              nodeCount: event.nodeCount || prev[src]?.nodeCount || 0,
            }
          }))

          // Node feed entry
          if (event.status === 'done' && event.nodeCount) {
            const cfg = SOURCE_CONFIG[src] || { color: '#888' }
            setNodes(n => [...n, {
              id:    `${src}-${Date.now()}`,
              text:  `${src}: ${event.nodeCount} nodes found`,
              color: cfg.color,
            }])
          }
        }

        // ── whitebox_received ──
        if (event.type === 'whitebox_received') {
          setNodes(n => [...n, {
            id:    `whitebox-${Date.now()}`,
            text:  '🔒 WhiteBox agent data received',
            color: '#722ed1',
          }])
        }

        // ── scan_completed ──
        if (event.type === 'scan_completed') {
          if (event.riskScore != null) setRiskScore(event.riskScore)
          setDone(true)
          clearInterval(timerRef.current)
          es.close()
        }

        // ── scan_failed ──
        if (event.type === 'scan_failed') {
          setFailed(event.message || 'Scan failed on backend.')
          clearInterval(timerRef.current)
          es.close()
        }

      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    es.onerror = (err) => {
      console.error('SSE connection error:', err)
      // Don't immediately fail — SSE reconnects automatically
      // But if we're past 60s and still no connection, show error
    }

    return () => {
      clearInterval(timerRef.current)
      es.close()
    }
  }, [scanId])

  // ── Computed ──
  const sourceList     = SOURCE_ORDER.map(key => ({ key, ...SOURCE_CONFIG[key], ...(sources[key] || {}) }))
  const completedCount = sourceList.filter(s => s.status === 'done').length
  const criticalCount  = nodes.filter(n => n.color === '#ff4d4f').length
  const totalNodes     = sourceList.reduce((a, s) => a + (s.nodeCount || 0), 0)
  const progressPct    = (completedCount / SOURCE_ORDER.length) * 100

  // ── Error screen ──
  if (failed) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Scan Failed</div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>{failed}</div>
        <Button type="primary" onClick={() => navigate('/onboarding')}>Start New Scan</Button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ color: '#888', fontSize: 13 }}>Target: <span style={{ color: '#1668dc', fontWeight: 600 }}>{domain || '—'}</span></span>
          <span style={{ color: '#555', fontSize: 12 }}>⏱ {elapsed}s</span>
          {scanId && <span style={{ color: '#333', fontSize: 11 }}>ID: {scanId.slice(0, 12)}...</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1a', borderRadius: 20, padding: '3px 10px', border: '1px solid #2a2a2a' }}>
            <motion.div animate={{ opacity: done ? 1 : [1, 0.3, 1] }} transition={{ repeat: done ? 0 : Infinity, duration: 1.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: done ? '#52c41a' : '#1668dc' }} />
            <span style={{ color: '#888', fontSize: 11 }}>{done ? 'Completed' : 'Scanning...'}</span>
          </div>
        </div>
      </div>

      {/* Overall progress */}
      <div style={{ background: '#141414', borderRadius: 12, padding: '16px 20px', border: '1px solid #1f1f1f', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#ccc', fontSize: 13, fontWeight: 600 }}>{completedCount}/{SOURCE_ORDER.length} sources completed</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {criticalCount > 0 && <span style={{ color: '#ff4d4f', fontSize: 12 }}>⚠️ {criticalCount} critical findings</span>}
            {totalNodes > 0   && <span style={{ color: '#888', fontSize: 12 }}>{totalNodes} nodes found</span>}
            {riskScore != null && done && (
              <span style={{ color: riskScore >= 70 ? '#ff4d4f' : riskScore >= 40 ? '#fa8c16' : '#52c41a', fontSize: 12, fontWeight: 700 }}>
                Risk: {riskScore}
              </span>
            )}
          </div>
        </div>
        <div style={{ background: '#1f1f1f', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <motion.div animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }}
            style={{ height: '100%', borderRadius: 6, background: done ? '#52c41a' : 'linear-gradient(90deg, #1668dc, #722ed1)' }} />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Sources list */}
        <div style={{ background: '#141414', borderRadius: 12, padding: '20px', border: '1px solid #1f1f1f' }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 18, fontSize: 14 }}>Scan Sources</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sourceList.map(source => {
              const status  = source.status || 'waiting'
              const percent = status === 'done' ? 100 : status === 'running' ? 50 : 0
              return (
                <div key={source.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <motion.div animate={status === 'running' ? { opacity: [1, 0.3, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}
                        style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: status === 'done' ? '#52c41a' : status === 'running' ? '#1668dc' : '#2a2a2a' }} />
                      <span style={{ color: '#ccc', fontSize: 13 }}>{source.label}</span>
                      {source.nodeCount > 0 && (
                        <span style={{ color: source.color, fontSize: 11, fontWeight: 600 }}>{source.nodeCount}</span>
                      )}
                    </div>
                    <Tag style={{ margin: 0, fontSize: 11, flexShrink: 0 }}
                      color={status === 'done' ? 'success' : status === 'running' ? 'processing' : 'default'}>
                      {status === 'done' ? 'Completed' : status === 'running' ? 'Running...' : 'Waiting'}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ProgressBar percent={percent} status={status} />
                    <span style={{ color: '#444', fontSize: 11, width: 30, textAlign: 'right' }}>{percent}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Done */}
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
                <div style={{ padding: 14, background: '#162312', borderRadius: 8, border: '1px solid #274916', marginBottom: 14, color: '#52c41a', fontWeight: 600, fontSize: 13 }}>
                  ✅ Scan complete — {totalNodes} nodes discovered
                  {riskScore != null && <span style={{ marginLeft: 12, color: riskScore >= 70 ? '#ff4d4f' : '#fa8c16' }}>Risk Score: {riskScore}</span>}
                </div>
                <Button type="primary" size="large" block onClick={() => navigate('/gaps')} style={{ height: 46, fontSize: 15 }}>
                  View Analysis — CyberGap Dashboard →
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Node feed */}
        <div style={{ background: '#141414', borderRadius: 12, border: '1px solid #1f1f1f', overflow: 'hidden' }}>
          <div onClick={() => !isDesktop && setShowNodes(s => !s)}
            style={{ padding: '14px 18px', borderBottom: nodes.length > 0 ? '1px solid #1f1f1f' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: !isDesktop ? 'pointer' : 'default' }}>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
              📡 Discovered Nodes
              {nodes.length > 0 && (
                <span style={{ marginLeft: 8, background: '#1668dc22', color: '#1668dc', border: '1px solid #1668dc44', borderRadius: 10, fontSize: 11, padding: '1px 7px' }}>{nodes.length}</span>
              )}
            </div>
            {!isDesktop && <motion.span animate={{ rotate: showNodes ? 180 : 0 }} style={{ color: '#555', fontSize: 14 }}>▼</motion.span>}
          </div>

          <AnimatePresence>
            {(isDesktop || showNodes) && (
              <motion.div initial={!isDesktop ? { height: 0, opacity: 0 } : false} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', maxHeight: isDesktop ? 460 : 320, overflowY: 'auto', padding: '14px 16px' }}>
                {nodes.length === 0 ? (
                  <div style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      Waiting for scan results...
                    </motion.div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {[...nodes].reverse().map(node => (
                      <motion.div key={node.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                        style={{ padding: '9px 12px', marginBottom: 7, background: '#1a1a1a', borderRadius: 8, borderLeft: `3px solid ${node.color}`, fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>
                        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: node.color, marginRight: 8, verticalAlign: 'middle' }} />
                        {node.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}