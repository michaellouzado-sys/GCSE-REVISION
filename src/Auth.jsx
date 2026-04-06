import { useState } from 'react'
import { supabase } from './supabase'

const f = { fontFamily: "'Courier New', monospace" }
const inp = { width: '100%', background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#F1F5F9', fontSize: 14, fontFamily: "'Courier New', monospace", boxSizing: 'border-box', marginBottom: 12, outline: 'none' }
const btn = { width: '100%', padding: '12px', background: '#F59E0B', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: "'Courier New', monospace", letterSpacing: 2, fontSize: 14 }

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handle = async () => {
    setError(''); setLoading(true); setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setMessage('Check your email to confirm your account, then log in.')
      }
    } catch (e) {
      setError('Something went wrong.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', ...f }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: '#F59E0B', marginBottom: 8 }}>GCSE REVISION COMMAND CENTRE</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#F1F5F9', lineHeight: 1 }}>REVISION<br /><span style={{ color: '#F59E0B' }}>PLANNER</span></div>
        </div>

        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 12, padding: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#F59E0B', marginBottom: 20 }}>
            {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </div>

          <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()} />
          <input style={inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()} />

          {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#EF444415', borderRadius: 6 }}>{error}</div>}
          {message && <div style={{ color: '#10B981', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#10B98115', borderRadius: 6 }}>{message}</div>}

          <button style={btn} onClick={handle} disabled={loading}>
            {loading ? 'LOADING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 12, fontFamily: "'Courier New', monospace" }}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
