import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { Button, Tag, Tabs, Switch, Drawer, Spin } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightOutlined, MenuFoldOutlined, MenuUnfoldOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import { useScanStore } from '../../store/scanStore'
import { getAttackGraph } from '../../services/api'

const NODE_COLORS = {
    internet:  '#ff4d4f',
    perimeter: '#fa8c16',
    internal:  '#722ed1',
    crown:     '#c0392b',
}
const NODE_RADIUS = { crown: 18, internet: 16, perimeter: 12, internal: 12 }
const TYPE_MAP = {
    'Internet':   'internet',
    'Perimeter':  'perimeter',
    'Internal':   'internal',
    'Credential': 'internal',
    'CrownJewel': 'crown',
}

export default function AttackPath() {
    const navigate    = useNavigate()
    const fgRef       = useRef()
    const animRef     = useRef()
    const containerRef= useRef()
    const { scanId }  = useScanStore()

    const [nodes,       setNodes]       = useState([])
    const [edges,       setEdges]       = useState([])
    const [optimalPath, setOptimalPath] = useState([])
    const [chokepoints, setChokepoints] = useState([])
    const [allPaths,    setAllPaths]    = useState([])
    const [totalPaths,  setTotalPaths]  = useState(0)
    const [loading,         setLoading]         = useState(true)
    const [error,           setError]           = useState(null)
    const [dimensions,      setDimensions]      = useState({ w: 800, h: 600 })
    const [leftOpen,        setLeftOpen]        = useState(true)
    const [showOptimal,     setShowOptimal]     = useState(true)
    const [showChokepoints, setShowChokepoints] = useState(true)
    const [weightThreshold, setWeightThreshold] = useState(0)
    const [nodeFilter,      setNodeFilter]      = useState('all')
    const [selectedNode,    setSelectedNode]    = useState(null)
    const [selectedEdge,    setSelectedEdge]    = useState(null)
    const [blastNodes,      setBlastNodes]      = useState([])
    const [pulseMap,        setPulseMap]        = useState({})
    const [pathOffset,      setPathOffset]      = useState(0)
    const [drawerOpen,      setDrawerOpen]      = useState(false)

    const loadGraph = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getAttackGraph(scanId)
            setNodes(
                data.nodes
                    .filter(n => n.isVisible !== false)
                    .map(n => ({
                        id: n.id, label: n.name,
                        type: TYPE_MAP[n.type] || 'internal',
                        cvss: n.weight ? parseFloat((n.weight * 10).toFixed(1)) : 0,
                        ip: n.ip, software: n.software, version: n.version,
                        isChokepoint: n.isChokepoint,
                    }))
            )
            setEdges(
                data.edges.map(e => ({
                    source: e.source, target: e.target, weight: e.weight,
                    mitre: e.technique, tactic: e.tactic,
                    mitigation: `${e.technique} — ${e.tactic}`, cve: e.cve,
                }))
            )
            if (data.optimalPath?.nodeIds?.length) setOptimalPath(data.optimalPath.nodeIds)
            if (data.chokepoints?.length) setChokepoints(data.chokepoints)
            if (data.topPaths?.length) {
                setAllPaths(data.topPaths.map((p, i) => ({
                    id: i + 1, path: p.nodeIds || [],
                    risk: Math.round((p.probability || 0) * 100),
                    steps: p.tactics || [],
                })))
            }
            if (data.totalPaths) setTotalPaths(data.totalPaths)
        } catch (err) {
            setError(err.message || 'Failed to load attack graph')
        } finally {
            setLoading(false)
        }
    }, [scanId])

    useEffect(() => { loadGraph() }, [loadGraph])

    useEffect(() => {
        if (loading || !nodes.length) return
        const t = setTimeout(() => {
            if (!fgRef.current) return
            fgRef.current.d3Force('charge').strength(-500)
            fgRef.current.d3Force('link').distance(160)
            fgRef.current.d3Force('center')?.strength(0.3)
            fgRef.current.d3ReheatSimulation()
        }, 300)
        return () => clearTimeout(t)
    }, [loading, nodes])

    useEffect(() => {
        function measure() {
            if (containerRef.current)
                setDimensions({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight })
        }
        measure()
        const ro = new ResizeObserver(measure)
        if (containerRef.current) ro.observe(containerRef.current)
        return () => ro.disconnect()
    }, [leftOpen])

    useEffect(() => {
        let t = 0
        animRef.current = setInterval(() => {
            t = (t + 0.04) % 1
            setPathOffset(t)
            setPulseMap(() => {
                const next = {}
                chokepoints.forEach(id => { next[id] = Math.sin(t * Math.PI * 2) * 0.5 + 0.5 })
                return next
            })
        }, 50)
        return () => clearInterval(animRef.current)
    }, [chokepoints])

    useEffect(() => {
        const t = setTimeout(() => fgRef.current?.zoomToFit(400, 80), 300)
        return () => clearTimeout(t)
    }, [weightThreshold, nodeFilter])

    function pathCount(nodeId) {
        return edges.filter(l => {
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
            edges.forEach(l => {
                const s = typeof l.source === 'object' ? l.source.id : l.source
                const t = typeof l.target === 'object' ? l.target.id : l.target
                if (s === cur && !reached.has(t)) { reached.add(t); queue.push(t) }
            })
        }
        return [...reached]
    }

    const isOptimalEdge = useCallback((link) => {
        const s = typeof link.source === 'object' ? link.source.id : link.source
        const t = typeof link.target === 'object' ? link.target.id : link.target
        for (let i = 0; i < optimalPath.length - 1; i++) {
            if (optimalPath[i] === s && optimalPath[i + 1] === t) return true
        }
        return false
    }, [optimalPath])

    const typeAllowedIds = new Set(
        nodes.filter(n =>
            nodeFilter === 'all' ? true :
            nodeFilter === 'perimeter' ? ['internet', 'perimeter'].includes(n.type) :
                                         ['internal', 'crown'].includes(n.type)
        ).map(n => n.id)
    )

    const filteredLinks = edges.filter(l => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        const tId = typeof l.target === 'object' ? l.target.id : l.target
        return (l.weight || 0) >= weightThreshold && typeAllowedIds.has(sId) && typeAllowedIds.has(tId)
    })

    const connectedNodeIds = new Set(
        filteredLinks.flatMap(l => [
            typeof l.source === 'object' ? l.source.id : l.source,
            typeof l.target === 'object' ? l.target.id : l.target,
        ])
    )

    const filteredData = {
        nodes: nodes.filter(n => {
            const typeMatch = typeAllowedIds.has(n.id)
            const connected = weightThreshold === 0 ? true : connectedNodeIds.has(n.id)
            return typeMatch && connected
        }),
        links: filteredLinks,
    }

    const paintNode = useCallback((node, ctx, globalScale) => {
        const isChoke    = showChokepoints && chokepoints.includes(node.id)
        const isOptPath  = showOptimal && optimalPath.includes(node.id)
        const isBlast    = blastNodes.includes(node.id)
        const isSelected = selectedNode?.id === node.id
        const pulse      = pulseMap[node.id] || 0
        const baseR      = NODE_RADIUS[node.type] || 12
        const r          = baseR + (isChoke ? pulse * 5 : 0)
        if (isChoke) {
            ctx.beginPath(); ctx.arc(node.x, node.y, r + 12, 0, 2 * Math.PI)
            ctx.fillStyle = `rgba(250,140,22,${0.08 + pulse * 0.12})`; ctx.fill()
        }
        if (isBlast) {
            ctx.beginPath(); ctx.arc(node.x, node.y, r + 9, 0, 2 * Math.PI)
            ctx.fillStyle = 'rgba(255,77,79,0.12)'; ctx.fill()
        }
        if (isSelected) {
            ctx.beginPath(); ctx.arc(node.x, node.y, r + 7, 0, 2 * Math.PI)
            ctx.fillStyle = 'rgba(22,104,220,0.25)'; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
        ctx.fillStyle   = NODE_COLORS[node.type] || '#888'
        ctx.strokeStyle = isSelected ? '#1668dc' : isOptPath ? '#fff' : 'rgba(255,255,255,0.2)'
        ctx.lineWidth   = isSelected ? 3 : isOptPath ? 2 : 1
        ctx.fill(); ctx.stroke()
        const fs = Math.max(10 / globalScale, 2.5)
        ctx.font = `bold ${fs * globalScale}px Inter, sans-serif`
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4
        ctx.fillText(node.label, node.x, node.y + r + fs * globalScale + 3)
        ctx.shadowBlur = 0
    }, [showOptimal, showChokepoints, blastNodes, selectedNode, pulseMap, chokepoints, optimalPath])

    const paintLink = useCallback((link, ctx) => {
        const s = link.source; const t = link.target
        if (!s?.x || !t?.x) return
        const opt = showOptimal && isOptimalEdge(link)
        const w   = (link.weight || 0.5) * 3
        const filteredNodeIds = new Set(filteredData.nodes.map(n => n.id))
        const sId = typeof s === 'object' ? s.id : s
        const tId = typeof t === 'object' ? t.id : t
        if (opt && (!filteredNodeIds.has(sId) || !filteredNodeIds.has(tId))) return
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = opt ? 'rgba(255,77,79,1)' : 'rgba(255,255,255,0.35)'
        ctx.lineWidth   = opt ? w + 2 : Math.max(w * 0.8, 1)
        ctx.stroke()
        if (opt) {
            const ox = s.x + (t.x - s.x) * pathOffset
            const oy = s.y + (t.y - s.y) * pathOffset
            ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, 2 * Math.PI)
            ctx.fillStyle = '#fff'; ctx.fill()
        }
    }, [showOptimal, pathOffset, filteredData, isOptimalEdge])

    const handleNodeClick = useCallback((node) => {
        setSelectedNode(node); setSelectedEdge(null)
        setBlastNodes(calcBlast(node.id)); setDrawerOpen(true)
    }, [edges])

    const handleLinkClick = useCallback((link) => {
        setSelectedEdge(link); setSelectedNode(null)
        setBlastNodes([]); setDrawerOpen(true)
    }, [])

    function closeDrawer() {
        setDrawerOpen(false); setSelectedNode(null)
        setSelectedEdge(null); setBlastNodes([])
    }

    const isMobile = dimensions.w < 600

    if (loading) return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#888' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, fontSize: 14 }}>Loading attack graph...</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Connecting to backend</div>
            </div>
        </div>
    )

    if (error) return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Attack Graph Not Available</div>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 24, lineHeight: 1.6, background: '#141414', padding: 12, borderRadius: 8, border: '1px solid #1f1f1f' }}>{error}</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button type="primary" icon={<ReloadOutlined />} onClick={loadGraph}>Retry</Button>
                    <Button onClick={() => navigate('/gaps')}>← Back to Gaps</Button>
                </div>
            </div>
        </div>
    )

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence initial={false}>
                {leftOpen && (
                    <>
                        {isMobile && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setLeftOpen(false)}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
                        )}
                        <motion.div key="left-panel"
                            initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -280, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            style={{
                                width: 260, background: '#141414', borderRight: '1px solid #1f1f1f',
                                display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, zIndex: 100,
                                ...(isMobile ? { position: 'absolute', top: 0, left: 0, bottom: 0 } : {}),
                            }}
                        >
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f1f1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
                                    🛡️ NoVuln<span style={{ color: '#1668dc' }}>.CyberGap</span>
                                </div>
                                <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setLeftOpen(false)} style={{ color: '#888' }} />
                            </div>
                            <Tabs defaultActiveKey="optimal" size="small"
                                style={{ flex: 1, overflow: 'hidden' }}
                                tabBarStyle={{ padding: '0 12px', borderBottom: '1px solid #1f1f1f', margin: 0 }}
                                items={[
                                    {
                                        key: 'optimal',
                                        label: <span style={{ fontSize: 12 }}>Optimal Path</span>,
                                        children: (
                                            <div style={{ padding: '12px 14px', overflowY: 'auto', height: 'calc(100vh - 200px)' }}>
                                                {optimalPath.length === 0 ? (
                                                    <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No path data available</div>
                                                ) : optimalPath.map((id, i) => {
                                                    const nd = nodes.find(n => n.id === id)
                                                    return (
                                                        <div key={id}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #2a2a2a', borderLeft: `3px solid ${NODE_COLORS[nd?.type] || '#888'}` }}>
                                                                <span style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 13, minWidth: 16 }}>{i + 1}</span>
                                                                <div>
                                                                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{nd?.label || id}</div>
                                                                    {allPaths[0]?.steps[i] && <div style={{ color: '#888', fontSize: 11 }}>{allPaths[0].steps[i]}</div>}
                                                                </div>
                                                            </div>
                                                            {i < optimalPath.length - 1 && (
                                                                <div style={{ textAlign: 'center', color: '#ff4d4f', fontSize: 18, lineHeight: '18px', margin: '2px 0' }}>↓</div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                                {totalPaths > 0 && (
                                                    <div style={{ marginTop: 14, padding: 12, background: '#1a0000', borderRadius: 8, border: '1px solid #3a0000' }}>
                                                        <div style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 12 }}>⚠️ Total Attack Paths: {totalPaths}</div>
                                                        <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>Highest probability path shown.</div>
                                                    </div>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'allpaths',
                                        label: <span style={{ fontSize: 12 }}>Top {allPaths.length} Paths</span>,
                                        children: (
                                            <div style={{ padding: '12px 14px', overflowY: 'auto', height: 'calc(100vh - 200px)' }}>
                                                {allPaths.length === 0 ? (
                                                    <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No path data available</div>
                                                ) : allPaths.map((p, i) => {
                                                    const labels = p.path.map(id => nodes.find(n => n.id === id)?.label || id)
                                                    return (
                                                        <div key={p.id} style={{ padding: '10px 12px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #2a2a2a', marginBottom: 8, borderLeft: `3px solid ${i === 0 ? '#ff4d4f' : i === 1 ? '#fa8c16' : '#fadb14'}` }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                                <span style={{ color: '#888', fontSize: 11 }}>#{i + 1}</span>
                                                                <Tag color={p.risk >= 90 ? 'red' : p.risk >= 75 ? 'orange' : 'gold'} style={{ fontSize: 10, padding: '0 5px', margin: 0 }}>{p.risk}%</Tag>
                                                            </div>
                                                            <div style={{ color: '#ccc', fontSize: 11, lineHeight: 1.5, wordBreak: 'break-all' }}>{labels.join(' → ')}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(15,15,15,0.95)', padding: '7px 12px', borderRadius: 24, border: '1px solid #2a2a2a', backdropFilter: 'blur(10px)', maxWidth: 'calc(100% - 24px)' }}>
                    {(!leftOpen || isMobile) && <Button size="small" type="text" icon={<MenuUnfoldOutlined />} onClick={() => setLeftOpen(o => !o)} style={{ color: '#888' }} />}
                    {!isMobile && leftOpen && <Button size="small" type="text" icon={<MenuFoldOutlined />} onClick={() => setLeftOpen(false)} style={{ color: '#888' }} />}
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
                        {[{ label: 'All', value: 0 }, { label: '≥0.7', value: 0.7 }, { label: '≥0.8', value: 0.8 }].map(opt => (
                            <Button key={opt.value} size="small" type={weightThreshold === opt.value ? 'primary' : 'text'}
                                onClick={() => setWeightThreshold(opt.value)} style={{ fontSize: 10, padding: '0 6px', height: 22 }}>{opt.label}</Button>
                        ))}
                    </div>
                    <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />
                    <div style={{ display: 'flex', gap: 3 }}>
                        {[{ key: 'all', label: 'All' }, { key: 'perimeter', label: 'Perim.' }, { key: 'internal', label: 'Int.' }].map(f => (
                            <Button key={f.key} size="small" type={nodeFilter === f.key ? 'primary' : 'text'}
                                onClick={() => setNodeFilter(f.key)} style={{ fontSize: 10, padding: '0 6px', height: 22 }}>{f.label}</Button>
                        ))}
                    </div>
                    <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />
                    <Button size="small" type="text" icon={<ReloadOutlined />} onClick={loadGraph} style={{ color: '#555' }} />
                </div>

                <div style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                    <div style={{ background: 'rgba(15,15,15,0.8)', padding: '3px 14px', borderRadius: 20, border: '1px solid #2a2a2a', display: 'flex', gap: 12 }}>
                        <span style={{ color: '#555', fontSize: 11 }}>{nodes.length} nodes</span>
                        <span style={{ color: '#333' }}>|</span>
                        <span style={{ color: '#555', fontSize: 11 }}>{edges.length} edges</span>
                        {totalPaths > 0 && <><span style={{ color: '#333' }}>|</span><span style={{ color: '#ff4d4f', fontSize: 11 }}>{totalPaths} paths</span></>}
                    </div>
                </div>

                {!isMobile && (
                    <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 20, background: 'rgba(15,15,15,0.9)', padding: '10px 12px', borderRadius: 10, border: '1px solid #2a2a2a' }}>
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

                <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20 }}>
                    <Button type="primary" size={isMobile ? 'small' : 'middle'} icon={<ArrowRightOutlined />} onClick={() => navigate('/fixes')}>
                        {isMobile ? 'Fix Plan' : 'Go to Fix Plan'}
                    </Button>
                </div>

                <ForceGraph2D
                    ref={fgRef} graphData={filteredData} backgroundColor="#0a0a0a"
                    nodeCanvasObject={paintNode} nodeCanvasObjectMode={() => 'replace'}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        const r = (NODE_RADIUS[node.type] || 12) + 8
                        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
                        ctx.fillStyle = color; ctx.fill()
                    }}
                    linkCanvasObject={paintLink} linkCanvasObjectMode={() => 'replace'}
                    onNodeClick={handleNodeClick} onLinkClick={handleLinkClick}
                    nodeLabel={() => ''} enableNodeDrag={true}
                    d3AlphaDecay={0.02} d3VelocityDecay={0.3} cooldownTicks={200}
                    onEngineStop={() => fgRef.current?.zoomToFit(800, 120)}
                    width={dimensions.w} height={dimensions.h}
                />
            </div>

            <Drawer open={drawerOpen} onClose={closeDrawer}
                width={Math.min(380, window.innerWidth - 16)} placement="right"
                title={
                    selectedNode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: NODE_COLORS[selectedNode.type] }} />
                            <span style={{ fontSize: 15 }}>{selectedNode.label}</span>
                        </div>
                    ) : selectedEdge ? (
                        <span style={{ fontSize: 13 }}>
                            {typeof selectedEdge.source === 'object' ? selectedEdge.source.label || selectedEdge.source.id : selectedEdge.source}
                            {' → '}
                            {typeof selectedEdge.target === 'object' ? selectedEdge.target.label || selectedEdge.target.id : selectedEdge.target}
                        </span>
                    ) : 'Details'
                }
                closeIcon={<CloseOutlined style={{ color: '#888' }} />}
                styles={{ body: { background: '#0f0f0f', padding: 16 }, header: { background: '#141414', borderBottom: '1px solid #1f1f1f' }, mask: { background: 'rgba(0,0,0,0.3)' }, wrapper: { zIndex: 500 } }}
            >
                {selectedNode && (
                    <div style={{ color: '#ccc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[
                                { label: 'Type', value: selectedNode.type, color: NODE_COLORS[selectedNode.type] },
                                { label: 'CVSS', value: selectedNode.cvss || '—', color: selectedNode.cvss >= 9 ? '#ff4d4f' : selectedNode.cvss >= 7 ? '#fa8c16' : '#52c41a' },
                                { label: 'Path Count', value: pathCount(selectedNode.id), color: '#fff' },
                                { label: 'Blast Radius', value: blastNodes.length, color: '#fa8c16' },
                            ].map(item => (
                                <div key={item.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a2a2a' }}>
                                    <div style={{ color: '#666', fontSize: 11 }}>{item.label}</div>
                                    <div style={{ color: item.color, fontWeight: 800, fontSize: 20, marginTop: 2 }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                        {(chokepoints.includes(selectedNode.id) || selectedNode.isChokepoint) && (
                            <div style={{ padding: 12, background: '#2d1a00', borderRadius: 8, border: '1px solid #5a3700', marginBottom: 12 }}>
                                <span style={{ color: '#fa8c16', fontSize: 13 }}>
                                    ⚡ Chokepoint — fixing this blocks <strong>{pathCount(selectedNode.id)} attack paths</strong>
                                </span>
                            </div>
                        )}
                        {blastNodes.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Blast Radius ({blastNodes.length} nodes)</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {blastNodes.map(id => {
                                        const n = nodes.find(nd => nd.id === id)
                                        return <Tag key={id} color="red" style={{ fontSize: 11 }}>{n?.label || id}</Tag>
                                    })}
                                </div>
                            </div>
                        )}
                        {(selectedNode.ip || selectedNode.software) && (
                            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10, border: '1px solid #2a2a2a', marginBottom: 12 }}>
                                <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>IP / Software</div>
                                <div style={{ color: '#ccc', fontSize: 12 }}>
                                    {selectedNode.ip && <span style={{ marginRight: 12 }}>📍 {selectedNode.ip}</span>}
                                    {selectedNode.software && <span>⚙️ {selectedNode.software} {selectedNode.version}</span>}
                                </div>
                            </div>
                        )}
                        <Button type="primary" block onClick={() => navigate('/fixes')} style={{ marginTop: 8 }}>View in Fix Plan →</Button>
                    </div>
                )}
                {selectedEdge && (
                    <div style={{ color: '#ccc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                            {[
                                { label: 'Weight', value: selectedEdge.weight, color: selectedEdge.weight >= 0.8 ? '#ff4d4f' : '#fadb14' },
                                { label: 'Success Rate', value: `${Math.round(selectedEdge.weight * 100)}%`, color: '#fa8c16' },
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
                            {selectedEdge.tactic && <Tag style={{ marginLeft: 6 }}>{selectedEdge.tactic}</Tag>}
                            {selectedEdge.cve && <Tag color="red" style={{ marginLeft: 6 }}>{selectedEdge.cve}</Tag>}
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #2a2a2a' }}>
                            <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>Mitigation</div>
                            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>{selectedEdge.mitigation}</div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    )
}