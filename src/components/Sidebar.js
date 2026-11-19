import React from 'react';

function fmt(v) {
  if (v === null || v === undefined) return '–';
  if (typeof v !== 'number') return String(v);
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('de-DE');
  return String(Math.round(v * 100) / 100);
}

// Rows hidden from the selector; data stays in tooltips.
const HIDDEN_KEYS = new Set([
  'electricityBasePrice',
  'electricityKwhPrice',
  'floor',
  'heatingCosts',
  'lastRefurbish',
  'livingSpace',
  'livingSpaceRange',
  'noParkSpaces',
  'noRooms',
  'noRoomsRange',
  'numberOfFloors',
  'qkm',
  'serviceCharge',
  'thermalChar',
  'yearConstructedRange'
]);

// Plain-language explanation shown under each option name.
const DESCRIPTIONS = {
  baseRent: 'Average base rent (Kaltmiete) per postal code, € per month',
  baseRentRange: 'Base rent grouped into 1–5 range categories',
  einwohner: 'Number of residents living in the postal code area',
  pricetrend: 'Forecast rent/price trend per year, in %',
  totalRent: 'Average total rent (Warmmiete incl. utilities) per postal code, € per month',
  yearConstructed: 'Average construction year of buildings in the postal code area'
};

function MiniLegend({ viz }) {
  const legend = viz && viz.legend;
  if (!legend || legend.min === null) return null;

  if (legend.type === 'num') {
    return (
      <div className="legend-num">
        <div
          className="legend-bar"
          style={{ background: `linear-gradient(to right, ${legend.colors.join(',')})` }}
        />
        <div className="legend-labels">
          <span>{fmt(legend.min)}</span>
          <span>{fmt(legend.max)}</span>
        </div>
      </div>
    );
  }

  const shown = legend.pairs.slice(0, 8);
  return (
    <div className="legend-cat">
      {shown.map(([v, c]) => (
        <span key={v} className="chip">
          <i style={{ background: c }} />
          {String(v)}
        </span>
      ))}
      {legend.distinct > shown.length && (
        <span className="chip chip-more">+{legend.distinct - shown.length} more</span>
      )}
    </div>
  );
}

function ColumnRow({ col, active, onSelect }) {
  const selected = active === col.key;
  return (
    <div className={`col-row ${selected ? 'on' : ''}`}>
      <label>
        <input
          type="radio"
          name="col-select"
          checked={selected}
          onChange={() => onSelect(col.key)}
        />
        <span className="col-name">{col.key}</span>
        <span className="col-type">{col.numeric ? 'num' : 'cat'}</span>
      </label>
      {DESCRIPTIONS[col.key] && (
        <div className="col-desc">{DESCRIPTIONS[col.key]}</div>
      )}
      {selected && <MiniLegend viz={col.viz} />}
    </div>
  );
}

export default function Sidebar({ cols, active, onSelect }) {
  if (!cols) {
    return (
      <aside className="sidebar">
        <h1>Germany Rental market 2024</h1>
        <p className="hint">Loading data…</p>
      </aside>
    );
  }

  const numeric = cols.filter(c => c.numeric && !HIDDEN_KEYS.has(c.key));

  return (
    <aside className="sidebar">
      <h1>Germany Rental market 2024</h1>
      <p className="hint">
        Select option to classify rented homes by postal codes (PLZ)
      </p>
      <h2>Classify post codes</h2>
      {numeric.map(col => (
        <ColumnRow key={col.key} col={col} active={active} onSelect={onSelect} />
      ))}
    </aside>
  );
}
