export interface RoomStatusSummary {
  noiseLabel: string | null
  crowdLevel: string | null
  yappersAvg: number
  musicCount: number
  totalReports: number
  latestAt: string | null
}

export interface RoomWithStatus {
  id: string
  name: string
  description: string
  building?: string
  spot_type?: string
  latitude?: number | null
  longitude?: number | null
  created_at: string
  status: RoomStatusSummary | null
}

/** Higher = better. Quiet + empty = top. Loud or crowded = bottom. */
export function rankScore(spot: RoomWithStatus): number {
  const s = spot.status
  if (!s) return -50
  let score = 0
  const noiseScores: Record<string, number> = { Quiet: 40, Moderate: 15, Loud: 0 }
  score += s.noiseLabel ? (noiseScores[s.noiseLabel] ?? 10) : -20
  const crowdScores: Record<string, number> = {
    empty: 25,
    lots_of_space: 20,
    some_space: 12,
    crowded: 5,
    no_space: 0,
  }
  score += s.crowdLevel ? (crowdScores[s.crowdLevel] ?? 5) : -5
  if (s.musicCount > 0) score -= 15
  if (s.yappersAvg > 2) score -= Math.min(20, s.yappersAvg * 4)
  if (s.latestAt) {
    const ageMin = (Date.now() - new Date(s.latestAt).getTime()) / 60000
    if (ageMin < 30) score += 5
    else if (ageMin < 120) score += 2
  }
  return score
}
