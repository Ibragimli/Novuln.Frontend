import { useEffect, useState } from 'react'
import { Badge, Button, Tag } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellOutlined, CloseOutlined,
  CheckOutlined, WarningOutlined,
  FireOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { useAlertStore } from '../store/alertStore'

const MOCK_ALERTS = [
  { id: 1, severity: 'Critical', title: 'RDP brute-force cəhdi',          time: '14:32', detail: 'IP: 185.220.101.45 — 47 uğursuz giriş cəhdi' },
  { id: 2, severity: 'High',     title: 'Yeni CVE aşkarlandı',            time: '14:28', detail: 'CVE-2024-3094 — CVSS 9.8, sisteminizdə mövcuddur' },
  { id: 3, severity: 'High',     title: 'SSL sertifikat 7 gün içindədir', time: '14:15', detail: 'mail.company.com sertifikatı 7 gündə bitir' },
  { id: 4, severity: 'Medium',   title: 'Anomal trafik aşkarlandı',       time: '13:55', detail: 'Daxili şəbəkədə qeyri-adi port scan fəaliyyəti' },
  { id: 5, severity: 'Critical', title: 'Admin hesabı breach-də tapıldı', time: '13:40', detail: 'admin@company.com HaveIBeenPwned-də mövcuddur' },
  { id: 6, severity: 'Medium',   title: 'Firewall rule dəyişikliyi',      time: '13:20', detail: 'Port 8080 xaricə açıldı — avtomatik aşkarlandı' },
]

const SEVERITY_COLOR = {
  Critical: '#ff4d4f',
  High:     '#fa8c16',
  Medium:   '#fadb14',
  Low:      '#52c41a',
}

const SEVERITY_BG = {
  Critical: '#1a0000',
  High:     '#1a0d00',
  Medium:   '#1a1800',
  Low:      '#001a00',
}

const SEVERITY_ICON = {
  Critical: <FireOutlined />,
  High:     <WarningOutlined />,
  Medium:   <InfoCircleOutlined />,
  Low:      <InfoCircleOutlined />,
}

// ── Alert Card ─────────────────────────────────────────────
function AlertCard({ alert, onAcknowledge, acknowledged }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: acknowledged ? 0.35 : 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        background:   acknowledged ? '#111' : SEVERITY_BG[alert.severity],
        borderRadius: 10,
        padding:      '12px 14px',
        marginBottom: 8,
        border:       `1px solid ${SEVERITY_COLOR[alert.severity]}${acknowledged ? '22' : '44'}`,
        borderLeft:   `3px solid ${SEVERITY_COLOR[alert.severity]}`,
        position:     'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: SEVERITY_COLOR[alert.severity], fontSize: 12, flexShrink: 0 }}>
              {SEVERITY_ICON[alert.severity]}
            </span>
            <span style={{
              color:      acknowledged ? '#666' : '#fff',
              fontSize:   13,
              fontWeight: 600,
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {alert.title}
            </span>
          </div>

          {/* Detail */}
          <div style={{
            color:      '#777',
            fontSize:   11,
            lineHeight: 1.5,
            marginBottom: 8,
          }}>
            {alert.detail}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background:   `${SEVERITY_COLOR[alert.severity]}22`,
              border:       `1px solid ${SEVERITY_COLOR[alert.severity]}55`,
              color:        SEVERITY_COLOR[alert.severity],
              fontSize:     10,
              fontWeight:   700,
              padding:      '1px 7px',
              borderRadius: 10,
            }}>
              {alert.severity}
            </span>
            <span style={{ color: '#444', fontSize: 11 }}>{alert.time}</span>
            {acknowledged && (
              <span style={{ color: '#52c41a', fontSize: 10, marginLeft: 'auto' }}>✓ Oxundu</span>
            )}
          </div>
        </div>

        {/* Acknowledge button */}
        {!acknowledged && (
          <motion.button
            whileHover={{ scale: 1.1, background: '#52c41a22' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAcknowledge(alert.id)}
            title="Oxundu kimi işarələ"
            style={{
              width:        28, height: 28,
              borderRadius: '50%',
              background:   'transparent',
              border:       '1px solid #52c41a44',
              color:        '#52c41a',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     12,
              flexShrink:   0,
            }}
          >
            <CheckOutlined />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function AlertSidebar() {
  const [open,           setOpen]          = useState(false)
  const [activeFilter,   setActiveFilter]  = useState('all')
  const [initialized,    setInitialized]   = useState(false)

  const { alerts, unreadCount, acknowledgedIds, addAlert, acknowledge } = useAlertStore()

  // Dublikatı önlə — yalnız 1 dəfə yüklə
  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    if (alerts.length > 0) return
    MOCK_ALERTS.forEach((alert, i) => {
      setTimeout(() => addAlert(alert), i * 800)
    })
  }, [])

  const unacknowledged = alerts.filter(a => !acknowledgedIds.includes(a.id))
  const acknowledged   = alerts.filter(a =>  acknowledgedIds.includes(a.id))

  const filterCounts = {
    all:      alerts.length,
    Critical: alerts.filter(a => a.severity === 'Critical').length,
    High:     alerts.filter(a => a.severity === 'High').length,
    Medium:   alerts.filter(a => a.severity === 'Medium').length,
  }

  function filteredUnack() {
    if (activeFilter === 'all') return unacknowledged
    return unacknowledged.filter(a => a.severity === activeFilter)
  }

  return (
    <>
      {/* ── Bell Button — panel açıqdırsa gizlət ── */}
      <AnimatePresence>
        {!open && (
          <motion.div
            key="bell"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top:      12,
              right:    16,
              zIndex:   1000,
              cursor:   'pointer',
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setOpen(true)}
          >
            <Badge
              count={unreadCount}
              styles={{ indicator: { background: '#ff4d4f', boxShadow: '0 0 6px #ff4d4f' } }}
            >
              <div style={{
                width:          40,
                height:         40,
                borderRadius:   '50%',
                background:     '#1a1a1a',
                border:         `2px solid ${unreadCount > 0 ? '#ff4d4f66' : '#2a2a2a'}`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                boxShadow:      unreadCount > 0 ? '0 0 10px rgba(255,77,79,0.3)' : 'none',
                transition:     'all 0.2s',
              }}>
                <BellOutlined style={{ color: '#fff', fontSize: 16 }} />
              </div>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position:   'fixed', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex:     998,
              }}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0,   opacity: 1 }}
              exit={{ x: 420,    opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              style={{
                position:      'fixed',
                top:           0, right: 0, bottom: 0,
                width:         Math.min(400, window.innerWidth - 8),
                background:    '#0f0f0f',
                borderLeft:    '1px solid #1f1f1f',
                zIndex:        999,
                display:       'flex',
                flexDirection: 'column',
              }}
            >
              {/* ── Header ── */}
              <div style={{
                padding:        '16px 18px',
                borderBottom:   '1px solid #1f1f1f',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                flexShrink:     0,
                background:     '#141414',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#ff4d4f22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BellOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Alertlər</div>
                    <div style={{ color: '#666', fontSize: 11 }}>
                      {unreadCount > 0
                        ? `${unreadCount} oxunmamış`
                        : 'Hamısı oxundu'
                      }
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {unreadCount > 0 && (
                    <Button
                      size="small" type="text"
                      style={{ color: '#52c41a', fontSize: 12 }}
                      onClick={() => unacknowledged.forEach(a => acknowledge(a.id))}
                    >
                      Hamısını oxu
                    </Button>
                  )}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: '#1a1a1a', border: '1px solid #2a2a2a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#888', fontSize: 12,
                    }}
                  >
                    <CloseOutlined />
                  </motion.div>
                </div>
              </div>

              {/* ── Filter tabs ── */}
              <div style={{
                padding:      '10px 16px',
                borderBottom: '1px solid #1f1f1f',
                display:      'flex',
                gap:          6,
                flexWrap:     'wrap',
                flexShrink:   0,
              }}>
                {[
                  { key: 'all',      label: 'Hamısı',  color: '#888'    },
                  { key: 'Critical', label: 'Kritik',  color: '#ff4d4f' },
                  { key: 'High',     label: 'Yüksək',  color: '#fa8c16' },
                  { key: 'Medium',   label: 'Orta',    color: '#fadb14' },
                ].map(f => (
                  <motion.div
                    key={f.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveFilter(f.key)}
                    style={{
                      padding:      '4px 10px',
                      borderRadius: 20,
                      cursor:       'pointer',
                      fontSize:     11,
                      fontWeight:   600,
                      background:   activeFilter === f.key ? `${f.color}22` : 'transparent',
                      border:       `1px solid ${activeFilter === f.key ? f.color + '66' : '#2a2a2a'}`,
                      color:        activeFilter === f.key ? f.color : '#666',
                      transition:   'all 0.15s',
                    }}
                  >
                    {f.label}
                    <span style={{
                      marginLeft: 5,
                      background: activeFilter === f.key ? f.color : '#2a2a2a',
                      color:      activeFilter === f.key ? '#fff' : '#555',
                      borderRadius: 10,
                      padding: '0 5px',
                      fontSize: 10,
                    }}>
                      {filterCounts[f.key] ?? 0}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* ── Alert Siyahısı ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

                {alerts.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#444', marginTop: 60 }}>
                    <BellOutlined style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
                    <div style={{ fontSize: 13 }}>Alert yoxdur</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: '#333' }}>
                      Real-time monitoring aktiv
                    </div>
                  </div>
                )}

                {/* Oxunmamış */}
                <AnimatePresence mode="popLayout">
                  {filteredUnack().map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      acknowledged={false}
                      onAcknowledge={acknowledge}
                    />
                  ))}
                </AnimatePresence>

                {/* Oxunmuş */}
                {acknowledged.length > 0 && activeFilter === 'all' && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{
                      color: '#333', fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                      marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
                      Oxundu ({acknowledged.length})
                      <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
                    </div>
                    <AnimatePresence mode="popLayout">
                      {acknowledged.map(alert => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          acknowledged={true}
                          onAcknowledge={acknowledge}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div style={{
                padding:    '12px 16px',
                borderTop:  '1px solid #1f1f1f',
                flexShrink: 0,
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#52c41a',
                  boxShadow: '0 0 6px #52c41a',
                }} />
                <div style={{ color: '#444', fontSize: 11 }}>Real-time monitoring aktiv</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}