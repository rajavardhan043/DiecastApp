# My Diecast Collection

A gallery app for your diecast car collection (Hot Wheels, Mini GT, Pop Race, etc.). Use as a **web app** or build an **offline Android APK** to share with friends.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the app locally**
   ```bash
   npm run dev
   ```
   Open http://localhost:7777 in your browser.

3. **Add cars** — Click **+ Add a new car**, choose a brand, and upload an image from your computer.

## Android APK (Offline — share with friends)

Build an APK that works **fully offline**. Your friends can add cars using their camera or gallery—no account, no internet.

```bash
npm run build:android
npm run android   # Opens in Android Studio, then Build → Build APK
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

See **[ANDROID_BUILD.md](ANDROID_BUILD.md)** for detailed steps.

## Going Online

Deploy to view your collection from any device:

### Option A: Vercel (Recommended)

1. Push your project to [GitHub](https://github.com)
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "Add New Project" and import your repo
4. Deploy — your gallery will be live at `your-project.vercel.app`

### Option B: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
3. Connect your repo and deploy

### Option C: GitHub Pages (Free, read-only)

**Note:** Add/Edit/Delete won't work — only viewing. Add cars locally, then build and deploy.

1. Push your project to GitHub
2. In the repo: **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions**
3. Push to `main` — the workflow will build and deploy automatically
4. Your site: `https://<username>.github.io/<repo-name>/`

To use a custom base path (e.g. if repo is `my-diecast`):
```bash
VITE_BASE_PATH=/my-diecast/ npm run build
```

## Commands

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production (includes manifest generation) |
| `npm run manifest` | Scan `public/cars` and update `cars.json` |
| `npm run preview` | Preview production build locally |

## Tips

- **Naming**: Filename becomes the car name (e.g. `Nissan Skyline GT-R.jpg` → "Nissan Skyline GT R")
- **Resolution**: Use 800–1200px wide images for fast loading
- **Upload works in dev mode only**: When deployed (Vercel, Netlify), add cars by placing images in `public/cars/{brand}/` and running `npm run manifest` before deploy
