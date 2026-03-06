import { useState } from 'react'

const BRAND_DISPLAY = {
  'hot wheels': 'Hot Wheels',
  'hotwheels': 'Hot Wheels',
  'mini gt': 'Mini GT',
  'minigt': 'Mini GT',
  'pop race': 'Pop Race',
  'poprace': 'Pop Race',
  'pop-race': 'Pop Race',
}

function formatBrand(brand) {
  if (!brand) return ''
  return BRAND_DISPLAY[brand.toLowerCase()] || brand
}

function GalleryCard({ car, viewMode, isFavorite, onToggleFavorite, onSelect, onUpdateQuantity }) {
  const [loaded, setLoaded] = useState(false)

  const handleCardClick = (e) => {
    if (e.target.closest('.card-bottom-actions')) return
    onSelect(car)
  }

  return (
    <div
      className={`gallery-card gallery-card-${viewMode}`}
      onClick={handleCardClick}
    >
      <div className="card-image-wrapper">
        {!loaded && <div className="card-skeleton" />}
        <img
          src={car.displayUrl || car.path}
          alt={car.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={e => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23141419" width="200" height="200"/><text x="50%" y="50%" fill="%236b7280" text-anchor="middle" dy=".3em" font-size="14">No image</text></svg>'
            setLoaded(true)
          }}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </div>
      <div className="card-info">
        <span className="card-name">{car.name}</span>
        <div className="card-tags">
          {car.quantity && (
            <span className="card-tag card-tag-qty">{car.quantity}</span>
          )}
          {car.brand && (
            <span className="card-tag card-tag-brand">{formatBrand(car.brand)}</span>
          )}
          {car.cardType && (
            <span className="card-tag card-tag-type">
              {car.cardType === 'indian' ? 'Indian' : 'Imported'}
            </span>
          )}
        </div>
      </div>
      <div className="card-bottom-actions">
        <button
          className="card-bottom-btn"
          onClick={(e) => { e.stopPropagation(); onUpdateQuantity(car, -1) }}
          aria-label="Decrease quantity"
          title="Decrease quantity"
          disabled={(car.quantity || 1) <= 1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button
          className={`card-bottom-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(car.id) }}
          aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
          title={isFavorite ? 'Unfavorite' : 'Favorite'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button
          className="card-bottom-btn"
          onClick={(e) => { e.stopPropagation(); onUpdateQuantity(car, 1) }}
          aria-label="Increase quantity"
          title="Increase quantity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>
  )
}

function Gallery({ cars, viewMode, favorites, onToggleFavorite, onSelect, onUpdateQuantity }) {
  return (
    <div className={`gallery gallery-${viewMode}`}>
      {cars.map(car => (
        <GalleryCard
          key={car.id}
          car={car}
          viewMode={viewMode}
          isFavorite={favorites.has(car.id)}
          onToggleFavorite={onToggleFavorite}
          onSelect={onSelect}
          onUpdateQuantity={onUpdateQuantity}
        />
      ))}
    </div>
  )
}

export default Gallery
