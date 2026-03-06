/**
 * Storage abstraction: Web uses fetch/API, Native uses Capacitor Filesystem.
 * Enables offline add/edit/delete on Android.
 */

const CAR_DIR = 'cars'
const MANIFEST_FILE = 'cars.json'

function isNative() {
  return window.Capacitor?.isNativePlatform?.() ?? false
}

// --- Web mode (dev server) ---
async function webLoadCars() {
  const res = await fetch('/cars.json')
  const data = await res.json()
  return data.cars || []
}

async function webAddCar(brand, files, name) {
  const fileList = Array.isArray(files) ? files : [files]
  const formData = new FormData()
  formData.append('brand', brand)
  if (name?.trim()) formData.append('name', name.trim())
  fileList.forEach(f => formData.append('images', f))

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
}

async function webDeleteCar(car) {
  const res = await fetch(`/api/car?path=${encodeURIComponent(car.path)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

async function webEditCar(car, { name }) {
  const res = await fetch('/api/car', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: car.id, name }),
  })
  if (!res.ok) throw new Error('Edit failed')
}

// --- Native mode (Capacitor / Android) ---
async function nativeLoadCars() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Capacitor } = await import('@capacitor/core')

  try {
    const { data } = await Filesystem.readFile({
      path: MANIFEST_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    const parsed = JSON.parse(data)
    const cars = parsed.cars || []

    // Resolve image URIs for native
    const paths = (car) => (car.images && car.images.length) ? car.images : [car.path].filter(Boolean)
    for (const car of cars) {
      const pathList = paths(car)
      const urls = []
      for (const p of pathList) {
        if (p && !p.startsWith('data:') && !p.startsWith('http')) {
          try {
            const { uri } = await Filesystem.getUri({ path: p, directory: Directory.Data })
            urls.push(Capacitor.convertFileSrc(uri))
          } catch {
            urls.push(null)
          }
        } else {
          urls.push(p)
        }
      }
      car.displayUrl = urls[0] || null
      if (urls.length > 1) car.displayUrls = urls
    }
    return cars
  } catch {
    return []
  }
}

async function nativeAddCar(brand, files, name, quantity = 1, cardType = 'indian', year = '', series = '') {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Capacitor } = await import('@capacitor/core')

  const fileList = Array.isArray(files) ? files : [files]
  const safeBrand = brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'other'
  const carId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const images = []
  let displayUrls = []

  try {
    await Filesystem.mkdir({
      path: `${CAR_DIR}/${safeBrand}`,
      directory: Directory.Data,
      recursive: true,
    })
  } catch {}

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    const ext = (file.name.match(/\.[^.]+$/) || ['.jpg'])[0]
    const filename = fileList.length === 1 ? `${carId}${ext}` : `${carId}-${i}${ext}`
    const relPath = `${CAR_DIR}/${safeBrand}/${filename}`

    const reader = new FileReader()
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => {
        const b = reader.result?.split(',')[1]
        if (!b) reject(new Error('Failed to read image data'))
        else resolve(b)
      }
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

    await Filesystem.writeFile({
      path: relPath,
      data: base64,
      directory: Directory.Data,
    })

    const { uri } = await Filesystem.getUri({
      path: relPath,
      directory: Directory.Data,
    })
    images.push(relPath)
    displayUrls.push(Capacitor.convertFileSrc(uri))
  }

  const carName = name?.trim() || fileList[0]?.name?.replace(/\.[^.]+$/, '')?.replace(/[-_]/g, ' ') || 'Untitled'
  const id = `${safeBrand}-${carId}`

  const cars = await nativeLoadCars()
  const meta = {}
  try {
    const { data } = await Filesystem.readFile({
      path: 'cars-meta.json',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    Object.assign(meta, JSON.parse(data))
  } catch {}

  meta[id] = { name: carName }
  await Filesystem.writeFile({
    path: 'cars-meta.json',
    data: JSON.stringify(meta),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })

  cars.push({
    id,
    brand: safeBrand.replace(/-/g, ' '),
    name: carName,
    cardType: cardType || 'indian',
    quantity: quantity || 1,
    year: year || '',
    series: series || '',
    path: images[0],
    images,
    displayUrl: displayUrls[0],
    displayUrls,
  })

  await Filesystem.writeFile({
    path: MANIFEST_FILE,
    data: JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })

  return cars
}

async function nativeDeleteCar(car) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')

  const pathsToDelete = (car.images && car.images.length) ? car.images : [car.path].filter(Boolean)
  for (const p of pathsToDelete) {
    try {
      await Filesystem.deleteFile({ path: p, directory: Directory.Data })
    } catch {}
  }

  const meta = {}
  try {
    const { data } = await Filesystem.readFile({
      path: 'cars-meta.json',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    Object.assign(meta, JSON.parse(data))
  } catch {}
  delete meta[car.id]
  await Filesystem.writeFile({
    path: 'cars-meta.json',
    data: JSON.stringify(meta),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })

  const cars = (await nativeLoadCars()).filter(c => c.id !== car.id)
  await Filesystem.writeFile({
    path: MANIFEST_FILE,
    data: JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
}

async function nativeEditCar(car, updates) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')

  const meta = {}
  try {
    const { data } = await Filesystem.readFile({
      path: 'cars-meta.json',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    Object.assign(meta, JSON.parse(data))
  } catch {}
  if (!meta[car.id]) meta[car.id] = {}
  if (updates.name !== undefined) meta[car.id].name = String(updates.name).trim()
  await Filesystem.writeFile({
    path: 'cars-meta.json',
    data: JSON.stringify(meta),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })

  const cars = await nativeLoadCars()
  const idx = cars.findIndex(c => c.id === car.id)
  if (idx >= 0) {
    if (updates.name !== undefined) cars[idx].name = String(updates.name).trim()
    if (updates.brand !== undefined) cars[idx].brand = String(updates.brand).trim()
    if (updates.quantity !== undefined) cars[idx].quantity = Number(updates.quantity) || 1
    if (updates.cardType !== undefined) cars[idx].cardType = updates.cardType
    if (updates.year !== undefined) cars[idx].year = String(updates.year).trim()
    if (updates.series !== undefined) cars[idx].series = String(updates.series).trim()
  }
  await Filesystem.writeFile({
    path: MANIFEST_FILE,
    data: JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
}

async function nativeUpdateQuantity(car, delta) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')

  const cars = await nativeLoadCars()
  const idx = cars.findIndex(c => c.id === car.id)
  if (idx < 0) return

  const newQty = Math.max(1, (cars[idx].quantity || 1) + delta)
  cars[idx].quantity = newQty

  await Filesystem.writeFile({
    path: MANIFEST_FILE,
    data: JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
}

// --- Public API ---
export const storage = {
  isNative: isNative(),
  async loadCars() {
    return isNative() ? nativeLoadCars() : webLoadCars()
  },
  async addCar(brand, file, name, quantity, cardType, year, series) {
    return isNative() ? nativeAddCar(brand, file, name, quantity, cardType, year, series) : webAddCar(brand, file, name)
  },
  async deleteCar(car) {
    return isNative() ? nativeDeleteCar(car) : webDeleteCar(car)
  },
  async editCar(car, updates) {
    return isNative() ? nativeEditCar(car, updates) : webEditCar(car, updates)
  },
  async updateQuantity(car, delta) {
    if (isNative()) {
      await nativeUpdateQuantity(car, delta)
    }
  },
}
