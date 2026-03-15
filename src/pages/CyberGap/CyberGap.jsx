import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, Drawer, Badge } from 'antd'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, Cell,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FilePdfOutlined, SendOutlined, ArrowRightOutlined,
  ClockCircleOutlined, ApartmentOutlined,
} from '@ant-design/icons'

const NIST_DATA = [
  { axis: 'Identify', company: 42, sector: 65 },
  { axis: 'Protect',  company: 55, sector: 70 },
  { axis: 'Detect',   company: 30, sector: 60 },
  { axis: 'Respond',  company: 25, sector: 55 },
  { axis: 'Recover',  company: 38, sector: 58 },
]

const GAPS = [
  {
    id: 1, severity: 'Critical', title: 'RDP İnternete Açıqdır',
    nist: 'PR.AC-3', fixHours: 4, pathsCut: 12,
    description: 'Port 3389 birbaşa internete açıqdır. Ən çox istifadə edilən ransomware giriş nöqtəsidir.',
    mitre: 'T1133 — External Remote Services',
    fix: ['NLA aktiv edin', 'RDP-ni VPN arxasına aparın', 'Port 3389-u firewall-da bağlayın', 'Allowlist tətbiq edin'],
    gemini: 'Bu boşluq 2024-cü ilin ən çox istismar edilən zəifliklərindən biridir. Dərhal bağlanmalıdır.',
  },
  {
    id: 2, severity: 'Critical', title: 'MFA Mövcud Deyil',
    nist: 'PR.AC-7', fixHours: 8, pathsCut: 9,
    description: 'Heç bir hesabda MFA aktiv deyil. Credential stuffing hücumlarına tam açıqdır.',
    mitre: 'T1078 — Valid Accounts',
    fix: ['Microsoft/Google Authenticator tətbiq edin', 'Admin hesablarına MFA məcburi edin', 'Conditional Access qurun'],
    gemini: 'MFA credential-based hücumların 99%-ni bloklayır.',
  },
  {
    id: 3, severity: 'High', title: 'TLS 1.0 Aktiv',
    nist: 'PR.DS-2', fixHours: 2, pathsCut: 5,
    description: 'Server köhnə TLS 1.0 dəstəkləyir. POODLE və BEAST hücumlarına həssasdır.',
    mitre: 'T1557 — Adversary-in-the-Middle',
    fix: ['TLS 1.0/1.1 disable edin', 'Yalnız TLS 1.2+ icazə verin', 'SSL Labs testi edin'],
    gemini: 'TLS 1.0 deprecated-dir. 2 saatlıq iş.',
  },
  {
    id: 4, severity: 'High', title: 'EDR Həlli Yoxdur',
    nist: 'DE.CM-4', fixHours: 16, pathsCut: 7,
    description: 'EDR quraşdırılmayıb. Zərərli proqram aşkarlanmır.',
    mitre: 'T1059 — Command and Scripting Interpreter',
    fix: ['CrowdStrike/Defender for Endpoint quraşdırın', 'Bütün endpointləri əhatə edin', 'Alert policy konfiqurasiya edin'],
    gemini: 'EDR olmadan ransomware 21 gün aşkarlanmadan qalır.',
  },
  {
    id: 5, severity: 'Medium', title: 'X-Frame-Options Yoxdur',
    nist: 'PR.DS-6', fixHours: 1, pathsCut: 2,
    description: 'Web server X-Frame-Options header göndərmir. Clickjacking həssaslığı.',
    mitre: 'T1185 — Browser Session Hijacking',
    fix: ['Nginx: add_header X-Frame-Options "DENY"', 'Apache: Header always append X-Frame-Options SAMEORIGIN'],
    gemini: '1 saatlıq iş. Asan fix.',
  },
]

const BENCHMARK_DATA = [
  { name: 'Identify', company: 42, sector: 65 },
  { name: 'Protect',  company: 55, sector: 70 },
  { name: 'Detect',   company: 30, sector: 60 },
  { name: 'Respond',  company: 25, sector: 55 },
  { name: 'Recover',  company: 38, sector: 58 },
]

const SEVERITY_COLOR = {
  Critical: '#ff4d4f',
  High:     '#fa8c16',
  Medium:   '#fadb14',
  Low:      '#52c41a',
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{
      background: '#1a1a1a', borderRadius: 10,
      padding: '12px 16px', border: '1px solid #2a2a2a',
      textAlign: 'center', flex: '1 1 100px', minWidth: 90,
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
        borderLeft: `4px solid ${SEVERITY_COLOR[gap.severity]}`,
        cursor: 'pointer', marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <Tag color={SEVERITY_COLOR[gap.severity]} style={{ margin: 0, fontSize: 11 }}>
            {gap.severity}
          </Tag>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{gap.title}</span>
        </div>
        <ArrowRightOutlined style={{ color: '#555', flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: 11 }}>
          <ClockCircleOutlined style={{ marginRight: 3 }} />{gap.fixHours}s
        </span>
        <span style={{ color: '#888', fontSize: 11 }}>
          <ApartmentOutlined style={{ marginRight: 3 }} />{gap.pathsCut} yol kəsilir
        </span>
        <span style={{ color: '#555', fontSize: 11 }}>{gap.nist}</span>
      </div>
    </motion.div>
  )
}

export default function CyberGap() {
  const navigate = useNavigate()
  const [selectedGap, setSelectedGap] = useState(null)

  const criticalCount = GAPS.filter(g => g.severity === 'Critical').length
  const highCount     = GAPS.filter(g => g.severity === 'High').length

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '20px 20px' }}>

      {/* ── Blok 1: Summary ── */}
      <div style={{
        background: '#141414', borderRadius: 12,
        padding: '16px 20px', border: '1px solid #1f1f1f',
        marginBottom: 20,
      }}>
        {/* Üst sıra — şirkət + buttonlar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Acme Corp</div>
            <Tag color="#1668dc" style={{ marginTop: 4 }}>Finans Sektoru</Tag>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => navigate('/report')}>
              PDF Export
            </Button>
            <Button size="small" icon={<SendOutlined />} type="primary">
              Telegram Al
            </Button>
          </div>
        </div>

        {/* Metric cards — flex wrap */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <MetricCard label="Kritik Gap"      value={criticalCount} color="#ff4d4f" />
          <MetricCard label="Yüksək Gap"      value={highCount}     color="#fa8c16" />
          <MetricCard label="Risk Skoru"      value={72}            color="#fadb14" />
          <MetricCard label="Sektor Sıralama" value="#8"            color="#888"    />
        </div>
      </div>

      {/* ── Blok 2+3: Radar + Gap Siyahısı ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 400px) 1fr',
        gap: 20,
        marginBottom: 20,
      }}>

        {/* Radar */}
        <div style={{
          background: '#141414', borderRadius: 12,
          padding: 20, border: '1px solid #1f1f1f',
        }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4, fontSize: 14 }}>
            NIST CSF Radar
          </div>
          <div style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>
            <span style={{ color: '#ff4d4f' }}>━</span> Şirkət &nbsp;
            <span style={{ color: '#1668dc' }}>╌</span> Sektor ortalama
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={NIST_DATA}>
              <PolarGrid stroke="#2a2a2a" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: '#888', fontSize: 11 }} />
              <Radar name="Sektor" dataKey="sector"
                stroke="#1668dc" fill="#1668dc" fillOpacity={0.1}
                strokeDasharray="4 2" strokeWidth={2} />
              <Radar name="Şirkət" dataKey="company"
                stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <Button type="primary" block size="small"
            style={{ marginTop: 12 }} onClick={() => navigate('/attack')}>
            AttackPath Graph-a Keç →
          </Button>
        </div>

        {/* Gap Siyahısı */}
        <div style={{
          background: '#141414', borderRadius: 12,
          padding: 20, border: '1px solid #1f1f1f',
          overflowY: 'auto', maxHeight: 420,
        }}>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: 14, fontSize: 14 }}>
            Gap Siyahısı
            <Badge count={GAPS.length} style={{ marginLeft: 10, background: '#ff4d4f' }} />
          </div>
          {GAPS.map(gap => (
            <GapCard key={gap.id} gap={gap} onClick={setSelectedGap} />
          ))}
        </div>
      </div>

      {/* ── Blok 4: Benchmark ── */}
      <div style={{
        background: '#141414', borderRadius: 12,
        padding: 20, border: '1px solid #1f1f1f',
      }}>
        <div style={{ fontWeight: 700, color: '#fff', marginBottom: 14, fontSize: 14 }}>
          Sektor Benchmark — NIST Kontrolları üzrə
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={BENCHMARK_DATA} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#666', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 11 }} width={60} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ color: '#888', fontSize: 11 }} />
            <Bar dataKey="sector" name="Sektor Ortalama"
              fill="#1668dc" opacity={0.6} radius={[0, 4, 4, 0]} />
            <Bar dataKey="company" name="Şirkətiniz" radius={[0, 4, 4, 0]}>
              {BENCHMARK_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.company < entry.sector ? '#ff4d4f' : '#52c41a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Gap Detail Drawer ── */}
      <Drawer
        open={!!selectedGap}
        onClose={() => setSelectedGap(null)}
        width={Math.min(480, window.innerWidth - 32)}
        title={
          selectedGap && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag color={SEVERITY_COLOR[selectedGap.severity]}>{selectedGap.severity}</Tag>
              <span style={{ fontSize: 14 }}>{selectedGap.title}</span>
            </div>
          )
        }
        styles={{
          body:   { background: '#0f0f0f', padding: 20 },
          header: { background: '#141414', borderBottom: '1px solid #1f1f1f' },
        }}
      >
        {selectedGap && (
          <div style={{ color: '#ccc' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <Tag color="#1668dc">{selectedGap.nist}</Tag>
              <Tag color="#722ed1" style={{ fontSize: 11 }}>{selectedGap.mitre}</Tag>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Təsvir</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{selectedGap.description}</div>
            </div>

            <div style={{
              background: '#1a1a1a', borderRadius: 8, padding: 12,
              border: '1px solid #2d2d2d', marginBottom: 16,
            }}>
              <div style={{ color: '#1668dc', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                🤖 Gemini Tövsiyəsi
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{selectedGap.gemini}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Fix Addımları</div>
              {selectedGap.fix.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, marginBottom: 6,
                  padding: '8px 10px', background: '#1a1a1a', borderRadius: 6,
                }}>
                  <span style={{ color: '#52c41a', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12 }}>{step}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{
                flex: 1, background: '#1a1a1a', borderRadius: 8,
                padding: 12, textAlign: 'center', border: '1px solid #2a2a2a',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fa8c16' }}>
                  {selectedGap.fixHours}s
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>Fix müddəti</div>
              </div>
              <div style={{
                flex: 1, background: '#1a1a1a', borderRadius: 8,
                padding: 12, textAlign: 'center', border: '1px solid #2a2a2a',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#52c41a' }}>
                  {selectedGap.pathsCut}
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>Yol kəsilir</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}