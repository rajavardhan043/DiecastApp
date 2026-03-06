import { useState } from 'react'
import { storage } from '../storage'
import CustomSelect from './CustomSelect'

const BRANDS = [
  { value: 'hot wheels', label: 'Hot Wheels' },
  { value: 'mini gt', label: 'Mini GT' },
  { value: 'poprace', label: 'Pop Race' },
  { value: 'other', label: 'Other' },
]

function EditCarModal({ car, onClose, onSuccess }) {
  const existingBrand = (car.brand || '').toLowerCase()
  const isKnownBrand = BRANDS.some(b => b.value === existingBrand)

  const [brandSelect, setBrandSelect] = useState(isKnownBrand ? existingBrand : 'other')
  const [customBrand, setCustomBrand] = useState(isKnownBrand ? '' : car.brand || '')
  const [name, setName] = useState(car.name || '')
  const [quantity, setQuantity] = useState(car.quantity || 1)
  const [cardType, setCardType] = useState(car.cardType || 'indian')
  const [year, setYear] = useState(car.year || '')
  const [series, setSeries] = useState(car.series || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resolvedBrand = brandSelect === 'other' ? customBrand.trim() : BRANDS.find(b => b.value === brandSelect)?.label || brandSelect

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await storage.editCar(car, {
        name: name.trim(),
        brand: resolvedBrand,
        quantity: Math.max(1, quantity),
        cardType,
        year: year.trim(),
        series: series.trim(),
      })
      await onSuccess?.()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Car</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="edit-name">Car Name</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="form-input"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Brand</label>
            <CustomSelect
              value={brandSelect}
              onChange={setBrandSelect}
              options={BRANDS}
              className="cselect-form"
              ariaLabel="Brand"
            />
            {brandSelect === 'other' && (
              <input
                type="text"
                value={customBrand}
                onChange={e => setCustomBrand(e.target.value)}
                placeholder="Enter brand name"
                className="form-input form-input-margin"
              />
            )}
          </div>
          <div className="form-group">
            <label>Card Type</label>
            <CustomSelect
              value={cardType}
              onChange={setCardType}
              options={[
                { value: 'indian', label: 'Indian' },
                { value: 'imported', label: 'Imported' },
              ]}
              className="cselect-form"
              ariaLabel="Card Type"
            />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <div className="quantity-control">
              <button
                type="button"
                className="btn btn-secondary quantity-btn"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >−</button>
              <input
                type="number"
                min="1"
                max="999"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="form-input quantity-input"
              />
              <button
                type="button"
                className="btn btn-secondary quantity-btn"
                onClick={() => setQuantity(q => Math.min(999, q + 1))}
              >+</button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group form-group-half">
              <label htmlFor="edit-year">Year (optional)</label>
              <input
                id="edit-year"
                type="text"
                placeholder="e.g. 2024"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="form-input"
                inputMode="numeric"
                maxLength={4}
              />
            </div>
            <div className="form-group form-group-half">
              <label htmlFor="edit-series">Series (optional)</label>
              <input
                id="edit-series"
                type="text"
                placeholder="e.g. HW Turbo"
                value={series}
                onChange={e => setSeries(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCarModal
