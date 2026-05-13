import { useEffect, useState } from 'react'
import { ChevronRight, RefreshCw, BarChart2, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { rankScore, type RoomWithStatus } from '../lib/ranking'
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

function badgeClass(label: string): string {
  const l = label?.toLowerCase() ?? 'moderate'
  return `room-badge ${l}`
}

interface Props {
  rooms: Room[]
  loading: boolean
  onRefresh: () => void
  canReport?: boolean
  user?: User | null
}

export function RankingsScreen({ rooms, loading, onRefresh, canReport = false, user }: Props) {
  const [roomData, setRoomData] = useState<RoomWithStatus[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [reportingPlace, setReportingPlace] = useState<RoomWithStatus | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<RoomWithStatus | null>(null)

  useEffect(() => {
    setStatusError(null)
    async function fetchStatus() {
      if (rooms.length === 0) {
        setRoomData(rooms.map((r) => ({ ...r, status: null })))
        return
      }
      try {
        const { data, error: err } = await supabase
        .from('room_status')
        .select('room_id, noise_label, crowd_level, yappers_count, has_music, created_at')
        .in('room_id', rooms.map((r) => r.id))
        .order('created_at', { ascending: false })
        if (err) throw err
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
        if (list.length === 0) return { ...room, status: null }
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

      summarized.sort((a, b) => rankScore(b) - rankScore(a))
        setRoomData(summarized)
      } catch {
        setStatusError('Could not load latest status')
        setRoomData(rooms.map((r) => ({ ...r, status: null })))
      }
    }
    fetchStatus()
  }, [rooms])

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const renderCard = (spot: RoomWithStatus) => (
    <div key={spot.id} className="room-card">
      <span
        className={`room-card-accent ${spot.status?.noiseLabel?.toLowerCase() ?? 'moderate'}`}
        aria-hidden
      />
      <div className="room-card-info">
        <h3>
          {spot.building && <span className="room-building">[{spot.building}]</span>} {spot.name}
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
            {spot.status.latestAt && (
              <span className="time-ago">
                {(() => {
                  const sec =
                    (Date.now() - new Date(spot.status.latestAt!).getTime()) / 1000
                  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`
                  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`
                  return `${Math.floor(sec / 86400)} days ago`
                })()}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="room-card-actions">
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
      </div>
    </div>
  )

  if (loading) {
    return <div className="empty-state">Loading…</div>
  }

  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <p>No places yet.</p>
        <p>Add places from the &quot;Add&quot; tab to see rankings.</p>
      </div>
    )
  }

  return (
    <div className="rankings-screen">
      {reportingPlace && (
        <ReportStatusModal
          place={reportingPlace}
          user={user ?? null}
          onSaved={onRefresh}
          onClose={() => setReportingPlace(null)}
        />
      )}

      {statusError && (
        <div className="inline-error-banner">
          <span>
            {statusError}
            <button type="button" className="inline-error-retry" onClick={() => { setStatusError(null); onRefresh(); }}>
              Retry
            </button>
          </span>
        </div>
      )}

      <div className="room-list-header">
        <h2 className="rankings-title">Best spots now</h2>
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

      {selectedPlace ? (
        <div>
          <button
            type="button"
            className="drilldown-back"
            onClick={() => setSelectedPlace(null)}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="rankings-detail">{renderCard(selectedPlace)}</div>
        </div>
      ) : (
        <div className="rankings-list">
          {roomData.map((spot, idx) => (
            <button
              key={spot.id}
              type="button"
              className="top-pick-card"
              onClick={() => setSelectedPlace(spot)}
            >
              <span className="top-pick-rank">{idx + 1}</span>
              <div className="top-pick-info">
                <span className="top-pick-name">
                  {spot.building && `[${spot.building}] `}{spot.name}
                </span>
                {spot.status && (
                  <span className="top-pick-meta">
                    {spot.status.noiseLabel}
                    {spot.status.crowdLevel &&
                      ` • ${CROWD_LABELS[spot.status.crowdLevel]}`}
                  </span>
                )}
              </div>
              <ChevronRight size={18} className="place-row-chevron" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
