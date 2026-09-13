import type { Amenity, AmenityRecommendation, RecommendationReview } from '../types/amenity'
import type { DashboardSummary } from '../types/dashboard'
import type { Guest, GuestDetail, GuestPreferenceResponse } from '../types/guest'
import type { Reservation, UpcomingArrival } from '../types/reservation'
import type { Room } from '../types/room'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    const detail = message ? `: ${message}` : ''
    throw new Error(
      `Request failed with ${response.status} ${response.statusText}${detail}`,
    )
  }

  return response.json() as Promise<T>
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return request<DashboardSummary>('/dashboard/summary')
}

export function getUpcomingArrivals(): Promise<UpcomingArrival[]> {
  return request<UpcomingArrival[]>('/reservations/upcoming-arrivals')
}

export function getReservations(status?: string): Promise<Reservation[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<Reservation[]>(`/reservations${query}`)
}

export function getGuests(): Promise<Guest[]> {
  return request<Guest[]>('/guests')
}

export function getGuest(guestId: string): Promise<GuestDetail> {
  return request<GuestDetail>(`/guests/${encodeURIComponent(guestId)}`)
}

export function getGuestPreferences(
  guestId: string,
): Promise<GuestPreferenceResponse> {
  return request<GuestPreferenceResponse>(
    `/guests/${encodeURIComponent(guestId)}/preferences`,
  )
}

export function getRooms(floor?: string): Promise<Room[]> {
  const query = floor ? `?floor=${encodeURIComponent(floor)}` : ''
  return request<Room[]>(`/rooms${query}`)
}

export function getAmenities(propertyId?: string): Promise<Amenity[]> {
  const query = propertyId ? `?property_id=${encodeURIComponent(propertyId)}` : ''
  return request<Amenity[]>(`/amenities${query}`)
}

export function getAmenityRecommendations(
  guestId: string,
): Promise<AmenityRecommendation[]> {
  return request<AmenityRecommendation[]>(
    `/guests/${encodeURIComponent(guestId)}/amenity-recommendations`,
  )
}

export function reviewAmenityRecommendation(
  guestId: string,
  amenityId: string,
  status: 'approved' | 'rejected',
): Promise<RecommendationReview> {
  return request<RecommendationReview>(
    `/guests/${encodeURIComponent(guestId)}/amenity-recommendations/${encodeURIComponent(amenityId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
  )
}
