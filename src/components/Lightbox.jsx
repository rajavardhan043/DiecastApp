import { useState, useEffect } from 'react'

function getImageUrls(car) {
  if (car.displayUrls?.length) return car.displayUrls
  if (car.images?.length) return car.images
  return [car.displayUrl || car.path]
}

function Lightbox({ car, onClose, isFavorite, onToggleFavorite, onEdit, onDelete, onUpdateQuantity }) {
  const urls = getImageUrls(car)
  const [imageIndex, setImageIndex] = useState(0)
  const currentUrl = urls[imageIndex] || urls[0]
  const hasMultiple = urls.length > 1

  useEffect(() => {
    setImageIndex(0)
  }, [car.id])

  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') onClose()
      if (hasMultiple && e.key === 'ArrowLeft' && imageIndex > 0) setImageIndex(i => i - 1)
      if (hasMultiple && e.key === 'ArrowRight' && imageIndex < urls.length - 1) setImageIndex(i => i + 1)
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, hasMultiple, imageIndex, car.id, urls.length])

  const handleDelete = () => {
    if (window.confirm(`Delete "${car.name}"?`)) onDelete()
  }

  const cardTypeLabel = car.cardType === 'indian' ? 'Indian' : car.cardType === 'imported' ? 'Imported' : '—'

  return (
    <div className="lightbox-overlay">
      <div className="lightbox">
        <div className="lb-header">
          <button className="lb-back" onClick={onClose} aria-label="Back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        <div className="lb-title-section">
          <h1 className="lb-car-name">{car.name}</h1>
          {car.brand && (
            <span className="lb-pill">
              {car.brand.toUpperCase()}
              {car.cardType ? ` · ${cardTypeLabel}` : ''}
            </span>
          )}
        </div>

        <div className="lb-image-area">
          {hasMultiple && imageIndex > 0 && (
            <button className="lb-img-nav prev" onClick={() => setImageIndex(i => i - 1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          <img src={currentUrl} alt={car.name} className="lb-img" />
          {hasMultiple && imageIndex < urls.length - 1 && (
            <button className="lb-img-nav next" onClick={() => setImageIndex(i => i + 1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {hasMultiple && (
          <div className="lb-dots">
            {urls.map((_, i) => (
              <span key={i} className={`lb-dot ${i === imageIndex ? 'active' : ''}`} onClick={() => setImageIndex(i)} />
            ))}
          </div>
        )}

        <div className="lb-details-grid">
          <div className="lb-detail-cell">
            <span className="lb-detail-label">BRAND</span>
            <span className="lb-detail-value">{car.brand || '—'}</span>
          </div>
          <div className="lb-detail-cell">
            <span className="lb-detail-label">CARD TYPE</span>
            <span className="lb-detail-value">{cardTypeLabel}</span>
          </div>
          <div className="lb-detail-cell">
            <span className="lb-detail-label">QUANTITY</span>
            <span className="lb-detail-value">{car.quantity || 1}</span>
          </div>
          <div className="lb-detail-cell">
            <span className="lb-detail-label">YEAR</span>
            <span className="lb-detail-value">{car.year || '—'}</span>
          </div>
          <div className="lb-detail-cell">
            <span className="lb-detail-label">SERIES</span>
            <span className="lb-detail-value">{car.series || '—'}</span>
          </div>
          <div className="lb-detail-cell">
            <span className="lb-detail-label">IMAGES</span>
            <span className="lb-detail-value">{urls.length}</span>
          </div>
        </div>

        <div className="lb-bottom-bar">
          <div className="lb-qty-control">
            <button
              className="lb-qty-btn"
              onClick={() => onUpdateQuantity(-1)}
              disabled={(car.quantity || 1) <= 1}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <span className="lb-qty-value">{car.quantity || 1}</span>
            <button className="lb-qty-btn" onClick={() => onUpdateQuantity(1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <button
            className={`lb-action-btn ${isFavorite ? 'fav-active' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorite ? 'Unfavorite' : 'Favorite'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button className="lb-action-btn" onClick={onEdit} title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="lb-action-btn lb-delete-btn" onClick={handleDelete} title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Lightbox
