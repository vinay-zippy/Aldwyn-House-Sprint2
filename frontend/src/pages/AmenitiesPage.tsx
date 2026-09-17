import React, { useEffect, useState } from 'react'
import { Compass, Sparkles, Utensils, X } from 'lucide-react'
import { getAmenities } from '../services/api'
import type { Amenity } from '../types/amenity'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'

type CategoryKey = 'spa' | 'dining' | 'local_experience'
type AmenityContent = { label: string; title: string; subtitle: string; description: string; action: string; details: string[]; images: string[]; icon: React.ReactNode }

const categoryContent: Record<CategoryKey, AmenityContent> = {
  spa: {
    label: 'Wellness at Aldwyn House', title: 'Serenity Spa', subtitle: 'Relax • Rejuvenate • Restore', action: 'Explore Spa',
    description: 'A tranquil wellness space offering relaxing treatments and personalized spa experiences for hotel guests.',
    details: ['Swedish, deep tissue and hot stone massage', 'Aromatherapy, couples spa and facial treatments', 'Open daily 08:00 - 20:00', '60 or 90 minute treatments', 'Lower ground floor · advance reservations recommended'],
    images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&q=80'], icon: <Sparkles className="h-4 w-4" />,
  },
  dining: {
    label: 'Dining at Aldwyn House', title: 'Aldwyn Dining', subtitle: 'Taste • Gather • Indulge', action: 'Explore Dining',
    description: 'From considered breakfasts to evening plates, our dining rooms bring seasonal ingredients and warm service together.',
    details: ['Modern British cuisine with seasonal menus', 'Breakfast 07:00 - 10:30 · dinner from 18:00', 'Private dining available for intimate gatherings', 'Terrace and lounge service throughout the day', 'Ground floor · reservations encouraged for dinner'],
    images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=80'], icon: <Utensils className="h-4 w-4" />,
  },
  local_experience: {
    label: 'Beyond Aldwyn House', title: 'Local Experiences', subtitle: 'Discover • Explore • Experience', action: 'Explore Experiences',
    description: 'Thoughtfully selected city experiences, local flavours and guided discoveries, all within easy reach of the hotel.',
    details: ['Curated walking tours and landmark visits', 'Independent galleries, markets and local makers', 'Seasonal food and cultural recommendations', 'Private guides can be arranged through Concierge', 'Available daily · speak with Front Desk to reserve'],
    images: ['https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'], icon: <Compass className="h-4 w-4" />,
  },
}

const categories = Object.keys(categoryContent) as CategoryKey[]

function GalleryImage({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  return <button type="button" className="amenity-image-button" onClick={onClick}><img src={src} alt={alt} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.setAttribute('aria-label', `${alt} image unavailable`) }} /></button>
}

export const AmenitiesPage: React.FC = () => {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('spa')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const loadAmenities = async () => {
    try { setLoading(true); setError(null); setAmenities(await getAmenities()) }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to retrieve amenities.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadAmenities(), 0)
    return () => window.clearTimeout(initialLoad)
  }, [])

  const content = categoryContent[activeCategory]
  const matchingAmenity = amenities.find((amenity) => amenity.category.toLowerCase() === activeCategory)
  const detailDescription = matchingAmenity?.description ?? content.description

  return <div className="amenities-page">
    <header>
      <p className="amenities-eyebrow">Aldwyn House</p>
      <h1 className="amenities-title">Amenities</h1>
      <p className="amenities-intro">Considered experiences designed to make every stay feel more personal.</p>
    </header>
    <nav className="amenity-tabs" aria-label="Amenity categories">
      {categories.map((category) => <button key={category} type="button" onClick={() => { setActiveCategory(category); setDetailsOpen(false) }} aria-pressed={activeCategory === category} className={`amenity-tab ${activeCategory === category ? 'active' : ''}`}>{categoryContent[category].label.replace(' at Aldwyn House', '').replace('Beyond Aldwyn House', 'Local Experience')}</button>)}
    </nav>
    {loading ? <LoadingState message="Loading amenity catalogue..." /> : error ? <ErrorState message={error} onRetry={() => void loadAmenities()} /> : <>
      <section className="amenity-editorial-grid" aria-label={`${content.title} gallery`}>
        <article className="amenity-tile amenity-copy amenity-copy--top"><p className="amenity-copy-label">{content.label}</p><h2>{content.title}</h2><p className="amenity-copy-subtitle">{content.subtitle}</p><p className="amenity-copy-description">{content.description}</p><button type="button" onClick={() => setDetailsOpen(true)} className="amenity-explore">{content.action}</button></article>
        <div className="amenity-tile"><GalleryImage src={content.images[0]} alt={`${content.title} treatment`} onClick={() => setSelectedImage(content.images[0])} /></div>
        <div className="amenity-tile"><GalleryImage src={content.images[1]} alt={`${content.title} interior`} onClick={() => setSelectedImage(content.images[1])} /></div>
        <div className="amenity-tile"><GalleryImage src={content.images[2]} alt={`${content.title} experience`} onClick={() => setSelectedImage(content.images[2])} /></div>
        <div className="amenity-tile"><GalleryImage src={content.images[3]} alt={`${content.title} detail`} onClick={() => setSelectedImage(content.images[3])} /></div>
        <article className="amenity-tile amenity-copy amenity-copy--bottom"><p className="amenity-copy-label">Guest experience</p><h2>{matchingAmenity?.name ?? content.title}</h2><p className="amenity-copy-description">{detailDescription}</p><button type="button" onClick={() => setDetailsOpen(true)} className="amenity-explore">View Details</button></article>
      </section>
    </>}
    {(detailsOpen || selectedImage) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33403d]/45 p-4" onClick={() => { setDetailsOpen(false); setSelectedImage(null) }}><div className="w-full max-w-3xl overflow-hidden rounded-xl border border-[#e4ddd3] bg-[#fffdf9] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex justify-end p-3"><button type="button" aria-label="Close amenity details" onClick={() => { setDetailsOpen(false); setSelectedImage(null) }} className="bg-transparent p-1 text-[#71807b] hover:bg-[#f4efe7] hover:text-[#33403d]"><X className="h-5 w-5" /></button></div>{selectedImage ? <img src={selectedImage} alt={`${content.title} enlarged`} className="max-h-[72vh] w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <div className="amenity-detail"><div><p className="amenities-eyebrow">{content.label}</p><h2 className="mt-2 font-serif text-3xl text-[#33403d]">{content.title}</h2><p className="mt-3 text-sm leading-6 text-[#71807b]">{detailDescription}</p></div><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#66816b]">{content.icon} At a glance</p><ul className="amenity-detail-list">{content.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></div></div>}</div></div>}
  </div>
}