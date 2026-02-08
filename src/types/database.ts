import type { User } from '@supabase/supabase-js'

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: { id: string; name: string; description: string; building?: string; created_at: string }
        Insert: { id?: string; name: string; description?: string; building?: string }
        Update: Partial<{ name: string; description: string; building: string }>
        Relationships: []
      }
      room_status: {
        Row: {
          id: string
          room_id: string
          user_id: string
          avg_noise: number | null
          noise_label: string | null
          people_count: number
          yappers_count: number
          has_music: boolean
          created_at: string
        }
        Insert: {
          room_id: string
          user_id: string
          avg_noise?: number | null
          noise_label?: string | null
          people_count?: number
          yappers_count?: number
          has_music?: boolean
        }
        Update: Partial<{
          people_count: number
          yappers_count: number
          has_music: boolean
        }>
        Relationships: []
      }
      // Legacy - keep for any old data
      noise_snapshots: {
        Row: {
          id: string
          room_id: string
          avg_noise: number
          label: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          room_id: string
          avg_noise: number
          label: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships?: unknown[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}

export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomStatus = Database['public']['Tables']['room_status']['Row']
export type { User }
