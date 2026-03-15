import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { useScanStore } from '../../store/scanStore'

const SOURCES = [
  { key: 'dns',    label: 'DNS kayıtları',     duration: 3000  },
  { key: 'ssl',    label: 'SSL sertifikatlar', duration: 4500  },
  { key: 'port',   label: 'Port skanı',        duration: 6000  },
  { key: 'cve',    label: 'CVE yoxlama',       duration: 7500  },
  { key: 'http',   label: 'HTTP analiz',       duration: 9000  },
  { key: 'breach', label: 'Breach yoxlama',    duration: 11000 },
]

const MOCK_NODES = [
  { id: 1, source: 'dns',    text: '5 DNS node tapıldı',               color: '#52c41a' },
  { id: 2, source: 'dns',    text: 'MX record: mail.company.com',      color: '#52c41a' },
  { id: 3, source: 'ssl',    text: 'SSL sertifikat: 87 gün qalıb',     color: '#fadb14' },
  { id: 4, source: 'ssl',    text: 'TLS 1.0 dəstəklənir — köhnə!',    color: '#ff4d4f' },
  { id: 5, source: 'port',   text: 'Port 3389 (RDP) açıqdır! ⚠️',     color: '#ff4d4f' },
  { id: 6, source: 'port',   text: 'Port 22 (SSH) açıqdır',            color: '#fa8c16' },
  { id: 7, source: 'cve',    text: 'CVE-2024-1234 tapıldı — CVSS 9.1', color: '#ff4d4f' },
  { id: 8, source: 'http',   text: 'X-Frame-Options header yoxdur',    color: '#fa8c16' },
  { id: 9, source: 'breach', text: '2 email ünvanı breach-də tapıldı', color: '#ff4d4f' },
]

function ProgressBar({ percent, status }) {
  const color = status === 'done' ? '#52c41a' : status === 'active' ? '#1668dc' : '#2a2a2a'
  return (
    <div style={{ background: '#1f1f1f', borderRadius: 4, height: 6, overflow: 'hidden', flex: 1 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.5 }}
        style={{ height: '100%', background: color, borderRadius: 4 }}
      />
    </div>
  )
}

export default function ScanProgress() {
  const navigate = useNavigate()
  const { domain } = useScanStore()
  const [progress,  setProgress]  = useState({})
  const [nodes,     setNodes]     = useState([])
  const [done,      setDone]      = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const [showNodes, setShowNodes] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isDesktop = windowWidth >= 700

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)

    SOURCES.forEach(source => {
      const steps = 10
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => {
          setProgress(p => ({
            ...p,
            [source.key]: {
              percent: i * 10,
              status:  i < 10 ? 'active' : 'done',
            }
          }))
        }, (source.duration / steps) * i)
      }
    })

    MOCK_NODES.forEach((node, idx) => {
      const source = SOURCES.find(s => s.key === node.source)
      setTimeout(() => {
        setNodes(n => [...n, node])
      }, source.duration + idx * 200)
    })

    setTimeout(() => {
      setDone(true)
      clearInterval(timer)
    }, 12000)

    return () => clearInterval(timer)
  }, [])

  const completedCount = Object.values(progress).filter(p => p?.status === 'done').length
  const criticalCount  = nodes.filter(n => n.color === '#ff4d4f').length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '20px 16px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
          🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ color: '#888', fontSize: 13 }}>
            Hədəf: <span style={{ color: '#1668dc', fontWeight: 600 }}>{domain || 'company.com'}</span>
          </span>
          <span style={{ color: '#555', fontSize: 12 }}>⏱ {elapsed}s</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1a1a1a', borderRadius: 20,
            padding: '3px 10px', border: '1px solid #2a2a2a',
          }}>
            <motion.div
              animate={{ opacity: done ? 1 : [1, 0.3, 1] }}
              transition={{ repeat: done ? 0 : Infinity, duration: 1.2 }}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: done ? '#52c41a' : '#1668dc',
              }}
            />
            <span style={{ color: '#888', fontSize: 11 }}>
              {done ? 'Tamamlandı' : 'Skanlanır...'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Ümumi progress ── */}
      <div style={{
        background: '#141414', borderRadius: 12,
        padding: '16px 20px', border: '1px solid #1f1f1f',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#ccc', fontSize: 13, fontWeight: 600 }}>
            {completedCount}/{SOURCES.length} mənbə tamamlandı
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {criticalCount > 0 && (
              <span style={{ color: '#ff4d4f', fontSize: 12 }}>
                ⚠️ {criticalCount} kritik tapıntı
              </span>
            )}
            <span style={{ color: '#888', fontSize: 12 }}>
              {nodes.length} node tapıldı
            </span>
          </div>
        </div>
        <div style={{ background: '#1f1f1f', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${(completedCount / SOURCES.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{
              height: '100%', borderRadius: 6,
              background: done
                ? '#52c41a'
                : 'linear-gradient(90deg, #1668dc, #722ed1)',
            }}
          />
        </div>
      </div>

      {/* ── Ana content ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 300px' : '1fr',
        gap: 16,
        alignItems: 'start',
      }}>

        {/* Sol — Mənbə siyahısı */}
        <div style={{
          background: '#141414', borderRadius: 12,
          padding: '20px', border: '1px solid #1f1f1f',
        }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 18, fontSize: 14 }}>
            Skan Mənbələri
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SOURCES.map(source => {
              const p       = progress[source.key]
              const percent = p?.percent || 0
              const status  = p?.status  || 'waiting'

              return (
                <div key={source.key}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 7, gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <motion.div
                        animate={status === 'active' ? { opacity: [1, 0.3, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 1 }}
                        style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background:
                            status === 'done'   ? '#52c41a' :
                            status === 'active' ? '#1668dc' : '#2a2a2a',
                        }}
                      />
                      <span style={{ color: '#ccc', fontSize: 13 }}>{source.label}</span>
                    </div>
                    <Tag
                      style={{ margin: 0, fontSize: 11, flexShrink: 0 }}
                      color={
                        status === 'done'   ? 'success'    :
                        status === 'active' ? 'processing' : 'default'
                      }
                    >
                      {status === 'done'   ? 'Tamamlandı' :
                       status === 'active' ? 'İşlənir...' : 'Gözlənilir'}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ProgressBar percent={percent} status={status} />
                    <span style={{ color: '#444', fontSize: 11, width: 30, textAlign: 'right' }}>
                      {percent}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tamamlandı */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 24 }}
              >
                <div style={{
                  padding: 14, background: '#162312',
                  borderRadius: 8, border: '1px solid #274916',
                  marginBottom: 14, color: '#52c41a',
                  fontWeight: 600, fontSize: 13,
                }}>
                  ✅ Skan tamamlandı — {MOCK_NODES.length} tapıntı aşkarlandı
                </div>
                <Button
                  type="primary" size="large" block
                  onClick={() => navigate('/gaps')}
                  style={{ height: 46, fontSize: 15 }}
                >
                  Analizi Gör — CyberGap Dashboard →
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sağ — Node feed */}
        <div style={{
          background: '#141414', borderRadius: 12,
          border: '1px solid #1f1f1f', overflow: 'hidden',
        }}>
          {/* Node feed header — mobilə toggle */}
          <div
            onClick={() => !isDesktop && setShowNodes(s => !s)}
            style={{
              padding: '14px 18px',
              borderBottom: nodes.length > 0 ? '1px solid #1f1f1f' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: !isDesktop ? 'pointer' : 'default',
            }}
          >
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
              📡 Tapılan Node-lar
              {nodes.length > 0 && (
                <span style={{
                  marginLeft: 8, background: '#1668dc22',
                  color: '#1668dc', border: '1px solid #1668dc44',
                  borderRadius: 10, fontSize: 11, padding: '1px 7px',
                }}>
                  {nodes.length}
                </span>
              )}
            </div>
            {!isDesktop && (
              <motion.span
                animate={{ rotate: showNodes ? 180 : 0 }}
                style={{ color: '#555', fontSize: 14 }}
              >
                ▼
              </motion.span>
            )}
          </div>

          {/* Node list */}
          <AnimatePresence>
            {(isDesktop || showNodes) && (
              <motion.div
                initial={!isDesktop ? { height: 0, opacity: 0 } : false}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  overflow: 'hidden',
                  maxHeight: isDesktop ? 460 : 320,
                  overflowY: 'auto',
                  padding: '14px 16px',
                }}
              >
                {nodes.length === 0 ? (
                  <div style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    <motion.div
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      Skan başlayır...
                    </motion.div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {[...nodes].reverse().map(node => (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          padding: '9px 12px',
                          marginBottom: 7,
                          background: '#1a1a1a',
                          borderRadius: 8,
                          borderLeft: `3px solid ${node.color}`,
                          fontSize: 12,
                          color: '#ccc',
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          width: 7, height: 7,
                          borderRadius: '50%',
                          background: node.color,
                          marginRight: 8,
                          verticalAlign: 'middle',
                          flexShrink: 0,
                        }} />
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