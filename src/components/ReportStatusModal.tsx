import { useState } from 'react'
import { Music2, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Room } from '../types/database'
import type { User } from '@supabase/supabase-js'

const CROWD_OPTIONS = [
  { value: '', label: 'How crowded?' },
  { value: 'empty', label: 'Empty' },
  { value: 'lots_of_space', label: 'A lot of space' },
  { value: 'some_space', label: 'Some space' },
  { value: 'crowded', label: 'Crowded' },
  { value: 'no_space', label: 'No space at all' },
] as const

const NOISE_OPTIONS = [
  { value: '', label: 'Noise level (optional)' },
  { value: 'Quiet', label: 'Quiet' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Loud', label: 'Loud' },
] as const

interface Props {
  place: Room
  user: User
  onSaved: () => void
  onClose: () => void
}

export function ReportStatusModal({ place, user, onSaved, onClose }: Props) {
  const [crowdLevel, setCrowdLevel] = useState('')
  const [yappersCount, setYappersCount] = useState(0)
  const [hasMusic, setHasMusic] = useState(false)
  const [noiseLabel, setNoiseLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('room_status') as any).insert({
        room_id: place.id,
        user_id: user.id,
        avg_noise: null,
        noise_label: noiseLabel || null,
        people_count: 0,
        crowd_level: crowdLevel || null,
        yappers_count: yappersCount,
        has_music: hasMusic,
      })
      if (err) throw new Error(err.message)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal edit-place-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="auth-title">Report status for {place.name}</h2>
        <p className="auth-hint">Update crowd, noise, and other conditions.</p>
        <form className="add-room-form" onSubmit={handleSubmit}>
          <label className="status-label status-select">
            <span>Crowd</span>
            <select
              value={crowdLevel}
              onChange={(e) => setCrowdLevel(e.target.value)}
            >
              {CROWD_OPTIONS.map((o) => (
                <option key={o.value || 'blank'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="status-label status-select">
            <span>Noise level</span>
            <select
              value={noiseLabel}
              onChange={(e) => setNoiseLabel(e.target.value)}
            >
              {NOISE_OPTIONS.map((o) => (
                <option key={o.value || 'blank'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
          {error && <p className="auth-error">{error}</p>}
          <div className="edit-place-actions">
            <button type="button" className="auth-toggle" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="add-place-button" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
