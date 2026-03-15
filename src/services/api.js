const BASE_URL = 'https://novuln.onrender.com'

export async function startScan(payload) {
    const res = await fetch(`${BASE_URL}/api/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Scan start failed: ${res.status}`)
    return res.json()
}

export function createScanSSE(scanId) {
    return new EventSource(`${BASE_URL}/api/scan/${scanId}/progress`)
}
export async function getAttackGraph(scanId) {
    const res = await fetch(`${BASE_URL}/api/attack/${scanId}/graph`)
    if (!res.ok) throw new Error(`Attack graph failed: ${res.status}`)
    return res.json()
}
export async function getGapReport(scanId) {
    const res = await fetch(`${BASE_URL}/api/gap/${scanId}`)
    if (!res.ok) throw new Error(`Gap report failed: ${res.status}`)
    return res.json()
}

export async function getFixPlan(scanId) {
    const res = await fetch(`${BASE_URL}/api/gap/${scanId}/fix-plan`)
    if (!res.ok) throw new Error(`Fix plan failed: ${res.status}`)
    return res.json()
}
export async function getReportPdf(scanId) {
    const res = await fetch(`${BASE_URL}/api/report/${scanId}/pdf`)
    if (!res.ok) throw new Error(`PDF report failed: ${res.status}`)
    return res.blob()
}