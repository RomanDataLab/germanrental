# Deutsche Immo - Kepler.gl React Application

A **React + Parcel** application that integrates Kepler.gl for visualizing German rental data on an interactive map.

## Features

- Interactive map visualization using Kepler.gl
- GeoJSON data loading and visualization
- Color-coded rental data based on base rent
- Tooltip interactions showing region, notes, and rental prices

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your Mapbox access token as an environment variable:
```bash
export MAPBOX_ACCESS_TOKEN=your_token_here
```

3. Run the development server:
```bash
npm start
```

## Data Files

Large data files (GeoJSON, CSV, shapefiles, videos) are **not** tracked in git due to size constraints. Host them externally (e.g., S3, CDN) and fetch at runtime.

## Deployment to Vercel

1. Connect your GitHub repo to Vercel
2. Set the `MAPBOX_ACCESS_TOKEN` environment variable in Vercel project settings
3. Vercel will auto-detect the build config from `vercel.json`

## Build

```bash
npm run build
```

Output goes to the `dist/` directory.
