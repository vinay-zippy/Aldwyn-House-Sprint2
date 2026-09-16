export interface DashboardSummary {
  upcoming_arrivals: number
  in_house_guests: number
  departures: number
  high_priority_guests: number
  room_summary: {
    available: number
    occupied: number
    cleaning: number
    maintenance: number
  }
}
