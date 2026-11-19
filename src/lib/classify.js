const NUMERIC_RAMP = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
const CATEGORICAL_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4',
  '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff'
];
const NULL_COLOR = '#d5d8dc';
const OTHER_COLOR = '#95a5a6';
const NULL_KEY = '__null__';

// "NA" marks missing values in the source data, same as null.
function isMissing(v) {
  return (
    v === null ||
    v === undefined ||
    v === '' ||
    (typeof v === 'string' && v.trim().toUpperCase() === 'NA')
  );
}

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (isMissing(v)) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Postal codes are digit-only but coloring by them is meaningless.
const NON_NUMERIC_KEYS = new Set(['plz']);

function detectColumns(features) {
  const keys = new Set();
  features.forEach(f => {
    Object.keys(f.properties || {}).forEach(k => keys.add(k));
  });

  const cols = [];
  keys.forEach(key => {
    let total = 0;
    let numeric = 0;
    features.forEach(f => {
      const v = (f.properties || {})[key];
      if (isMissing(v)) return;
      total++;
      if (toNumber(v) !== null) numeric++;
    });
    const isNumeric = total > 0 && numeric / total >= 0.9 && !NON_NUMERIC_KEYS.has(key);
    cols.push({ key, numeric: isNumeric });
  });

  cols.sort((a, b) => a.key.localeCompare(b.key));
  return cols;
}

function coerceNumeric(features, cols) {
  const numericKeys = cols.filter(c => c.numeric).map(c => c.key);
  features.forEach(f => {
    const p = f.properties || (f.properties = {});
    numericKeys.forEach(k => {
      p[k] = toNumber(p[k]);
    });
  });
}

function quantileBreaks(sorted, k) {
  const breaks = [];
  for (let i = 1; i < k; i++) {
    const idx = Math.floor((i / k) * (sorted.length - 1));
    const b = sorted[idx];
    if (!breaks.length || breaks[breaks.length - 1] !== b) breaks.push(b);
  }
  return breaks;
}

function rampColors(classCount) {
  if (classCount === 1) return [NUMERIC_RAMP[2]];
  const colors = [];
  for (let i = 0; i < classCount; i++) {
    const t = i / (classCount - 1);
    const pos = t * (NUMERIC_RAMP.length - 1);
    colors.push(NUMERIC_RAMP[Math.round(pos)]);
  }
  return colors;
}

function buildColumnViz(features, key, numeric) {
  if (numeric) {
    const values = features
      .map(f => (f.properties || {})[key])
      .filter(v => v !== null && v !== undefined);
    const sorted = values.slice().sort((a, b) => a - b);
    const breaks = quantileBreaks(sorted, 5);
    const colors = rampColors(breaks.length + 1);
    const expression = ['step', ['get', key], colors[0]];
    for (let i = 0; i < breaks.length; i++) {
      expression.push(breaks[i], colors[i + 1]);
    }
    return {
      expression,
      legend: {
        type: 'num',
        min: sorted.length ? sorted[0] : null,
        max: sorted.length ? sorted[sorted.length - 1] : null,
        colors,
        breaks
      }
    };
  }

  const counts = new Map();
  features.forEach(f => {
    const v = (f.properties || {})[key];
    if (isMissing(v)) return;
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, CATEGORICAL_PALETTE.length);

  const valueColor = new Map(top.map(([v], i) => [v, CATEGORICAL_PALETTE[i]]));
  const expression = ['match', ['coalesce', ['get', key], NULL_KEY]];
  top.forEach(([v], i) => expression.push(v, CATEGORICAL_PALETTE[i]));
  expression.push(NULL_KEY, NULL_COLOR, OTHER_COLOR);

  return {
    expression,
    legend: {
      type: 'cat',
      pairs: top.map(([v], i) => [v, CATEGORICAL_PALETTE[i]]),
      distinct: counts.size
    }
  };
}

export { detectColumns, coerceNumeric, buildColumnViz, NULL_COLOR, OTHER_COLOR };
