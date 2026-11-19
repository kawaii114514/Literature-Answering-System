import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, FileSearch, Layers3, Quote } from 'lucide-react'
import { api } from '../api'
import type { Session } from '../types'
import { DemoNotice } from './DemoPolicy'

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
          <span>LitEvidence<small>循证 · 文献研究室</small></span>
        </a>

        <div className="auth-copy">
          <p className="eyebrow eyebrow-dark">A QUIETER PLACE FOR DEEPER THINKING</p>
          <h1 id="auth-heading">在字里行间，<br />遇见<em>新发现。</em></h1>
          <p className="auth-lead">
            把散落的论文，连成清晰的思路。<br />让每一个问题有据可循，每一个结论都能回到原文。
          </p>
          <div className="auth-features" aria-label="核心能力">
            <div><FileSearch aria-hidden="true" /><span>文献里的答案</span></div>
            <div><Layers3 aria-hidden="true" /><span>跨论文的联系</span></div>
            <div><Quote aria-hidden="true" /><span>可核验的出处</span></div>
          </div>
        </div>

        <div className="auth-footnote">
          <span className="auth-footnote-number">[ 01 — ∞ ]</span>
          <p>从第一篇文献，<br />到属于你的洞见。</p>
          <span className="auth-stamp">循证<br />而行</span>
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
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h2>{mode === 'login' ? '继续你的研究' : '建立你的文献空间'}</h2>
            <p>{mode === 'login' ? '登录后恢复知识空间与检索记录。' : '账户用于隔离个人及课题组文献。'}</p>
          </div>

          <DemoNotice />
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label>
                <span>显示名称</span>
                <input
                  autoComplete="name"
                  maxLength={200}
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
                maxLength={100}
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

          <p className="auth-note">你的文献与研究记录，仅向有权限的成员开放。</p>
        </div>
      </section>
    </main>
  )
}
