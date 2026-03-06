import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Formidable } from 'formidable'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const carsDir = path.join(__dirname, '..', 'public', 'cars')
const manifestPath = path.join(__dirname, '..', 'public', 'cars.json')
const metaPath = path.join(__dirname, '..', 'public', 'cars-meta.json')

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const DEFAULT_BRANDS = ['hot-wheels', 'mini-gt', 'poprace', 'other']

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  } catch {
    return {}
  }
}

function writeMeta(meta) {
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    return { cars: [], lastUpdated: new Date().toISOString() }
  }
}

function writeManifest(manifest) {
  manifest.lastUpdated = new Date().toISOString()
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

function generateManifest() {
  const meta = readMeta()
  const cars = []
  if (!fs.existsSync(carsDir)) {
    fs.mkdirSync(carsDir, { recursive: true })
    DEFAULT_BRANDS.forEach(b => fs.mkdirSync(path.join(carsDir, b), { recursive: true }))
    fs.writeFileSync(manifestPath, JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2))
    return cars
  }

  const brands = fs.readdirSync(carsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const brand of brands) {
    const brandPath = path.join(carsDir, brand)
    if (!fs.statSync(brandPath).isDirectory()) continue
    const files = fs.readdirSync(brandPath)

    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const id = `${brand}-${file}`
        const defaultName = path.basename(file, ext).replace(/[-_]/g, ' ')
        cars.push({
          id,
          brand: brand.replace(/-/g, ' '),
          name: meta[id]?.name ?? defaultName,
          path: `/cars/${brand}/${file}`,
        })
      }
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify({
    cars,
    lastUpdated: new Date().toISOString(),
  }, null, 2))
  return cars
}

function safeBrand(input) {
  return (input || 'other').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function handleUpload(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const form = new Formidable({ keepExtensions: true, multiples: true })
  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
      return
    }

    let brand = safeBrand(fields.brand?.[0] || 'other')
    if (!brand) brand = 'other'
    const customName = (fields.name?.[0] || '').trim()

    const fileList = Array.isArray(files.images) ? files.images : (files.images ? [files.images] : [])
    if (fileList.length === 0) {
      const single = Array.isArray(files.image) ? files.image[0] : files.image
      if (single?.filepath) fileList.push(single)
    }
    if (fileList.length === 0 || !fileList[0]?.filepath) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'No image file provided' }))
      return
    }

    const brandDir = path.join(carsDir, brand)
    fs.mkdirSync(brandDir, { recursive: true })

    const carId = `car-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const imagePaths = []
    const validFiles = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (!file?.filepath) continue
      const ext = path.extname(file.originalFilename || file.newFilename).toLowerCase()
      if (!IMAGE_EXTENSIONS.includes(ext)) continue
      const filename = fileList.length === 1
        ? `${carId}${ext}`
        : `${carId}-${i}${ext}`
      const destPath = path.join(brandDir, filename)
      try {
        fs.renameSync(file.filepath, destPath)
        imagePaths.push(`/cars/${brand}/${filename}`)
        validFiles.push(file)
      } catch (e) {
        // skip failed rename
      }
    }

    if (imagePaths.length === 0) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Failed to save images' }))
      return
    }

    const id = `${brand}-${carId}`

    try {
      if (customName) {
        const meta = readMeta()
        meta[id] = { name: customName }
        writeMeta(meta)
      }
      const manifest = readManifest()
      const defaultName = customName || path.basename(validFiles[0].originalFilename || '', path.extname(validFiles[0].originalFilename || '')).replace(/[-_]/g, ' ') || 'Untitled'
      manifest.cars.push({
        id,
        brand: brand.replace(/-/g, ' '),
        name: customName || defaultName,
        path: imagePaths[0],
        images: imagePaths,
      })
      writeManifest(manifest)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, path: imagePaths[0], images: imagePaths }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
  })
}

export function handleDelete(req, res) {
  if (req.method !== 'DELETE') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const carPath = url.searchParams.get('path') // e.g. /cars/hot-wheels/file.jpg
  if (!carPath || !carPath.startsWith('/cars/')) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing or invalid path' }))
    return
  }

  const manifest = readManifest()
  const car = manifest.cars.find(c => c.path === carPath || (c.images && c.images.includes(carPath)))
  if (!car) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Car not found' }))
    return
  }

  const pathsToDelete = (car.images && car.images.length) ? car.images : [car.path]
  try {
    for (const p of pathsToDelete) {
      const parts = p.slice(6).split('/') // after /cars/
      if (parts.length === 2) {
        const [brand, filename] = parts
        const filePath = path.join(carsDir, brand, filename)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }
    }
    const meta = readMeta()
    delete meta[car.id]
    writeMeta(meta)
    manifest.cars = manifest.cars.filter(c => c.id !== car.id)
    writeManifest(manifest)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: e.message }))
  }
}

export function handleEdit(req, res) {
  if (req.method !== 'PATCH') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    try {
      const { id, name, brand } = JSON.parse(body || '{}')
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing id' }))
        return
      }

      const manifest = readManifest()
      const car = manifest.cars.find(c => c.id === id)
      if (car && name !== undefined) {
        car.name = String(name).trim()
        const meta = readMeta()
        if (!meta[id]) meta[id] = {}
        meta[id].name = car.name
        writeMeta(meta)
        writeManifest(manifest)
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
  })
}
