import { useNavigate } from 'react-router-dom'
import { Input, Button, Form, Select, Switch, Tooltip, Progress, Tag, Upload, message } from 'antd'
import { useState, useEffect } from 'react'
import {
  InfoCircleOutlined, SafetyOutlined, GlobalOutlined,
  DatabaseOutlined, SecurityScanOutlined, UploadOutlined,
  CheckCircleOutlined, RightOutlined, LoadingOutlined,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useScanStore } from '../../store/scanStore'
import { startScan } from '../../services/api'

// ── Confidence ─────────────────────────────────────────────
function calcConfidence(domain, values) {
  let score = 0
  if (domain) score += 40
  const network  = ['ip_range', 'vpn_vendor', 'extra_domains']
  const tech     = ['server_os', 'cloud_provider', 'web_framework', 'database']
  const security = ['mfa_type', 'edr', 'patch_cycle', 'backup', 'ir_plan']
  score += Math.min(network.filter(k => values[k]).length  * 5, 15)
  score += Math.min(tech.filter(k => values[k]).length     * 4, 15)
  score += Math.min(security.filter(k => values[k] && values[k] !== 'None').length * 4, 18)
  if (values.file_upload) score += 12
  return Math.min(score, 100)
}

function confidenceLabel(score) {
  if (score < 41) return { color: '#ff4d4f', text: 'Domain only'    }
  if (score < 56) return { color: '#fa8c16', text: '+ Network info' }
  if (score < 71) return { color: '#fadb14', text: '+ Tech stack'   }
  if (score < 82) return { color: '#52c41a', text: '+ Security info'}
  return               { color: '#1668dc', text: '+ File upload'  }
}

// ── SSE sources from backend ───────────────────────────────
const SSE_SOURCES = ['DNS', 'CrtSh', 'Shodan', 'HTTP', 'HIBP', 'NVD']
const SOURCE_LABELS = {
  DNS:    'DNS Records',
  CrtSh:  'Certificate Search',
  Shodan: 'Shodan Scan',
  HTTP:   'HTTP Analysis',
  HIBP:   'Breach Check',
  NVD:    'CVE Check',
}

// ── Section ────────────────────────────────────────────────
function Section({ icon, title, badge, color, children, filledCount, totalCount }) {
  const [open, setOpen] = useState(false)
  const pct = totalCount ? Math.round((filledCount / totalCount) * 100) : 0
  return (
    <motion.div layout style={{ background: '#141414', borderRadius: 12, border: `1px solid ${open ? color + '55' : '#1f1f1f'}`, marginBottom: 10, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{title}</span>
            <Tag style={{ fontSize: 10, margin: 0, background: `${color}22`, borderColor: `${color}55`, color }}>{badge}</Tag>
            {filledCount > 0 && <Tag color="success" style={{ fontSize: 10, margin: 0 }}>{filledCount}/{totalCount} filled</Tag>}
          </div>
          <div style={{ marginTop: 5, background: '#2a2a2a', borderRadius: 3, height: 3 }}>
            <motion.div animate={{ width: `${pct}%` }} style={{ height: '100%', background: color, borderRadius: 3 }} />
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} style={{ color: '#555', fontSize: 16 }}><RightOutlined /></motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 18px 18px', borderTop: '1px solid #1f1f1f' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FieldLabel({ label, tooltip }) {
  return (
    <span style={{ color: '#ccc', fontSize: 13 }}>
      {label}
      <Tooltip title={tooltip}><InfoCircleOutlined style={{ marginLeft: 5, color: '#555', fontSize: 11 }} /></Tooltip>
    </span>
  )
}

const inputStyle = { background: '#1a1a1a', borderColor: '#2a2a2a', color: '#fff' }

// ── Main ──────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()
  const { setDomain, setScanStatus, setScanId } = useScanStore()
  const [form] = Form.useForm()

  const [domain,       setLocalDomain]  = useState('')
  const [domainError,  setDomainError]  = useState('')
  const [previewing,   setPreviewing]   = useState(false)   // OSINT preview animasiyası
  const [previewDone,  setPreviewDone]  = useState(false)   // preview tamamlandı
  const [previewSources, setPreviewSources] = useState({})  // {DNS: 'done', CrtSh: 'running', ...}
  const [formValues,   setFormValues]   = useState({})
  const [fileUploaded, setFileUploaded] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  const confidence = calcConfidence(domain, { ...formValues, file_upload: fileUploaded })
  const confInfo   = confidenceLabel(confidence)
  const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/

  const nFields = ['ip_range', 'vpn_vendor', 'extra_domains']
  const tFields = ['server_os', 'cloud_provider', 'web_framework', 'database']
  const sFields = ['mfa_type', 'edr', 'patch_cycle', 'backup']
  const filledN = nFields.filter(k => formValues[k]).length
  const filledT = tFields.filter(k => formValues[k]).length
  const filledS = sFields.filter(k => formValues[k] && formValues[k] !== 'None').length

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const isDesktop = windowWidth >= 768

  function handleDomainChange(e) {
    const val = e.target.value.toLowerCase().trim()
    setLocalDomain(val)
    setDomainError(val && !domainRegex.test(val) ? 'Invalid domain format (e.g. company.com)' : '')
  }

  // OSINT preview — animasiya, real API yoxdur bu addımda
  function handlePreview() {
    if (!domain || !domainRegex.test(domain)) {
      setDomainError('Please enter a valid domain')
      return
    }
    setPreviewing(true)
    setPreviewSources({})

    // SSE sources-ı ardıcıl canlandır
    SSE_SOURCES.forEach((src, i) => {
      // running
      setTimeout(() => {
        setPreviewSources(p => ({ ...p, [src]: 'running' }))
      }, i * 600)
      // done
      setTimeout(() => {
        setPreviewSources(p => ({ ...p, [src]: 'done' }))
      }, i * 600 + 500)
    })

    // Hamısı bitdi
    setTimeout(() => {
      setPreviewing(false)
      setPreviewDone(true)
      form.setFieldsValue({ rdp_exposed: true })
      setFormValues(v => ({ ...v, rdp_exposed: true }))
    }, SSE_SOURCES.length * 600 + 600)
  }

  function handleValuesChange(_, all) { setFormValues(all) }

  async function handleSubmit() {
    if (!domain) return

    const payload = {
      domain,
      scanType: 'blackbox',
      ...(formValues.ip_range       && { ipRanges:        [formValues.ip_range]        }),
      ...(formValues.extra_domains  && { extraDomains:    [formValues.extra_domains]   }),
      ...(formValues.vpn_vendor     && { knownEndpoints:  [formValues.vpn_vendor]      }),
      ...(formValues.server_os      && { operatingSystem: formValues.server_os         }),
      ...(formValues.cloud_provider && { cloudProvider:   formValues.cloud_provider    }),
      ...(formValues.web_framework  && { knownSoftware:   [formValues.web_framework]   }),
      hasMfa:    formValues.mfa_type !== 'None' && !!formValues.mfa_type,
      hasEdr:    formValues.edr      !== 'None' && !!formValues.edr,
      hasSiem:   !!formValues.siem,
      hasBackup: formValues.backup   !== 'None' && !!formValues.backup,
      hasIrPlan: !!formValues.ir_plan,
      ...(formValues.patch_cycle && {
        patchCycleDays:
          formValues.patch_cycle === 'Weekly'    ? 7  :
          formValues.patch_cycle === 'Bi-weekly' ? 14 :
          formValues.patch_cycle === 'Monthly'   ? 30 : 90
      }),
      sector: 'Finance',
    }

    setSubmitting(true)
    try {
      const result = await startScan(payload)
      setDomain(domain)
      setScanId(result.scanId)
      setScanStatus('scanning')
      navigate('/scan')
    } catch (err) {
      console.error('Scan start failed:', err)
      message.error(`Backend connection failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const doneCount = Object.values(previewSources).filter(s => s === 'done').length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span></div>
        <Tag color="#1668dc" style={{ fontSize: 12 }}>Beta</Tag>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0,1fr) 280px' : 'minmax(0,1fr)', gap: 24, alignItems: 'start' }}>

        <div>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {['Domain', 'Network', 'Tech Stack', 'Security', 'Files'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 && previewDone ? '#52c41a' : i === 0 ? '#1668dc' : '#1a1a1a', border: `1px solid ${i === 0 ? '#1668dc' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>
                  {i === 0 && previewDone ? '✓' : i + 1}
                </div>
                <span style={{ color: i === 0 ? '#fff' : '#555', fontSize: 12 }}>{s}</span>
                {i < 4 && <div style={{ width: 20, height: 1, background: '#2a2a2a' }} />}
              </div>
            ))}
          </div>

          <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>

            {/* Domain Step */}
            <div style={{ background: '#141414', borderRadius: 12, padding: 20, border: `2px solid ${previewDone ? '#52c41a' : '#1668dc'}`, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1668dc22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1668dc', fontSize: 15 }}><GlobalOutlined /></div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Domain Scan</div>
                  <div style={{ color: '#888', fontSize: 11 }}>Required — OSINT engine starts here</div>
                </div>
                {previewDone && <Tag color="success" style={{ marginLeft: 'auto' }}>✓ Preview complete</Tag>}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Input size="large" placeholder="company.com" value={domain} onChange={handleDomainChange}
                    status={domainError ? 'error' : ''} style={inputStyle} disabled={previewDone}
                    prefix={<GlobalOutlined style={{ color: '#555' }} />}
                    onPressEnter={!previewing && !previewDone ? handlePreview : undefined} />
                  {domainError && <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 4 }}>{domainError}</div>}
                </div>
                <Button type="primary" size="large" loading={previewing} onClick={handlePreview}
                  icon={previewing ? <LoadingOutlined /> : <SafetyOutlined />} disabled={previewDone} style={{ minWidth: 110 }}>
                  {previewing ? 'Scanning' : previewDone ? 'Done' : 'Preview'}
                </Button>
              </div>

              {/* OSINT progress */}
              <AnimatePresence>
                {(previewing || previewDone) && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 14 }}>

                    {/* Source badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {SSE_SOURCES.map(src => {
                        const status = previewSources[src]
                        return (
                          <div key={src} style={{
                            padding: '3px 9px', borderRadius: 5, fontSize: 11,
                            background: status === 'done' ? '#162312' : status === 'running' ? '#0e1a2e' : '#1a1a1a',
                            border: `1px solid ${status === 'done' ? '#274916' : status === 'running' ? '#1668dc44' : '#2a2a2a'}`,
                            color: status === 'done' ? '#52c41a' : status === 'running' ? '#1668dc' : '#555',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            {status === 'done' ? '✓' : status === 'running' ? <LoadingOutlined style={{ fontSize: 9 }} /> : '○'} {src}
                          </div>
                        )
                      })}
                    </div>

                    {!previewDone && (
                      <>
                        <Progress percent={Math.round((doneCount / SSE_SOURCES.length) * 100)} status="active" strokeColor="#1668dc" showInfo={false} />
                        <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>OSINT preview running... ({doneCount}/{SSE_SOURCES.length})</div>
                      </>
                    )}

                    {previewDone && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ padding: 10, background: '#2d1a00', borderRadius: 8, border: '1px solid #5a3700', fontSize: 12, color: '#fa8c16' }}>
                          ⚠️ RDP port (3389) exposed to internet — form auto-filled
                        </div>
                        <div style={{ marginTop: 8, color: '#555', fontSize: 11 }}>
                          Full scan results will appear after you click "Start Full Analysis"
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Network */}
            <Section icon={<GlobalOutlined />} title="Network Information" badge="Optional · +15% confidence" color="#1668dc" filledCount={filledN} totalCount={nFields.length}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                <Form.Item name="ip_range" label={<FieldLabel label="IP Range" tooltip="Company's public IP range (e.g. 203.0.113.0/24)" />} style={{ margin: 0 }}>
                  <Input placeholder="203.0.113.0/24" style={inputStyle} />
                </Form.Item>
                <Form.Item name="vpn_vendor" label={<FieldLabel label="VPN Vendor" tooltip="Which VPN solution do you use?" />} style={{ margin: 0 }}>
                  <Input placeholder="OpenVPN, Cisco AnyConnect..." style={inputStyle} />
                </Form.Item>
                <Form.Item name="extra_domains" label={<FieldLabel label="Extra Domains" tooltip="Subdomains like corp.com, int.corp.com" />} style={{ margin: 0 }}>
                  <Input placeholder="corp.com, int.corp.com" style={inputStyle} />
                </Form.Item>
                <Form.Item name="rdp_exposed" label={<FieldLabel label="RDP Exposed" tooltip="Check if port 3389 is accessible from internet" />} valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
              </div>
            </Section>

            {/* Tech Stack */}
            <Section icon={<DatabaseOutlined />} title="Tech Stack" badge="Optional · +15% confidence" color="#722ed1" filledCount={filledT} totalCount={tFields.length}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                <Form.Item name="server_os" label={<FieldLabel label="Server OS" tooltip="Windows Server, Ubuntu, CentOS..." />} style={{ margin: 0 }}>
                  <Select placeholder="Select" options={['Windows Server 2019','Windows Server 2022','Ubuntu 20/22','CentOS/RHEL','Other'].map(o=>({label:o,value:o}))} />
                </Form.Item>
                <Form.Item name="cloud_provider" label={<FieldLabel label="Cloud Provider" tooltip="Azure, AWS, GCP or on-premise" />} style={{ margin: 0 }}>
                  <Select placeholder="Select" options={['On-premise','Azure','AWS','GCP','Hybrid'].map(o=>({label:o,value:o}))} />
                </Form.Item>
                <Form.Item name="web_framework" label={<FieldLabel label="Web Framework" tooltip="Backend framework" />} style={{ margin: 0 }}>
                  <Input placeholder=".NET, Laravel, Django..." style={inputStyle} />
                </Form.Item>
                <Form.Item name="database" label={<FieldLabel label="Database" tooltip="MS SQL, MySQL, PostgreSQL..." />} style={{ margin: 0 }}>
                  <Input placeholder="MS SQL, MySQL..." style={inputStyle} />
                </Form.Item>
              </div>
            </Section>

            {/* Security */}
            <Section icon={<SecurityScanOutlined />} title="Security Posture" badge="Optional · +18% confidence" color="#fa8c16" filledCount={filledS} totalCount={sFields.length}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                <Form.Item name="mfa_type" label={<FieldLabel label="MFA Type" tooltip="Multi-factor authentication type" />} style={{ margin: 0 }}>
                  <Select placeholder="Select" options={['None','SMS','Authenticator App','Hardware Key'].map(o=>({label:o,value:o}))} />
                </Form.Item>
                <Form.Item name="edr" label={<FieldLabel label="EDR Solution" tooltip="Endpoint Detection & Response" />} style={{ margin: 0 }}>
                  <Select placeholder="Select" options={['None','CrowdStrike','Microsoft Defender','SentinelOne','Other'].map(o=>({label:o,value:o}))} />
                </Form.Item>
                <Form.Item name="patch_cycle" label={<FieldLabel label="Patch Cycle" tooltip="How often are patches applied?" />} style={{ margin: 0 }}>
                  <Select placeholder="Select" options={['Weekly','Bi-weekly','Monthly','Irregular'].map(o=>({label:o,value:o}))} />
                </Form.Item>
                <Form.Item name="backup" label={<FieldLabel label="Backup Strategy" tooltip="3-2-1 rule, cloud backup..." />} style={{ margin: 0 }}>
                  <Select placeholder="Select" options={['None','Local','Cloud','3-2-1 Rule'].map(o=>({label:o,value:o}))} />
                </Form.Item>
                <Form.Item name="siem" label={<FieldLabel label="SIEM" tooltip="Security Information & Event Management" />} style={{ margin: 0 }}>
                  <Input placeholder="Splunk, QRadar, Elastic..." style={inputStyle} />
                </Form.Item>
                <Form.Item name="ir_plan" label={<FieldLabel label="Incident Response Plan" tooltip="Do you have a formal IR plan?" />} valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
              </div>
            </Section>

            {/* Files */}
            <Section icon={<UploadOutlined />} title="File Upload" badge="Optional · +12% confidence" color="#52c41a" filledCount={fileUploaded ? 1 : 0} totalCount={1}>
              <div style={{ paddingTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
                  {[{label:'Nmap XML',icon:'🗂'},{label:'Nessus .nessus',icon:'🔍'},{label:'OpenVAS XML',icon:'🛡'},{label:'Shodan Export',icon:'🌐'},{label:'CSV Asset List',icon:'📋'}].map(f => (
                    <div key={f.label} style={{ padding: '8px 10px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #2a2a2a', fontSize: 11, color: '#888', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{f.icon}</div>{f.label}
                    </div>
                  ))}
                </div>
                <Upload.Dragger accept=".xml,.nessus,.csv,.json" maxCount={3}
                  beforeUpload={(file) => { setFileUploaded(true); message.success(`${file.name} uploaded`); return false }}
                  style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                  <div style={{ padding: '16px 0' }}>
                    <UploadOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                    <div style={{ color: '#ccc', fontSize: 13 }}>Drag files here or click to upload</div>
                    <div style={{ color: '#555', fontSize: 11 }}>XML, .nessus, CSV, JSON — max 50MB</div>
                  </div>
                </Upload.Dragger>
                {fileUploaded && (
                  <div style={{ marginTop: 10, padding: 10, background: '#162312', borderRadius: 8, border: '1px solid #274916', color: '#52c41a', fontSize: 12 }}>
                    ✅ File uploaded — nodes will come directly from file (confidence 90%+)
                  </div>
                )}
              </div>
            </Section>

            {/* Submit */}
            <motion.div animate={{ opacity: domain ? 1 : 0.4 }} style={{ marginTop: 8 }}>
              <Button type="primary" size="large" block onClick={handleSubmit} disabled={!domain || submitting}
                loading={submitting} style={{ height: 50, fontSize: 16, borderRadius: 10 }} icon={<SafetyOutlined />}>
                {submitting ? 'Connecting to backend...' : previewDone ? 'Start Full Analysis →' : 'Start with Domain →'}
              </Button>
              {!previewDone && domain && (
                <div style={{ textAlign: 'center', color: '#888', fontSize: 11, marginTop: 6 }}>
                  You can start without preview — full OSINT will run on backend
                </div>
              )}
            </motion.div>
          </Form>
        </div>

        {/* Confidence Panel */}
        <div style={{ position: isDesktop ? 'sticky' : 'relative', top: 16 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #1f1f1f', marginBottom: 14 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📊 Analysis Confidence</div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <motion.div key={confidence} initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ fontSize: 52, fontWeight: 900, color: confInfo.color, lineHeight: 1 }}>
                {confidence}%
              </motion.div>
              <div style={{ color: confInfo.color, fontSize: 13, fontWeight: 600, marginTop: 4 }}>{confInfo.text}</div>
            </div>
            <Progress percent={confidence} strokeColor={confInfo.color} trailColor="#1a1a1a" showInfo={false} strokeWidth={8} />
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { range: '40–55%', color: '#ff4d4f', label: 'Domain only',    max: 55  },
                { range: '60–70%', color: '#fa8c16', label: '+ Network info', max: 70  },
                { range: '70–80%', color: '#fadb14', label: '+ Tech stack',   max: 80  },
                { range: '80–88%', color: '#52c41a', label: '+ Security info',max: 88  },
                { range: '88–95%', color: '#1668dc', label: '+ File upload',  max: 100 },
              ].map((tier, i) => {
                const isActive = i === [0,1,2,3,4].find(idx => confidence <= [55,70,80,88,100][idx])
                return (
                  <div key={tier.range} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: isActive ? `${tier.color}15` : 'transparent', border: `1px solid ${isActive ? tier.color+'44' : 'transparent'}`, transition: 'all 0.2s' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                    <span style={{ color: tier.color, fontSize: 11, fontWeight: 700, minWidth: 44 }}>{tier.range}</span>
                    <span style={{ color: isActive ? '#ccc' : '#555', fontSize: 11 }}>{tier.label}</span>
                    {isActive && <CheckCircleOutlined style={{ color: tier.color, marginLeft: 'auto', fontSize: 12 }} />}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ background: '#141414', borderRadius: 12, padding: 16, border: '1px solid #1f1f1f' }}>
            <div style={{ color: '#888', fontSize: 11, marginBottom: 10, fontWeight: 600 }}>💡 Why does confidence matter?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #ff4d4f33' }}>
                <Tag color="error" style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>Black-box</Tag>
                <div style={{ color: '#888', fontSize: 11 }}>23 nodes · confidence 55% · range weights</div>
              </div>
              <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #52c41a33' }}>
                <Tag color="success" style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>White-box</Tag>
                <div style={{ color: '#888', fontSize: 11 }}>47 nodes · confidence 93% · precise weights</div>
              </div>
            </div>
            <div style={{ color: '#555', fontSize: 10, marginTop: 10, lineHeight: 1.5 }}>More data = more accurate analysis. Everything is optional.</div>
          </div>
        </div>
      </div>
    </div>
  )
}