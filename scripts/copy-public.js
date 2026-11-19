// Copies public data assets into dist/ for production deploys.
// index.html is excluded: webpack generates it (hashed bundle refs).
const fs = require('fs');
const path = require('path');

const FILES = [
  'de_muni_v3.geojson',
  'de_muni_lite.geojson',
  'immowelt_listings.geojson'
];

FILES.forEach(f => {
  const src = path.join(__dirname, '..', 'public', f);
  const dest = path.join(__dirname, '..', 'dist', f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('copied', f);
  } else {
    console.warn('missing, skipped:', f);
  }
});
