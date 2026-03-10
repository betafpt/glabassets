// Config Database schema

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            app_settings: {
                Row: {
                    id: number
                    daily_price: string
                    daily_url: string
                    monthly_price: string
                    monthly_url: string
                    yearly_price: string
                    yearly_url: string
                    copyright_text: string
                    copyright_url: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    daily_price?: string
                    daily_url?: string
                    monthly_price?: string
                    monthly_url?: string
                    yearly_price?: string
                    yearly_url?: string
                    copyright_text?: string
                    copyright_url?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    daily_price?: string
                    daily_url?: string
                    monthly_price?: string
                    monthly_url?: string
                    yearly_price?: string
                    yearly_url?: string
                    copyright_text?: string
                    copyright_url?: string
                    updated_at?: string
                }
            }
            assets: {
                Row: {
                    id: string
                    created_at: string
                    title: string
                    category: string
                    type: string
                    file_url: string
                    thumbnail_url: string | null
                    video_preview_url: string | null
                    description: string | null
                    youtube_url: string | null
                    size_bytes: number | null
                    tags: string[] | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    title: string
                    category: string
                    type: string
                    file_url: string
                    thumbnail_url?: string | null
                    video_preview_url?: string | null
                    description?: string | null
                    youtube_url?: string | null
                    size_bytes?: number | null
                    tags?: string[] | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    title?: string
                    category?: string
                    type?: string
                    file_url?: string
                    thumbnail_url?: string | null
                    video_preview_url?: string | null
                    description?: string | null
                    youtube_url?: string | null
                    size_bytes?: number | null
                    tags?: string[] | null
                }
            }
            licenses: {
                Row: {
                    id: string
                    key: string
                    device_id: string | null
                    status: 'active' | 'revoked'
                    created_at: string
                    type: 'daily' | 'monthly' | 'yearly' | 'lifetime'
                    activated_at: string | null
                    expires_at: string | null
                }
                Insert: {
                    id?: string
                    key: string
                    device_id?: string | null
                    status?: 'active' | 'revoked'
                    created_at?: string
                    type?: 'daily' | 'monthly' | 'yearly' | 'lifetime'
                    activated_at?: string | null
                    expires_at?: string | null
                }
                Update: {
                    id?: string
                    key?: string
                    device_id?: string | null
                    status?: 'active' | 'revoked'
                    created_at?: string
                    type?: 'daily' | 'monthly' | 'yearly' | 'lifetime'
                    activated_at?: string | null
                    expires_at?: string | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
