// Grafana-style time-series panels: a seeded spec, the data, the ground truth,
// and an SVG drawn to look like a Grafana dark-theme panel. Not real Grafana.
import { mulberry32, pick, between, logBetween, gauss, shuffle } from './rand.mjs';
import { formatValue, BYTES } from './units.mjs';

export const THEME = {
  panelBg: '#181b1f',
  border: 'rgba(204,204,220,0.12)',
  text: '#ccccdc',
  axisText: 'rgba(204,204,220,0.75)',
  grid: 'rgba(240,250,255,0.09)',
  thresholdRed: '#F2495C',
  thresholdGreen: '#73BF69',
  font: 'Inter',
};

// Grafana's classic palette, in its own order.
const CLASSIC = ['#7EB26D', '#EAB839', '#6ED0E0', '#EF843C', '#E24D42', '#1F78C1', '#BA43A9', '#705DA0'];
// Shades of one Grafana named colour, for the "similar colours" panels.
const SIMILAR = [
  ['#1F60C4', '#3274D9', '#5794F2', '#8AB8FF', '#C0D8FF'],
  ['#37872D', '#56A64B', '#73BF69', '#96D98D', '#C8F2C2'],
  ['#E0752D', '#FA6400', '#FF780A', '#FF9830', '#FFB357'],
];

const KINDS = {
  ms: {
    titles: ['API latency p99', 'Checkout latency p95', 'Request duration p99', 'DB query time p95', 'Upstream response time'],
    names: ['checkout', 'cart', 'search', 'auth', 'payments', 'inventory', 'orders', 'gateway'],
    peak: [60, 4000],
  },
  percent: {
    titles: ['CPU usage', 'Memory utilisation', 'Disk usage /var', 'Error ratio', 'Connection pool used'],
    names: ['node-a1', 'node-b2', 'node-c3', 'node-d4', 'node-e5', 'node-f6'],
    peak: [18, 97],
  },
  reqps: {
    titles: ['HTTP requests', 'Ingress request rate', 'gRPC calls', 'Queue consumer rate', 'API throughput'],
    names: ['GET /api/orders', 'POST /api/cart', 'GET /health', 'GET /api/search', 'POST /login', 'GET /static'],
    peak: [40, 25000],
  },
  bytes: {
    titles: ['Memory working set', 'Container RSS', 'JVM heap used', 'Page cache', 'Redis used memory'],
    names: ['web-7d9f-x2k4', 'web-7d9f-q8m1', 'worker-5c6b-z9p2', 'worker-5c6b-h3t7', 'api-66f4-n1r8', 'api-66f4-w5d0'],
    peak: [80 * BYTES.MIB, 12 * BYTES.GIB],
  },
};

const RANGES = { '1h': { sec: 3600, step: 30 }, '6h': { sec: 21600, step: 120 }, '24h': { sec: 86400, step: 300 } };
const SIZES = [
  { w: 1000, h: 500, small: false },
  { w: 800, h: 400, small: false },
  { w: 800, h: 360, small: false },
  { w: 600, h: 320, small: false },
  { w: 420, h: 230, small: true },
  { w: 360, h: 200, small: true },
];

// Ground truth tolerances, shared with the scorer.
export const TOL = { valueRel: 0.05, timeFrac: 0.05 };

// --- spec -------------------------------------------------------------------

function drawSpec(rnd, index) {
  const unit = pick(rnd, Object.keys(KINDS));
  const kind = KINDS[unit];
  const size = rnd() < 0.22 ? pick(rnd, SIZES.filter((s) => s.small)) : pick(rnd, SIZES.filter((s) => !s.small));
  const nSeries = 1 + Math.floor(rnd() * 5);
  const canStack = unit !== 'ms' && nSeries >= 2;
  const stacked = canStack && rnd() < 0.3;
  const canLog = unit !== 'percent' && !stacked;
  const log = canLog && rnd() < 0.3;
  const similar = nSeries >= 2 && rnd() < 0.3;
  const colours = similar ? shuffle(rnd, pick(rnd, SIMILAR)).slice(0, nSeries) : CLASSIC.slice(0, nSeries);
  const names = shuffle(rnd, kind.names).slice(0, nSeries);
  const rangeKey = pick(rnd, Object.keys(RANGES));
  const { sec, step } = RANGES[rangeKey];
  // End time somewhere in October 2026, aligned to the step, UTC.
  const endBase = Date.UTC(2026, 9, 1) / 1000;
  const end = Math.floor((endBase + Math.floor(rnd() * 30 * 86400)) / step) * step;
  const peakAt = rnd() < 0.25 ? 'edge' : pick(rnd, ['early', 'middle', 'late']);
  const peakFrac = peakAt === 'edge' ? between(rnd, 0.975, 1) : peakAt === 'early' ? between(rnd, 0.06, 0.33) : peakAt === 'middle' ? between(rnd, 0.33, 0.66) : between(rnd, 0.66, 0.94);
  const noise = pick(rnd, ['low', 'medium', 'high']);
  let peak = unit === 'percent' ? between(rnd, ...kind.peak) : logBetween(rnd, ...kind.peak);
  if (unit === 'percent' && stacked) peak = between(rnd, 30, 95);
  const hasThreshold = rnd() < 0.6;
  const thresholdStyle = hasThreshold ? pick(rnd, ['line', 'region', 'line+region']) : null;
  const crossedWanted = rnd() < 0.55;
  const fill = stacked ? between(rnd, 0.35, 0.6) : pick(rnd, [0, 0, 0.1, 0.2]);
  const lineWidth = pick(rnd, [1, 1, 2]);
  return {
    id: `p${String(index + 1).padStart(3, '0')}`,
    unit, title: pick(rnd, kind.titles), width: size.w, height: size.h, small: size.small,
    series: names.map((name, i) => ({ name, colour: colours[i] })),
    stacked, log, logBase: unit === 'bytes' ? 2 : 10, similarColours: similar,
    range: rangeKey, rangeSec: sec, stepSec: step, end, start: end - sec,
    peakAt, peakFrac, noise, targetPeak: peak, thresholdStyle, crossedWanted, fill, lineWidth,
    peakWidthFrac: between(rnd, 0.01, 0.045),
  };
}

const NOISE = { low: 0.015, medium: 0.05, high: 0.11 };

function buildData(rnd, spec) {
  const n = Math.round(spec.rangeSec / spec.stepSec) + 1;
  const times = Array.from({ length: n }, (_, i) => spec.start + i * spec.stepSec);
  const top = Math.floor(rnd() * spec.series.length);
  const P = spec.targetPeak;
  const nz = NOISE[spec.noise];
  const values = spec.series.map((s, si) => {
    const isTop = si === top;
    // Others sit lower; on a stacked panel the top series has the largest own share.
    const base = isTop ? between(rnd, 0.25, 0.5) : between(rnd, 0.08, 0.42);
    const share = spec.stacked ? (isTop ? 1 : between(rnd, 0.25, 0.6)) : 1;
    const amp = between(rnd, 0.03, 0.12);
    const period = between(rnd, 0.3, 1.5);
    const phase = between(rnd, 0, 2 * Math.PI);
    const out = [];
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      let v = base * (1 + amp * Math.sin((2 * Math.PI * f) / period + phase));
      if (isTop) {
        const d = (f - spec.peakFrac) / spec.peakWidthFrac;
        v += (1 - base) * Math.exp(-0.5 * d * d);
      }
      v *= 1 + nz * gauss(rnd);
      out.push(Math.max(v, 0.004) * P * share);
    }
    return out;
  });
  if (spec.unit === 'percent' && !spec.stacked) for (const s of values) for (let i = 0; i < n; i++) s[i] = Math.min(s[i], 100);
  return { times, values, top };
}

// The curve the eye reads against the y-axis: the stack's top edge, or the
// highest line at each time.
function visibleCurve(spec, values) {
  const n = values[0].length;
  return Array.from({ length: n }, (_, i) => (spec.stacked ? values.reduce((a, s) => a + s[i], 0) : Math.max(...values.map((s) => s[i]))));
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return m * p;
}

function yAxis(spec, maxNeeded, minData, plotH) {
  if (spec.log) {
    const b = spec.logBase;
    const lo = Math.floor(Math.log(minData) / Math.log(b));
    const hi = Math.ceil(Math.log(maxNeeded * 1.02) / Math.log(b));
    const span = hi - lo;
    const every = Math.max(1, Math.ceil(span / Math.max(2, Math.floor(plotH / 32))));
    const ticks = [];
    for (let e = lo; e <= hi; e += every) ticks.push(b ** e);
    return { min: b ** lo, max: b ** hi, ticks, log: true, base: b };
  }
  const target = Math.max(2, Math.min(6, Math.floor(plotH / 42)));
  let scale = 1;
  if (spec.unit === 'bytes') scale = maxNeeded >= BYTES.GIB ? BYTES.GIB : maxNeeded >= BYTES.MIB ? BYTES.MIB : BYTES.KIB;
  const step = niceStep(maxNeeded / scale / target) * scale;
  let max = Math.ceil((maxNeeded * 1.02) / step) * step;
  if (spec.unit === 'percent' && max > 100 && maxNeeded <= 100) max = 100;
  const ticks = [];
  for (let v = 0; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toPrecision(12)));
  return { min: 0, max, ticks, log: false };
}

export function makePanel(index) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rnd = mulberry32((0x5eed0000 + index * 9973 + attempt * 104729) >>> 0);
    const spec = drawSpec(rnd, index);
    const { times, values, top } = buildData(rnd, spec);
    const curve = visibleCurve(spec, values);
    const peakIdx = curve.indexOf(Math.max(...curve));
    const peak = curve[peakIdx];
    const ownPeaks = values.map((s) => Math.max(...s));
    const topSeries = ownPeaks.indexOf(Math.max(...ownPeaks));
    const reasons = [];
    if (topSeries !== top) reasons.push('top series moved');
    // The highest series must be clear: 15% above the next one.
    const sorted = [...ownPeaks].sort((a, b) => b - a);
    if (sorted.length > 1 && sorted[0] < 1.15 * sorted[1]) reasons.push('top series not clear');
    // On a line panel the peak is the top series' own peak.
    if (!spec.stacked && values[topSeries][peakIdx] !== peak) reasons.push('peak not on top series');
    // On a stacked panel the top series must also have the thickest band at the peak.
    if (spec.stacked) {
      const atPeak = values.map((s) => s[peakIdx]);
      if (atPeak.indexOf(Math.max(...atPeak)) !== topSeries) reasons.push('thickest band at peak is not the top series');
    }
    // The peak time must be clear: every point within 12% of the peak sits
    // inside half the time tolerance.
    const tolSec = TOL.timeFrac * spec.rangeSec;
    for (let i = 0; i < curve.length; i++) {
      if (curve[i] >= 0.88 * peak && Math.abs(times[i] - times[peakIdx]) > tolSec / 2) { reasons.push('peak time not clear'); break; }
    }
    let threshold = null;
    if (spec.thresholdStyle) {
      threshold = niceThreshold(spec, spec.crossedWanted ? peak * between(rnd, 0.55, 0.85) : peak * between(rnd, 1.15, 1.45));
      if (Math.abs(threshold - peak) < 0.1 * peak) reasons.push('threshold too close to peak');
      if (spec.unit === 'percent' && threshold > 100) reasons.push('threshold over 100%');
    }
    if (spec.unit === 'percent' && peak > 100) reasons.push('percent over 100');
    if (reasons.length) continue;
    const minData = Math.min(...values.flat());
    const layout = computeLayout(spec);
    if (layout.plot.h < 60) continue;
    const axis = yAxis(spec, Math.max(peak, threshold ?? 0), minData, layout.plot.h);
    if (peak > axis.max || (threshold != null && threshold > axis.max)) continue;
    const t = new Date(times[peakIdx] * 1000);
    const truth = {
      id: spec.id,
      file: `data/panels/${spec.id}.png`,
      unit: spec.unit,
      title: spec.title,
      width: spec.width,
      height: spec.height,
      series: spec.series.map((s) => s.name),
      stacked: spec.stacked,
      log: spec.log,
      similarColours: spec.similarColours,
      range: spec.range,
      start: new Date(spec.start * 1000).toISOString(),
      end: new Date(spec.end * 1000).toISOString(),
      peak: { value: peak, display: formatValue(spec.unit, peak), time: t.toISOString(), hhmm: t.toISOString().slice(11, 16) },
      topSeries: spec.series[topSeries].name,
      threshold,
      thresholdStyle: spec.thresholdStyle,
      thresholdCrossed: threshold == null ? 'no threshold' : peak > threshold ? 'yes' : 'no',
      axis: { min: axis.min, max: axis.max, log: axis.log, ticks: axis.ticks.map((v) => formatValue(spec.unit, v)) },
      features: {
        log: spec.log, stacked: spec.stacked, manySeries: spec.series.length >= 4, small: spec.small,
        similarColours: spec.similarColours, threshold: threshold != null, peakAtEdge: spec.peakAt === 'edge',
        noise: spec.noise, range: spec.range, nSeries: spec.series.length,
      },
      seedAttempt: attempt,
    };
    return { spec, times, values, axis, layout, truth };
  }
  throw new Error(`panel ${index}: no valid spec in 200 attempts`);
}

function niceThreshold(spec, v) {
  // Thresholds people type: two significant figures in the display unit.
  if (spec.unit === 'bytes') {
    const s = v >= BYTES.GIB ? BYTES.GIB : BYTES.MIB;
    return Number((v / s).toPrecision(2)) * s;
  }
  return Number(v.toPrecision(2));
}

// --- layout and SVG ---------------------------------------------------------

const charW = (px) => px * 0.56;

function legendRows(spec, innerW) {
  const rows = [[]];
  let x = 0;
  for (const s of spec.series) {
    const w = 20 + s.name.length * charW(12) + 16;
    if (x + w > innerW && rows[rows.length - 1].length) { rows.push([]); x = 0; }
    rows[rows.length - 1].push({ ...s, x });
    x += w;
  }
  return rows;
}

function computeLayout(spec) {
  const pad = 8;
  const headerH = 32;
  const rows = legendRows(spec, spec.width - 2 * pad);
  const legendH = rows.length * 20 + 4;
  const xLabelH = 20;
  // Widest y label: estimate from the unit's longest likely label.
  const sample = { ms: '1500 ms', percent: '100%', reqps: '25K req/s', bytes: '512 MiB' }[spec.unit];
  const yLabelW = Math.ceil(sample.length * charW(12)) + 6;
  const plot = { x: pad + yLabelW + 8, y: headerH + 4 };
  plot.w = spec.width - plot.x - 16;
  plot.h = spec.height - plot.y - xLabelH - legendH - pad;
  return { pad, headerH, rows, legendH, xLabelH, plot, legendY: spec.height - legendH - pad + 14 };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function yToPx(axis, plot, v) {
  const f = axis.log
    ? (Math.log(v) - Math.log(axis.min)) / (Math.log(axis.max) - Math.log(axis.min))
    : (v - axis.min) / (axis.max - axis.min);
  return plot.y + plot.h * (1 - f);
}

export function xToPx(spec, plot, t) {
  return plot.x + ((t - spec.start) / spec.rangeSec) * plot.w;
}

function timeTicks(spec, plot) {
  const steps = [60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 14400, 21600, 43200];
  const step = steps.find((s) => (s / spec.rangeSec) * plot.w >= 64) ?? 43200;
  const first = Math.ceil(spec.start / step) * step;
  const out = [];
  for (let t = first; t <= spec.end; t += step) out.push(t);
  return out;
}

const hhmm = (t) => new Date(t * 1000).toISOString().slice(11, 16);

export function renderSvg(panel) {
  const { spec, times, values, axis, layout } = panel;
  const { plot } = layout;
  const W = spec.width;
  const H = spec.height;
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${THEME.font}">`);
  o.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2" fill="${THEME.panelBg}" stroke="${THEME.border}"/>`);
  o.push(`<text x="${layout.pad}" y="21" font-size="14" font-weight="500" fill="${THEME.text}">${esc(spec.title)}</text>`);

  // Threshold regions sit under the grid and the series.
  const thr = panel.truth.threshold;
  if (thr != null && spec.thresholdStyle.includes('region')) {
    const ty = yToPx(axis, plot, thr);
    o.push(`<rect x="${plot.x}" y="${ty}" width="${plot.w}" height="${plot.y + plot.h - ty}" fill="${THEME.thresholdGreen}" fill-opacity="0.08"/>`);
    o.push(`<rect x="${plot.x}" y="${plot.y}" width="${plot.w}" height="${ty - plot.y}" fill="${THEME.thresholdRed}" fill-opacity="0.15"/>`);
  }

  // Grid and y labels.
  for (const v of axis.ticks) {
    const y = yToPx(axis, plot, v);
    o.push(`<line x1="${plot.x}" x2="${plot.x + plot.w}" y1="${y}" y2="${y}" stroke="${THEME.grid}"/>`);
    o.push(`<text x="${plot.x - 6}" y="${y + 4}" font-size="12" text-anchor="end" fill="${THEME.axisText}">${esc(formatValue(spec.unit, v))}</text>`);
  }
  for (const t of timeTicks(spec, plot)) {
    const x = xToPx(spec, plot, t);
    o.push(`<line x1="${x}" x2="${x}" y1="${plot.y}" y2="${plot.y + plot.h}" stroke="${THEME.grid}"/>`);
    const label = hhmm(t);
    const half = (label.length * charW(12)) / 2;
    if (x - half >= plot.x - 4 && x + half <= W - 4) {
      o.push(`<text x="${x}" y="${plot.y + plot.h + 15}" font-size="12" text-anchor="middle" fill="${THEME.axisText}">${label}</text>`);
    }
  }

  // Series. Clip to the plot area like Grafana does.
  o.push(`<clipPath id="plot"><rect x="${plot.x}" y="${plot.y - 2}" width="${plot.w}" height="${plot.h + 2}"/></clipPath>`);
  o.push('<g clip-path="url(#plot)">');
  const pts = (arr) => arr.map((v, i) => `${xToPx(spec, plot, times[i]).toFixed(2)},${yToPx(axis, plot, v).toFixed(2)}`);
  if (spec.stacked) {
    const cum = [];
    let below = times.map(() => 0);
    values.forEach((s, si) => {
      const above = s.map((v, i) => below[i] + v);
      const upper = pts(above);
      const lower = below.map((v, i) => `${xToPx(spec, plot, times[i]).toFixed(2)},${(v === 0 ? plot.y + plot.h : yToPx(axis, plot, v)).toFixed(2)}`).reverse();
      cum.push({ upper, colour: spec.series[si].colour, fillPts: [...upper, ...lower] });
      below = above;
    });
    for (const c of cum) o.push(`<polygon points="${c.fillPts.join(' ')}" fill="${c.colour}" fill-opacity="${spec.fill.toFixed(2)}"/>`);
    for (const c of cum) o.push(`<polyline points="${c.upper.join(' ')}" fill="none" stroke="${c.colour}" stroke-width="${spec.lineWidth}" stroke-linejoin="round"/>`);
  } else {
    values.forEach((s, si) => {
      const p = pts(s);
      const c = spec.series[si].colour;
      if (spec.fill > 0) {
        const baseY = (plot.y + plot.h).toFixed(2);
        const first = xToPx(spec, plot, times[0]).toFixed(2);
        const last = xToPx(spec, plot, times[times.length - 1]).toFixed(2);
        o.push(`<polygon points="${first},${baseY} ${p.join(' ')} ${last},${baseY}" fill="${c}" fill-opacity="${spec.fill}"/>`);
      }
      o.push(`<polyline points="${p.join(' ')}" fill="none" stroke="${c}" stroke-width="${spec.lineWidth}" stroke-linejoin="round"/>`);
    });
  }
  o.push('</g>');

  if (thr != null && spec.thresholdStyle.includes('line')) {
    const ty = yToPx(axis, plot, thr);
    o.push(`<line x1="${plot.x}" x2="${plot.x + plot.w}" y1="${ty}" y2="${ty}" stroke="${THEME.thresholdRed}" stroke-width="1" stroke-dasharray="10 10"/>`);
  }

  // Legend: list mode, names only (no Max/Last columns).
  layout.rows.forEach((row, ri) => {
    const y = layout.legendY + ri * 20;
    for (const it of row) {
      const x = layout.pad + it.x;
      o.push(`<rect x="${x}" y="${y - 6}" width="14" height="4" rx="1" fill="${it.colour}"/>`);
      o.push(`<text x="${x + 20}" y="${y}" font-size="12" fill="${THEME.text}">${esc(it.name)}</text>`);
    }
  });
  o.push('</svg>');
  return o.join('\n');
}
