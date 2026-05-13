import { useState } from 'react'
import { MapPin } from 'lucide-react'
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
  const [showCoords, setShowCoords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(false)
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
      setShowCoords(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add place. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-screen">
      <div className="add-screen-header">
        <h2 className="add-screen-title">Add a place</h2>
        <p className="add-screen-hint">Know a great study spot? Share it with others.</p>
      </div>

      <div className="add-card">
        <div className="add-type-toggle">
          <button
            type="button"
            className={spotType === 'building' ? 'active' : ''}
            onClick={() => setSpotType('building')}
          >
            Building / Library
          </button>
          <button
            type="button"
            className={spotType === 'cafe' ? 'active' : ''}
            onClick={() => setSpotType('cafe')}
          >
            Cafe
          </button>
        </div>

        <form className="add-form" onSubmit={handleSubmit}>
          <div className="add-field-group">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">{spotType === 'cafe' ? 'Area (optional)' : 'Building (optional)'}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder={spotType === 'cafe' ? 'Cafe name (e.g. Williams, Gong Cha)' : 'Place name (e.g. DC 1301, SLC 3rd Floor)'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <button
            type="button"
            className="add-coords-toggle"
            onClick={() => setShowCoords(v => !v)}
          >
            <MapPin size={14} />
            {showCoords ? 'Hide map coordinates' : 'Add map coordinates (optional)'}
          </button>

          {showCoords && (
            <div className="add-coords">
              <input
                type="text"
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <input
                type="text"
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="add-error">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          {success && (
            <p className="add-success">Place added successfully!</p>
          )}

          <button type="submit" className="add-submit" disabled={loading}>
            {loading ? 'Adding…' : spotType === 'cafe' ? 'Add Cafe' : 'Add Place'}
          </button>
        </form>
      </div>
    </div>
  )
}
