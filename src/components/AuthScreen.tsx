import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  profile: { username: string } | null
  onAuthChange: () => void
  onProfileChange: () => void
}

export function AuthScreen({ user, profile, onAuthChange, onProfileChange }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim().slice(0, 30) } },
        })
        if (error) throw error
        if (data.user) onProfileChange()
        setMessage({ type: 'success', text: 'Check your email to confirm!' })
      } else {
        let signInEmail = email.trim()
        if (!signInEmail.includes('@')) {
          const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', signInEmail)
            .maybeSingle() as { data: { email: string } | null }
          if (!data?.email) {
            throw new Error('Username not found')
          }
          signInEmail = data.email
        }
        const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password })
        if (error) throw error
        onAuthChange()
        onProfileChange()
      }
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Something went wrong',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onAuthChange()
  }

  if (user && profile) {
    return (
      <div className="auth-status">
        <span className="auth-username">@{profile.username}</span>
        <button type="button" className="auth-logout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    )
  }

  if (user && !profile) {
    return (
      <div className="auth-status">
        <span className="auth-username">Account</span>
        <button type="button" className="auth-logout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-form-wrapper">
      <h3 className="auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</h3>
      <p className="auth-hint">Sign in to share place status with other UWaterloo students</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Username (letters, numbers, _ -)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
            title="Letters, numbers, underscore, hyphen only"
            autoComplete="username"
          />
        )}
        <input
          type={mode === 'login' ? 'text' : 'email'}
          placeholder={mode === 'login' ? 'Email or username' : 'Email (e.g. you@uwaterloo.ca)'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete={mode === 'login' ? 'username' : 'email'}
        />
        <div className="auth-password-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {message && (
          <p className={message.type === 'error' ? 'auth-error' : 'auth-success'}>{message.text}</p>
        )}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button
        type="button"
        className="auth-toggle"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'signup' : 'login'))
          setMessage(null)
          setUsername('')
        }}
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
