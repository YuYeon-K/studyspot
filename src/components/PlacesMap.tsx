import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Room } from '../types/database'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon in Vite/bundler
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const UW_CENTER: [number, number] = [43.4723, -80.5449]

interface Props {
  places: Room[]
}

export function PlacesMap({ places }: Props) {
  const withCoords = useMemo(
    () => places.filter((p) => p.latitude != null && p.longitude != null),
    [places],
  )

  if (withCoords.length === 0) {
    return (
      <div className="map-empty">
        <p>No places with location data yet.</p>
        <p>Add places with coordinates to see them on the map.</p>
      </div>
    )
  }

  return (
    <div className="places-map-wrapper">
      <MapContainer
        center={UW_CENTER}
        zoom={16}
        className="places-map"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude!, place.longitude!]}
            icon={defaultIcon}
          >
            <Popup>
              <strong>{place.name}</strong>
              {place.building && (
                <span className="map-popup-building"> [{place.building}]</span>
              )}
              {place.description && (
                <p className="map-popup-desc">{place.description}</p>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
