import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, Drawer, Badge, Spin } from 'antd'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  FilePdfOutlined, SendOutlined, ArrowRightOutlined,
  ClockCircleOutlined, ApartmentOutlined,
} from '@ant-design/icons'
import { useScanStore } from '../../store/scanStore'
import { getGapReport } from '../../services/api'

// ── Sector benchmark (static reference data) ──────────────
const NIST_SECTOR = { identify: 65, protect: 70, detect: 60, respond: 55, recover: 58 }
const SEVERITY_COLOR = { Critical: '#ff4d4f', High: '#fa8c16', Medium: '#fadb14', Low: '#52c41a' }

// ── Sub-components ─────────────────────────────────────────
function MetricCard({ label, value, color }) {
  return (
    <div style={{
      background: '#1a1a1a', borderRadius: 10, padding: '12px 16px',
      border: '1px solid #2a2a2a', textAlign: 'center',
      flex: '1 1 100px', minWidth: 90,
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || '#fff' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function GapCard({ gap, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={() => onClick(gap)}
      style={{
        background: '#1a1a1a', borderRadius: 10, padding: '14px 16px',
        border: '1px solid #2a2a2a',
        borderLeft: `4px solid ${SEVERITY_COLOR[gap.severity] || '#888'}`,
        cursor: 'pointer', marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <Tag color={SEVERITY_COLOR[gap.severity]} style={{ margin: 0, fontSize: 11 }}>{gap.severity}</Tag>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{gap.title}</span>
        </div>
        <ArrowRightOutlined style={{ color: '#555', flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: 11 }}>
          <ClockCircleOutlined style={{ marginRight: 3 }} />{gap.fixHours}h
        </span>
        <span style={{ color: '#888', fontSize: 11 }}>
          <ApartmentOutlined style={{ marginRight: 3 }} />{gap.eliminatedPaths} paths blocked
        </span>
        <span style={{ color: '#555', fontSize: 11 }}>{gap.nistControl}</span>
        {gap.impactPercent != null && (
          <span style={{ color: '#1668dc', fontSize: 11, fontWeight: 600 }}>
            {parseFloat(gap.impactPercent).toFixed(1)}% impact
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Empty / Error state ────────────────────────────────────
function EmptyState({ scanId, onRetry }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {scanId ? 'Analysis Not Ready' : 'No Scan Found'}
        </div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          {scanId
            ? 'The gap analysis is still being processed, or the scan did not complete successfully.'
            : 'No active scan ID found. Please start a new scan first.'}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {scanId && (
            <Button type="primary" onClick={onRetry}>Retry</Button>
          )}
          <Button onClick={() => navigate('/onboarding')}>Start New Scan</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function CyberGap() {
  const navigate  = useNavigate()
  const { scanId } = useScanStore()

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [riskScore,   setRiskScore]   = useState(null)
  const [nistScores,  setNistScores]  = useState(null)
  const [gaps,        setGaps]        = useState([])
  const [narrative,   setNarrative]   = useState('')
  const [selectedGap, setSelectedGap] = useState(null)
  const [retryCount,  setRetryCount]  = useState(0)

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const isDesktop = windowWidth >= 768

  useEffect(() => {
    if (!scanId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    getGapReport(scanId)
      .then(data => {
        setRiskScore(data.riskScore ?? null)
        setNistScores(data.nistScores || null)
        if (data.gaps?.length) {
          setGaps(data.gaps.map(g => ({
            id:              g.id,
            severity:        g.severity,
            title:           g.title,
            nistControl:     g.nistControl || g.nistDomain || '—',
            fixHours:        g.fixHours    || 0,
            eliminatedPaths: g.eliminatedPaths || 0,
            impactPercent:   g.impactPercent,
            description:     g.description || '',
            fix:             g.steps || [],
            mitre:           g.attackEdgeTags?.join(', ') || '',
          })))
        }
        if (data.narrativeText) setNarrative(data.narrativeText)
      })
      .catch(err => {
        console.error('Gap report error:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [scanId, retryCount])

  // ── Loading ──
  if (loading) return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#888' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: 14 }}>Loading gap analysis...</div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#444' }}>Scan ID: {scanId?.slice(0, 16)}...</div>
      </div>
    </div>
  )

  // ── No scanId or API error with no data ──
  if (!scanId || (error && gaps.length === 0)) {
    return <EmptyState scanId={scanId} onRetry={() => setRetryCount(c => c + 1)} />
  }

  // ── Build chart data ──
  const nistKeys = ['identify', 'protect', 'detect', 'respond', 'recover']
  const NIST_DATA = nistKeys.map(k => ({
    axis:    k.charAt(0).toUpperCase() + k.slice(1),
    company: nistScores ? Math.round(nistScores[k] || 0) : 0,
    sector:  NIST_SECTOR[k],
  }))

  const criticalCount = gaps.filter(g => g.severity === 'Critical').length
  const highCount     = gaps.filter(g => g.severity === 'High').length

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: isDesktop ? '20px' : '12px' }}>

      {/* ── Summary ── */}
      <div style={{ background: '#141414', borderRadius: 12, padding: '16px 20px', border: '1px solid #1f1f1f', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
              {scanId.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <Tag color="#1668dc">Finance Sector</Tag>
              {error && <Tag color="orange" style={{ fontSize: 10 }}>Partial data — {error}</Tag>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => navigate('/report')}>PDF Export</Button>
            <Button size="small" icon={<SendOutlined />} type="primary">Telegram Alert</Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <MetricCard label="Critical Gaps" value={criticalCount}
            color="#ff4d4f" />
          <MetricCard label="High Gaps"     value={highCount}
            color="#fa8c16" />
          <MetricCard label="Risk Score"
            value={riskScore != null ? riskScore : '—'}
            color={riskScore == null ? '#555' : riskScore >= 70 ? '#ff4d4f' : riskScore >= 40 ? '#fa8c16' : '#52c41a'} />
          <MetricCard label="Total Gaps"    value={gaps.length}
            color="#888" />
        </div>

        {narrative && (
          <div style={{ marginTop: 14, padding: 12, background: '#1a1a1a', borderRadius: 8, border: '1px solid #2a2a2a', color: '#888', fontSize: 12, lineHeight: 1.6 }}>
            {narrative}
          </div>
        )}
      </div>

      {/* ── Radar + Gap List ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'minmax(280px, 380px) 1fr' : '1fr',
        gap: 20,
        marginBottom: 20,
      }}>

        {/* Radar */}
        <div style={{ background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #1f1f1f' }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4, fontSize: 14 }}>NIST CSF Radar</div>
          <div style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>
            <span style={{ color: '#ff4d4f' }}>━</span> Company &nbsp;
            <span style={{ color: '#1668dc' }}>╌</span> Sector average
          </div>

          {nistScores ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={NIST_DATA}>
                  <PolarGrid stroke="#2a2a2a" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#888', fontSize: 11 }} />
                  <Radar name="Sector"  dataKey="sector"  stroke="#1668dc" fill="#1668dc" fillOpacity={0.1} strokeDasharray="4 2" strokeWidth={2} />
                  <Radar name="Company" dataKey="company" stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8 }}>
                {NIST_DATA.map(item => (
                  <div key={item.axis} style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ color: '#888', fontSize: 11 }}>{item.axis}</span>
                      <span style={{
                        color: item.company < 40 ? '#ff4d4f' : item.company < 60 ? '#fa8c16' : '#52c41a',
                        fontSize: 11, fontWeight: 700,
                      }}>{item.company}</span>
                    </div>
                    <div style={{ background: '#1f1f1f', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${item.company}%`, height: '100%', borderRadius: 3,
                        background: item.company < 40 ? '#ff4d4f' : item.company < 60 ? '#fa8c16' : '#52c41a',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#444', padding: '40px 0', fontSize: 13 }}>
              NIST scores not available
            </div>
          )}

          <Button type="primary" block size="small" style={{ marginTop: 14 }}
            onClick={() => navigate('/attack')}>
            AttackPath Graph →
          </Button>
        </div>

        {/* Gap List */}
        <div style={{
          background: '#141414', borderRadius: 12, padding: 20,
          border: '1px solid #1f1f1f', overflowY: 'auto',
          maxHeight: isDesktop ? 520 : 'none',
        }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 14, fontSize: 14 }}>
            Gap List
            <Badge count={gaps.length} style={{ marginLeft: 10, background: '#ff4d4f' }} />
          </div>

          {gaps.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', padding: '40px 0', fontSize: 13 }}>
              No gaps found yet
            </div>
          ) : (
            gaps.map(gap => <GapCard key={gap.id} gap={gap} onClick={setSelectedGap} />)
          )}
        </div>
      </div>

      {/* ── Benchmark ── */}
      {nistScores && (
        <div style={{ background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #1f1f1f' }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 14, fontSize: 14 }}>
            Sector Benchmark — By NIST Controls
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={NIST_DATA} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
              <YAxis type="category" dataKey="axis" tick={{ fill: '#888', fontSize: 11 }} width={60} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ color: '#888', fontSize: 11 }} />
              <Bar dataKey="sector"  name="Sector Average" fill="#1668dc" opacity={0.6} radius={[0,4,4,0]} />
              <Bar dataKey="company" name="Your Company"   radius={[0,4,4,0]}>
                {NIST_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.company < entry.sector ? '#ff4d4f' : '#52c41a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Gap Detail Drawer ── */}
      <Drawer
        open={!!selectedGap}
        onClose={() => setSelectedGap(null)}
        width={Math.min(480, window.innerWidth - 32)}
        title={selectedGap && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag color={SEVERITY_COLOR[selectedGap.severity]}>{selectedGap.severity}</Tag>
            <span style={{ fontSize: 14 }}>{selectedGap.title}</span>
          </div>
        )}
        styles={{
          body:   { background: '#0f0f0f', padding: 20 },
          header: { background: '#141414', borderBottom: '1px solid #1f1f1f' },
        }}
      >
        {selectedGap && (
          <div style={{ color: '#ccc' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Tag color="#1668dc">{selectedGap.nistControl}</Tag>
              {selectedGap.mitre && (
                <Tag color="#722ed1" style={{ fontSize: 11 }}>{selectedGap.mitre}</Tag>
              )}
            </div>

            {selectedGap.description && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Description</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{selectedGap.description}</div>
              </div>
            )}

            {selectedGap.fix?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Fix Steps</div>
                {selectedGap.fix.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '8px 10px', background: '#1a1a1a', borderRadius: 6 }}>
                    <span style={{ color: '#52c41a', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12 }}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 80px', background: '#1a1a1a', borderRadius: 8, padding: 12, textAlign: 'center', border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fa8c16' }}>{selectedGap.fixHours}h</div>
                <div style={{ color: '#888', fontSize: 11 }}>Fix time</div>
              </div>
              <div style={{ flex: '1 1 80px', background: '#1a1a1a', borderRadius: 8, padding: 12, textAlign: 'center', border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#52c41a' }}>{selectedGap.eliminatedPaths}</div>
                <div style={{ color: '#888', fontSize: 11 }}>Paths blocked</div>
              </div>
              {selectedGap.impactPercent != null && (
                <div style={{ flex: '1 1 80px', background: '#1a1a1a', borderRadius: 8, padding: 12, textAlign: 'center', border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1668dc' }}>{parseFloat(selectedGap.impactPercent).toFixed(1)}%</div>
                  <div style={{ color: '#888', fontSize: 11 }}>Impact</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}