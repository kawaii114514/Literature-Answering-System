import { useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowRight, FileSearch, Layers3, Quote } from 'lucide-react'
import { spineCloths } from '../library'
import { Owl, owlSprite, type OwlMood } from '../pixel/Owl'
import { PixelSprite } from '../pixel/PixelSprite'
import { api } from '../api'
import type { Session } from '../types'
import { DemoNotice } from './DemoPolicy'

const brandOwl = owlSprite('open')
/** Decorative spines for the cover page: [cloth, width, height]. */
const coverShelf = [[0, 18, 64], [2, 14, 52], [1, 22, 72], [3, 16, 58], [5, 12, 46], [6, 20, 68], [4, 16, 54], [7, 24, 74], [1, 14, 50], [0, 18, 62], [2, 22, 70], [3, 12, 48], [6, 16, 60], [5, 20, 66], [4, 14, 56], [7, 18, 72], [2, 16, 50], [0, 22, 64]] as const

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
  const [field, setField] = useState<'text' | 'password' | null>(null)
  const mood: OwlMood = pending ? 'searching' : error ? 'sad' : field === 'password' ? 'shy' : field === 'text' ? 'writing' : 'idle'

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
          <span className="brand-mark brand-owl"><PixelSprite sprite={brandOwl} scale={2} /></span>
          <span>LitEvidence<small>循证 · 文献研究室</small></span>
        </a>

        <div className="auth-copy">
          <h1 id="auth-heading">在字里行间，<br />遇见<em>新发现。</em></h1>
          <p className="auth-lead">每一个结论，都能回到原文。</p>
          <div className="auth-features" aria-label="核心能力">
            <div><FileSearch aria-hidden="true" /><span>文献里的答案</span></div>
            <div><Layers3 aria-hidden="true" /><span>跨论文的联系</span></div>
            <div><Quote aria-hidden="true" /><span>可核验的出处</span></div>
          </div>
        </div>

        <div className="auth-footnote">
          <div className="auth-shelf" aria-hidden="true">
            {coverShelf.map(([cloth, width, height], index) => {
              const colors = spineCloths[cloth]
              return <i key={index} style={{ '--cover': colors.cover, '--cover-light': colors.light, '--cover-dark': colors.dark, '--i': index, width, height } as CSSProperties} />
            })}
          </div>
          <span className="auth-stamp">循证<br />而行</span>
        </div>
      </section>

      <section className="auth-panel" aria-label={mode === 'login' ? '登录' : '注册'}>
        <div className="auth-form-wrap">
          <div className="auth-owl"><Owl mood={mood} scale={5} bubbleSide="right" tips={['输密码的时候，我不看。', '注册只要一个用户名和密码。']} /></div>
          <div className="auth-form-box px-box">
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
            <h2>{mode === 'login' ? '继续你的研究' : '建立你的文献空间'}</h2>
          </div>

          <form onSubmit={submit} className="auth-form" onFocus={(event) => setField(event.target instanceof HTMLInputElement ? (event.target.type === 'password' ? 'password' : 'text') : null)} onBlur={() => setField(null)}>
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
                onChange={(event) => { setUsername(event.target.value); setError(null) }}
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
                onChange={(event) => { setPassword(event.target.value); setError(null) }}
                placeholder={mode === 'register' ? '至少 8 个字符' : '输入密码'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit px-button" type="submit" disabled={pending}>
              <span>{pending ? '正在连接…' : mode === 'login' ? '进入工作台' : '创建并进入'}</span>
              {!pending && <ArrowRight aria-hidden="true" />}
            </button>
          </form>
          </div>

          <DemoNotice />
          <p className="auth-note">文献与研究记录仅向有权限的成员开放</p>
        </div>
      </section>
    </main>
  )
}
