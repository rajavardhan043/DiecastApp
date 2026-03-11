import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { storage } from '../storage'
import CustomSelect from './CustomSelect'
import { getMergedLookup } from '../updateService'

const MAX_IMAGES = 10

const THUMBS_BASE = 'https://rajavardhan043.github.io/DiecastApp'
function resolveThumbSrc(img) {
  if (!img) return null
  if (img.startsWith('http')) return img
  if (img.startsWith('/') && typeof window !== 'undefined' && !window.location.origin.startsWith('http')) {
    return THUMBS_BASE + img
  }
  return img
}

const BRANDS = [
  { value: 'hot-wheels', label: 'Hot Wheels' },
  { value: 'mini-gt', label: 'Mini GT' },
  { value: 'pop-race', label: 'Pop Race' },
  { value: 'other', label: 'Other' },
]

const PlaceholderIcon = () => (
  <span className="autocomplete-thumb-placeholder">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  </span>
)

function AutocompleteThumb({ src }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <PlaceholderIcon />
  return (
    <img
      src={src}
      alt=""
      className="autocomplete-thumb"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  )
}

function AddCarModal({ onClose, onSuccess, existingCars = [] }) {
  const [brand, setBrand] = useState('hot-wheels')
  const [customBrand, setCustomBrand] = useState('')
  const [name, setName] = useState('')
  const [cardType, setCardType] = useState('indian')
  const [quantity, setQuantity] = useState(1)
  const [year, setYear] = useState('')
  const [series, setSeries] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const fileInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const nameInputRef = useRef(null)

  const allEntries = useCallback(() => {
    const fromCollection = existingCars
      .filter(c => c.name)
      .map(c => ({
        name: c.name,
        year: c.year || '',
        series: c.series || '',
        img: c.displayUrl || (c.displayUrls && c.displayUrls[0]) || null,
        source: 'collection',
      }))
    const seen = new Set(fromCollection.map(e => `${e.name}||${e.year}`))
    const lookup = getMergedLookup()
    const fromLookup = lookup.filter(e => !seen.has(`${e.name}||${e.year}`))
    return [...fromCollection, ...fromLookup]
  }, [existingCars])

  const handleNameChange = (value) => {
    setName(value)
    setSelectedIdx(-1)
    setError('')
    if (brand !== 'hot-wheels' || value.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const q = value.toLowerCase()
    const matches = allEntries()
      .filter(e => e.name.toLowerCase().includes(q))
      .slice(0, 12)
    const unique = []
    const keys = new Set()
    for (const m of matches) {
      const key = `${m.name}|${m.year}`
      if (!keys.has(key)) { keys.add(key); unique.push(m) }
    }
    unique.sort((a, b) => {
      const ya = parseInt(a.year, 10) || 0
      const yb = parseInt(b.year, 10) || 0
      return yb - ya
    })
    setSuggestions(unique)
    setShowSuggestions(unique.length > 0)
  }

  const selectSuggestion = (entry) => {
    setName(entry.name)
    if (entry.year) setYear(entry.year)
    if (entry.series) setSeries(entry.series)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleNameKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[selectedIdx])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    if (selectedIdx >= 0 && suggestionsRef.current) {
      const item = suggestionsRef.current.children[selectedIdx]
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIdx])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          nameInputRef.current && !nameInputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isNative = storage.isNative

  const addFiles = (newFiles) => {
    const filtered = [...newFiles].filter(f => f.type?.startsWith('image/'))
    setFiles(prev => [...prev, ...filtered].slice(0, MAX_IMAGES))
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleFileChange = (e) => {
    const selected = e.target.files
    if (selected?.length) addFiles(selected)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const pickFromGallery = async () => {
    if (files.length >= MAX_IMAGES) return
    try {
      const result = await Camera.pickImages({ limit: MAX_IMAGES - files.length })
      for (const photo of result.photos) {
        const res = await fetch(photo.webPath)
        const blob = await res.blob()
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type })
        addFiles([file])
      }
    } catch (e) {
      setError(e.message || 'Failed to pick images')
    }
  }

  const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
    const byteChars = atob(base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i)
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
  }

  const takePhoto = async () => {
    if (files.length >= MAX_IMAGES) return
    try {
      const result = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      })
      let file
      if (result.webPath) {
        const res = await fetch(result.webPath)
        const blob = await res.blob()
        file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type })
      } else if (result.base64String) {
        const blob = base64ToBlob(result.base64String)
        file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      } else {
        throw new Error('No image data received')
      }
      addFiles([file])
    } catch (e) {
      setError(e.message || 'Failed to take photo')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) {
      setError('Please select at least one image')
      return
    }
    setError('')

    const useName = (name || '').trim()
    const useYear = (year || '').trim()
    const alreadyExists = useName && existingCars.some(
      c => (c.name || '').trim().toLowerCase() === useName.toLowerCase() &&
           (c.year || '').trim() === useYear &&
           (c.cardType || 'indian') === cardType
    )
    if (alreadyExists) {
      setError('This car is already in your garage')
      return
    }

    setUploading(true)
    const useBrand = brand === 'other' && customBrand
      ? customBrand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'other'
      : brand

    try {
      if (isNative) {
        await storage.addCar(useBrand, files, name.trim() || null, quantity, cardType, year.trim() || '', series.trim() || '')
      } else {
        const formData = new FormData()
        formData.append('brand', useBrand)
        if (name.trim()) formData.append('name', name.trim())
        formData.append('cardType', cardType)
        if (quantity > 1) formData.append('quantity', String(quantity))
        files.forEach(file => formData.append('images', file))

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
      }
      await onSuccess?.()
      onClose()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add cars</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Brand</label>
            <CustomSelect
              value={brand}
              onChange={(v) => {
                setBrand(v)
                if (v !== 'hot-wheels') {
                  setSuggestions([])
                  setShowSuggestions(false)
                }
              }}
              options={BRANDS}
              className="cselect-form"
              ariaLabel="Brand"
            />
            {brand === 'other' && (
              <input
                type="text"
                placeholder="Enter brand name"
                value={customBrand}
                onChange={e => setCustomBrand(e.target.value)}
                className="form-input form-input-margin"
              />
            )}
          </div>

          <div className="form-group autocomplete-group">
            <label htmlFor="name">Car name (optional)</label>
            <input
              ref={nameInputRef}
              id="name"
              type="text"
              placeholder="e.g. McLaren P1 Orange"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onFocus={() => brand === 'hot-wheels' && name.trim().length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              className="form-input"
              autoComplete="off"
            />
            {brand === 'hot-wheels' && showSuggestions && suggestions.length > 0 && (
              <ul className="autocomplete-list" ref={suggestionsRef}>
                {suggestions.map((entry, i) => (
                  <li
                    key={`${entry.name}-${entry.year}-${i}`}
                    className={`autocomplete-item ${i === selectedIdx ? 'active' : ''}`}
                    onMouseDown={() => selectSuggestion(entry)}
                  >
                    <AutocompleteThumb src={resolveThumbSrc(entry.img)} />
                    <div className="autocomplete-text">
                      <span className="autocomplete-name">{entry.name}</span>
                      {(entry.year || entry.series) && (
                        <span className="autocomplete-meta">
                          {[entry.year, entry.series].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label>Card Type</label>
            <CustomSelect
              value={cardType}
              onChange={(v) => {
                setCardType(v)
                setError('')
              }}
              options={[
                { value: 'indian', label: 'Indian' },
                { value: 'imported', label: 'Imported' },
              ]}
              className="cselect-form"
              ariaLabel="Card Type"
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <div className="quantity-control">
              <button
                type="button"
                className="btn btn-outline quantity-btn"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                max="999"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="form-input quantity-input"
              />
              <button
                type="button"
                className="btn btn-outline quantity-btn"
                onClick={() => setQuantity(q => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group-half">
              <label htmlFor="year">Year (optional)</label>
              <input
                id="year"
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
              <label htmlFor="series">Series (optional)</label>
              <input
                id="series"
                type="text"
                placeholder="e.g. HW Turbo"
                value={series}
                onChange={e => setSeries(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Images (max {MAX_IMAGES})</label>
            {isNative && (
              <div className="form-native-actions">
                <button type="button" className="btn btn-outline" onClick={takePhoto}>
                  📷 Camera
                </button>
                <button type="button" className="btn btn-outline" onClick={pickFromGallery}>
                  🖼️ Gallery
                </button>
                <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                  📁 Files
                </button>
              </div>
            )}
            <div
              className={`form-dropzone ${dragOver ? 'drag-over' : ''} ${files.length >= MAX_IMAGES ? 'disabled' : ''}`}
              onDragOver={e => { e.preventDefault(); files.length < MAX_IMAGES && setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => files.length < MAX_IMAGES && !isNative && fileInputRef.current?.click()}
              style={isNative ? { cursor: 'default' } : {}}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileChange}
                className="form-file-hidden"
              />
              {files.length === 0 ? (
                <p className="form-dropzone-text">
                  {isNative ? 'Use buttons above or add files' : 'Drop images here or click to browse'}
                </p>
              ) : (
                <div className="form-preview-grid">
                  {files.map((file, i) => (
                    <div key={i} className="form-preview-item">
                      <img src={URL.createObjectURL(file)} alt="" className="form-preview-thumb" />
                      <button
                        type="button"
                        className="form-preview-remove"
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isNative && files.length < MAX_IMAGES && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </button>
            )}
            {files.length > 0 && (
              <p className="form-file-name">{files.length} of {MAX_IMAGES} images selected</p>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={uploading || files.length === 0}>
              {uploading ? 'Adding car...' : `Add ${quantity} car${quantity !== 1 ? 's' : ''} with ${files.length} image${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCarModal
