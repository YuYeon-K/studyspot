import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  buildings: readonly string[]
  onAdded: () => void
  onSignInClick: () => void
}

export function AddRoomForm({ user, buildings, onAdded, onSignInClick }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [building, setBuilding] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <div className="auth-required">
        <p>Sign in to add new rooms and help build the UWaterloo study map.</p>
        <button type="button" className="add-room-button" onClick={onSignInClick}>
          Sign in to continue
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('rooms') as any).insert({
        name: name.trim(),
        description: description.trim(),
        building: building || '',
      })
      setName('')
      setDescription('')
      setBuilding('')
      onAdded()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="add-room-form" onSubmit={handleSubmit}>
      <select
        className="add-room-select"
        value={building}
        onChange={(e) => setBuilding(e.target.value)}
      >
        <option value="">Building (optional)</option>
        {buildings.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Room name (e.g. DC 1301, SLC 3rd Floor)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit" className="add-room-button" disabled={loading}>
        {loading ? 'Adding…' : 'Add Room'}
      </button>
    </form>
  )
}
