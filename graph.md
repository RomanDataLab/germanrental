# Deutsche Immo - Project Structure

```
deutsche_immo/
├── public/
│   ├── index.html                  # HTML template
│   ├── de_muni_v3.geojson          # ACTIVE dataset: topology-clean simplified polygons
│   │                               # (16MB, 8170 features, 39 curated fields)
│   ├── de_muni_lite.geojson        # OLD broken simplification (gaps/slivers) [unused]
│   ├── immowelt_listings.geojson   # Property listings (183KB, 358 features, geometry null)
│   ├── De_muni.geojson             # Full municipalities geometry (145MB) [gitignored]
│   └── De_muni_meta.geojson        # Full municipalities + immo metadata (164MB) [gitignored]
│
├── src/
│   ├── index.js                    # Entry point: React root renders App
│   ├── App.js                      # Leaflet map + layer stack + tooltip
│   ├── styles.css                  # Sidebar, legend, tooltip styles
│   ├── lib/
│   │   └── classify.js             # Column type detection, quantile breaks, color ramps
│   └── components/
│       └── Sidebar.js              # Column checkboxes, legends, stack order
│
├── webpack.config.js               # Webpack 5 config: babel, css, devServer:3333
├── package.json                    # Dependencies: leaflet 1.9, react 18
├── vercel.json                     # Vercel deploy config: build → dist/
└── .gitignore                      # Ignores node_modules, dist, large geojsons
```

## Map stack

Leaflet (no map workers, no style JSON, no API key). Basemap: Esri World Dark Gray
Canvas raster tiles (Base + Reference overlay), keyless. CARTO raster tiles
watermark "API KEY REQUIRED" even with a key (cb1_ keys are for their vector
basemap API only). Replaced kepler.gl (Redux + Mapbox token + worker issues in
embedded webviews).

## Geometry pipeline

de_muni_lite.geojson was simplified per-polygon without topology awareness →
slivers, spikes, jagged shared borders when zoomed. Fixed with mapshaper:

```
npx mapshaper public/De_muni_meta.geojson \
  -simplify visvalingam 8% keep-shapes \
  -clean \
  -o precision=0.0001 format=geojson public/de_muni_v2.geojson

npx mapshaper public/de_muni_v2.geojson \
  -filter-fields <39 fields> \
  -rename-fields baseRent=immo_data_24Ge_baseRent,... \
  -o format=geojson public/de_muni_v3.geojson
```

visvalingam keep-shapes preserves shared borders; -clean repairs intersections
and slivers. Regenerate from De_muni_meta.geojson if source data changes.

## Data Flow

```
de_muni_v3.geojson (public/)
        │ fetch()
        ▼
App.js
  ├─ classify.js: detectColumns()   → numeric vs categorical per property
  ├─ classify.js: coerceNumeric()   → strings/"NA" → numbers/null
  ├─ classify.js: buildColumnViz()  → quantile breaks + Viridis ramp (numeric)
  │                                  top-12 values + palette (categorical)
  └─ setCols() → Sidebar renders checkbox per column
        │
        ▼ user checks column
App.js layer effect
  ├─ L.geoJSON per active column (canvas renderer)
  ├─ check order = stack order, last checked paints on top (opacity 0.85 vs 0.5)
  └─ mousemove → tooltip (PLZ note + value of every active layer)
```

## Column classification

- Numeric (quantile 5 classes, Viridis): baseRent, totalRent, livingSpace,
  noRooms, yearConstructed, pricetrend, einwohner, qkm, heatingCosts,
  serviceCharge, thermalChar, pricetrend ranges, floors, etc.
- Categorical (top 12 values, "NA"/null grey): regio1-3, condition,
  typeOfFlat, heatingType, balcony/cellar/garden booleans, plz (forced cat)
- plz excluded from numeric: coloring by postal code number is meaningless

## Key Config

- **Dev server**: http://localhost:3333
- **Dataset ID**: n/a (plain fetch, no Redux)
- **No tokens or API keys required**

## Deploy

1. `npm run build` = webpack production + `scripts/copy-public.js` copies data
   geojson files into dist/ (index.html excluded, webpack generates it)
2. Push to https://github.com/RomanDataLab/germanrental.git
3. Import repo in Vercel — vercel.json: build `npm run build`, output `dist/`
4. Auto-deploys on push to main

## Mobile

- Sidebar = overlay drawer, collapsed by default under 640px viewport width
- `«`/`»` toggle button slides panel left / unrolls
- Media query (max-width: 640px): drawer 86vw, bigger toggle touch target,
  smaller title, tooltip capped 200px
