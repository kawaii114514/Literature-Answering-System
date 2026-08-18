import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, FileSearch, Layers3, Quote } from 'lucide-react'
import { api } from '../api'
import type { Session } from '../types'

interface AuthScreenProps {
  onAuthenticated(session: Session): void
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, displayName, password)
      onAuthenticated(response)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '认证失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-labelledby="auth-heading">
        <a className="brand brand-light" href="#" aria-label="LitEvidence 首页">
          <span className="brand-mark"><BookOpen aria-hidden="true" /></span>
          <span>LitEvidence</span>
        </a>

        <div className="auth-copy">
          <p className="eyebrow eyebrow-dark">RESEARCH, GROUNDED</p>
          <h1 id="auth-heading">让每一个结论，<br />都能回到原文。</h1>
          <p className="auth-lead">
            为研究生与课题组打造的文献证据工作台。上传论文，使用混合检索定位证据，并获得页码级可核验回答。
          </p>
          <div className="auth-features" aria-label="核心能力">
            <div><FileSearch aria-hidden="true" /><span>PDF 页码感知解析</span></div>
            <div><Layers3 aria-hidden="true" /><span>BM25 + BGE-M3 + 重排序</span></div>
            <div><Quote aria-hidden="true" /><span>文献、页码与原文引用</span></div>
          </div>
        </div>

        <div className="benchmark-strip">
          <div>
            <span className="benchmark-label">Top-5 证据命中率</span>
            <strong>42.5%</strong>
            <small>向量基线</small>
          </div>
          <ArrowRight aria-hidden="true" />
          <div className="benchmark-best">
            <span className="benchmark-label">混合检索 + 重排</span>
            <strong>87.5%</strong>
            <small><Check aria-hidden="true" /> 50 条固定评测</small>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label={mode === 'login' ? '登录' : '注册'}>
        <div className="auth-form-wrap">
          <div className="auth-tabs" role="tablist" aria-label="认证方式">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setError(null) }}
            >登录</button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => { setMode('register'); setError(null) }}
            >创建账户</button>
          </div>

          <div className="auth-form-heading">
            <p className="eyebrow">WELCOME TO LITEVIDENCE</p>
            <h2>{mode === 'login' ? '继续你的研究' : '建立你的文献空间'}</h2>
            <p>{mode === 'login' ? '登录后恢复知识空间与检索记录。' : '账户用于隔离个人及课题组文献。'}</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label>
                <span>显示名称</span>
                <input
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="例如：林同学"
                  required
                />
              </label>
            )}
            <label>
              <span>用户名</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="researcher"
                required
              />
            </label>
            <label>
              <span>密码</span>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? '至少 8 个字符' : '输入密码'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit" type="submit" disabled={pending}>
              <span>{pending ? '正在连接…' : mode === 'login' ? '进入工作台' : '创建并进入'}</span>
              {!pending && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-note">JWT 身份验证 · 文献按用户与课题组隔离</p>
        </div>
      </section>
    </main>
  )
}
