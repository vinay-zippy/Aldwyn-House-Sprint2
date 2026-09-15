import type { Amenity, AmenityRecommendation, RecommendationReview } from '../types/amenity'
import type { DashboardSummary } from '../types/dashboard'
import type { Guest, GuestDetail, GuestPreferenceResponse } from '../types/guest'
import type { Reservation, UpcomingArrival } from '../types/reservation'
import type { Room } from '../types/room'
import { getToken } from './auth'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
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

export function searchGuests(query: string): Promise<Guest[]> {
  return request<Guest[]>(`/guests/search?q=${encodeURIComponent(query)}`)
}

export function updateGuest(guestId: string, payload: Record<string, unknown>): Promise<Guest> {
  return request<Guest>(`/guests/${encodeURIComponent(guestId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteGuest(guestId: string): Promise<void> {
  return request<void>(`/guests/${encodeURIComponent(guestId)}`, { method: 'DELETE' })
}

export function updateReservationStatus(reservationId: string, status: string): Promise<Reservation> {
  return request<Reservation>(`/reservations/${encodeURIComponent(reservationId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function createGuest(payload: {
  name: string
  email: string
  phone?: string
  loyalty_tier: string
}): Promise<Guest> {
  return request<Guest>('/guests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: { username: string; password: string }) {
  return request<{ access_token: string; token_type: string; role: 'FRONT_DESK' | 'HOUSEKEEPING'; username: string }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function getAvailableRooms(checkIn: string, checkOut: string): Promise<Room[]> {
  return request<Room[]>(`/walk-ins/available-rooms?check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}`)
}

export function createWalkIn(payload: Record<string, unknown>) {
  return request<{ guest: Guest; reservation: Reservation; returning_guest: boolean }>('/walk-ins', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function findGuestMatch(name: string, email: string, phone: string) {
  return request<{ guest: Guest; previous_stays: Reservation[] } | null>(
    `/walk-ins/guest-match?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`,
  )
}

export function updateRoomStatus(roomNumber: string, status: string): Promise<Room> {
  return request<Room>(`/rooms/${encodeURIComponent(roomNumber)}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
  })
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
