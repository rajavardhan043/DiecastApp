import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const carsDir = path.join(__dirname, '..', 'public', 'cars')
const outputPath = path.join(__dirname, '..', 'public', 'cars.json')
const metaPath = path.join(__dirname, '..', 'public', 'cars-meta.json')

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  } catch {
    return {}
  }
}

function generateManifest() {
  const meta = readMeta()
  let cars = []
  const accountedPaths = new Set()

  // Preserve existing multi-image cars (created via API upload)
  try {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    for (const car of existing.cars || []) {
      if (car.images && car.images.length > 0) {
        cars.push(car)
        car.images.forEach(p => accountedPaths.add(p))
      }
    }
  } catch {}

  if (!fs.existsSync(carsDir)) {
    fs.mkdirSync(carsDir, { recursive: true })
    ['hot-wheels', 'mini-gt', 'poprace', 'other'].forEach(brand => {
      fs.mkdirSync(path.join(carsDir, brand), { recursive: true })
    })
    fs.writeFileSync(outputPath, JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2))
    console.log('Created public/cars folder with brand subfolders')
    return
  }

  const brands = fs.readdirSync(carsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const brand of brands) {
    const brandPath = path.join(carsDir, brand)
    const files = fs.readdirSync(brandPath)

    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (!IMAGE_EXTENSIONS.includes(ext)) continue

      const pathStr = `/cars/${brand}/${file}`
      if (accountedPaths.has(pathStr)) continue

      const id = `${brand}-${file}`
      const defaultName = path.basename(file, ext).replace(/[-_]/g, ' ')
      cars.push({
        id,
        brand: brand.replace(/-/g, ' '),
        name: meta[id]?.name ?? defaultName,
        path: pathStr,
      })
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify({ cars, lastUpdated: new Date().toISOString() }, null, 2))
  console.log(`Generated manifest with ${cars.length} cars from ${brands.length} brands`)
}

generateManifest()
