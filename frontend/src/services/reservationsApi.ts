import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface UpcomingArrival {
  id: string
  guest_id: string
  guest_name: string
  check_in: string
  check_out: string
  room_number: string | null
  status: string
}

const api = axios.create({
  baseURL: API_BASE_URL,
})

export async function getUpcomingArrivals(): Promise<UpcomingArrival[]> {
  const response = await api.get<UpcomingArrival[]>(
    '/api/v1/reservations/upcoming-arrivals',
  )

  return response.data
}
