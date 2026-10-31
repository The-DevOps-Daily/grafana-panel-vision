// Tick label formatting (Grafana style) and parsing of a model's value + unit.
// Base units: ms, percent, reqps, bytes.

const KIB = 1024;
const MIB = 1024 ** 2;
const GIB = 1024 ** 3;
const TIB = 1024 ** 4;

export function trim(x, digits = 2) {
  const s = Number(x).toFixed(digits);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

export function formatValue(unit, v, digits = 2) {
  if (unit === 'ms') {
    if (v === 0) return '0 ms';
    if (Math.abs(v) >= 1000) return `${trim(v / 1000, digits)} s`;
    if (Math.abs(v) < 1) return `${trim(v * 1000, digits)} µs`;
    return `${trim(v, digits)} ms`;
  }
  if (unit === 'percent') return `${trim(v, digits)}%`;
  if (unit === 'reqps') {
    if (Math.abs(v) >= 1e6) return `${trim(v / 1e6, digits)}M req/s`;
    if (Math.abs(v) >= 1000) return `${trim(v / 1000, digits)}K req/s`;
    return `${trim(v, digits)} req/s`;
  }
  if (unit === 'bytes') {
    if (v === 0) return '0 B';
    const a = Math.abs(v);
    if (a >= TIB) return `${trim(v / TIB, digits)} TiB`;
    if (a >= GIB) return `${trim(v / GIB, digits)} GiB`;
    if (a >= MIB) return `${trim(v / MIB, digits)} MiB`;
    if (a >= KIB) return `${trim(v / KIB, digits)} KiB`;
    return `${trim(v, digits)} B`;
  }
  throw new Error(`unknown unit ${unit}`);
}

// Multipliers to the base unit, by family. Keys are lower case with spaces removed.
const FAMILIES = {
  ms: { ms: 1, millisecond: 1, milliseconds: 1, msec: 1, s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000, 'µs': 0.001, us: 0.001, min: 60000, m: 60000, minutes: 60000 },
  percent: { '%': 1, percent: 1, pct: 1 },
  reqps: {
    'req/s': 1, reqps: 1, rps: 1, 'requests/s': 1, 'requests/sec': 1, 'request/s': 1, 'r/s': 1, '/s': 1, 'req/sec': 1, ops: 1, 'ops/s': 1,
    'kreq/s': 1e3, kreqps: 1e3, krps: 1e3, 'krequests/s': 1e3, 'k/s': 1e3, 'kr/s': 1e3,
    'mreq/s': 1e6, mreqps: 1e6, mrps: 1e6,
  },
  // MB and GB are taken as MiB and GiB: the axis labels are IEC, and a model that
  // writes "MB" for "MiB" has read the label, not converted it.
  bytes: { b: 1, byte: 1, bytes: 1, kib: KIB, kb: KIB, k: KIB, mib: MIB, mb: MIB, m: MIB, gib: GIB, gb: GIB, g: GIB, tib: TIB, tb: TIB },
};

// Returns { ok, base, family, reason }. `family` is the panel's base unit; a unit
// from another family is a wrong answer, not a conversion.
export function toBase(family, value, unit) {
  let num = value;
  let u = unit == null ? '' : String(unit);
  if (typeof num === 'string') {
    const m = /^\s*([-+]?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?)\s*(.*)$/i.exec(num.replace(/,/g, ''));
    if (!m) return { ok: false, reason: `value not a number: ${JSON.stringify(value)}` };
    num = Number(m[1]);
    if (m[2] && !u) u = m[2];
    else if (m[2] && /^[kmg]$/i.test(m[2].trim())) u = m[2].trim() + u;
  }
  if (typeof num !== 'number' || !Number.isFinite(num)) return { ok: false, reason: `value not a number: ${JSON.stringify(value)}` };
  let key = u.toLowerCase().replace(/\s+/g, '');
  if (key === '' && family === 'percent') key = '%';
  const table = FAMILIES[family];
  if (key in table) return { ok: true, base: num * table[key] };
  // "1.5K req/s" style: a K or M prefix glued to the unit.
  if (family === 'reqps') {
    const m = /^([km])?(.*)$/.exec(key);
    if (m && m[2] in table && table[m[2]] === 1) return { ok: true, base: num * (m[1] === 'k' ? 1e3 : m[1] === 'm' ? 1e6 : 1) };
  }
  return { ok: false, reason: `unit "${u}" is not a ${family} unit` };
}

export const BYTES = { KIB, MIB, GIB, TIB };
