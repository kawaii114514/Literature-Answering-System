import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface DemoPolicy {
  enabled: boolean
  queriesPerDay: number
  uploadsPerDay: number
  maxFileSizeBytes: number
  maxPages: number
}

const defaults: DemoPolicy = { enabled: false, queriesPerDay: 10, uploadsPerDay: 3, maxFileSizeBytes: 50 * 1024 * 1024, maxPages: 500 }
const Policy = createContext(defaults)
export const useDemoPolicy = () => useContext(Policy)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState(defaults)
  useEffect(() => {
    const controller = new AbortController()
    const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
    fetch(`${base}/api/v1/demo`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Policy unavailable'); return response.json() as Promise<DemoPolicy> })
      .then((value) => { if (!controller.signal.aborted && typeof value.enabled === 'boolean') setPolicy(value) })
      .catch(() => { /* Normal deployments and older backends need no demo notice. */ })
    return () => controller.abort()
  }, [])
  return <Policy.Provider value={policy}>{children}</Policy.Provider>
}

export function DemoNotice() {
  const policy = useDemoPolicy()
  if (!policy.enabled) return null
  return <aside className="demo-notice" aria-label="公开演示说明">
    <strong>公开试用 · 真实文献问答</strong>
    <p>每个账户每天 {policy.queriesPerDay} 次问答或检索、{policy.uploadsPerDay} 次上传或重试。额度在北京时间 08:00 重置，操作尝试计入额度。</p>
    <p>请只上传可公开的论文。用于问答的文献片段会发送给模型服务商；演示数据可能在维护或试用结束时清理。</p>
  </aside>
}
