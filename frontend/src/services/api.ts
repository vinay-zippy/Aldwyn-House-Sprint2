import type { Guest } from '../types/guest'
import type { Reservation } from '../types/reservation'

const API_BASE_URL = 'http://localhost:8000/api/v1'

async function request<T>(path: string): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`)

	if (!response.ok) {
		const message = await response.text()
		const detail = message ? `: ${message}` : ''
		throw new Error(`Request failed with ${response.status} ${response.statusText}${detail}`)
	}

	return response.json() as Promise<T>
}

export function getReservations(): Promise<Reservation[]> {
	return request<Reservation[]>('/reservations')
}

export function getGuest(guestId: string): Promise<Guest> {
	return request<Guest>(`/guests/${encodeURIComponent(guestId)}`)
}
