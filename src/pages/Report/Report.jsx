import { useState, useRef, useEffect } from 'react'
import { Button, Tag, Spin } from 'antd'
import { motion } from 'framer-motion'
import {
  DownloadOutlined, UserOutlined, CodeOutlined,
  FileTextOutlined, CheckCircleOutlined, LoadingOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '../../store/scanStore'
import { getGapReport, getReportPdf } from '../../services/api'

// ── Report type config (static) ───────────────────────────
const REPORT_TYPES = [
  {
    key: 'clevel',
    label: 'C-Level',
    icon: <UserOutlined />,
    desc: 'Minimal technical detail, high business impact. Ideal for CEO/CFO.',
    pages: 4,
    color: '#1668dc',
    sections: ['Executive Summary', 'Business Risk', 'Financial Impact', 'Recommendations'],
  },
  {
    key: 'technical',
    label: 'Technical',
    icon: <CodeOutlined />,
    desc: 'Full technical detail. Ideal for CISO/IT team.',
    pages: 18,
    color: '#722ed1',
    sections: ['NIST CSF Analysis', 'Gap List', 'CVE Details', 'Attack Path Graph', 'Fix Steps', 'MITRE Mapping'],
  },
  {
    key: 'executive',
    label: 'Executive Summary',
    icon: <FileTextOutlined />,
    desc: '1 page. Ideal for board meetings.',
    pages: 1,
    color: '#52c41a',
    sections: ['Risk Score', 'Top 3 Gaps', 'Immediate Actions'],
  },
]

const SEVERITY_COLOR = { Critical: '#ff4d4f', High: '#fa8c16', Medium: '#fadb14', Low: '#52c41a' }
const NIST_SECTOR    = { identify: 65, protect: 70, detect: 60, respond: 55, recover: 58 }

// ── PDF Preview — real data ────────────────────────────────
function PDFPreview({ type, reportData, previewRef }) {
  const t = REPORT_TYPES.find(r => r.key === type)

  const riskScore  = reportData?.riskScore  ?? null
  const nistScores = reportData?.nistScores ?? null
  const gaps       = reportData?.gaps       ?? []
  const narrative  = reportData?.narrativeText ?? ''

  const displayGaps = type === 'executive' ? gaps.slice(0, 3) : gaps

  const nistKeys = ['identify', 'protect', 'detect', 'respond', 'recover']
  const nistRows = nistKeys.map(k => ({
    name:  k.charAt(0).toUpperCase() + k.slice(1),
    score: nistScores ? Math.round(nistScores[k] || 0) : null,
  }))

  return (
    <motion.div
      key={type}
      ref={previewRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: '#fff', borderRadius: 8, padding: 32,
        color: '#111', fontFamily: 'Inter, sans-serif', width: '100%',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `3px solid ${t.color}`, paddingBottom: 14, marginBottom: 20,
        flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#111' }}>
            🛡️ NoVuln<span style={{ color: t.color }}>.CyberGap</span>
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Cybersecurity Gap Analysis Report</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ background: t.color, color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {t.label}
          </div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-US')}
          </div>
        </div>
      </div>

      {/* Company info */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 18, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Scan ID',     value: reportData?.scanId ? reportData.scanId.slice(0, 8).toUpperCase() : '—' },
          { label: 'Risk Score',  value: riskScore != null ? `${riskScore} / 100` : '—' },
          { label: 'Total Gaps',  value: gaps.length || '—' },
          { label: 'Report Type', value: t.label },
        ].map(item => (
          <div key={item.label} style={{ minWidth: 80 }}>
            <div style={{ fontSize: 10, color: '#888' }}>{item.label}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Risk bar */}
      {riskScore != null && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Overall Risk Score</span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: riskScore >= 70 ? '#ff4d4f' : riskScore >= 40 ? '#fa8c16' : '#52c41a',
            }}>{riskScore}%</span>
          </div>
          <div style={{ background: '#e9ecef', borderRadius: 4, height: 8 }}>
            <div style={{
              width: `${riskScore}%`, height: '100%', borderRadius: 4,
              background: riskScore >= 70 ? '#ff4d4f' : riskScore >= 40 ? '#fa8c16' : '#52c41a',
            }} />
          </div>
        </div>
      )}

      {/* Narrative */}
      {narrative && (
        <div style={{ marginBottom: 18, padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#555', lineHeight: 1.6, fontStyle: 'italic' }}>
          {narrative}
        </div>
      )}

      {/* NIST scores */}
      {nistScores && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#333' }}>NIST CSF Results</div>
          {nistRows.map(item => (
            <div key={item.name} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: '#555' }}>{item.name}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: item.score < 40 ? '#ff4d4f' : item.score < 60 ? '#fa8c16' : '#52c41a',
                  }}>{item.score}</span>
                  <span style={{ fontSize: 11, color: '#bbb' }}>/ {NIST_SECTOR[item.name?.toLowerCase() || ''] || 60}</span>
                </div>
              </div>
              <div style={{ background: '#e9ecef', borderRadius: 3, height: 5, position: 'relative' }}>
                <div style={{
                  width: `${NIST_SECTOR[item.name?.toLowerCase() || ''] || 60}%`,
                  height: '100%', borderRadius: 3, background: '#d0d0d0',
                }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${item.score}%`, height: '100%', borderRadius: 3,
                  background: item.score < 40 ? '#ff4d4f' : item.score < 60 ? '#fa8c16' : '#52c41a',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#333' }}>
            {type === 'executive' ? 'Top 3 Gaps' : 'Detected Vulnerabilities'}
          </div>
          {displayGaps.map((gap, i) => (
            <div key={gap.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', background: '#f8f9fa', borderRadius: 5,
              marginBottom: 5, borderLeft: `3px solid ${SEVERITY_COLOR[gap.severity] || '#888'}`,
              flexWrap: 'wrap',
            }}>
              <span style={{
                background: SEVERITY_COLOR[gap.severity] || '#888', color: '#fff',
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, flexShrink: 0,
              }}>{gap.severity}</span>
              <span style={{ flex: 1, fontSize: 12, color: '#333', minWidth: 120 }}>{gap.title}</span>
              {gap.impactPercent != null && (
                <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>
                  {parseFloat(gap.impactPercent).toFixed(1)}% impact
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations (non-technical) */}
      {type !== 'technical' && gaps.length > 0 && (
        <div style={{ background: '#f0f9f0', borderRadius: 8, padding: 12, border: '1px solid #b7eb8f' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#389e0d', marginBottom: 6 }}>✅ Recommended Actions</div>
          {gaps.slice(0, 3).map((gap, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#555' }}>
                {gap.title} — {gap.fixHours}h
              </span>
            </div>
          ))}
        </div>
      )}

      {/* MITRE (technical only) */}
      {type === 'technical' && (
        <div style={{ background: '#f0f0ff', borderRadius: 8, padding: 12, border: '1px solid #d3adf7' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#722ed1', marginBottom: 6 }}>🔬 MITRE ATT&CK Mapping</div>
          {gaps.slice(0, 5).map((gap, i) => {
            const tags = gap.attackEdgeTags || []
            return (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 4, fontSize: 11, color: '#555', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#722ed1', minWidth: 60 }}>{gap.nistControl || '—'}</span>
                <span style={{ flex: 1 }}>{gap.title}</span>
                {tags.length > 0 && <span style={{ color: '#aaa' }}>{tags[0]}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 20, paddingTop: 10, borderTop: '1px solid #e9ecef',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
        color: '#aaa', fontSize: 9, gap: 4,
      }}>
        <span>NoVuln.CyberGap — Confidential Report</span>
        <span>{t.pages} pages</span>
        <span>© 2025 NoVuln Security</span>
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function Report() {
  const navigate    = useNavigate()
  const { scanId }  = useScanStore()
  const previewRef  = useRef()

  const [selectedType, setSelectedType] = useState('clevel')
  const [generating,   setGenerating]   = useState(false)
  const [loadingData,  setLoadingData]  = useState(true)
  const [reportData,   setReportData]   = useState(null)
  const [dataError,    setDataError]    = useState(null)

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const isDesktop = windowWidth >= 768

  // Load gap data for preview
  useEffect(() => {
    if (!scanId) { setLoadingData(false); return }

    getGapReport(scanId)
      .then(data => setReportData({ ...data, scanId }))
      .catch(err => {
        console.error('Report data error:', err)
        setDataError(err.message)
      })
      .finally(() => setLoadingData(false))
  }, [scanId])

  const currentType = REPORT_TYPES.find(r => r.key === selectedType)

  // ── Download from backend ──
  async function handleDownload() {
    if (!scanId) return
    setGenerating(true)
    try {
      const blob = await getReportPdf(scanId)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `NoVuln_${currentType.label}_${scanId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
      // Fallback: generate client-side from preview
      await generateClientPdf()
    } finally {
      setGenerating(false)
    }
  }

  // Fallback client-side PDF generation
  async function generateClientPdf() {
    if (!previewRef.current) return
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(m => m.default),
      import('html2canvas').then(m => m.default),
    ])
    const canvas  = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
    const imgData = canvas.toDataURL('image/png')
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW    = pdf.internal.pageSize.getWidth()
    const pdfH    = (canvas.height * pdfW) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
    const blob = pdf.output('blob')
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `NoVuln_${currentType.label}_${new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // No scan
  if (!scanId) return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>No Scan Found</div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Start a scan to generate a report.</div>
        <Button type="primary" onClick={() => navigate('/onboarding')}>Start New Scan</Button>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 16 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>📄 PDF Report</div>
        <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
          Select report type, preview, download
          {dataError && <Tag color="orange" style={{ marginLeft: 8, fontSize: 10 }}>Preview limited</Tag>}
        </div>
      </div>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'minmax(0, 300px) 1fr' : '1fr',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* Left: controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Report type selector */}
          <div style={{ background: '#141414', borderRadius: 12, padding: 16, border: '1px solid #1f1f1f' }}>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Report Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REPORT_TYPES.map(type => (
                <motion.div key={type.key} whileHover={{ scale: 1.01 }} onClick={() => setSelectedType(type.key)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${selectedType === type.key ? type.color : '#2a2a2a'}`,
                    background: selectedType === type.key ? `${type.color}18` : '#1a1a1a',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: type.color, fontSize: 14 }}>{type.icon}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, flex: 1 }}>{type.label}</span>
                    <Tag style={{ fontSize: 10, margin: 0 }}>{type.pages} pg.</Tag>
                  </div>
                  <div style={{ color: '#888', fontSize: 11 }}>{type.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sections list */}
          <div style={{ background: '#141414', borderRadius: 12, padding: 16, border: '1px solid #1f1f1f' }}>
            <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>In this report:</div>
            {currentType.sections.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <CheckCircleOutlined style={{ color: currentType.color, fontSize: 12 }} />
                <span style={{ color: '#ccc', fontSize: 12 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Scan info */}
          {scanId && (
            <div style={{ background: '#141414', borderRadius: 8, padding: 12, border: '1px solid #1f1f1f' }}>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>Scan ID</div>
              <div style={{ color: '#888', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{scanId}</div>
              {reportData?.riskScore != null && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: '#555', fontSize: 11 }}>Risk Score:</div>
                  <div style={{
                    fontWeight: 800, fontSize: 16,
                    color: reportData.riskScore >= 70 ? '#ff4d4f' : reportData.riskScore >= 40 ? '#fa8c16' : '#52c41a',
                  }}>{reportData.riskScore}</div>
                </div>
              )}
            </div>
          )}

          {/* Download button */}
          <Button
            type="primary" size="large" block
            loading={generating}
            onClick={handleDownload}
            disabled={!scanId}
            icon={generating ? <LoadingOutlined /> : <DownloadOutlined />}
            style={{ background: currentType.color, borderColor: currentType.color, height: 46, fontSize: 14 }}
          >
            {generating ? 'Generating PDF...' : `Download — ${currentType.label}`}
          </Button>

          <div style={{ background: '#141414', borderRadius: 8, padding: 12, border: '1px solid #1f1f1f', color: '#666', fontSize: 11, lineHeight: 1.5 }}>
            💡 PDF is generated by the backend and downloaded directly to your device.
          </div>
        </div>

        {/* Right: preview */}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>
            📋 Preview — <span style={{ color: currentType.color }}>{currentType.label}</span>
            {loadingData && <span style={{ marginLeft: 8 }}><LoadingOutlined style={{ fontSize: 11 }} /> Loading data...</span>}
          </div>

          <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.5)', border: '1px solid #2a2a2a' }}>
            {loadingData ? (
              <div style={{ background: '#fff', padding: 60, textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#888', fontSize: 14 }}>Loading report data...</div>
              </div>
            ) : (
              <PDFPreview type={selectedType} reportData={reportData} previewRef={previewRef} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}