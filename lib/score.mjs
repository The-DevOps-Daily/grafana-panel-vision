// Scoring one answer against the ground truth, with explicit tolerances.
//   peak value: within 5% of the true peak, after unit conversion (a unit from
//     another family, such as MiB on a latency panel, is wrong)
//   peak time:  within 5% of the panel's time range (3 min on 1h, 18 min on 6h,
//     72 min on 24h), compared as a clock time
//   threshold:  exact: yes / no / no threshold
//   top series: the answer is matched to the nearest legend name; correct if
//     that is the top series and at most 2 edits away (1 for names shorter than
//     8 characters); a tie between two names counts as no match
import { toBase } from './units.mjs';
import { TOL } from './panel.mjs';

const RANGE_MIN = { '1h': 60, '6h': 360, '24h': 1440 };

export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const norm = (s) => String(s ?? '').toLowerCase().trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ');

// The legend name an answer refers to: an exact or contained name first, then
// the nearest by edit distance (at most 2 edits).
export function matchSeries(answer, names) {
  const a = norm(answer);
  if (!a) return null;
  const exact = names.find((n) => norm(n) === a);
  if (exact) return exact;
  const contained = names.filter((n) => a.includes(norm(n)));
  if (contained.length === 1) return contained[0];
  if (contained.length > 1) return contained.sort((x, y) => y.length - x.length)[0];
  const ranked = names.map((n) => ({ n, d: editDistance(a, norm(n)) })).sort((x, y) => x.d - y.d);
  const [best, next] = ranked;
  const limit = best.n.length < 8 ? 1 : 2;
  if (best.d > limit) return null;
  if (next && next.d === best.d) return null; // a tie names no series
  return best.n;
}

export function parseClock(s) {
  const m = /(\d{1,2}):(\d{2})/.exec(String(s ?? ''));
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

export function normThreshold(v) {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  const s = norm(v);
  if (s === 'yes' || s === 'no') return s;
  if (!s || s === 'null' || s === 'none' || s === 'n/a' || s.includes('no threshold')) return 'no threshold';
  if (s.startsWith('yes')) return 'yes';
  if (s.startsWith('no')) return 'no';
  return `unknown:${s}`;
}

export function readPeak(unit, peak) {
  if (peak == null) return { ok: false, reason: 'no peak' };
  if (typeof peak === 'object') return toBase(unit, peak.value, peak.unit);
  return toBase(unit, peak, '');
}

export function scoreAnswer(truth, ans) {
  const out = { value: false, time: false, threshold: false, series: false };
  const detail = {};
  if (!ans || typeof ans !== 'object') return { ...out, all: false, detail: { error: 'no answer' } };
  const p = readPeak(truth.unit, ans.peak);
  if (p.ok) {
    detail.valueBase = p.base;
    detail.valueErr = (p.base - truth.peak.value) / truth.peak.value;
    out.value = Math.abs(detail.valueErr) <= TOL.valueRel;
  } else detail.valueReason = p.reason;
  const clock = parseClock(ans.peakTime);
  const tclock = parseClock(truth.peak.hhmm);
  if (clock != null) {
    let d = Math.abs(clock - tclock);
    d = Math.min(d, 1440 - d);
    detail.timeErrMin = d;
    out.time = d <= TOL.timeFrac * RANGE_MIN[truth.range];
  }
  detail.threshold = normThreshold(ans.thresholdCrossed);
  out.threshold = detail.threshold === truth.thresholdCrossed;
  detail.series = matchSeries(ans.topSeries, truth.series);
  out.series = detail.series === truth.topSeries;
  return { ...out, all: out.value && out.time && out.threshold && out.series, detail };
}

// Wilson 95% interval for k of n.
export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n;
  const den = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / den;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
