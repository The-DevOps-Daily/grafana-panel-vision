// Stage 1: render 100 Grafana-style panels to PNG with known ground truth.
// Writes data/panels/pNNN.png, data/truth.jsonl and data/alerts.jsonl.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { makePanel, renderSvg } from '../lib/panel.mjs';
import { formatValue } from '../lib/units.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const N = Number(process.argv[2] ?? 100);
const FONT = { fontFiles: [`${ROOT}fonts/Inter.ttf`], loadSystemFonts: false, defaultFontFamily: 'Inter' };

mkdirSync(`${ROOT}data/panels`, { recursive: true });
const truths = [];
const alerts = [];
for (let i = 0; i < N; i++) {
  const panel = makePanel(i);
  const svg = renderSvg(panel);
  const png = new Resvg(svg, { font: FONT, fitTo: { mode: 'original' } }).render().asPng();
  writeFileSync(`${ROOT}${panel.truth.file}`, png);
  truths.push(panel.truth);
  alerts.push(alertFor(panel));
}
writeFileSync(`${ROOT}data/truth.jsonl`, truths.map((t) => JSON.stringify(t)).join('\n') + '\n');
writeFileSync(`${ROOT}data/alerts.jsonl`, alerts.map((a) => JSON.stringify(a)).join('\n') + '\n');

// The alert that would carry this screenshot: a Grafana rule on the same query,
// reduced with max over the panel's range. On a stacked panel the rule is on the
// sum, so it has no series label. A panel with no drawn threshold still has a
// rule threshold; it is just not on the panel.
function alertFor({ spec, times, values, truth }) {
  const curve = times.map((_, i) => (spec.stacked ? values.reduce((a, s) => a + s[i], 0) : Math.max(...values.map((s) => s[i]))));
  const thr = truth.threshold ?? Number((truth.peak.value * 0.8).toPrecision(2));
  const firstOver = curve.findIndex((v) => v > thr);
  const firing = truth.peak.value > thr;
  return {
    id: truth.id,
    status: firing ? 'firing' : 'resolved',
    labels: { alertname: spec.title, ...(spec.stacked ? {} : { series: truth.topSeries }), severity: 'warning' },
    annotations: { summary: `${spec.title} ${firing ? 'above' : 'below'} ${formatValue(spec.unit, thr)}` },
    reducer: 'max',
    range: spec.range,
    unit: spec.unit,
    values: { B: truth.peak.value, C: firing ? 1 : 0 },
    threshold: thr,
    thresholdOnPanel: truth.threshold != null,
    startsAt: firing ? new Date(times[firstOver] * 1000).toISOString() : null,
    endsAt: truth.end,
    image: truth.file,
  };
}

const f = (k) => truths.filter((t) => t.features[k]).length;
console.log(`rendered ${truths.length} panels: log ${f('log')}, stacked ${f('stacked')}, 4+ series ${f('manySeries')}, small ${f('small')}, similar colours ${f('similarColours')}, threshold ${f('threshold')}, peak at edge ${f('peakAtEdge')}`);
