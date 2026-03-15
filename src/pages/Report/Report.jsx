import { useState, useRef } from 'react'
import { Button, Tag } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FilePdfOutlined, DownloadOutlined,
  UserOutlined, CodeOutlined, FileTextOutlined,
  CheckCircleOutlined, LoadingOutlined,
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const REPORT_TYPES = [
  {
    key:      'clevel',
    label:    'C-Level Üçün',
    icon:     <UserOutlined />,
    desc:     'Texniki detal az, biznes impact çox. CEO/CFO üçün ideal.',
    pages:    4,
    color:    '#1668dc',
    sections: ['İcra Xülasəsi', 'Biznes Riski', 'Maliyyə Təsiri', 'Tövsiyələr'],
  },
  {
    key:      'technical',
    label:    'Texniki',
    icon:     <CodeOutlined />,
    desc:     'Tam texniki detal. CISO/IT team üçün ideal.',
    pages:    18,
    color:    '#722ed1',
    sections: ['NIST CSF Analizi', 'Gap Siyahısı', 'CVE Detalları', 'AttackPath Graf', 'Fix Addımları', 'MITRE Mapping'],
  },
  {
    key:      'executive',
    label:    'İcra Xülasəsi',
    icon:     <FileTextOutlined />,
    desc:     '1 səhifə. Board meeting üçün ideal.',
    pages:    1,
    color:    '#52c41a',
    sections: ['Risk Skoru', 'Top 3 Gap', 'Təcili Addımlar'],
  },
]

const MOCK_GAPS = [
  { title: 'RDP İnternete Açıqdır', severity: 'Critical', impact: '38%' },
  { title: 'MFA Mövcud Deyil',      severity: 'Critical', impact: '28%' },
  { title: 'TLS 1.0 Aktiv',         severity: 'High',     impact: '15%' },
  { title: 'EDR Həlli Yoxdur',      severity: 'High',     impact: '22%' },
]

const SEVERITY_COLOR = { Critical: '#ff4d4f', High: '#fa8c16', Medium: '#fadb14' }

// ── PDF Preview ────────────────────────────────────────────
function PDFPreview({ type, previewRef }) {
  const t = REPORT_TYPES.find(r => r.key === type)

  return (
    <motion.div
      key={type}
      ref={previewRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background:  '#fff',
        borderRadius: 8,
        padding:     32,
        color:       '#111',
        fontFamily:  'Inter, sans-serif',
        width:       '100%',
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
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Kibertəhlükəsizlik Boşluğu Analiz Hesabatı
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            background: t.color, color: '#fff',
            padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>
            {t.label}
          </div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
            {new Date().toLocaleDateString('az-AZ')}
          </div>
        </div>
      </div>

      {/* Şirkət info */}
      <div style={{
        background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 18,
        display: 'flex', gap: 20, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Şirkət',        value: 'Acme Corp' },
          { label: 'Sektor',        value: 'Finans'    },
          { label: 'Risk Skoru',    value: '72 / 100'  },
          { label: 'Sektor Sırası', value: '#8 / 24'   },
        ].map(item => (
          <div key={item.label} style={{ minWidth: 80 }}>
            <div style={{ fontSize: 10, color: '#888' }}>{item.label}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Risk Bar */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Ümumi Risk Skoru</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fa8c16' }}>72%</span>
        </div>
        <div style={{ background: '#e9ecef', borderRadius: 4, height: 8 }}>
          <div style={{ width: '72%', height: '100%', background: '#fa8c16', borderRadius: 4 }} />
        </div>
      </div>

      {/* NIST */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#333' }}>NIST CSF Nəticələri</div>
        {[
          { name: 'Identify', score: 42 },
          { name: 'Protect',  score: 55 },
          { name: 'Detect',   score: 30 },
          { name: 'Respond',  score: 25 },
          { name: 'Recover',  score: 38 },
        ].map(item => (
          <div key={item.name} style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: '#555' }}>{item.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: item.score < 40 ? '#ff4d4f' : '#333' }}>
                {item.score}
              </span>
            </div>
            <div style={{ background: '#e9ecef', borderRadius: 3, height: 5 }}>
              <div style={{
                width: `${item.score}%`, height: '100%', borderRadius: 3,
                background: item.score < 40 ? '#ff4d4f' : item.score < 60 ? '#fa8c16' : '#52c41a',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Gap siyahısı */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#333' }}>
          {type === 'executive' ? 'Top 3 Gap' : 'Aşkar Edilən Boşluqlar'}
        </div>
        {(type === 'executive' ? MOCK_GAPS.slice(0, 3) : MOCK_GAPS).map((gap, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', background: '#f8f9fa',
            borderRadius: 5, marginBottom: 5,
            borderLeft: `3px solid ${SEVERITY_COLOR[gap.severity]}`,
            flexWrap: 'wrap',
          }}>
            <span style={{
              background: SEVERITY_COLOR[gap.severity], color: '#fff',
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
            }}>
              {gap.severity}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: '#333', minWidth: 120 }}>{gap.title}</span>
            <span style={{ fontSize: 11, color: '#888' }}>Impact: {gap.impact}</span>
          </div>
        ))}
      </div>

      {/* C-level / executive fix summary */}
      {type !== 'technical' && (
        <div style={{ background: '#f0f9f0', borderRadius: 8, padding: 12, border: '1px solid #b7eb8f' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#389e0d', marginBottom: 6 }}>
            ✅ Tövsiyə Olunan Addımlar
          </div>
          {['RDP-ni dərhal VPN arxasına aparın (4 saat)', 'MFA tətbiq edin (8 saat)', 'TLS 1.0 disable edin (2 saat)'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 2 }} />
              <span style={{ fontSize: 11, color: '#555' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Technical MITRE */}
      {type === 'technical' && (
        <div style={{ background: '#f0f0ff', borderRadius: 8, padding: 12, border: '1px solid #d3adf7' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#722ed1', marginBottom: 6 }}>🔬 MITRE ATT&CK Mapping</div>
          {[
            { tech: 'T1133', name: 'External Remote Services', tactic: 'Initial Access'       },
            { tech: 'T1078', name: 'Valid Accounts',           tactic: 'Privilege Escalation' },
            { tech: 'T1557', name: 'Adversary-in-the-Middle',  tactic: 'Collection'           },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 4, fontSize: 11, color: '#555', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#722ed1', minWidth: 50 }}>{m.tech}</span>
              <span style={{ flex: 1 }}>{m.name}</span>
              <span style={{ color: '#aaa' }}>{m.tactic}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 20, paddingTop: 10, borderTop: '1px solid #e9ecef',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
        color: '#aaa', fontSize: 9, gap: 4,
      }}>
        <span>NoVuln.CyberGap — Gizli Hesabat</span>
        <span>{t.pages} səhifə</span>
        <span>© 2025 NoVuln Security</span>
      </div>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Report() {
  const [selectedType, setSelectedType] = useState('clevel')
  const [generating,   setGenerating]   = useState(false)
  const previewRef = useRef()

  const currentType = REPORT_TYPES.find(r => r.key === selectedType)

  // ── PDF yüklə — browser save dialog açır ──
  async function handleDownload() {
    if (!previewRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale:           2,
        useCORS:         true,
        backgroundColor: '#ffffff',
        logging:         false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW    = pdf.internal.pageSize.getWidth()
      const pdfH    = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      // save() → brauzer "Saxla" dialoqu açır
      pdf.save(`NoVuln_${currentType.label}_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      console.error('PDF xətası:', err)
    }
    setGenerating(false)
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 16 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>📄 PDF Hesabat</div>
        <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
          Hesabat növünü seçin, preview görün, yükləyin
        </div>
      </div>

      {/* Responsive layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 300px) 1fr',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* ── Sol — Seçimlər ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tip seçimi */}
          <div style={{ background: '#141414', borderRadius: 12, padding: 16, border: '1px solid #1f1f1f' }}>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Hesabat Növü</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REPORT_TYPES.map(type => (
                <motion.div
                  key={type.key}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedType(type.key)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    border:  `1px solid ${selectedType === type.key ? type.color : '#2a2a2a'}`,
                    background: selectedType === type.key ? `${type.color}18` : '#1a1a1a',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: type.color, fontSize: 14 }}>{type.icon}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, flex: 1 }}>{type.label}</span>
                    <Tag style={{ fontSize: 10, margin: 0 }}>{type.pages} səh.</Tag>
                  </div>
                  <div style={{ color: '#888', fontSize: 11 }}>{type.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bu hesabatda */}
          <div style={{ background: '#141414', borderRadius: 12, padding: 16, border: '1px solid #1f1f1f' }}>
            <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>Bu hesabatda:</div>
            {currentType.sections.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <CheckCircleOutlined style={{ color: currentType.color, fontSize: 12 }} />
                <span style={{ color: '#ccc', fontSize: 12 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Yüklə düyməsi */}
          <Button
            type="primary"
            size="large"
            block
            loading={generating}
            onClick={handleDownload}
            icon={generating ? <LoadingOutlined /> : <DownloadOutlined />}
            style={{
              background:  currentType.color,
              borderColor: currentType.color,
              height: 46, fontSize: 14,
            }}
          >
            {generating ? 'PDF hazırlanır...' : `Yüklə — ${currentType.label}`}
          </Button>

          {/* Məlumat */}
          <div style={{
            background: '#141414', borderRadius: 8, padding: 12,
            border: '1px solid #1f1f1f', color: '#666', fontSize: 11, lineHeight: 1.5,
          }}>
            💡 "Yüklə" düyməsinə basın → brauzer saxlama dialoqu açılacaq → fayl adını seçib yadda saxlayın.
          </div>
        </div>

        {/* ── Sağ — Preview ── */}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>
            📋 Preview —{' '}
            <span style={{ color: currentType.color }}>{currentType.label}</span>
          </div>

          {/* Preview wrapper — scroll yox, tam göstər */}
          <div style={{
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
            border: '1px solid #2a2a2a',
          }}>
            <PDFPreview type={selectedType} previewRef={previewRef} />
          </div>
        </div>
      </div>
    </div>
  )
}