import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined, ApartmentOutlined,
  ToolOutlined, FilePdfOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import AlertSidebar from '../components/AlertSidebar'

const { Header, Content } = Layout

const menuItems = [
  { key: '/gaps',   icon: <DashboardOutlined />, label: 'CyberGap'   },
  { key: '/attack', icon: <ApartmentOutlined />, label: 'AttackPath' },
  { key: '/fixes',  icon: <ToolOutlined />,      label: 'Fix Plan'   },
  { key: '/report', icon: <FilePdfOutlined />,   label: 'Report'     },
]

export default function MainLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  // Route dəyişəndə sidebar-ı bağla
  useEffect(() => { setOpen(false) }, [location.pathname])

  const currentLabel = menuItems.find(m => m.key === location.pathname)?.label || ''

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a0a' }}>

      {/* ── Overlay Sidebar ── */}
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
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 300,
              }}
            />

            {/* Sidebar panel */}
            <motion.div
              key="sidebar"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              style={{
                position:   'fixed',
                left:       0, top: 0, bottom: 0,
                width:      220,
                background: '#141414',
                borderRight:'1px solid #1f1f1f',
                zIndex:     400,
                display:    'flex',
                flexDirection: 'column',
              }}
            >
              {/* Logo + close */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 16px',
                borderBottom: '1px solid #1f1f1f',
              }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
                  🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span>
                </div>
                <div
                  onClick={() => setOpen(false)}
                  style={{
                    cursor: 'pointer', color: '#888',
                    fontSize: 18, lineHeight: 1,
                    padding: 4,
                  }}
                >
                  ✕
                </div>
              </div>

              {/* Menu */}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname]}
                items={menuItems}
                onClick={({ key }) => navigate(key)}
                style={{
                  background: 'transparent',
                  borderRight: 0,
                  marginTop: 8,
                  flex: 1,
                }}
              />

              {/* Footer */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid #1f1f1f',
                color: '#555', fontSize: 11,
              }}>
                🔒 NoVuln.CyberGap v0.1 Beta
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Area — heç vaxt sıxılmır ── */}
      <Layout style={{ background: '#0a0a0a', minHeight: '100vh' }}>

        {/* Header */}
        <Header style={{
          position:       'sticky',
          top:            0,
          zIndex:         200,
          background:     '#141414',
          borderBottom:   '1px solid #1f1f1f',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 20px',
          height:         56,
        }}>
          {/* Hamburger */}
          <div
            onClick={() => setOpen(o => !o)}
            style={{
              cursor:         'pointer',
              color:          '#fff',
              fontSize:       18,
              width:          36, height: 36,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              borderRadius:   8,
              background:     '#1a1a1a',
              border:         '1px solid #2a2a2a',
            }}
          >
            {open ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </div>

          {/* Cari səhifə adı */}
          <div style={{ color: '#888', fontSize: 13, fontWeight: 600 }}>
            {currentLabel}
          </div>

          {/* Sağ — boş (AlertSidebar öz bell-ini idarə edir) */}
          <div style={{ width: 36 }} />
        </Header>

        {/* Content — tam genişlik */}
        <Content style={{
          background: '#0a0a0a',
          minHeight:  'calc(100vh - 56px)',
          overflowX:  'hidden',
        }}>
          <AlertSidebar />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}