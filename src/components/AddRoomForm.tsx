import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  locations: readonly string[]
  onAdded: () => void
}

export function AddRoomForm({ locations, onAdded }: Props) {
  const [spotType, setSpotType] = useState<'building' | 'cafe'>('building')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const lat = latitude ? parseFloat(latitude) : null
      const lng = longitude ? parseFloat(longitude) : null
      const { error: err } = await (supabase.from('rooms') as any).insert({
        name: name.trim(),
        description: description.trim(),
        building: location || (spotType === 'cafe' ? 'Plaza' : ''),
        spot_type: spotType === 'building' ? 'room' : 'cafe',
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
      })
      if (err) throw new Error(err.message)
      setName('')
      setDescription('')
      setLocation('')
      setLatitude('')
      setLongitude('')
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add place. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="add-room-form" onSubmit={handleSubmit}>
      <div className="add-room-type">
        <label>
          <input
            type="radio"
            name="spotType"
            checked={spotType === 'building'}
            onChange={() => setSpotType('building')}
          />
          Building / Library
        </label>
        <label>
          <input
            type="radio"
            name="spotType"
            checked={spotType === 'cafe'}
            onChange={() => setSpotType('cafe')}
          />
          Cafe
        </label>
      </div>
      <select
        className="add-room-select"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      >
        <option value="">{spotType === 'cafe' ? 'Location (optional)' : 'Building (optional)'}</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder={
          spotType === 'cafe'
            ? 'Cafe name (e.g. Williams, Gong Cha)'
            : 'Place name (e.g. DC 1301, SLC 3rd Floor)'
        }
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="add-place-coords">
        <input
          type="text"
          placeholder="Latitude (optional, for map)"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
        />
        <input
          type="text"
          placeholder="Longitude (optional, for map)"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
        />
      </div>
      {error && (
        <div className="form-error-block">
          <p className="auth-error">{error}</p>
          <button type="button" className="form-error-retry" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <button type="submit" className="add-place-button" disabled={loading}>
        {loading ? 'Adding…' : spotType === 'cafe' ? 'Add Cafe' : 'Add Place'}
      </button>
    </form>
  )
}
