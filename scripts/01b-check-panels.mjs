// Stage 1 check: re-read every panel the way a reader would, from the drawn SVG
// only (tick label text and positions, the drawn lines), and compare with
// data/truth.jsonl. It does not use the generator's numbers, so a mismatch
// between what is drawn and what the truth says shows up here.
// Also checks that each committed PNG is byte-identical to a fresh render.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';
import { makePanel, renderSvg } from '../lib/panel.mjs';
import { toBase } from '../lib/units.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const FONT = { fontFiles: [`${ROOT}fonts/Inter.ttf`], loadSystemFonts: false, defaultFontFamily: 'Inter' };
const truths = readFileSync(`${ROOT}data/truth.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const sha = (b) => createHash('sha256').update(b).digest('hex');

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
};

const problems = [];
const rows = [];
let stackedChecked = 0;
truths.forEach((t, i) => {
  const panel = makePanel(i);
  const svg = renderSvg(panel);
  const png = new Resvg(svg, { font: FONT, fitTo: { mode: 'original' } }).render().asPng();
  const onDisk = readFileSync(`${ROOT}${t.file}`);
  if (sha(png) !== sha(onDisk)) problems.push(`${t.id}: committed PNG differs from a fresh render`);

  const lines = svg.split('\n');
  // Y tick labels: right-aligned text left of the plot. Label baseline is tick y + 4.
  const yTicks = lines
    .filter((l) => l.startsWith('<text') && l.includes('text-anchor="end"'))
    .map((l) => {
      const label = />([^<]*)<\/text>/.exec(l)[1];
      const parsed = toBase(t.unit, label, '');
      if (!parsed.ok) problems.push(`${t.id}: tick label "${label}" does not parse (${parsed.reason})`);
      return { y: Number(attr(l, 'y')) - 4, v: parsed.base };
    });
  const xTicks = lines
    .filter((l) => l.startsWith('<text') && l.includes('text-anchor="middle"'))
    .map((l) => ({ x: Number(attr(l, 'x')), hhmm: />([^<]*)<\/text>/.exec(l)[1] }));

  // Value at a pixel row, interpolated between the two nearest tick labels.
  const valueAt = (y) => {
    const s = [...yTicks].sort((a, b) => b.y - a.y);
    let lo = s[0];
    let hi = s[1];
    for (let k = 0; k < s.length - 1; k++) if (y <= s[k].y && y >= s[k + 1].y) { lo = s[k]; hi = s[k + 1]; }
    const f = (lo.y - y) / (lo.y - hi.y);
    if (t.log) return Math.exp(Math.log(lo.v) + f * (Math.log(hi.v) - Math.log(lo.v)));
    return lo.v + f * (hi.v - lo.v);
  };
  // Time at a pixel column, from two x labels (minutes, wrapping at midnight).
  const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const timeAt = (x) => {
    const [a, b] = xTicks;
    let d = toMin(b.hhmm) - toMin(a.hhmm);
    if (d <= 0) d += 1440;
    const m = toMin(a.hhmm) + ((x - a.x) / (b.x - a.x)) * d;
    return ((Math.round(m) % 1440) + 1440) % 1440;
  };

  // The drawn top edge: on a stacked panel the last band's line, otherwise the
  // highest point over all lines.
  const polylines = lines.filter((l) => l.startsWith('<polyline')).map((l) => ({
    colour: attr(l, 'stroke'),
    pts: attr(l, 'points').split(' ').map((p) => p.split(',').map(Number)),
  }));
  const candidates = t.stacked ? [polylines[polylines.length - 1]] : polylines;
  let best = null;
  for (const pl of candidates) for (const [x, y] of pl.pts) if (!best || y < best.y) best = { x, y, colour: pl.colour };
  const readPeak = valueAt(best.y);
  const readTime = timeAt(best.x);
  const truthMin = toMin(t.peak.hhmm);
  let dt = Math.abs(readTime - truthMin);
  dt = Math.min(dt, 1440 - dt);
  const relErr = Math.abs(readPeak - t.peak.value) / t.peak.value;
  if (relErr > 0.005) problems.push(`${t.id}: drawn peak reads ${readPeak.toPrecision(5)}, truth ${t.peak.value.toPrecision(5)} (${(relErr * 100).toFixed(2)}%)`);
  if (dt > 1) problems.push(`${t.id}: drawn peak at ${readTime} min, truth ${t.peak.hhmm}`);

  // Top series on a line panel: the colour of the highest drawn point, mapped
  // through the legend swatches.
  const legend = [];
  lines.forEach((l, k) => {
    if (l.startsWith('<rect') && attr(l, 'width') === '14' && attr(l, 'height') === '4') {
      legend.push({ colour: attr(l, 'fill'), name: />([^<]*)<\/text>/.exec(lines[k + 1])[1].replace(/&amp;/g, '&') });
    }
  });
  if (legend.length !== t.series.length) problems.push(`${t.id}: legend shows ${legend.length} of ${t.series.length} series`);
  if (!t.stacked) {
    const name = legend.find((g) => g.colour === best.colour)?.name;
    if (name !== t.topSeries) problems.push(`${t.id}: highest drawn line is ${name}, truth ${t.topSeries}`);
  } else {
    // Stacked: at the column of the drawn peak, each band's own height is its
    // upper line minus the line below it. The thickest band, mapped through the
    // legend by its line colour, must be the truth's top series.
    const k = polylines[polylines.length - 1].pts.findIndex(([x, y]) => x === best.x && y === best.y);
    let below = 0;
    let thick = null;
    for (const pl of polylines) {
      const v = valueAt(pl.pts[k][1]);
      if (!thick || v - below > thick.h) thick = { h: v - below, colour: pl.colour };
      below = v;
    }
    const name = legend.find((g) => g.colour === thick.colour)?.name;
    stackedChecked++;
    if (name !== t.topSeries) problems.push(`${t.id}: thickest drawn band at the peak is ${name}, truth ${t.topSeries}`);
  }

  // Threshold: the dashed line or the top of the red region.
  const thrLine = lines.find((l) => l.includes('stroke-dasharray'));
  const thrRegion = lines.find((l) => l.startsWith('<rect') && l.includes('#F2495C'));
  if ((thrLine || thrRegion) && t.threshold == null) problems.push(`${t.id}: threshold drawn but truth has none`);
  if (!(thrLine || thrRegion) && t.threshold != null) problems.push(`${t.id}: truth has a threshold that is not drawn`);
  let readThr = null;
  if (thrLine) readThr = valueAt(Number(attr(thrLine, 'y1')));
  else if (thrRegion) readThr = valueAt(Number(attr(thrRegion, 'y')) + Number(attr(thrRegion, 'height')));
  if (readThr != null) {
    const e = Math.abs(readThr - t.threshold) / t.threshold;
    if (e > 0.005) problems.push(`${t.id}: drawn threshold reads ${readThr.toPrecision(4)}, truth ${t.threshold}`);
    const crossed = readPeak > readThr ? 'yes' : 'no';
    if (crossed !== t.thresholdCrossed) problems.push(`${t.id}: drawn crossing ${crossed}, truth ${t.thresholdCrossed}`);
  }
  // Nothing drawn above the top tick (a clipped peak would read as the axis max).
  if (best.y < Math.min(...yTicks.map((k) => k.y)) - 0.5) problems.push(`${t.id}: peak drawn above the top tick`);
  rows.push({ id: t.id, readPeak, truthPeak: t.peak.value, relErr, readTime, truthTime: t.peak.hhmm, readThr, truthThr: t.threshold });
});

const out = [`checked ${truths.length} panels from the drawn SVG; problems: ${problems.length}`, ...problems];
const worst = [...rows].sort((a, b) => b.relErr - a.relErr)[0];
out.push(`largest peak read-back error: ${worst.id} ${(worst.relErr * 100).toFixed(3)}%`);
out.push(`top series checked from line colours on ${truths.length - stackedChecked} line panels and from band heights on ${stackedChecked} stacked panels`);
writeFileSync(`${ROOT}results/panel-check.txt`, out.join('\n') + '\n');
console.log(out.join('\n'));
if (problems.length) process.exit(1);
