import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { Button, Tag, Tabs, Switch, Slider, Drawer, Badge } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRightOutlined, MenuFoldOutlined,
    MenuUnfoldOutlined, CloseOutlined,
} from '@ant-design/icons'

// ── Mock Data ──────────────────────────────────────────────
const GRAPH_DATA = {
    nodes: [
        { id: 'INTERNET', label: 'INTERNET', type: 'internet', cvss: 0 },
        { id: 'RDP', label: 'RDP :3389', type: 'perimeter', cvss: 9.1 },
        { id: 'SSH', label: 'SSH :22', type: 'perimeter', cvss: 6.5 },
        { id: 'WEB', label: 'Web Server', type: 'perimeter', cvss: 7.2 },
        { id: 'AD', label: 'Active Directory', type: 'internal', cvss: 8.8 },
        { id: 'FILESERVER', label: 'File Server', type: 'internal', cvss: 7.0 },
        { id: 'DB', label: 'Database', type: 'internal', cvss: 8.5 },
        { id: 'BACKUP', label: 'Backup Server', type: 'internal', cvss: 6.0 },
        { id: 'CROWN', label: '👑 Crown Jewel', type: 'crown', cvss: 10 },
    ],
    links: [
        { source: 'INTERNET', target: 'RDP', weight: 0.95, mitre: 'T1133', mitigation: 'RDP-ni VPN arxasına aparın' },
        { source: 'INTERNET', target: 'SSH', weight: 0.70, mitre: 'T1021', mitigation: 'SSH key-based auth tətbiq edin' },
        { source: 'INTERNET', target: 'WEB', weight: 0.80, mitre: 'T1190', mitigation: 'WAF quraşdırın' },
        { source: 'RDP', target: 'AD', weight: 0.90, mitre: 'T1078', mitigation: 'MFA aktiv edin' },
        { source: 'WEB', target: 'DB', weight: 0.75, mitre: 'T1190', mitigation: 'Input validation tətbiq edin' },
        { source: 'AD', target: 'FILESERVER', weight: 0.85, mitre: 'T1021', mitigation: 'Lateral movement detection' },
        { source: 'AD', target: 'BACKUP', weight: 0.70, mitre: 'T1490', mitigation: 'Backup-ları izolasiya edin' },
        { source: 'AD', target: 'CROWN', weight: 0.95, mitre: 'T1078', mitigation: 'PAM həlli tətbiq edin' },
        { source: 'FILESERVER', target: 'CROWN', weight: 0.80, mitre: 'T1005', mitigation: 'DLP həlli quraşdırın' },
        { source: 'DB', target: 'CROWN', weight: 0.88, mitre: 'T1041', mitigation: 'DB audit logging aktiv edin' },
        { source: 'SSH', target: 'FILESERVER', weight: 0.60, mitre: 'T1021', mitigation: 'SSH allowlist tətbiq edin' },
    ],
}

const OPTIMAL_PATH = ['INTERNET', 'RDP', 'AD', 'CROWN']
const CHOKEPOINTS = ['AD', 'RDP']

const ALL_PATHS = [
    { id: 1, path: ['INTERNET', 'RDP', 'AD', 'CROWN'], risk: 98, steps: ['Initial Access', 'Lateral Movement', 'Privilege Escalation'] },
    { id: 2, path: ['INTERNET', 'WEB', 'DB', 'CROWN'], risk: 84, steps: ['Initial Access', 'Exploitation', 'Exfiltration'] },
    { id: 3, path: ['INTERNET', 'SSH', 'FILESERVER', 'CROWN'], risk: 72, steps: ['Initial Access', 'Lateral Movement', 'Collection'] },
    { id: 4, path: ['INTERNET', 'RDP', 'AD', 'BACKUP', 'CROWN'], risk: 70, steps: ['Initial Access', 'Lateral Movement', 'Impact'] },
    { id: 5, path: ['INTERNET', 'WEB', 'DB', 'FILESERVER', 'CROWN'], risk: 65, steps: ['Initial Access', 'Exploitation', 'Collection'] },
]

const NODE_COLORS = {
    internet: '#ff4d4f',
    perimeter: '#fa8c16',
    internal: '#722ed1',
    crown: '#c0392b',
}

const NODE_RADIUS = { crown: 18, internet: 16, perimeter: 12, internal: 12 }

function isOptimalEdge(link) {
    const s = typeof link.source === 'object' ? link.source.id : link.source
    const t = typeof link.target === 'object' ? link.target.id : link.target
    for (let i = 0; i < OPTIMAL_PATH.length - 1; i++) {
        if (OPTIMAL_PATH[i] === s && OPTIMAL_PATH[i + 1] === t) return true
    }
    return false
}

function pathCount(nodeId) {
    return GRAPH_DATA.links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        return s === nodeId || t === nodeId
    }).length
}

function calcBlast(nodeId) {
    const reached = new Set()
    const queue = [nodeId]
    while (queue.length) {
        const cur = queue.shift()
        GRAPH_DATA.links.forEach(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source
            const t = typeof l.target === 'object' ? l.target.id : l.target
            if (s === cur && !reached.has(t)) { reached.add(t); queue.push(t) }
        })
    }
    return [...reached]
}

// ── Main ───────────────────────────────────────────────────
export default function AttackPath() {
    const navigate = useNavigate()
    const fgRef = useRef()
    const animRef = useRef()
    const containerRef = useRef()
    // Node-ları aralandır
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!fgRef.current) return
            fgRef.current.d3Force('charge').strength(-500)
            fgRef.current.d3Force('link').distance(160)
            fgRef.current.d3Force('center')?.strength(0.3)
            fgRef.current.d3ReheatSimulation()
        }, 200)
        return () => clearTimeout(timer)
    }, [])
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 })
    const [leftOpen, setLeftOpen] = useState(true)
    const [showOptimal, setShowOptimal] = useState(true)
    const [showChokepoints, setShowChokepoints] = useState(true)
    const [weightThreshold, setWeightThreshold] = useState(0)
    const [nodeFilter, setNodeFilter] = useState('all')
    const [selectedNode, setSelectedNode] = useState(null)
    const [selectedEdge, setSelectedEdge] = useState(null)
    const [blastNodes, setBlastNodes] = useState([])
    const [pulseMap, setPulseMap] = useState({})
    const [pathOffset, setPathOffset] = useState(0)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Canvas ölçülərini izlə
    useEffect(() => {
        function measure() {
            if (containerRef.current) {
                const leftW = leftOpen ? 260 : 0
                setDimensions({
                    w: containerRef.current.offsetWidth,
                    h: containerRef.current.offsetHeight,
                })
            }
        }
        measure()
        const ro = new ResizeObserver(measure)
        if (containerRef.current) ro.observe(containerRef.current)
        return () => ro.disconnect()
    }, [leftOpen])

    // Animasiya lopu
    useEffect(() => {
        let t = 0
        animRef.current = setInterval(() => {
            t = (t + 0.04) % 1
            setPathOffset(t)
            setPulseMap(() => {
                const next = {}
                CHOKEPOINTS.forEach(id => { next[id] = Math.sin(t * Math.PI * 2) * 0.5 + 0.5 })
                return next
            })
        }, 50)
        return () => clearInterval(animRef.current)
    }, [])

    // Yeni kod:
    const typeAllowedIds = new Set(
        GRAPH_DATA.nodes
            .filter(n =>
                nodeFilter === 'all' ? true :
                    nodeFilter === 'perimeter' ? ['internet', 'perimeter'].includes(n.type) :
                        ['internal', 'crown'].includes(n.type)
            )
            .map(n => n.id)
    )

    const filteredLinks = GRAPH_DATA.links.filter(l => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        const tId = typeof l.target === 'object' ? l.target.id : l.target
        const weightOk = (l.weight || 0) >= weightThreshold
        const nodesVisible = typeAllowedIds.has(sId) && typeAllowedIds.has(tId)
        return weightOk && nodesVisible
    })

    const connectedNodeIds = new Set(
        filteredLinks.flatMap(l => [
            typeof l.source === 'object' ? l.source.id : l.source,
            typeof l.target === 'object' ? l.target.id : l.target,
        ])
    )

    const filteredData = {
        nodes: GRAPH_DATA.nodes.filter(n => {
            const typeMatch = typeAllowedIds.has(n.id)
            const connected = weightThreshold === 0 ? true : connectedNodeIds.has(n.id)
            return typeMatch && connected
        }),
        links: filteredLinks,
    }
    // Filter dəyişəndə yenidən zoom et
    useEffect(() => {
        const timer = setTimeout(() => {
            fgRef.current?.zoomToFit(400, 80)
        }, 300)
        return () => clearTimeout(timer)
    }, [weightThreshold, nodeFilter])
    // Node-u tam əhatə edən hit area — sürükləmək asanlaşır
    const paintNodeArea = useCallback((node, color, ctx) => {
        const r = (NODE_RADIUS[node.type] || 12) + 6
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()
    }, [])

    // Node render
    const paintNode = useCallback((node, ctx, globalScale) => {
        const isChoke = showChokepoints && CHOKEPOINTS.includes(node.id)
        const isOptPath = showOptimal && OPTIMAL_PATH.includes(node.id)
        const isBlast = blastNodes.includes(node.id)
        const isSelected = selectedNode?.id === node.id
        const pulse = pulseMap[node.id] || 0
        const baseR = NODE_RADIUS[node.type] || 12
        const r = baseR + (isChoke ? pulse * 5 : 0)

        // Glow rings
        if (isChoke) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 12, 0, 2 * Math.PI)
            ctx.fillStyle = `rgba(250,140,22,${0.08 + pulse * 0.12})`
            ctx.fill()
        }
        if (isBlast) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 9, 0, 2 * Math.PI)
            ctx.fillStyle = 'rgba(255,77,79,0.12)'
            ctx.fill()
        }
        if (isSelected) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 7, 0, 2 * Math.PI)
            ctx.fillStyle = 'rgba(22,104,220,0.25)'
            ctx.fill()
        }

        // Node body
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
        ctx.fillStyle = NODE_COLORS[node.type] || '#888'
        ctx.strokeStyle = isSelected ? '#1668dc' : isOptPath ? '#fff' : 'rgba(255,255,255,0.2)'
        ctx.lineWidth = isSelected ? 3 : isOptPath ? 2 : 1
        ctx.fill()
        ctx.stroke()

        // Label
        const fs = Math.max(10 / globalScale, 2.5)
        ctx.font = `bold ${fs * globalScale}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = 4
        ctx.fillText(node.label, node.x, node.y + r + fs * globalScale + 3)
        ctx.shadowBlur = 0
    }, [showOptimal, showChokepoints, blastNodes, selectedNode, pulseMap])

    // Edge render
    const paintLink = useCallback((link, ctx) => {
        const s = link.source
        const t = link.target
        if (!s?.x || !t?.x) return

        const opt = showOptimal && isOptimalEdge(link)
        const w = (link.weight || 0.5) * 3

        // Optimal edge-i yalnız hər iki node görünürsə çək
        const filteredNodeIds = new Set(filteredData.nodes.map(n => n.id))
        const sId = typeof s === 'object' ? s.id : s
        const tId = typeof t === 'object' ? t.id : t
        if (opt && (!filteredNodeIds.has(sId) || !filteredNodeIds.has(tId))) return

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = opt ? 'rgba(255,77,79,1)' : 'rgba(255,255,255,0.35)'
        ctx.lineWidth = opt ? w + 2 : Math.max(w * 0.8, 1)
        ctx.stroke()

        if (opt) {
            const ox = s.x + (t.x - s.x) * pathOffset
            const oy = s.y + (t.y - s.y) * pathOffset
            ctx.beginPath()
            ctx.arc(ox, oy, 4.5, 0, 2 * Math.PI)
            ctx.fillStyle = '#fff'
            ctx.fill()
        }
    }, [showOptimal, pathOffset, filteredData])

    const handleNodeClick = useCallback((node) => {
        setSelectedNode(node)
        setSelectedEdge(null)
        setBlastNodes(calcBlast(node.id))
        setDrawerOpen(true)
    }, [])

    const handleLinkClick = useCallback((link) => {
        setSelectedEdge(link)
        setSelectedNode(null)
        setBlastNodes([])
        setDrawerOpen(true)
    }, [])

    function closeDrawer() {
        setDrawerOpen(false)
        setSelectedNode(null)
        setSelectedEdge(null)
        setBlastNodes([])
    }

    const LEFT_W = 260

    const isMobile = dimensions.w < 600

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>

            {/* ── Sol Panel — masaüstü: yan, mobil: overlay ── */}
            <AnimatePresence initial={false}>
                {leftOpen && (
                    <>
                        {/* Mobil backdrop */}
                        {isMobile && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setLeftOpen(false)}
                                style={{
                                    position: 'fixed', inset: 0,
                                    background: 'rgba(0,0,0,0.6)',
                                    zIndex: 99,
                                }}
                            />
                        )}

                        <motion.div
                            key="left-panel"
                            initial={{ x: -280, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -280, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            style={{
                                width: 260,
                                background: '#141414',
                                borderRight: '1px solid #1f1f1f',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                flexShrink: 0,
                                zIndex: 100,
                                // Mobil: absolute, masaüstü: relative
                                ...(isMobile ? {
                                    position: 'absolute',
                                    top: 0, left: 0, bottom: 0,
                                } : {}),
                            }}
                        >
                            {/* Panel header */}
                            <div style={{
                                padding: '14px 16px',
                                borderBottom: '1px solid #1f1f1f',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
                                    🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span>
                                </div>
                                <Button
                                    size="small" type="text"
                                    icon={<CloseOutlined />}
                                    onClick={() => setLeftOpen(false)}
                                    style={{ color: '#888' }}
                                />
                            </div>

                            <Tabs
                                defaultActiveKey="optimal"
                                size="small"
                                style={{ flex: 1, overflow: 'hidden' }}
                                tabBarStyle={{ padding: '0 12px', borderBottom: '1px solid #1f1f1f', margin: 0 }}
                                items={[
                                    {
                                        key: 'optimal',
                                        label: <span style={{ fontSize: 12 }}>Optimal Path</span>,
                                        children: (
                                            <div style={{ padding: '12px 14px', overflowY: 'auto', height: 'calc(100vh - 200px)' }}>
                                                {OPTIMAL_PATH.map((id, i) => {
                                                    const nodeType = GRAPH_DATA.nodes.find(n => n.id === id)?.type
                                                    return (
                                                        <div key={id}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: 10,
                                                                padding: '10px 12px', background: '#1a1a1a',
                                                                borderRadius: 8, border: '1px solid #2a2a2a',
                                                                borderLeft: `3px solid ${NODE_COLORS[nodeType]}`,
                                                            }}>
                                                                <span style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 13, minWidth: 16 }}>{i + 1}</span>
                                                                <div>
                                                                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{id}</div>
                                                                    {ALL_PATHS[0].steps[i] && (
                                                                        <div style={{ color: '#888', fontSize: 11 }}>{ALL_PATHS[0].steps[i]}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {i < OPTIMAL_PATH.length - 1 && (
                                                                <div style={{ textAlign: 'center', color: '#ff4d4f', fontSize: 18, lineHeight: '18px', margin: '2px 0' }}>↓</div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                                <div style={{
                                                    marginTop: 14, padding: 12, background: '#1a0000',
                                                    borderRadius: 8, border: '1px solid #3a0000',
                                                }}>
                                                    <div style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 12 }}>⚠️ Risk: 98%</div>
                                                    <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                                                        Bu yolun uğur ehtimalı çox yüksəkdir
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'allpaths',
                                        label: <span style={{ fontSize: 12 }}>Top 5 Yol</span>,
                                        children: (
                                            <div style={{ padding: '12px 14px', overflowY: 'auto', height: 'calc(100vh - 200px)' }}>
                                                {ALL_PATHS.map((p, i) => (
                                                    <div key={p.id} style={{
                                                        padding: '10px 12px', background: '#1a1a1a',
                                                        borderRadius: 8, border: '1px solid #2a2a2a',
                                                        marginBottom: 8,
                                                        borderLeft: `3px solid ${i === 0 ? '#ff4d4f' : i === 1 ? '#fa8c16' : '#fadb14'}`,
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                            <span style={{ color: '#888', fontSize: 11 }}>#{i + 1}</span>
                                                            <Tag
                                                                color={p.risk >= 90 ? 'red' : p.risk >= 75 ? 'orange' : 'gold'}
                                                                style={{ fontSize: 10, padding: '0 5px', margin: 0 }}
                                                            >
                                                                {p.risk}%
                                                            </Tag>
                                                        </div>
                                                        <div style={{ color: '#ccc', fontSize: 11, lineHeight: 1.5, wordBreak: 'break-all' }}>
                                                            {p.path.join(' → ')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Graf Sahəsi — mobil: tam genişlik ── */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    // Mobil: sol panel absolute olduğundan margin lazım deyil
                    marginLeft: (!isMobile && leftOpen) ? 0 : 0,
                }}
            >
                {/* Toolbar */}
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    background: 'rgba(15,15,15,0.95)',
                    padding: '7px 12px',
                    borderRadius: 24,
                    border: '1px solid #2a2a2a',
                    backdropFilter: 'blur(10px)',
                    maxWidth: 'calc(100% - 24px)',
                }}>
                    {/* Hamburger — həmişə göstər mobil, yalnız bağlıda masaüstü */}
                    {(!leftOpen || isMobile) && (
                        <Button
                            size="small" type="text"
                            icon={<MenuUnfoldOutlined />}
                            onClick={() => setLeftOpen(o => !o)}
                            style={{ color: '#888' }}
                        />
                    )}

                    {!isMobile && leftOpen && (
                        <Button
                            size="small" type="text"
                            icon={<MenuFoldOutlined />}
                            onClick={() => setLeftOpen(false)}
                            style={{ color: '#888' }}
                        />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: '#888', fontSize: 11 }}>Opt</span>
                        <Switch size="small" checked={showOptimal} onChange={setShowOptimal} />
                    </div>

                    <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: '#888', fontSize: 11 }}>Choke</span>
                        <Switch size="small" checked={showChokepoints} onChange={setShowChokepoints} />
                    </div>

                    <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {[
                            { label: 'All', value: 0 },
                            { label: '≥0.7', value: 0.7 },
                            { label: '≥0.8', value: 0.8 },
                        ].map(opt => (
                            <Button
                                key={opt.value} size="small"
                                type={weightThreshold === opt.value ? 'primary' : 'text'}
                                onClick={() => setWeightThreshold(opt.value)}
                                style={{ fontSize: 10, padding: '0 6px', height: 22 }}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />

                    <div style={{ display: 'flex', gap: 3 }}>
                        {[
                            { key: 'all', label: isMobile ? 'All' : 'Hamısı' },
                            { key: 'perimeter', label: 'Perim.' },
                            { key: 'internal', label: 'Int.' },
                        ].map(f => (
                            <Button
                                key={f.key} size="small"
                                type={nodeFilter === f.key ? 'primary' : 'text'}
                                onClick={() => setNodeFilter(f.key)}
                                style={{ fontSize: 10, padding: '0 6px', height: 22 }}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Legend — mobil: kiçil */}
                {!isMobile && (
                    <div style={{
                        position: 'absolute', bottom: 16, left: 16, zIndex: 20,
                        background: 'rgba(15,15,15,0.9)', padding: '10px 12px',
                        borderRadius: 10, border: '1px solid #2a2a2a',
                    }}>
                        {Object.entries(NODE_COLORS).map(([type, color]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                                <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
                                <span style={{ color: '#888', fontSize: 11, textTransform: 'capitalize' }}>{type}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid #2a2a2a', marginTop: 6, paddingTop: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 20, height: 2, background: '#ff4d4f' }} />
                                <span style={{ color: '#888', fontSize: 11 }}>Optimal path</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fix Plan button */}
                <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20 }}>
                    <Button
                        type="primary"
                        size={isMobile ? 'small' : 'middle'}
                        icon={<ArrowRightOutlined />}
                        onClick={() => navigate('/fixes')}
                    >
                        {isMobile ? 'Fix Plan' : 'Fix Plan-a Keç'}
                    </Button>
                </div>

                {/* ForceGraph */}
                <ForceGraph2D
                    ref={fgRef}
                    graphData={filteredData}
                    backgroundColor="#0a0a0a"
                    nodeCanvasObject={paintNode}
                    nodeCanvasObjectMode={() => 'replace'}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        const r = (NODE_RADIUS[node.type] || 12) + 8
                        ctx.beginPath()
                        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
                        ctx.fillStyle = color
                        ctx.fill()
                    }}
                    linkCanvasObject={paintLink}
                    linkCanvasObjectMode={() => 'replace'}
                    onNodeClick={handleNodeClick}
                    onLinkClick={handleLinkClick}
                    nodeLabel={() => ''}
                    enableNodeDrag={true}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                    cooldownTicks={200}
                    onEngineStop={() => {
                        fgRef.current?.zoomToFit(800, 120)
                    }}
                    width={dimensions.w}
                    height={dimensions.h}
                />
            </div>

            {/* ── Detail Drawer ── */}
            <Drawer
                open={drawerOpen}
                onClose={closeDrawer}
                width={Math.min(380, window.innerWidth - 16)}
                placement="right"
                title={
                    selectedNode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: NODE_COLORS[selectedNode.type] }} />
                            <span style={{ fontSize: 15 }}>{selectedNode.label}</span>
                        </div>
                    ) : selectedEdge ? (
                        <span style={{ fontSize: 13 }}>
                            {typeof selectedEdge.source === 'object' ? selectedEdge.source.id : selectedEdge.source}
                            {' → '}
                            {typeof selectedEdge.target === 'object' ? selectedEdge.target.id : selectedEdge.target}
                        </span>
                    ) : 'Detal'
                }
                closeIcon={<CloseOutlined style={{ color: '#888' }} />}
                styles={{
                    body: { background: '#0f0f0f', padding: 16 },
                    header: { background: '#141414', borderBottom: '1px solid #1f1f1f' },
                    mask: { background: 'rgba(0,0,0,0.3)' },
                    wrapper: { zIndex: 500 },
                }}
            >
                {selectedNode && (
                    <div style={{ color: '#ccc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[
                                { label: 'Tip', value: selectedNode.type, color: NODE_COLORS[selectedNode.type] },
                                { label: 'CVSS', value: selectedNode.cvss || '—', color: selectedNode.cvss >= 9 ? '#ff4d4f' : selectedNode.cvss >= 7 ? '#fa8c16' : '#52c41a' },
                                { label: 'Keçən Yol', value: pathCount(selectedNode.id), color: '#fff' },
                                { label: 'Blast Radius', value: blastNodes.length, color: '#fa8c16' },
                            ].map(item => (
                                <div key={item.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a2a2a' }}>
                                    <div style={{ color: '#666', fontSize: 11 }}>{item.label}</div>
                                    <div style={{ color: item.color, fontWeight: 800, fontSize: 20, marginTop: 2 }}>{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {CHOKEPOINTS.includes(selectedNode.id) && (
                            <div style={{ padding: 12, background: '#2d1a00', borderRadius: 8, border: '1px solid #5a3700', marginBottom: 12 }}>
                                <span style={{ color: '#fa8c16', fontSize: 13 }}>
                                    ⚡ Chokepoint — fix etsəniz <strong>{pathCount(selectedNode.id)} hücum yolu</strong> kəsilir
                                </span>
                            </div>
                        )}

                        {blastNodes.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Blast Radius</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {blastNodes.map(id => <Tag key={id} color="red" style={{ fontSize: 11 }}>{id}</Tag>)}
                                </div>
                            </div>
                        )}

                        <Button type="primary" block onClick={() => navigate('/fixes')} style={{ marginTop: 8 }}>
                            Fix Plan-da Gör →
                        </Button>
                    </div>
                )}

                {selectedEdge && (
                    <div style={{ color: '#ccc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                            {[
                                { label: 'Weight', value: selectedEdge.weight, color: selectedEdge.weight >= 0.8 ? '#ff4d4f' : '#fadb14' },
                                { label: 'Uğur ehtimalı', value: `${Math.round(selectedEdge.weight * 100)}%`, color: '#fa8c16' },
                            ].map(item => (
                                <div key={item.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a2a2a' }}>
                                    <div style={{ color: '#666', fontSize: 11 }}>{item.label}</div>
                                    <div style={{ color: item.color, fontWeight: 800, fontSize: 20, marginTop: 2 }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #2a2a2a', marginBottom: 10 }}>
                            <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>MITRE ATT&CK</div>
                            <Tag color="#722ed1">{selectedEdge.mitre}</Tag>
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #2a2a2a' }}>
                            <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>Mitiqasiya</div>
                            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>{selectedEdge.mitigation}</div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    )
}