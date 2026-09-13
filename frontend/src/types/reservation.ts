export interface Reservation {
  id: string
  guest_id: string
  property_id: string
  rate_plan_id: string | null
  check_in: string
  check_out: string
  room_number?: string | null
  status: string
}

export interface UpcomingArrival {
  id: string
  guest_id: string
  guest_name: string
  check_in: string
  check_out: string
  room_number: string | null
  status: string
  is_high_priority?: boolean
}
