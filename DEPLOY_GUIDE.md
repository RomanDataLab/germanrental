# Deployment Guide — Deutsche Immo

## Prerequisites

### 1. Set Git Identity (required before first commit)

```bash
git config user.email "your@email.com"
git config user.name "Your Name"
```

### 2. Get a Mapbox Access Token

- Go to https://account.mapbox.com/
- Create or copy your **default public token**
- You'll need this for both local dev and Vercel deployment

---

## Before Pushing to GitHub

### 3. Verify large files are NOT staged

The following files exist locally but must **not** be committed (they're in `.gitignore`):

| File/Folder | Size | Why excluded |
|---|---|---|
| `immo_data_24Ge.csv` | 272 MB | Too large for git/Vercel |
| `public/De_muni.geojson` | 145 MB | Too large for git/Vercel |
| `public/De_muni_meta.geojson` | 164 MB | Too large for git/Vercel |
| `plz-5stellig.*` (shapefiles) | ~86 MB | Not used by app |
| `1763728612666/*.mp4` (videos) | 152 MB | Not used by app |

Confirm with:

```bash
git status
```

You should only see these tracked files:

```
.github/workflows/deploy.yml
.gitignore
README.md
package.json
package-lock.json
public/index.html
src/App.js
src/index.js
src/store.js
vercel.json
webpack.config.js
```

### 4. Commit all changes

```bash
git add .gitignore README.md package.json package-lock.json public/index.html src/App.js src/index.js src/store.js vercel.json webpack.config.js .github/workflows/deploy.yml
git commit -m "Fix project for Vercel deployment"
```

### 5. Create GitHub repo and push

```bash
git remote add origin https://github.com/YOUR_USERNAME/deutsche_immo.git
git branch -M main
git push -u origin main
```

---

## Deploy to Vercel

### 6. Connect repo to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository (`deutsche_immo`)
3. Vercel will auto-detect settings from `vercel.json`:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 7. Set environment variable in Vercel

1. In Vercel project → **Settings** → **Environment Variables**
2. Add:
   - **Name**: `MAPBOX_ACCESS_TOKEN`
   - **Value**: your Mapbox public token
   - **Environments**: Production, Preview, Development

### 8. Deploy

- Vercel will auto-deploy on every push to `main`
- Or trigger manually from the Vercel dashboard

### 9. Verify

- Open the Vercel deployment URL
- Confirm the map loads (if map is blank, the Mapbox token is missing or invalid)

---

## Hosting Large Data Files (Optional)

The GeoJSON and CSV data files are too large for git. To use them in the app:

1. **Upload** `De_muni.geojson` and `immo_data_24Ge.csv` to a file host (S3, Cloudflare R2, GitHub Releases, etc.)
2. **Fetch at runtime** in `src/App.js` using `fetch()` instead of bundling them
3. Keep files under **100 MB each** for best performance, or use tiling/simplification

---

## Local Development

```bash
npm install
export MAPBOX_ACCESS_TOKEN=your_token_here   # Linux/Mac
set MAPBOX_ACCESS_TOKEN=your_token_here       # Windows CMD
$env:MAPBOX_ACCESS_TOKEN="your_token_here"    # PowerShell
npm start
```

Opens at http://localhost:3000
