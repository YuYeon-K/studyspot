import { useEffect, useState } from 'react'
import { RefreshCw, Users, MessageCircle, Music2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Room } from '../types/database'

interface RoomStatusSummary {
  noiseLabel: string | null
  peopleAvg: number
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
}

export function RoomList({ rooms, loading, onRefresh }: Props) {
  const [roomData, setRoomData] = useState<RoomWithStatus[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    async function fetchStatus() {
      if (rooms.length === 0) {
        setRoomData(rooms.map((r) => ({ ...r, status: null })))
        return
      }

      const { data } = await supabase
        .from('room_status')
        .select('room_id, noise_label, people_count, yappers_count, has_music, created_at')
        .in('room_id', rooms.map((r) => r.id))
        .order('created_at', { ascending: false })
      const statusRows = data as Array<{
        room_id: string
        noise_label: string | null
        people_count: number
        yappers_count: number
        has_music: boolean
        created_at: string
      }> | null

      // Build summary from latest reports (e.g. last 2 hours or last 10 per room)
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const recent = (statusRows ?? []).filter((s) => s.created_at >= cutoff)

      const byRoom = new Map<string, typeof recent>()
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
        const peopleSum = list.reduce((a, x) => a + (x.people_count ?? 0), 0)
        const yappersSum = list.reduce((a, x) => a + (x.yappers_count ?? 0), 0)
        const musicCount = list.filter((x) => x.has_music).length
        const latest = list[0]
        return {
          ...room,
          status: {
            noiseLabel: latest?.noise_label ?? null,
            peopleAvg: Math.round(peopleSum / list.length),
            yappersAvg: Math.round(yappersSum / list.length),
            musicCount,
            totalReports: list.length,
            latestAt: latest?.created_at ?? null,
          },
        }
      })

      // Sort: quiet first, then by least yappers, then by has-music preference
      summarized.sort((a, b) => {
        const order: Record<string, number> = { Quiet: 0, Moderate: 1, Loud: 2 }
        const va = a.status?.noiseLabel ? (order[a.status.noiseLabel] ?? 1) : 99
        const vb = b.status?.noiseLabel ? (order[b.status.noiseLabel] ?? 1) : 99
        if (va !== vb) return va - vb
        const ya = a.status?.yappersAvg ?? 99
        const yb = b.status?.yappersAvg ?? 99
        return ya - yb
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

  if (loading) {
    return <div className="empty-state">Loading rooms...</div>
  }

  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <p>No rooms yet.</p>
        <p>Sign in and add a room from the &quot;Add Room&quot; tab.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="room-list-header">
        <span className="room-list-hint">Live from UWaterloo students</span>
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
      {roomData.map((room) => (
        <div key={room.id} className="room-card">
          <div className="room-card-info">
            <h3>
              {room.building && <span className="room-building">[{room.building}]</span>} {room.name}
            </h3>
            <p>{room.description || 'No description'}</p>
            {room.status && (
              <div className="room-meta">
                {room.status.noiseLabel && (
                  <span className={badgeClass(room.status.noiseLabel)}>
                    {room.status.noiseLabel}
                  </span>
                )}
                <span className="room-stat" title="People">
                  <Users size={12} /> {room.status.peopleAvg}
                </span>
                <span className="room-stat" title="Yappers">
                  <MessageCircle size={12} /> {room.status.yappersAvg}
                </span>
                {room.status.musicCount > 0 && (
                  <span className="room-stat music" title="Music reported">
                    <Music2 size={12} /> {room.status.musicCount} report{room.status.musicCount !== 1 ? 's' : ''}
                  </span>
                )}
                {room.status.latestAt && (
                  <span className="time-ago">{timeAgo(room.status.latestAt)}</span>
                )}
              </div>
            )}
          </div>
          {(!room.status || !room.status.noiseLabel) && (
            <span className="room-badge moderate">No data</span>
          )}
        </div>
      ))}
    </div>
  )
}
