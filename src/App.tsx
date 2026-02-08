import { useState, useEffect } from 'react'
import { Home, Map, Mic, PlusCircle, LogIn } from 'lucide-react'
import { RoomList } from './components/RoomList'
import { PlacesMap } from './components/PlacesMap'
import { ScanScreen } from './components/ScanScreen'
import { AddRoomForm } from './components/AddRoomForm'
import { AuthScreen } from './components/AuthScreen'
import { supabase } from './lib/supabase'
import type { Room } from './types/database'
import type { User } from '@supabase/supabase-js'
import './App.css'

type Tab = 'places' | 'map' | 'scan' | 'add'

const UW_LOCATIONS = ['DC', 'MC', 'SLC', 'DP', 'E7', 'E5', 'E3', 'HH', 'QNC', 'RCH', 'Plaza', 'Other'] as const

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const needsSetup = !supabaseUrl || supabaseUrl.includes('your-project')

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ username: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [tab, setTab] = useState<Tab>('places')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('username').eq('user_id', uid).maybeSingle()
    const p = data as { username: string } | null
    setProfile(p ? { username: p.username } : null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchRooms = async () => {
    setError(null)
    try {
      const { data, error: err } = await supabase.from('rooms').select('*').order('name')
      if (err) throw err
      setRooms(data ?? [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load rooms'
      setError(msg)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  if (needsSetup) {
    return (
      <div className="app">
        <div className="setup-banner">
          <h2>Supabase not configured</h2>
          <p>Replace the placeholder values in <code>.env</code> with your real Supabase project:</p>
          <ol>
            <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com/dashboard</a></li>
            <li>Create or open a project → Project Settings → API</li>
            <li>Copy <strong>Project URL</strong> and <strong>anon public</strong> key</li>
            <li>Edit <code>.env</code> and replace <code>your-project</code> with your real URL (e.g. <code>https://xyz123.supabase.co</code>)</li>
            <li>Restart the dev server (<code>npm run dev</code>)</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">UWaterloo Study Spot</h1>
        <div className="app-header-actions">
          {!authLoading && user ? (
            <AuthScreen
              user={user}
              profile={profile}
              onAuthChange={() => setShowAuth(false)}
              onProfileChange={() => user && fetchProfile(user.id)}
            />
          ) : !authLoading ? (
            <button
              type="button"
              className="auth-trigger"
              onClick={() => setShowAuth(true)}
              aria-label="Sign in"
            >
              <LogIn size={20} />
              <span>Sign in</span>
            </button>
          ) : null}
        </div>
      </header>

      {showAuth && !user && (
        <div className="auth-overlay" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <AuthScreen
              user={null}
              profile={null}
              onAuthChange={() => setShowAuth(false)}
              onProfileChange={() => {}}
            />
            <button type="button" className="auth-close" onClick={() => setShowAuth(false)}>
              ×
            </button>
          </div>
        </div>
      )}

      <nav className="nav-tabs">
        <button
          className={tab === 'places' ? 'active' : ''}
          onClick={() => setTab('places')}
        >
          <Home size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Places
        </button>
        <button
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          <Map size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Map
        </button>
        <button
          className={tab === 'scan' ? 'active' : ''}
          onClick={() => setTab('scan')}
        >
          <Mic size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Scan
        </button>
        <button
          className={tab === 'add' ? 'active' : ''}
          onClick={() => setTab('add')}
        >
          <PlusCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Add Place
        </button>
      </nav>

      {error && (
        <div className="app-error-banner">
          {error}
          {(error.toLowerCase().includes('fetch') || error.includes('Invalid') || !import.meta.env.VITE_SUPABASE_URL) ? (
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
              Add a <code>.env</code> file with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from your Supabase project.
            </p>
          ) : null}
        </div>
      )}

      {tab === 'places' && (
        <RoomList rooms={rooms} loading={loading} onRefresh={fetchRooms} />
      )}
      {tab === 'map' && <PlacesMap places={rooms} />}
      {tab === 'scan' && (
        <ScanScreen
          rooms={rooms}
          user={user}
          onSubmitted={fetchRooms}
          onSignInClick={() => setShowAuth(true)}
        />
      )}
      {tab === 'add' && (
        <AddRoomForm
          user={user}
          locations={UW_LOCATIONS}
          onAdded={fetchRooms}
          onSignInClick={() => setShowAuth(true)}
        />
      )}
    </div>
  )
}

export default App
