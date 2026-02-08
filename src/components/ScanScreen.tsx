import { useState } from 'react'
import { Music2, Users, MessageCircle } from 'lucide-react'
import { measureNoise, type NoiseSnapshot } from '../lib/noiseDetector'
import { supabase } from '../lib/supabase'
import type { Room } from '../types/database'
import type { User } from '@supabase/supabase-js'

interface Props {
  rooms: Room[]
  user: User | null
  onSubmitted: () => void
  onSignInClick: () => void
}

export function ScanScreen({ rooms, user, onSubmitted, onSignInClick }: Props) {
  const [scanning, setScanning] = useState(false)
  const [snapshot, setSnapshot] = useState<NoiseSnapshot | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [peopleCount, setPeopleCount] = useState(0)
  const [yappersCount, setYappersCount] = useState(0)
  const [hasMusic, setHasMusic] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setError(null)
    setSnapshot(null)
    setScanning(true)
    try {
      const result = await measureNoise(4000)
      setSnapshot(result)
      if (rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rooms[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mic access denied or failed')
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRoomId || !user) return
    setSubmitting(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('room_status') as any).insert({
        room_id: selectedRoomId,
        user_id: user.id,
        avg_noise: snapshot?.rms ?? null,
        noise_label: snapshot?.label ?? null,
        people_count: peopleCount,
        yappers_count: yappersCount,
        has_music: hasMusic,
      })
      if (err) throw new Error(err.message)
      setSnapshot(null)
      setPeopleCount(0)
      setYappersCount(0)
      setHasMusic(false)
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="auth-required">
        <p>Sign in to report room status and help other students find the best spots.</p>
        <button type="button" className="submit-button" onClick={onSignInClick}>
          Sign in to continue
        </button>
      </div>
    )
  }

  return (
    <div className="scan-screen">
      <button
        className={`scan-button ${scanning ? 'scanning' : ''}`}
        onClick={handleScan}
        disabled={scanning}
      >
        {scanning ? 'Listening…' : 'Scan Noise'}
      </button>

      {scanning && (
        <p className="scan-status">Sampling ~4 seconds of audio…</p>
      )}

      {error && (
        <p style={{ color: '#f87171', marginTop: '1rem' }}>{error}</p>
      )}

      {rooms.length > 0 && (
        <div className="scan-form">
          <select
            className="room-select"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            <option value="">Select room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.building ? `[${r.building}] ` : ''}{r.name}
              </option>
            ))}
          </select>

          <div className="status-inputs">
            <label className="status-label">
              <Users size={16} />
              <span>People</span>
              <input
                type="number"
                min={0}
                max={200}
                value={peopleCount || ''}
                onChange={(e) => setPeopleCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
              />
            </label>
            <label className="status-label">
              <MessageCircle size={16} />
              <span>Yappers</span>
              <input
                type="number"
                min={0}
                max={50}
                value={yappersCount || ''}
                onChange={(e) => setYappersCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
              />
            </label>
            <label className="status-label status-toggle">
              <Music2 size={16} />
              <span>Music playing</span>
              <input
                type="checkbox"
                checked={hasMusic}
                onChange={(e) => setHasMusic(e.target.checked)}
              />
            </label>
          </div>

          {snapshot && !scanning && (
            <div className="scan-result-inline">
              <span className={`room-badge ${snapshot.label.toLowerCase()}`}>{snapshot.label}</span>
              <span className="scan-rms">RMS: {snapshot.rms.toFixed(4)}</span>
            </div>
          )}

          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={!selectedRoomId || submitting}
          >
            {submitting ? 'Submitting…' : 'Submit status'}
          </button>
        </div>
      )}

      {rooms.length === 0 && (
        <p className="empty-hint">Add rooms first to submit status.</p>
      )}
    </div>
  )
}
