import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { detectColumns, coerceNumeric, buildColumnViz } from './lib/classify';
import Sidebar from './components/Sidebar';
import './styles.css';

export default function App() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const dataRef = useRef(null);
  const layerRefs = useRef({}); // key -> L.geoJSON
  const activeRef = useRef(null);
  const [cols, setCols] = useState(null);
  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640
  );

  activeRef.current = active;

  useEffect(() => {
    const map = L.map(mapEl.current, {
      center: [51.2, 10.4],
      zoom: 6,
      zoomControl: false
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    // CARTO raster tiles now serve an "API KEY REQUIRED" watermark even with a
    // key (the cb1_ key is for their vector basemap API, not legacy raster).
    // Esri dark canvas is keyless and works.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
      }
    ).addTo(map);
    // Reference overlay: country borders + labels stay visible around Germany.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    ).addTo(map);
    mapRef.current = map;
    window.__lm = map;

    fetch('/de_muni_v3.geojson')
      .then(r => r.json())
      .then(geojson => {
        const detected = detectColumns(geojson.features);
        coerceNumeric(geojson.features, detected);
        const withViz = detected.map(c => ({
          ...c,
          viz: buildColumnViz(geojson.features, c.key, c.numeric)
        }));

        dataRef.current = geojson;

        // Black backdrop under the choropleth layer: darkens the Germany
        // footprint (90% transparent) so surrounding basemap contrasts.
        L.geoJSON(geojson, {
          renderer: L.canvas({ padding: 0.3 }),
          style: () => ({
            color: '#000000',
            weight: 1,
            fillColor: '#000000',
            fillOpacity: 0.1
          })
        }).addTo(map);

        map.fitBounds(boundsOf(geojson), { padding: [10, 10] });
        setCols(withViz);
      })
      .catch(err => setError(String((err && err.stack) || err)));

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const geojson = dataRef.current;
    if (!map || !geojson || !cols) return;

    // Single selection: remove any old layer, add the chosen one.
    Object.values(layerRefs.current).forEach(l => map.removeLayer(l));
    layerRefs.current = {};

    if (!active) return;
    const col = cols.find(c => c.key === active);
    if (!col) return;
    const colorFor = col.numeric ? numericColorFor(col) : categoricalColorFor(col);
    const layer = L.geoJSON(geojson, {
      renderer: L.canvas({ padding: 0.3 }),
      style: feature => ({
        color: '#ffffff',
        weight: 0.4,
        fillColor: colorFor(feature),
        fillOpacity: 0.5
      }),
      onEachFeature: (feature, el) => {
        el.on('mousemove', e =>
          setHover({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, props: feature.properties })
        );
        el.on('mouseout', () => setHover(null));
      }
    });
    layer.addTo(map);
    layerRefs.current[active] = layer;
  }, [active, cols]);

  const onSelect = key => setActive(key);

  return (
    <div className="app">
      <div ref={mapEl} className="map" />
      <button
        className={`sidebar-toggle ${collapsed ? 'at-edge' : ''}`}
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Unroll legend' : 'Slide legend left'}
      >
        {collapsed ? '»' : '«'}
      </button>
      <div className={`sidebar-wrap ${collapsed ? 'collapsed' : ''}`}>
        <Sidebar cols={cols} active={active} onSelect={onSelect} />
      </div>
      {error && <pre className="error-panel">{error}</pre>}
      {hover && (
        <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="tooltip-title">{hover.props.note || hover.props.plz}</div>
          {activeRef.current && (
            <div className="tooltip-row">
              <span>{activeRef.current}</span>
              <span>{fmtValue(hover.props[activeRef.current])}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function boundsOf(geojson) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = coords => {
    if (typeof coords[0] === 'number') {
      if (coords[0] < minX) minX = coords[0];
      if (coords[0] > maxX) maxX = coords[0];
      if (coords[1] < minY) minY = coords[1];
      if (coords[1] > maxY) maxY = coords[1];
      return;
    }
    coords.forEach(walk);
  };
  geojson.features.forEach(f => {
    if (f.geometry && f.geometry.coordinates) walk(f.geometry.coordinates);
  });
  return [[minY, minX], [maxY, maxX]];
}

function numericColorFor(col) {
  const { breaks, colors } = col.viz.legend;
  return feature => {
    const v = feature.properties[col.key];
    if (v === null || v === undefined) return '#6f7a85';
    let i = 0;
    while (i < breaks.length && v >= breaks[i]) i++;
    return colors[i];
  };
}

function categoricalColorFor(col) {
  const colorMap = new Map(col.viz.legend.pairs);
  return feature => {
    const v = feature.properties[col.key];
    if (v === null || v === undefined || v === '') return '#6f7a85';
    return colorMap.get(String(v)) || '#8d959d';
  };
}

function fmtValue(v) {
  if (v === null || v === undefined || v === '') return '–';
  if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return '–';
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('de-DE');
    return String(Math.round(v * 100) / 100);
  }
  return String(v);
}
