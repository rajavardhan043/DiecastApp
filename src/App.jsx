import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import Gallery from './components/Gallery'
import Lightbox from './components/Lightbox'
import AddCarModal from './components/AddCarModal'
import EditCarModal from './components/EditCarModal'
import CustomSelect from './components/CustomSelect'
import { useFavorites } from './hooks/useFavorites'
import { storage } from './storage'
import { checkForUpdates, getDatabaseInfo, clearUpdateCache } from './updateService'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'newest', label: 'Newest first' },
]

const BRAND_OPTIONS = [
  { value: 'all', label: 'Brand' },
  { value: 'hotwheels', label: 'Hot Wheels' },
  { value: 'poprace', label: 'Pop Race' },
  { value: 'minigt', label: 'Mini GT' },
  { value: 'other', label: 'Other' },
]

function App() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCardType, setSelectedCardType] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [lightboxCar, setLightboxCar] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editCar, setEditCar] = useState(null)
  const [sortBy, setSortBy] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [showSettings, setShowSettings] = useState(false)
  const [updateStatus, setUpdateStatus] = useState(null)
  const [updateChecking, setUpdateChecking] = useState(false)
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('light-theme') ? 'light' : 'dark'
  )
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-theme')
    } else {
      document.documentElement.classList.remove('light-theme')
    }
  }

  const handleCheckUpdates = async () => {
    setUpdateChecking(true)
    setUpdateStatus(null)
    const result = await checkForUpdates()
    setUpdateChecking(false)
    if (result.error) {
      setUpdateStatus('Network error. Try again later.')
    } else if (result.updated) {
      setUpdateStatus(`Updated! ${result.count} new car${result.count !== 1 ? 's' : ''} added.`)
    } else {
      setUpdateStatus('Already up to date.')
    }
  }

  const loadCars = useCallback(() => {
    return storage.loadCars().then(setCars)
  }, [])

  useEffect(() => {
    loadCars()
      .then(() => setLoading(false))
      .catch(() => setLoading(false))
    checkForUpdates().then((result) => {
      if (result.updated) {
        const msg = result.fullRefresh
          ? (result.count > 0 ? `${result.count} new car${result.count !== 1 ? 's' : ''} added` : 'Car database updated')
          : `${result.count} new car${result.count !== 1 ? 's' : ''} added`
        setToast(msg)
        toastTimerRef.current = setTimeout(() => setToast(null), 3500)
      }
    })
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [loadCars])

  let filteredCars = cars.filter(car => {
    const matchesCardType = selectedCardType === 'all' || car.cardType === selectedCardType
    const matchesSearch = !searchQuery ||
      (car.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (car.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
    const normBrand = (car.brand || '').toLowerCase().replace(/\s+/g, '')
    const normFilter = selectedBrand.replace(/\s+/g, '')
    const matchesBrand = selectedBrand === 'all' || normBrand === normFilter
    const matchesFav = !showFavoritesOnly || favorites.has(car.id)
    return matchesCardType && matchesBrand && matchesSearch && matchesFav
  })

  const sortedCars = [...filteredCars].sort((a, b) => {
    switch (sortBy) {
      case 'name': return (a.name || '').localeCompare(b.name || '')
      case 'name-desc': return (b.name || '').localeCompare(a.name || '')
      case 'newest': return 0
      default: return (a.name || '').localeCompare(b.name || '')
    }
  })

  const handleUpdateQuantity = useCallback(async (car, delta) => {
    try {
      await storage.updateQuantity(car, delta)
      await loadCars()
    } catch (e) {
      alert(e.message)
    }
  }, [loadCars])

  const handleDelete = useCallback(async (car) => {
    try {
      await storage.deleteCar(car)
      if (lightboxCar?.id === car.id) setLightboxCar(null)
      await loadCars()
    } catch (e) {
      alert(e.message)
    }
  }, [loadCars, lightboxCar])

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="header-title-row">
            <h1 className="title">MY<br/>GARAGE</h1>
            <button
              type="button"
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="filter-row">
          <CustomSelect
            value={selectedCardType}
            onChange={setSelectedCardType}
            options={[
              { value: 'all', label: 'Card Type' },
              { value: 'indian', label: 'Indian' },
              { value: 'imported', label: 'Imported' },
            ]}
            defaultValue="all"
            ariaLabel="Card Type"
          />
          <CustomSelect
            value={sortBy}
            onChange={setSortBy}
            options={[{ value: '', label: 'Sort By' }, ...SORT_OPTIONS]}
            defaultValue=""
            ariaLabel="Sort By"
          />
          <CustomSelect
            value={selectedBrand}
            onChange={setSelectedBrand}
            options={BRAND_OPTIONS}
            defaultValue="all"
            ariaLabel="Brand"
          />
          <button
            type="button"
            className={`filter-pill filter-pill-btn ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            ★
          </button>
        </div>

        <div className="search-row">
          <div className="search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Search in My Garage"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="count-row">
          <span className="vehicle-count">{sortedCars.length} Unique Vehicle{sortedCars.length !== 1 ? 's' : ''}</span>
          <span className="qty-count">&nbsp;·&nbsp;{sortedCars.reduce((sum, c) => sum + (c.quantity || 1), 0)} Total</span>
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <p>Loading your collection...</p>
          </div>
        ) : sortedCars.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>No cars yet</h2>
            <p>
              {showFavoritesOnly
                ? 'No favorites. Tap the star on any car to add it.'
                : 'Tap + below to add your first diecast car.'}
            </p>
          </div>
        ) : (
          <Gallery
            cars={sortedCars}
            viewMode="grid"
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelect={setLightboxCar}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => { setShowFavoritesOnly(false); setSearchQuery('') }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>My Garage</span>
        </button>
        <button className="nav-item" onClick={() => setShowAddModal(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <span>Add Car</span>
        </button>
        <button className="nav-item" onClick={() => document.querySelector('.search-input')?.focus()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search</span>
        </button>
      </nav>

      {showAddModal && (
        <AddCarModal onClose={() => setShowAddModal(false)} onSuccess={loadCars} existingCars={cars} />
      )}

      {editCar && (
        <EditCarModal
          car={editCar}
          onClose={() => {
            const carToReopen = editCar
            setEditCar(null)
            setLightboxCar(carToReopen)
          }}
          onSuccess={async () => {
            await loadCars()
            const updated = await storage.loadCars()
            const refreshed = updated.find(c => c.id === editCar.id)
            if (refreshed) setLightboxCar(refreshed)
          }}
        />
      )}

      {lightboxCar && (
        <Lightbox
          car={lightboxCar}
          onClose={() => setLightboxCar(null)}
          isFavorite={isFavorite(lightboxCar.id)}
          onToggleFavorite={() => toggleFavorite(lightboxCar.id)}
          onEdit={() => { setLightboxCar(null); setEditCar(lightboxCar) }}
          onDelete={() => handleDelete(lightboxCar)}
          onUpdateQuantity={async (delta) => {
            await handleUpdateQuantity(lightboxCar, delta)
            const updated = await storage.loadCars()
            const refreshed = updated.find(c => c.id === lightboxCar.id)
            if (refreshed) setLightboxCar(refreshed)
          }}
        />
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="settings-body">
              <div className="settings-section">
                <label className="settings-label">Theme</label>
                <div className="settings-theme-toggle">
                  <button
                    className={`settings-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`settings-theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>
              <div className="settings-section">
                <label className="settings-label">Car Database</label>
                <button
                  className="settings-update-btn"
                  onClick={handleCheckUpdates}
                  disabled={updateChecking}
                >
                  {updateChecking ? (
                    <><span className="settings-spinner" /> Checking...</>
                  ) : (
                    'Check for Updates'
                  )}
                </button>
                {updateStatus && (
                  <span className="settings-update-status">{updateStatus}</span>
                )}
                <button
                  type="button"
                  className="settings-clear-cache-btn"
                  onClick={() => {
                    clearUpdateCache()
                    setUpdateStatus('Cache cleared. Tap Check for Updates.')
                  }}
                >
                  Clear cache
                </button>
              </div>
              <div className="settings-section settings-about">
                <span className="settings-label">App Version</span>
                <span className="settings-version">v1.0.0</span>
              </div>
              <div className="settings-section settings-about">
                <span className="settings-label">Database</span>
                <span className="settings-version">v{getDatabaseInfo().version} · {getDatabaseInfo().count.toLocaleString()} cars</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
