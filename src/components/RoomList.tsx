import { useEffect, useState } from 'react'
import { RefreshCw, MessageCircle, Music2, Trash2, ChevronRight, ArrowLeft, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ReportStatusModal } from './ReportStatusModal'
import type { Room } from '../types/database'
import type { User } from '@supabase/supabase-js'

const CROWD_LABELS: Record<string, string> = {
  empty: 'Empty',
  lots_of_space: 'A lot of space',
  some_space: 'Some space',
  crowded: 'Crowded',
  no_space: 'No space',
}

interface RoomStatusSummary {
  noiseLabel: string | null
  crowdLevel: string | null
  yappersAvg: number
  musicCount: number
  totalReports: number
  latestAt: string | null
}

interface RoomWithStatus extends Room {
  status: RoomStatusSummary | null
}

function timeAgo(dateStr: string): string {
  const sec = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`
  return `${Math.floor(sec / 86400)} days ago`
}

function badgeClass(label: string): string {
  const l = label?.toLowerCase() ?? 'moderate'
  return `room-badge ${l}`
}

interface Props {
  rooms: Room[]
  loading: boolean
  onRefresh: () => void
  isAdmin?: boolean
  canReport?: boolean
  user?: User | null
}

type ViewMode = 'buildings' | 'cafes'

export function RoomList({ rooms, loading, onRefresh, isAdmin, canReport = false, user }: Props) {
  const [roomData, setRoomData] = useState<RoomWithStatus[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('buildings')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reportingPlace, setReportingPlace] = useState<RoomWithStatus | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<RoomWithStatus | null>(null)

  useEffect(() => {
    setSelectedBuilding(null)
    setSelectedPlace(null)
  }, [viewMode])

  useEffect(() => {
    async function fetchStatus() {
      if (rooms.length === 0) {
        setRoomData(rooms.map((r) => ({ ...r, status: null })))
        return
      }

      const { data } = await supabase
        .from('room_status')
        .select('room_id, noise_label, crowd_level, yappers_count, has_music, created_at')
        .in('room_id', rooms.map((r) => r.id))
        .order('created_at', { ascending: false })
      const statusRows = data as Array<{
        room_id: string
        noise_label: string | null
        crowd_level: string | null
        yappers_count: number
        has_music: boolean
        created_at: string
      }> | null

      const byRoom = new Map<string, typeof statusRows>()
      for (const s of statusRows ?? []) {
        const list = byRoom.get(s.room_id) ?? []
        if (list.length < 10) list.push(s)
        byRoom.set(s.room_id, list)
      }

      const summarized: RoomWithStatus[] = rooms.map((room) => {
        const list = byRoom.get(room.id) ?? []
        if (list.length === 0) {
          return { ...room, status: null }
        }
        const crowdCounts = new Map<string, number>()
        let crowdLatest = list[0]?.crowd_level ?? null
        for (const x of list) {
          if (x.crowd_level) {
            crowdCounts.set(x.crowd_level, (crowdCounts.get(x.crowd_level) ?? 0) + 1)
          }
        }
        const yappersSum = list.reduce((a, x) => a + (x.yappers_count ?? 0), 0)
        const musicCount = list.filter((x) => x.has_music).length
        const latest = list[0]
        const crowdLevel =
          crowdCounts.size > 0
            ? [...crowdCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
            : crowdLatest

        return {
          ...room,
          status: {
            noiseLabel: latest?.noise_label ?? null,
            crowdLevel,
            yappersAvg: Math.round(yappersSum / list.length),
            musicCount,
            totalReports: list.length,
            latestAt: latest?.created_at ?? null,
          },
        }
      })

      const crowdOrder: Record<string, number> = {
        empty: 0,
        lots_of_space: 1,
        some_space: 2,
        crowded: 3,
        no_space: 4,
      }
      summarized.sort((a, b) => {
        const order: Record<string, number> = { Quiet: 0, Moderate: 1, Loud: 2 }
        const va = a.status?.noiseLabel ? (order[a.status.noiseLabel] ?? 1) : 99
        const vb = b.status?.noiseLabel ? (order[b.status.noiseLabel] ?? 1) : 99
        if (va !== vb) return va - vb
        const ca = a.status?.crowdLevel ? (crowdOrder[a.status.crowdLevel] ?? 99) : 99
        const cb = b.status?.crowdLevel ? (crowdOrder[b.status.crowdLevel] ?? 99) : 99
        return ca - cb
      })

      setRoomData(summarized)
    }

    fetchStatus()
  }, [rooms])

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin || !confirm(`Remove "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id)
      if (error) throw error
      await onRefresh()
    } catch {
      // Silently fail - admin might have lost permission
    } finally {
      setDeletingId(null)
    }
  }

  const roomsList = roomData.filter((r) => (r as { spot_type?: string }).spot_type !== 'cafe')
  const cafesList = roomData.filter((r) => (r as { spot_type?: string }).spot_type === 'cafe')

  const BUILDING_ORDER: Record<string, number> = {
    DC: 0,
    MC: 1,
    SLC: 2,
    DP: 3,
    E7: 4,
    Plaza: 5,
  }

  function groupByBuilding(list: RoomWithStatus[]): [string, RoomWithStatus[]][] {
    const map = new Map<string, RoomWithStatus[]>()
    for (const r of list) {
      const b = r.building?.trim() || 'Other'
      const arr = map.get(b) ?? []
      arr.push(r)
      map.set(b, arr)
    }
    const entries = [...map.entries()]
    entries.sort((a, b) => {
      const oa = BUILDING_ORDER[a[0]] ?? 99
      const ob = BUILDING_ORDER[b[0]] ?? 99
      if (oa !== ob) return oa - ob
      return a[0].localeCompare(b[0])
    })
    return entries
  }

  const goIntoBuilding = (building: string) => {
    setSelectedBuilding(building)
    setSelectedPlace(null)
  }

  const goIntoPlace = (spot: RoomWithStatus) => {
    setSelectedPlace(spot)
  }

  const goBack = () => {
    if (viewMode === 'cafes') {
      setSelectedPlace(null)
    } else if (selectedPlace) {
      setSelectedPlace(null)
    } else if (selectedBuilding) {
      setSelectedBuilding(null)
    }
  }

  const canGoBack = viewMode === 'cafes' ? selectedPlace !== null : selectedBuilding !== null

  if (loading) {
    return <div className="empty-state">Loading spots...</div>
  }

  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <p>No places yet.</p>
        <p>Sign in and add a place from the &quot;Add Place&quot; tab.</p>
      </div>
    )
  }

  const accentColor = (i: number) => `color-${(i % 5) + 1}` as const

  const renderPlaceRow = (spot: RoomWithStatus, onClick: () => void, idx: number) => (
    <button
      key={spot.id}
      type="button"
      className="place-row inline"
      onClick={onClick}
    >
      <span className={`place-row-tab ${accentColor(idx)}`} aria-hidden />
      <div className="place-row-body">
        <span className="place-row-name">{spot.name}</span>
        {spot.status?.noiseLabel && (
          <span className={badgeClass(spot.status.noiseLabel)}>{spot.status.noiseLabel}</span>
        )}
        <ChevronRight size={18} className="place-row-chevron" />
      </div>
    </button>
  )

  const renderCard = (spot: RoomWithStatus, hideBuilding?: boolean) => {
    const accentClass = spot.status?.noiseLabel?.toLowerCase() ?? 'moderate'
    return (
    <div key={spot.id} className="room-card">
      <span className={`room-card-accent ${accentClass}`} aria-hidden />
      <div className="room-card-info">
        <h3>
          {!hideBuilding && spot.building && <span className="room-building">[{spot.building}]</span>}{' '}
          {spot.name}
        </h3>
        <p>{spot.description || 'No description'}</p>
        {spot.status && (
          <div className="room-meta">
            {spot.status.noiseLabel && (
              <span className={badgeClass(spot.status.noiseLabel)}>{spot.status.noiseLabel}</span>
            )}
            {spot.status.crowdLevel && (
              <span className="room-stat crowd" title="Crowd">
                {CROWD_LABELS[spot.status.crowdLevel] ?? spot.status.crowdLevel}
              </span>
            )}
            <span className="room-stat" title="Yappers">
              <MessageCircle size={12} /> {spot.status.yappersAvg}
            </span>
            {spot.status.musicCount > 0 && (
              <span className="room-stat music" title="Music reported">
                <Music2 size={12} /> {spot.status.musicCount} report
                {spot.status.musicCount !== 1 ? 's' : ''}
              </span>
            )}
            {spot.status.latestAt && (
              <span className="time-ago">{timeAgo(spot.status.latestAt)}</span>
            )}
          </div>
        )}
      </div>
      <div className="room-card-actions">
        {(!spot.status || !spot.status.noiseLabel) && (
          <span className="room-badge moderate">No data</span>
        )}
        {canReport && (
          <button
            type="button"
            className="place-edit-btn"
            onClick={() => setReportingPlace(spot)}
            aria-label={`Report status for ${spot.name}`}
          >
            <BarChart2 size={16} />
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className="place-delete-btn"
            onClick={() => handleDelete(spot.id, spot.name)}
            disabled={deletingId === spot.id}
            aria-label={`Remove ${spot.name}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )}

  const currentList = viewMode === 'buildings' ? roomsList : cafesList
  const grouped = groupByBuilding(currentList)

  return (
    <div>
      {reportingPlace && user && (
        <ReportStatusModal
          place={reportingPlace}
          user={user}
          onSaved={onRefresh}
          onClose={() => setReportingPlace(null)}
        />
      )}
      <div className="room-list-header">
        <div className="room-list-toggle">
          <button
            type="button"
            className={viewMode === 'buildings' ? 'active' : ''}
            onClick={() => setViewMode('buildings')}
          >
            Campus buildings
          </button>
          <button
            type="button"
            className={viewMode === 'cafes' ? 'active' : ''}
            onClick={() => setViewMode('cafes')}
          >
            Cafes
          </button>
        </div>
        <button
          type="button"
          className="refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>
      {viewMode === 'buildings' && roomsList.length === 0 && cafesList.length > 0 && (
        <div className="empty-state small">
          <p>No campus buildings yet. Add one from the &quot;Add Place&quot; tab.</p>
        </div>
      )}
      {viewMode === 'cafes' && cafesList.length === 0 && roomsList.length > 0 && (
        <div className="empty-state small">
          <p>No cafes yet. Add one from the &quot;Add Place&quot; tab.</p>
        </div>
      )}
      {((viewMode === 'cafes' && cafesList.length > 0) || (viewMode === 'buildings' && grouped.length > 0)) && (
        <section className="place-drilldown">
          {canGoBack && (
            <button type="button" className="drilldown-back" onClick={goBack}>
              <ArrowLeft size={18} />
              Back
            </button>
          )}

          {viewMode === 'cafes' ? (
            !selectedPlace ? (
              <>
                <h2 className="drilldown-section-title">Cafes</h2>
                <div className="drilldown-list">
                  {cafesList.map((spot, idx) =>
                    renderPlaceRow(spot, () => goIntoPlace(spot), idx)
                  )}
                </div>
              </>
            ) : (
              <div className="drilldown-detail">
                {renderCard(selectedPlace, false)}
              </div>
            )
          ) : (
            <>
              {!selectedBuilding && (
                <>
                  <h2 className="drilldown-section-title">Campus buildings</h2>
                  <div className="drilldown-list grid">
                    {grouped.map(([building, spots], idx) => (
                      <button
                        key={building}
                        type="button"
                        className="place-row building-row"
                        onClick={() => goIntoBuilding(building)}
                      >
                        <span className={`place-row-tab ${accentColor(idx)}`} aria-hidden />
                        <div className="place-row-body">
                          <span className="place-row-name">{building}</span>
                          <span className="place-row-count">{spots.length}</span>
                          <ChevronRight size={18} className="place-row-chevron" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selectedBuilding && !selectedPlace && (
                <div className="drilldown-list">
                  <h2 className="drilldown-title">{selectedBuilding}</h2>
                  {(grouped.find(([b]) => b === selectedBuilding)?.[1] ?? []).map((spot, idx) =>
                    renderPlaceRow(spot, () => goIntoPlace(spot), idx)
                  )}
                </div>
              )}

              {selectedPlace && (
                <div className="drilldown-detail">
                  {renderCard(selectedPlace, false)}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
