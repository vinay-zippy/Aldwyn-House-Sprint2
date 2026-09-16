export type RoomStatusType = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'ready' | 'dirty' | 'inspection_pending' | 'out_of_service' | 'reserved'

export interface Room {
  id: string
  room_number: string
  floor: string
  status: RoomStatusType
  room_type: string
}
