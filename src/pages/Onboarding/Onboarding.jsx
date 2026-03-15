import { useNavigate } from 'react-router-dom'
import {
    Input, Button, Form, Select, Switch,
    Tooltip, Progress, Tag, Upload, message,
} from 'antd'
import { useState, useEffect } from 'react'
import {
    InfoCircleOutlined, SafetyOutlined,
    GlobalOutlined, DatabaseOutlined,
    SecurityScanOutlined, UploadOutlined,
    CheckCircleOutlined, RightOutlined,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useScanStore } from '../../store/scanStore'

// ── Confidence hesabla ─────────────────────────────────────
function calcConfidence(domain, values) {
    let score = 0
    if (domain) score += 40

    const network = ['ip_range', 'vpn_vendor', 'extra_domains']
    const tech = ['server_os', 'cloud_provider', 'web_framework', 'database']
    const security = ['mfa_type', 'edr', 'patch_cycle', 'backup', 'ir_plan']

    const filledNetwork = network.filter(k => values[k]).length
    const filledTech = tech.filter(k => values[k]).length
    const filledSecurity = security.filter(k => values[k] && values[k] !== 'Yoxdur').length

    score += Math.min(filledNetwork * 5, 15)
    score += Math.min(filledTech * 4, 15)
    score += Math.min(filledSecurity * 4, 18)
    if (values.file_upload) score += 12

    return Math.min(score, 100)
}

function confidenceLabel(score) {
    if (score < 41) return { label: '40–55%', color: '#ff4d4f', text: 'Yalnız domain' }
    if (score < 56) return { label: '60–70%', color: '#fa8c16', text: '+ Şəbəkə info' }
    if (score < 71) return { label: '70–80%', color: '#fadb14', text: '+ Tech stack' }
    if (score < 82) return { label: '80–88%', color: '#52c41a', text: '+ Security info' }
    return { label: '88–95%', color: '#1668dc', text: '+ Fayl upload' }
}

// ── Section Component ─────────────────────────────────────
function Section({ icon, title, badge, color, children, filledCount, totalCount }) {
    const [open, setOpen] = useState(false)
    const pct = totalCount ? Math.round((filledCount / totalCount) * 100) : 0

    return (
        <motion.div
            layout
            style={{
                background: '#141414',
                borderRadius: 12,
                border: `1px solid ${open ? color + '55' : '#1f1f1f'}`,
                marginBottom: 10,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
            }}
        >
            {/* Header */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    cursor: 'pointer',
                }}
            >
                <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: `${color}22`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color,
                }}>
                    {icon}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{title}</span>
                        <Tag style={{ fontSize: 10, margin: 0, background: `${color}22`, borderColor: `${color}55`, color }}>
                            {badge}
                        </Tag>
                        {filledCount > 0 && (
                            <Tag color="success" style={{ fontSize: 10, margin: 0 }}>
                                {filledCount}/{totalCount} dolduruldu
                            </Tag>
                        )}
                    </div>
                    {/* Mini progress */}
                    <div style={{ marginTop: 5, background: '#2a2a2a', borderRadius: 3, height: 3 }}>
                        <motion.div
                            animate={{ width: `${pct}%` }}
                            style={{ height: '100%', background: color, borderRadius: 3 }}
                        />
                    </div>
                </div>

                <motion.div animate={{ rotate: open ? 90 : 0 }} style={{ color: '#555', fontSize: 16 }}>
                    <RightOutlined />
                </motion.div>
            </div>

            {/* Content */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #1f1f1f' }}>
                            {children}
                        </div>
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
            <Tooltip title={tooltip}>
                <InfoCircleOutlined style={{ marginLeft: 5, color: '#555', fontSize: 11 }} />
            </Tooltip>
        </span>
    )
}

const inputStyle = { background: '#1a1a1a', borderColor: '#2a2a2a', color: '#fff' }

// ── Main ──────────────────────────────────────────────────
export default function Onboarding() {
    const navigate = useNavigate()
    const { setDomain, setScanStatus } = useScanStore()
    const [form] = Form.useForm()

    const [domain, setLocalDomain] = useState('')
    const [domainError, setDomainError] = useState('')
    const [scanning, setScanning] = useState(false)
    const [scanDone, setScanDone] = useState(false)
    const [formValues, setFormValues] = useState({})
    const [fileUploaded, setFileUploaded] = useState(false)

    const confidence = calcConfidence(domain, { ...formValues, file_upload: fileUploaded })
    const confInfo = confidenceLabel(confidence)

    const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/

    function handleDomainChange(e) {
        const val = e.target.value.toLowerCase().trim()
        setLocalDomain(val)
        setDomainError(val && !domainRegex.test(val) ? 'Domain düzgün formatda deyil (məs: company.com)' : '')
    }

    function handleScan() {
        if (!domain || !domainRegex.test(domain)) {
            setDomainError('Zəhmət olmasa düzgün domain daxil edin')
            return
        }
        setScanning(true)
        setTimeout(() => {
            setScanning(false)
            setScanDone(true)
            form.setFieldsValue({ rdp_exposed: true })
            setFormValues(v => ({ ...v, rdp_exposed: true }))
        }, 2500)
    }

    function handleValuesChange(_, all) {
        setFormValues(all)
    }

    function handleSubmit() {
        setDomain(domain)
        setScanStatus('scanning')
        navigate('/scan')
    }

    // Filled counts per section
    const nFields = ['ip_range', 'vpn_vendor', 'extra_domains']
    const tFields = ['server_os', 'cloud_provider', 'web_framework', 'database']
    const sFields = ['mfa_type', 'edr', 'patch_cycle', 'backup']
    const filledN = nFields.filter(k => formValues[k]).length
    const filledT = tFields.filter(k => formValues[k]).length
    const filledS = sFields.filter(k => formValues[k] && formValues[k] !== 'Yoxdur').length
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handler = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])
    const isDesktop = windowWidth >= 768
    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>

            {/* ── Top nav bar ── */}
            <div style={{
                borderBottom: '1px solid #1a1a1a',
                padding: '14px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span>
                </div>
                <Tag color="#1668dc" style={{ fontSize: 12 }}>Beta</Tag>
            </div>

            {/* ── Main content ── */}
            <div style={{
                maxWidth: 1100,
                margin: '0 auto',
                padding: '24px 16px',
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'minmax(0,1fr) 280px' : 'minmax(0,1fr)',
                gap: 24,
                alignItems: 'start',
            }}>

                {/* ── Sol — Form ── */}
                <div>

                    {/* Step indicator */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
                        {['Domain', 'Şəbəkə', 'Tech Stack', 'Security', 'Fayl'].map((s, i) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: i === 0 && scanDone ? '#52c41a' : i === 0 ? '#1668dc' : '#1a1a1a',
                                    border: `1px solid ${i === 0 ? '#1668dc' : '#2a2a2a'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, color: '#fff', fontWeight: 700,
                                }}>
                                    {i === 0 && scanDone ? '✓' : i + 1}
                                </div>
                                <span style={{ color: i === 0 ? '#fff' : '#555', fontSize: 12 }}>{s}</span>
                                {i < 4 && <div style={{ width: 20, height: 1, background: '#2a2a2a' }} />}
                            </div>
                        ))}
                    </div>

                    <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>

                        {/* ── STEP 1: Domain ── */}
                        <div style={{
                            background: '#141414', borderRadius: 12, padding: 20,
                            border: `2px solid ${scanDone ? '#52c41a' : '#1668dc'}`,
                            marginBottom: 12,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: '#1668dc22', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#1668dc', fontSize: 15,
                                }}>
                                    <GlobalOutlined />
                                </div>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Domain Skanı</div>
                                    <div style={{ color: '#888', fontSize: 11 }}>Məcburi — OSINT engine buradan başlayır</div>
                                </div>
                                {scanDone && <Tag color="success" style={{ marginLeft: 'auto' }}>✓ Skan tamamlandı</Tag>}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <Input
                                        size="large"
                                        placeholder="bakicorp.az"
                                        value={domain}
                                        onChange={handleDomainChange}
                                        status={domainError ? 'error' : ''}
                                        style={inputStyle}
                                        disabled={scanDone}
                                        prefix={<GlobalOutlined style={{ color: '#555' }} />}
                                        onPressEnter={!scanning && !scanDone ? handleScan : undefined}
                                    />
                                    {domainError && (
                                        <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 4 }}>{domainError}</div>
                                    )}
                                </div>
                                <Button
                                    type="primary" size="large"
                                    loading={scanning} onClick={handleScan}
                                    icon={<SafetyOutlined />}
                                    disabled={scanDone}
                                    style={{ minWidth: 110 }}
                                >
                                    {scanning ? 'Skanlanır' : scanDone ? 'Tamamlandı' : 'Skan Et'}
                                </Button>
                            </div>

                            <AnimatePresence>
                                {scanning && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        style={{ marginTop: 14 }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            {['DNS', 'crt.sh', 'Shodan', 'NVD', 'HIBP', 'HTTP'].map((src, i) => (
                                                <div key={src} style={{
                                                    padding: '3px 8px', borderRadius: 5, fontSize: 11,
                                                    background: i < 2 ? '#162312' : i === 2 ? '#2d1a00' : '#1a1a1a',
                                                    border: `1px solid ${i < 2 ? '#274916' : i === 2 ? '#5a3700' : '#2a2a2a'}`,
                                                    color: i < 2 ? '#52c41a' : i === 2 ? '#fa8c16' : '#555',
                                                }}>
                                                    {i < 2 ? '✓ ' : i === 2 ? '⏳ ' : '○ '}{src}
                                                </div>
                                            ))}
                                        </div>
                                        <Progress percent={45} status="active" strokeColor="#1668dc" showInfo={false} />
                                        <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>OSINT engine işləyir...</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {scanDone && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ marginTop: 14 }}
                                >
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                        {['DNS ✓ 5 node', 'crt.sh ✓ 18 node', 'Shodan ✓', 'NVD ✓', 'HIBP ✓', 'HTTP ✓'].map(s => (
                                            <Tag key={s} color="success" style={{ fontSize: 10 }}>{s}</Tag>
                                        ))}
                                    </div>
                                    <div style={{
                                        padding: 10, background: '#2d1a00', borderRadius: 8,
                                        border: '1px solid #5a3700', fontSize: 12, color: '#fa8c16',
                                    }}>
                                        ⚠️ RDP portu (3389) internete açıq aşkarlandı — forma avtomatik işarələndi
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* ── STEP 2: Şəbəkə ── */}
                        <Section
                            icon={<GlobalOutlined />}
                            title="Şəbəkə Məlumatları"
                            badge="Optional · +15% confidence"
                            color="#1668dc"
                            filledCount={filledN}
                            totalCount={nFields.length}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                                <Form.Item name="ip_range" label={<FieldLabel label="IP Range" tooltip="Şirkətin public IP aralığı (məs: 203.0.113.0/24)" />} style={{ margin: 0 }}>
                                    <Input placeholder="203.0.113.0/24" style={inputStyle} />
                                </Form.Item>
                                <Form.Item name="vpn_vendor" label={<FieldLabel label="VPN Vendor" tooltip="Hansı VPN həllindən istifadə edirsiniz?" />} style={{ margin: 0 }}>
                                    <Input placeholder="OpenVPN, Cisco AnyConnect..." style={inputStyle} />
                                </Form.Item>
                                <Form.Item name="extra_domains" label={<FieldLabel label="Əlavə Domainlər" tooltip="corp.az, int.az kimi subdomain-lər" />} style={{ margin: 0 }}>
                                    <Input placeholder="corp.az, int.az" style={inputStyle} />
                                </Form.Item>
                                <Form.Item name="rdp_exposed" label={<FieldLabel label="RDP internete açıqdır" tooltip="Port 3389 xaricdən əlçatandırsa işarələyin" />}
                                    valuePropName="checked" style={{ margin: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Section>

                        {/* ── STEP 3: Tech Stack ── */}
                        <Section
                            icon={<DatabaseOutlined />}
                            title="Tech Stack"
                            badge="Optional · +15% confidence"
                            color="#722ed1"
                            filledCount={filledT}
                            totalCount={tFields.length}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                                <Form.Item name="server_os" label={<FieldLabel label="Server OS" tooltip="Windows Server, Ubuntu, CentOS..." />} style={{ margin: 0 }}>
                                    <Select placeholder="Seçin" style={{ background: '#1a1a1a' }}
                                        options={['Windows Server 2019', 'Windows Server 2022', 'Ubuntu 20/22', 'CentOS/RHEL', 'Digər'].map(o => ({ label: o, value: o }))} />
                                </Form.Item>
                                <Form.Item name="cloud_provider" label={<FieldLabel label="Cloud Provider" tooltip="Azure, AWS, GCP və ya on-premise" />} style={{ margin: 0 }}>
                                    <Select placeholder="Seçin" style={{ background: '#1a1a1a' }}
                                        options={['On-premise', 'Azure', 'AWS', 'GCP', 'Hybrid'].map(o => ({ label: o, value: o }))} />
                                </Form.Item>
                                <Form.Item name="web_framework" label={<FieldLabel label="Web Framework" tooltip="Backend framework" />} style={{ margin: 0 }}>
                                    <Input placeholder=".NET, Laravel, Django..." style={inputStyle} />
                                </Form.Item>
                                <Form.Item name="database" label={<FieldLabel label="Database" tooltip="MS SQL, MySQL, PostgreSQL..." />} style={{ margin: 0 }}>
                                    <Input placeholder="MS SQL, MySQL..." style={inputStyle} />
                                </Form.Item>
                            </div>
                        </Section>

                        {/* ── STEP 4: Security Posture ── */}
                        <Section
                            icon={<SecurityScanOutlined />}
                            title="Security Posture"
                            badge="Optional · +18% confidence"
                            color="#fa8c16"
                            filledCount={filledS}
                            totalCount={sFields.length}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 14 }}>
                                <Form.Item name="mfa_type" label={<FieldLabel label="MFA Növü" tooltip="Çox faktorlu doğrulama" />} style={{ margin: 0 }}>
                                    <Select placeholder="Seçin"
                                        options={['Yoxdur', 'SMS', 'Authenticator App', 'Hardware Key'].map(o => ({ label: o, value: o }))} />
                                </Form.Item>
                                <Form.Item name="edr" label={<FieldLabel label="EDR Həlli" tooltip="Endpoint Detection & Response" />} style={{ margin: 0 }}>
                                    <Select placeholder="Seçin"
                                        options={['Yoxdur', 'CrowdStrike', 'Microsoft Defender', 'SentinelOne', 'Digər'].map(o => ({ label: o, value: o }))} />
                                </Form.Item>
                                <Form.Item name="patch_cycle" label={<FieldLabel label="Patch Cycle" tooltip="Neçə gündə bir patch tətbiq edilir?" />} style={{ margin: 0 }}>
                                    <Select placeholder="Seçin"
                                        options={['Həftəlik', '2 həftəlik', 'Aylıq', 'Nizamsız'].map(o => ({ label: o, value: o }))} />
                                </Form.Item>
                                <Form.Item name="backup" label={<FieldLabel label="Backup Strategiyası" tooltip="3-2-1 rule, cloud backup..." />} style={{ margin: 0 }}>
                                    <Select placeholder="Seçin"
                                        options={['Yoxdur', 'Lokal', 'Cloud', '3-2-1 Qaydası'].map(o => ({ label: o, value: o }))} />
                                </Form.Item>
                                <Form.Item name="siem" label={<FieldLabel label="SIEM" tooltip="Security Information & Event Management" />} style={{ margin: 0 }}>
                                    <Input placeholder="Splunk, QRadar, Elastic..." style={inputStyle} />
                                </Form.Item>
                                <Form.Item name="ir_plan" label={<FieldLabel label="Incident Response Planı" tooltip="Rəsmi IR planınız var?" />}
                                    valuePropName="checked" style={{ margin: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Section>

                        {/* ── STEP 5: Fayl Upload ── */}
                        <Section
                            icon={<UploadOutlined />}
                            title="Fayl Upload"
                            badge="Optional · +12% confidence"
                            color="#52c41a"
                            filledCount={fileUploaded ? 1 : 0}
                            totalCount={1}
                        >
                            <div style={{ paddingTop: 14 }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: 8, marginBottom: 14,
                                }}>
                                    {[
                                        { label: 'Nmap XML', icon: '🗂' },
                                        { label: 'Nessus .nessus', icon: '🔍' },
                                        { label: 'OpenVAS XML', icon: '🛡' },
                                        { label: 'Shodan Export', icon: '🌐' },
                                        { label: 'CSV Asset List', icon: '📋' },
                                    ].map(f => (
                                        <div key={f.label} style={{
                                            padding: '8px 10px', background: '#1a1a1a',
                                            borderRadius: 8, border: '1px solid #2a2a2a',
                                            fontSize: 11, color: '#888', textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: 18, marginBottom: 2 }}>{f.icon}</div>
                                            {f.label}
                                        </div>
                                    ))}
                                </div>

                                <Upload.Dragger
                                    accept=".xml,.nessus,.csv,.json"
                                    maxCount={3}
                                    beforeUpload={(file) => {
                                        setFileUploaded(true)
                                        message.success(`${file.name} yükləndi`)
                                        return false
                                    }}
                                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
                                >
                                    <div style={{ padding: '16px 0' }}>
                                        <UploadOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                                        <div style={{ color: '#ccc', fontSize: 13 }}>Faylları bura sürükləyin</div>
                                        <div style={{ color: '#555', fontSize: 11 }}>XML, .nessus, CSV, JSON — maks 50MB</div>
                                    </div>
                                </Upload.Dragger>

                                {fileUploaded && (
                                    <div style={{
                                        marginTop: 10, padding: 10, background: '#162312',
                                        borderRadius: 8, border: '1px solid #274916',
                                        color: '#52c41a', fontSize: 12,
                                    }}>
                                        ✅ Fayl yükləndi — node-lar birbaşa fayldan gələcək (confidence 90%+)
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* ── Submit ── */}
                        <motion.div
                            animate={{ opacity: scanDone || domain ? 1 : 0.4 }}
                            style={{ marginTop: 8 }}
                        >
                            <Button
                                type="primary" size="large" block
                                onClick={handleSubmit}
                                disabled={!domain}
                                style={{ height: 50, fontSize: 16, borderRadius: 10 }}
                                icon={<SafetyOutlined />}
                            >
                                {scanDone ? 'Tam Analizi Başlat →' : 'Domain ilə Başlat →'}
                            </Button>
                            {!scanDone && domain && (
                                <div style={{ textAlign: 'center', color: '#888', fontSize: 11, marginTop: 6 }}>
                                    Skan etmədən də başlaya bilərsiniz — nəticə daha az dəqiq olacaq
                                </div>
                            )}
                        </motion.div>
                    </Form>
                </div>

                {/* ── Sağ — Confidence Panel ── */}
                <div style={{ position: isDesktop ? 'sticky' : 'relative', top: 16 }}>

                    {/* Confidence Score */}
                    <div style={{
                        background: '#141414', borderRadius: 12,
                        padding: 20, border: '1px solid #1f1f1f', marginBottom: 14,
                    }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                            📊 Analiz Confidence
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <motion.div
                                key={confidence}
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                style={{ fontSize: 52, fontWeight: 900, color: confInfo.color, lineHeight: 1 }}
                            >
                                {confidence}%
                            </motion.div>
                            <div style={{ color: confInfo.color, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                                {confInfo.text}
                            </div>
                        </div>

                        <Progress
                            percent={confidence}
                            strokeColor={confInfo.color}
                            trailColor="#1a1a1a"
                            showInfo={false}
                            strokeWidth={8}
                        />

                        {/* Confidence tiers */}
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[
                                { range: '40–55%', color: '#ff4d4f', label: 'Yalnız domain' },
                                { range: '60–70%', color: '#fa8c16', label: '+ Şəbəkə info' },
                                { range: '70–80%', color: '#fadb14', label: '+ Tech stack' },
                                { range: '80–88%', color: '#52c41a', label: '+ Security info' },
                                { range: '88–95%', color: '#1668dc', label: '+ Fayl upload' },
                            ].map((tier, i) => {
                                const isActive = i === [0, 1, 2, 3, 4].find(idx => confidence <= [55, 70, 80, 88, 100][idx])
                                return (
                                    <div key={tier.range} style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                                        borderRadius: 6, background: isActive ? `${tier.color}15` : 'transparent',
                                        border: `1px solid ${isActive ? tier.color + '44' : 'transparent'}`,
                                        transition: 'all 0.2s',
                                    }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                                        <span style={{ color: tier.color, fontSize: 11, fontWeight: 700, minWidth: 44 }}>{tier.range}</span>
                                        <span style={{ color: isActive ? '#ccc' : '#555', fontSize: 11 }}>{tier.label}</span>
                                        {isActive && <CheckCircleOutlined style={{ color: tier.color, marginLeft: 'auto', fontSize: 12 }} />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Tip */}
                    <div style={{
                        background: '#141414', borderRadius: 12,
                        padding: 16, border: '1px solid #1f1f1f',
                    }}>
                        <div style={{ color: '#888', fontSize: 11, marginBottom: 10, fontWeight: 600 }}>
                            💡 Confidence niyə vacibdir?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{
                                display: 'flex', gap: 10, padding: '8px 10px',
                                background: '#1a1a1a', borderRadius: 8, border: '1px solid #ff4d4f33',
                            }}>
                                <div style={{ flexShrink: 0 }}>
                                    <Tag color="error" style={{ fontSize: 10, margin: 0 }}>Black-box</Tag>
                                </div>
                                <div style={{ color: '#888', fontSize: 11 }}>23 node · confidence 55% · range weight-lər</div>
                            </div>
                            <div style={{
                                display: 'flex', gap: 10, padding: '8px 10px',
                                background: '#1a1a1a', borderRadius: 8, border: '1px solid #52c41a33',
                            }}>
                                <div style={{ flexShrink: 0 }}>
                                    <Tag color="success" style={{ fontSize: 10, margin: 0 }}>White-box</Tag>
                                </div>
                                <div style={{ color: '#888', fontSize: 11 }}>47 node · confidence 93% · dəqiq weight-lər</div>
                            </div>
                        </div>
                        <div style={{ color: '#555', fontSize: 10, marginTop: 10, lineHeight: 1.5 }}>
                            Daha çox məlumat versəniz analiz daha dəqiq olur. Hamısı optionaldır.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}