export interface Amenity {
  id: string
  property_id?: string | null
  name: string
  category: 'dining' | 'spa' | 'local_experience' | string
  description?: string | null
  tags: string[]
  is_active: boolean
}

export interface AmenityRecommendation {
  amenity: Amenity
  matched_terms: string[]
  status: 'pending_staff_review' | 'approved' | 'rejected' | string
}

export interface RecommendationReview {
  id: string
  guest_id: string
  amenity_id: string
  status: 'approved' | 'rejected' | string
  reviewed_at?: string | null
}
