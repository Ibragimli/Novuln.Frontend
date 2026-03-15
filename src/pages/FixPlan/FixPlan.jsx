import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, Switch, Progress } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClockCircleOutlined, ApartmentOutlined,
  FilePdfOutlined, CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

const FIXES = [
  {
    id: 1, title: 'RDP-ni VPN Arxasına Apar', severity: 'Critical',
    fixHours: 4, pathsCut: 12, impact: 38, nist: 'PR.AC-3', mitre: 'T1133',
    gemini: 'RDP-nin birbaşa internete açıq olması ən çox istifadə edilən ransomware giriş nöqtəsidir. Bu fix tək başına hücum səthinin 38%-ni bağlayır.',
    steps: ['Mövcud VPN həllini (OpenVPN/WireGuard) yoxlayın', 'RDP trafikini yalnız VPN IP range-inə icazə verin', 'Windows Firewall-da port 3389-u xaricdən bağlayın', 'NLA aktiv edin', 'Xarici şəbəkədən RDP cəhdi edin — uğursuz olmalıdır'],
  },
  {
    id: 2, title: 'MFA Tətbiq Et', severity: 'Critical',
    fixHours: 8, pathsCut: 9, impact: 28, nist: 'PR.AC-7', mitre: 'T1078',
    gemini: 'MFA olmadan credential stuffing hücumları 100% uğur şansına malikdir. Tətbiq credential-based hücumların 99%-ni bloklayır.',
    steps: ['Microsoft Entra ID və ya Okta seçin', 'Pilot qrup üçün MFA aktiv edin', 'Authenticator app deploy edin', 'Admin hesablarına MFA məcburi edin', 'Conditional Access policy qurun', 'Recovery code-ları saxlayın'],
  },
  {
    id: 3, title: 'TLS 1.0/1.1 Disable Et', severity: 'High',
    fixHours: 2, pathsCut: 5, impact: 15, nist: 'PR.DS-2', mitre: 'T1557',
    gemini: 'TLS 1.0 POODLE hücumuna həssasdır. 2 saatlıq iş ilə bağlanır.',
    steps: ['IIS: Windows Registry-də TLS 1.0 disable edin', 'Nginx: ssl_protocols TLSv1.2 TLSv1.3', 'Apache: SSLProtocol -TLSv1 -TLSv1.1', 'SSL Labs testi edin'],
  },
  {
    id: 4, title: 'EDR Həlli Quraşdır', severity: 'High',
    fixHours: 16, pathsCut: 7, impact: 22, nist: 'DE.CM-4', mitre: 'T1059',
    gemini: 'EDR olmadan ransomware ortalama 21 gün aşkarlanmadan qalır.',
    steps: ['Vendor seçin: CrowdStrike / Defender / SentinelOne', 'Lisenziya əldə edin', 'Pilot qrup üçün agent deploy edin', 'Alert policy konfiqurasiya edin', 'SOC team-ə öyrədin', 'Bütün endpointlərə roll-out edin'],
  },
  {
    id: 5, title: 'Security Header-ları Əlavə Et', severity: 'Medium',
    fixHours: 1, pathsCut: 2, impact: 5, nist: 'PR.DS-6', mitre: 'T1185',
    gemini: '1 saatlıq iş. Clickjacking, XSS və MIME-sniffing hücumlarından qoruyur.',
    steps: ['Nginx: add_header X-Frame-Options "DENY"', 'add_header X-Content-Type-Options "nosniff"', 'add_header X-XSS-Protection "1; mode=block"', 'add_header Strict-Transport-Security "max-age=31536000"', 'securityheaders.com ilə yoxlayın'],
  },
]

const SEVERITY_COLOR = { Critical: '#ff4d4f', High: '#fa8c16', Medium: '#fadb14', Low: '#52c41a' }
const TOTAL_HOURS    = FIXES.reduce((a, f) => a + f.fixHours, 0)
const TOTAL_IMPACT   = Math.min(FIXES.reduce((a, f) => a + f.impact, 0), 100)

// ── Fix Card ───────────────────────────────────────────────
function FixCard({ fix, simulated, onToggle }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   simulated ? '#0d1f0d' : '#141414',
        borderRadius: 12,
        border:       `1px solid ${simulated ? '#274916' : '#1f1f1f'}`,
        borderLeft:   `4px solid ${simulated ? '#52c41a' : SEVERITY_COLOR[fix.severity]}`,
        marginBottom: 10,
        overflow:     'hidden',
        transition:   'background 0.3s',
      }}
    >
      {/* ── Card Header ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '14px 16px', cursor: 'pointer' }}
      >
        {/* Sətir 1: severity + başlıq */}
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
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} style={{ color: '#555', fontSize: 18, flexShrink: 0 }}>›</motion.span>
        </div>

        {/* Sətir 2: metrics + simulate */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: '#888', fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 3 }} />{fix.fixHours}s
            </span>
            <span style={{ color: '#888', fontSize: 12 }}>
              <ApartmentOutlined style={{ marginRight: 3 }} />{fix.pathsCut} yol
            </span>
            <span style={{ color: '#1668dc', fontSize: 12, fontWeight: 600 }}>
              <ThunderboltOutlined style={{ marginRight: 3 }} />{fix.impact}% impact
            </span>
          </div>

          {/* Simulate toggle */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ color: '#666', fontSize: 11 }}>Simulate</span>
            <Switch
              size="small"
              checked={simulated}
              onChange={onToggle}
              style={{ background: simulated ? '#52c41a' : undefined }}
            />
          </div>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px', borderTop: '1px solid #1f1f1f' }}>

              {/* Gemini */}
              <div style={{
                background: '#1a1a1a', borderRadius: 8,
                padding: 12, border: '1px solid #2a2a2a', marginBottom: 12,
              }}>
                <div style={{ color: '#1668dc', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🤖 Gemini Tövsiyəsi</div>
                <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>{fix.gemini}</div>
              </div>

              {/* NIST + MITRE */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Tag color="#1668dc">{fix.nist}</Tag>
                <Tag color="#722ed1">{fix.mitre}</Tag>
              </div>

              {/* Fix Addımları + Preview — responsive grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}>
                {/* Fix addımları */}
                <div>
                  <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Fix Addımları</div>
                  {fix.steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '8px 10px',
                        background: simulated ? '#0d1f0d' : '#1a1a1a',
                        borderRadius: 6, marginBottom: 6,
                        border: '1px solid #2a2a2a',
                      }}
                    >
                      <CheckCircleOutlined style={{ color: simulated ? '#52c41a' : '#555', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ color: '#ccc', fontSize: 12, lineHeight: 1.5 }}>{step}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Attack graph preview */}
                <div style={{
                  background: '#0f0f0f', borderRadius: 8,
                  border: '1px solid #2a2a2a', padding: 14,
                }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>Attack Graph Preview</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    {['INTERNET', 'RDP', 'AD', 'CROWN'].map((node, i, arr) => (
                      <div key={node} style={{ width: '100%', textAlign: 'center' }}>
                        <div style={{
                          padding: '7px 0', borderRadius: 6,
                          fontSize: 12, fontWeight: 700, color: '#fff',
                          background: simulated && node === 'RDP' ? '#162312' : '#1a1a1a',
                          border: `1px solid ${simulated && node === 'RDP' ? '#52c41a' : '#2a2a2a'}`,
                          textDecoration: simulated && node === 'RDP' ? 'line-through' : 'none',
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
                      ✅ Yol kəsildi
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

// ── Main ───────────────────────────────────────────────────
export default function FixPlan() {
  const navigate = useNavigate()
  const [simulated, setSimulated] = useState({})

  const simulatedCount  = Object.values(simulated).filter(Boolean).length
  const simulatedHours  = FIXES.filter(f => simulated[f.id]).reduce((a, f) => a + f.fixHours, 0)
  const simulatedImpact = Math.min(FIXES.filter(f => simulated[f.id]).reduce((a, f) => a + f.impact, 0), 100)
  const simulatedPaths  = FIXES.filter(f => simulated[f.id]).reduce((a, f) => a + f.pathsCut, 0)

  function toggleSimulate(id) {
    setSimulated(s => ({ ...s, [id]: !s[id] }))
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '16px' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>🔧 Fix Plan</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            ROI-yə görə sıralanmış — ən az iş, ən çox effekt yuxarıda
          </div>
        </div>
        <Button type="primary" icon={<FilePdfOutlined />} onClick={() => navigate('/report')}>
          PDF Export
        </Button>
      </div>

      {/* ── Summary Banner ── */}
      <div style={{
        background: '#141414', borderRadius: 12,
        padding: '16px', border: '1px solid #1f1f1f', marginBottom: 16,
      }}>
        {/* Üst sıra — ümumi statistika */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Ümumi müddət</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
              {TOTAL_HOURS}<span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>saat</span>
            </div>
          </div>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Risk azalması</div>
            <div style={{ color: '#52c41a', fontWeight: 800, fontSize: 22 }}>
              {TOTAL_IMPACT}<span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>%</span>
            </div>
          </div>
          <div style={{ flex: '1 1 120px', background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: 11 }}>Simulate seçildi</div>
            <div style={{ color: '#fa8c16', fontWeight: 800, fontSize: 22 }}>
              {simulatedCount}<span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>fix</span>
            </div>
          </div>
        </div>

        {/* Simulate progress */}
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 12 }}>Simulate nəticəsi</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#fa8c16', fontSize: 12 }}>{simulatedHours} saat</span>
              <span style={{ color: '#52c41a', fontSize: 12 }}>{simulatedImpact}% impact</span>
              <span style={{ color: '#1668dc', fontSize: 12 }}>{simulatedPaths} yol kəsilir</span>
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

      {/* ── Fix Cards ── */}
      <div>
        {FIXES.map(fix => (
          <FixCard
            key={fix.id}
            fix={fix}
            simulated={!!simulated[fix.id]}
            onToggle={() => toggleSimulate(fix.id)}
          />
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 24 }}>
        <Button
          type="primary" size="large" block
          icon={<FilePdfOutlined />}
          onClick={() => navigate('/report')}
          style={{ maxWidth: 400, height: 46, fontSize: 15 }}
        >
          PDF Report Al →
        </Button>
      </div>
    </div>
  )
}