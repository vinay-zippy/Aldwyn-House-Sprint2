export interface PreferenceItem {
  value: string
  priority?: 'high' | 'normal' | null
  is_high_priority: boolean
}

export interface GuestPreferences {
  dietary: PreferenceItem[]
  room_preferences: PreferenceItem[]
  notes: PreferenceItem[]
}

export interface PastRequest {
  request: string
  status: string
}

export interface Guest {
  id: string
  name: string
  email: string
  phone: string | null
  loyalty_tier: string
  created_at: string
  preferences?: GuestPreferences
}

export interface GuestDetail extends Guest {
  preferences: GuestPreferences
}

export interface GuestPreferenceResponse {
  dietary_preferences: PreferenceItem[]
  room_preferences: PreferenceItem[]
  past_requests: PastRequest[]
}
