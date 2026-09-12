export interface Reservation {
  id: string
  guest_id: string
  property_id: string
  rate_plan_id: string | null
  check_in: string
  check_out: string
  status: string
}
