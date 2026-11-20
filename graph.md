# Germany Rental market 2024 - Project Structure

Repo: https://github.com/RomanDataLab/germanrental.git (branch `main`)

```
deutsche_immo/
├── public/
│   ├── index.html                  # HTML template (viewport meta included)
│   ├── de_muni_v3.geojson          # ACTIVE dataset: topology-clean simplified polygons
│   │                               # (16MB, 8170 features, 39 curated fields)
│   ├── de_muni_lite.geojson        # OLD broken simplification (gaps/slivers) [unused]
│   ├── immowelt_listings.geojson   # Property listings (183KB, 358 features, geometry null)
│   ├── De_muni.geojson             # Full municipalities geometry (145MB) [gitignored]
│   └── De_muni_meta.geojson        # Full municipalities + immo metadata (164MB) [gitignored]
│
├── src/
│   ├── index.js                    # Entry point: React root renders App
│   ├── App.js                      # Leaflet map, radio selection, tooltip, drawer state
│   ├── styles.css                  # Translucent legend, drawer, tooltip, mobile queries
│   ├── lib/
│   │   └── classify.js             # Column type detection, quantile breaks, color ramps
│   └── components/
│       └── Sidebar.js              # Radio selector, descriptions, per-option legends
│
├── scripts/
│   └── copy-public.js              # Build step: copies data geojson into dist/
├── webpack.config.js               # Webpack 5 config: babel, css, devServer:3333
├── package.json                    # Dependencies: leaflet 1.9, react 18
├── vercel.json                     # Vercel deploy config: build → dist/
└── .gitignore                      # node_modules, dist, big geojsons,
                                    # .claude/, src/config/cartoConfig.js (local-only)
```

## Map stack

Leaflet (no map workers, no style JSON, no API key). Basemap: Esri World Dark Gray
Canvas raster tiles (Base + Reference overlay), keyless; zoom control moved to
top-right. CARTO raster tiles watermark "API KEY REQUIRED" even with a key
(cb1_ keys are for their vector basemap API only). Replaced kepler.gl
(Redux + Mapbox token + worker issues in embedded webviews).

## Interaction model

- Radio buttons (single selection), NOT multi-layer checkboxes. One choropleth
  at a time, fill opacity 0.5
- Black backdrop polygon under Germany footprint, fillOpacity 0.1, always on
- Section "CLASSIFY POST CODES": 6 visible options — baseRent, baseRentRange,
  einwohner, pricetrend, totalRent, yearConstructed. Per-option explanation
  text via DESCRIPTIONS map in Sidebar.js
- HIDDEN_KEYS set in Sidebar.js hides 15 fields from the selector (data stays
  in file; tooltip can show them)
- Hint text: "Select option to classify rented homes by postal codes (PLZ)"
- Title: "Germany Rental market 2024"

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
  ├─ black backdrop L.geoJSON added (fillOpacity 0.1)
  └─ setCols() → Sidebar renders radio per visible column
        │
        ▼ user selects radio
App.js layer effect
  ├─ old choropleth layer removed, single L.geoJSON added (canvas renderer)
  └─ mousemove → tooltip (PLZ note + selected column value)
```

## Column classification

- Numeric (quantile 5 classes, Viridis): baseRent, totalRent, livingSpace,
  noRooms, yearConstructed, pricetrend, einwohner, qkm, heatingCosts,
  serviceCharge, thermalChar, ranges, floors, etc.
- Categorical (top 12 values, "NA"/null grey): regio1-3, condition,
  typeOfFlat, heatingType, balcony/cellar/garden booleans, plz (forced cat)
- plz excluded from numeric: coloring by postal code number is meaningless

## Key Config

- **Dev server**: http://localhost:3333
- **No tokens or API keys required** at runtime
- CARTO API key (for future vector basemap use) lives in local-only
  src/config/cartoConfig.js, injected via webpack DefinePlugin env var

## Deploy

1. `npm run build` = webpack production + `scripts/copy-public.js` copies data
   geojson files into dist/ (index.html excluded, webpack generates it)
2. Push to https://github.com/RomanDataLab/germanrental.git — SSH key
   id_ed25519_romandatalab in G:\My Drive\J_Projects_Archive\ssh
3. Import repo in Vercel — vercel.json: build `npm run build`, output `dist/`
4. Auto-deploys on push to main

## Mobile

- Sidebar = overlay drawer, collapsed by default under 640px viewport width
- `«`/`»` toggle button slides panel left / unrolls (below zoom control)
- Media query (max-width: 640px): drawer 86vw, bigger toggle touch target,
  smaller title, tooltip capped 200px
- Verified at 390×844: drawer collapsed on load, unroll works, tiles render
