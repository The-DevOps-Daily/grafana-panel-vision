// Stage 3: score every recorded answer against the ground truth.
// Refuses any results/raw file that is unstamped, mixed, or stamped by other
// code or inputs. Writes results/summary.json, results/summary.md and
// results/failures.json (the worst misses, with the panel PNG paths).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { runStamp } from '../lib/stamp.mjs';
import { readConfigRecords } from '../lib/records.mjs';
import { scoreAnswer, wilson } from '../lib/score.mjs';
import { inSubset } from '../lib/subset.mjs';
import { CONFIGS } from '../lib/configs.mjs';
import { callCost } from '../lib/cost.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const STAMP = runStamp();
const truths = readFileSync(`${ROOT}data/truth.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const byId = Object.fromEntries(truths.map((t) => [t.id, t]));
const CLAIM = { config: ['nemotron-3.5-super-vl', 'nemotron-3.5-super-vl+reasoning'], minCorrect: 90, maxCostUsd: 0.001 };

const files = readdirSync(`${ROOT}results/raw`).filter((f) => f.endsWith('.jsonl'));
const order = Object.keys(CONFIGS);
files.sort((a, b) => order.indexOf(a.replace('.jsonl', '')) - order.indexOf(b.replace('.jsonl', '')));

const pct = (k, n) => (n ? `${((100 * k) / n).toFixed(1)}%` : '-');
const ci = (k, n) => wilson(k, n).map((x) => Math.round(x * 1000) / 10);
const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const i = (s.length - 1) * q;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i));
};

const FEATURES = [
  ['all panels', () => true],
  ['log y-axis', (t) => t.features.log],
  ['stacked', (t) => t.features.stacked],
  ['4-5 series', (t) => t.features.manySeries],
  ['1 series', (t) => t.features.nSeries === 1],
  ['small panel', (t) => t.features.small],
  ['similar colours', (t) => t.features.similarColours],
  ['threshold shown', (t) => t.features.threshold],
  ['no threshold', (t) => !t.features.threshold],
  ['peak at right edge', (t) => t.features.peakAtEdge],
  ['high noise', (t) => t.features.noise === 'high'],
  ['range 1h', (t) => t.features.range === '1h'],
  ['range 6h', (t) => t.features.range === '6h'],
  ['range 24h', (t) => t.features.range === '24h'],
];
const FIELDS = ['value', 'time', 'threshold', 'series', 'all'];

const summary = { stamp: STAMP, tolerances: 'value 5% relative; time 5% of range; threshold exact; series nearest legend name', configs: {} };
const failures = {};
const run1Correct = {};

for (const f of files) {
  const id = f.replace('.jsonl', '');
  const recs = readConfigRecords(`${ROOT}results/raw/${f}`, STAMP, f.replace('.jsonl', ''));
  // One outcome per (panel, run): the last call that answered, else the last call.
  const calls = new Map();
  for (const r of recs) {
    const k = `${r.panel}#${r.run}`;
    const prev = calls.get(k);
    if (!prev || r.ok || !prev.ok) calls.set(k, r);
  }
  const outcomes = [...calls.values()].map((r) => {
    const t = byId[r.panel];
    let kind = 'answered';
    if (!r.ok) kind = r.status === 429 ? 'rate-limited' : r.status >= 500 ? 'server error' : r.status === 0 ? 'network/timeout' : `HTTP ${r.status}`;
    else if (!r.answer) kind = r.finishReason === 'length' ? 'truncated' : 'unparseable';
    const s = kind === 'answered' ? scoreAnswer(t, r.answer) : { value: false, time: false, threshold: false, series: false, all: false, detail: {} };
    return { r, t, kind, s };
  });
  const run1 = outcomes.filter((o) => o.r.run === 1);
  const runs = [...new Set(outcomes.map((o) => o.r.run))].sort();
  const cfg = CONFIGS[id] ?? {};
  const ok = recs.filter((r) => r.ok);
  const lat = ok.map((r) => r.latencyMs);
  const attempts = recs.flatMap((r) => r.attempts);
  // Priced on run 1 only: later runs resend the same image and some models
  // serve it from the prompt cache (see scripts/04-cost.mjs).
  const costs = ok.filter((r) => r.run === 1).map((r) => callCost(r.model, r.usage));
  const out = {
    model: cfg.model, reasoning: cfg.reasoning, temperature: cfg.temperature, maxTokens: cfg.maxTokens,
    calls: recs.length, runs,
    run1: { panels: run1.length },
    perRun: {},
    nonAnswers: {},
    features: {},
    latencyMs: { p50: quantile(lat, 0.5), p95: quantile(lat, 0.95), max: Math.max(...lat) },
    attempts: {
      total: attempts.length,
      ok: attempts.filter((a) => a.status === 200).length,
      rateLimited: attempts.filter((a) => a.status === 429).length,
      serverError: attempts.filter((a) => a.status >= 500).length,
      networkOrTimeout: attempts.filter((a) => a.status === 0).length,
      other4xx: attempts.filter((a) => a.status >= 400 && a.status < 500 && a.status !== 429).length,
    },
    truncatedCalls: recs.filter((r) => r.finishReason === 'length').length,
    cost: {
      meanPerCall: costs.reduce((a, b) => a + b, 0) / costs.length,
      p95PerCall: quantile(costs, 0.95),
      maxPerCall: Math.max(...costs),
      per1000: (1000 * costs.reduce((a, b) => a + b, 0)) / costs.length,
      total: costs.reduce((a, b) => a + b, 0),
    },
    tokens: {
      promptMean: ok.reduce((a, r) => a + (r.usage?.prompt_tokens ?? 0), 0) / ok.length,
      completionMean: ok.reduce((a, r) => a + (r.usage?.completion_tokens ?? 0), 0) / ok.length,
      completionP95: quantile(ok.map((r) => r.usage?.completion_tokens ?? 0), 0.95),
      reasoningTokensReported: ok.reduce((a, r) => a + (r.usage?.completion_tokens_details?.reasoning_tokens ?? 0), 0),
      callsWithReasoningText: ok.filter((r) => r.reasoning).length,
    },
  };
  for (const o of outcomes) if (o.kind !== 'answered') out.nonAnswers[o.kind] = (out.nonAnswers[o.kind] ?? 0) + 1;
  out.nonAnswersRun1 = {};
  for (const o of run1) if (o.kind !== 'answered') out.nonAnswersRun1[o.kind] = (out.nonAnswersRun1[o.kind] ?? 0) + 1;
  for (const field of FIELDS) {
    const k = run1.filter((o) => o.s[field]).length;
    out.run1[field] = { correct: k, of: run1.length, ci95: ci(k, run1.length) };
  }
  for (const run of runs) {
    const rs = outcomes.filter((o) => o.r.run === run);
    out.perRun[run] = { panels: rs.length, all: rs.filter((o) => o.s.all).length };
    const sub = rs.filter((o) => inSubset(o.r.panel));
    out.perRun[run].subsetAll = sub.filter((o) => o.s.all).length;
    out.perRun[run].subsetPanels = sub.length;
  }
  // Run-to-run agreement on every panel that has all runs: same all-four
  // verdict, and the same four facts, in every run.
  if (runs.length > 1) {
    let same = 0;
    let sameAnswer = 0;
    let complete = 0;
    let rightEveryRun = 0;
    for (const pid of truths.map((t) => t.id)) {
      const os = runs.map((run) => outcomes.find((o) => o.r.panel === pid && o.r.run === run)).filter(Boolean);
      if (os.length !== runs.length) continue;
      complete++;
      if (os.every((o) => o.s.all === os[0].s.all)) same++;
      const key = (o) => JSON.stringify([o.s.detail.valueBase, o.r.answer?.peakTime, o.s.detail.threshold, o.s.detail.series]);
      if (os.every((o) => key(o) === key(os[0]))) sameAnswer++;
      if (os.every((o) => o.s.all)) rightEveryRun++;
    }
    out.repeat = { panels: complete, sameVerdict: same, sameFacts: sameAnswer, rightEveryRun };
  }
  // Sensitivity of the value fact to the tolerance (the claim stays at 5%), and
  // unit slips: a value right except for a factor of 1000 (or 1024 for bytes),
  // such as "1.6 req/s" for 1.6K req/s.
  const relErr = (o) => (o.s.detail.valueErr == null ? null : Math.abs(o.s.detail.valueErr));
  out.run1.valueWithin10 = run1.filter((o) => relErr(o) != null && relErr(o) <= 0.1).length;
  out.run1.valueWithin20 = run1.filter((o) => relErr(o) != null && relErr(o) <= 0.2).length;
  const slip = (o) => {
    const b = o.s.detail.valueBase;
    if (b == null || o.s.value) return false;
    const v = o.t.peak.value;
    return [1000, 1 / 1000, 1024, 1 / 1024].some((f) => Math.abs(b * f - v) / v <= 0.05);
  };
  out.unitSlips = { run1: run1.filter(slip).map((o) => o.r.panel), allRuns: outcomes.filter(slip).length };
  for (const [name, pred] of FEATURES) {
    const rs = run1.filter((o) => pred(o.t));
    const row = { n: rs.length };
    for (const field of FIELDS) row[field] = rs.filter((o) => o.s[field]).length;
    row.ci95 = ci(row.all, rs.length);
    out.features[name] = row;
  }
  run1Correct[id] = Object.fromEntries(run1.map((o) => [o.r.panel, o.s.all]));
  // Worst misses in run 1: wrong reads first by size of the value error.
  failures[id] = run1
    .filter((o) => !o.s.all)
    .map((o) => ({
      panel: o.r.panel, file: o.t.file, kind: o.kind,
      wrong: FIELDS.slice(0, 4).filter((fl) => !o.s[fl]),
      valueErrPct: o.s.detail.valueErr != null ? Math.round(o.s.detail.valueErr * 1000) / 10 : null,
      timeErrMin: o.s.detail.timeErrMin ?? null,
      truth: { peak: o.t.peak.display, time: o.t.peak.hhmm, threshold: o.t.thresholdCrossed, top: o.t.topSeries },
      answer: o.r.answer,
      features: o.t.features,
    }))
    .sort((a, b) => Math.abs(b.valueErrPct ?? 1e9) - Math.abs(a.valueErrPct ?? 1e9));
  out.claim = CLAIM.config.includes(id)
    ? { run1Correct: out.run1.all.correct, minCorrect: CLAIM.minCorrect, meanCost: out.cost.meanPerCall, maxCost: CLAIM.maxCostUsd, accuracyHolds: out.run1.all.correct >= CLAIM.minCorrect, costHolds: out.cost.meanPerCall < CLAIM.maxCostUsd }
    : undefined;
  summary.configs[id] = out;
}

// Paired comparison on run 1 (exact two-sided sign test on discordant panels).
function binomTwoSided(k, n) {
  if (!n) return 1;
  const pmf = (i) => {
    let c = 1;
    for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1);
    return c / 2 ** n;
  };
  const obs = pmf(k);
  let p = 0;
  for (let i = 0; i <= n; i++) if (pmf(i) <= obs + 1e-12) p += pmf(i);
  return Math.min(1, p);
}
const ids = Object.keys(summary.configs);
summary.paired = [];
for (let i = 0; i < ids.length; i++)
  for (let j = i + 1; j < ids.length; j++) {
    const a = run1Correct[ids[i]];
    const b = run1Correct[ids[j]];
    let aOnly = 0;
    let bOnly = 0;
    for (const pid of Object.keys(a)) {
      if (!(pid in b)) continue;
      if (a[pid] && !b[pid]) aOnly++;
      if (!a[pid] && b[pid]) bOnly++;
    }
    summary.paired.push({ a: ids[i], b: ids[j], aOnly, bOnly, p: Math.round(binomTwoSided(Math.min(aOnly, bOnly), aOnly + bOnly) * 1000) / 1000 });
  }

writeFileSync(`${ROOT}results/summary.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`${ROOT}results/failures.json`, JSON.stringify(failures, null, 2) + '\n');

// Markdown report.
const md = [];
md.push(`# Results (stamp ${STAMP})`, '', `Tolerances: peak value within 5% (after unit conversion), peak time within 5% of the range (3/18/72 min), threshold exact, top series nearest legend name (<=2 edits, <=1 for short names, ties wrong). Run 1 covers all 100 panels; later runs cover the subset of 34.`, '');
md.push('## Run 1, 100 panels', '', '| configuration | all four right | 95% CI | peak value | peak time | threshold | top series | non-answers | $ per 1,000 | p50 latency (all runs) | p95 latency (all runs) |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const [id, o] of Object.entries(summary.configs)) {
  const r = o.run1;
  const na = Object.entries(o.nonAnswersRun1).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || '0';
  md.push(`| ${id} | ${r.all.correct}/${r.all.of} | ${r.all.ci95[0]}-${r.all.ci95[1]}% | ${r.value.correct} | ${r.time.correct} | ${r.threshold.correct} | ${r.series.correct} | ${na} | ${o.cost.per1000.toFixed(3)} | ${(o.latencyMs.p50 / 1000).toFixed(1)} s | ${(o.latencyMs.p95 / 1000).toFixed(1)} s |`);
}
md.push('', 'Accuracy and cost are run 1. Latency covers every successful call in all runs, and is the attempt that succeeded; retried attempts are counted below, not timed. Non-answers count as wrong in "all four right".', '');
md.push('## By panel feature, run 1 (all four right)', '');
md.push(`| feature | n | ${ids.join(' | ')} |`, `|---|---|${ids.map(() => '---').join('|')}|`);
for (const [name] of FEATURES) {
  const n = summary.configs[ids[0]].features[name].n;
  md.push(`| ${name} | ${n} | ${ids.map((id) => { const x = summary.configs[id].features[name]; return `${x.all} (${pct(x.all, x.n)})`; }).join(' | ')} |`);
}
md.push('', '## By panel feature and question, run 1', '');
for (const id of ids) {
  md.push(`### ${id}`, '', '| feature | n | value | time | threshold | series | all four |', '|---|---|---|---|---|---|---|');
  for (const [name] of FEATURES) {
    const x = summary.configs[id].features[name];
    md.push(`| ${name} | ${x.n} | ${x.value} | ${x.time} | ${x.threshold} | ${x.series} | ${x.all} |`);
  }
  md.push('');
}
md.push('## Repeat runs', '', 'Panels with every run recorded (all 100 for three full runs, the 34-panel subset otherwise).', '', '| configuration | runs | all four right per run | same verdict in every run | same four facts in every run | right in every run |', '|---|---|---|---|---|---|');
for (const [id, o] of Object.entries(summary.configs)) {
  if (!o.repeat) continue;
  md.push(`| ${id} | ${o.runs.join(', ')} | ${o.runs.map((r) => `${o.perRun[r].all}/${o.perRun[r].panels}`).join(', ')} | ${o.repeat.sameVerdict}/${o.repeat.panels} | ${o.repeat.sameFacts}/${o.repeat.panels} | ${o.repeat.rightEveryRun}/${o.repeat.panels} |`);
}
md.push('', '## Peak value at looser tolerances, run 1 (sensitivity only; the claim uses 5%)', '', '| configuration | within 5% | within 10% | within 20% | unit slips (x1000 or x1024), run 1 |', '|---|---|---|---|---|');
for (const [id, o] of Object.entries(summary.configs)) md.push(`| ${id} | ${o.run1.value.correct} | ${o.run1.valueWithin10} | ${o.run1.valueWithin20} | ${o.unitSlips.run1.length}${o.unitSlips.run1.length ? ` (${o.unitSlips.run1.join(', ')})` : ''} |`);
md.push('', '## Calls, retries and tokens', '', 'Non-answers over all runs: ' + Object.entries(summary.configs).map(([id, o]) => `${id} ${Object.entries(o.nonAnswers).map(([k, v]) => `${k} ${v}`).join(', ') || '0'}`).join('; ') + '.', '', '| configuration | calls | attempts | 429 | 5xx | network/timeout | other 4xx | truncated (finish=length) | mean prompt tokens | mean completion tokens | p95 completion | reasoning_tokens reported | calls with reasoning text | mean $ per call | max $ per call |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [id, o] of Object.entries(summary.configs)) {
  const a = o.attempts;
  md.push(`| ${id} | ${o.calls} | ${a.total} | ${a.rateLimited} | ${a.serverError} | ${a.networkOrTimeout} | ${a.other4xx} | ${o.truncatedCalls} | ${o.tokens.promptMean.toFixed(0)} | ${o.tokens.completionMean.toFixed(0)} | ${o.tokens.completionP95.toFixed(0)} | ${o.tokens.reasoningTokensReported} | ${o.tokens.callsWithReasoningText} | ${o.cost.meanPerCall.toFixed(5)} | ${o.cost.maxPerCall.toFixed(5)} |`);
}
md.push('', '## Paired comparison, run 1 (panels right in one and wrong in the other)', '', '| A | B | A only | B only | sign test p |', '|---|---|---|---|---|');
for (const p of summary.paired) md.push(`| ${p.a} | ${p.b} | ${p.aOnly} | ${p.bOnly} | ${p.p} |`);
md.push('', '## The claim', '', '"nemotron-3.5-super-vl reads the key facts of a rendered metrics panel on at least 90 of 100 panels, for under $0.001 per screenshot."', '');
for (const [id, o] of Object.entries(summary.configs)) {
  if (!o.claim) continue;
  md.push(`- ${id}: ${o.claim.run1Correct}/100 all four right (${o.claim.accuracyHolds ? 'meets' : 'misses'} 90), mean $${o.claim.meanCost.toFixed(5)} per screenshot (${o.claim.costHolds ? 'under' : 'over'} $0.001).`);
}
md.push('', '## Worst misses, run 1', '');
for (const id of ids) {
  md.push(`### ${id}`, '');
  for (const x of failures[id].slice(0, 8)) {
    const a = x.answer;
    const said = a ? `${a.peak?.value ?? a.peak} ${a.peak?.unit ?? ''} at ${a.peakTime}, threshold ${a.thresholdCrossed}, top ${a.topSeries}` : x.kind;
    md.push(`- ${x.panel} (${x.file}): wrong ${x.wrong.join(', ')}; truth ${x.truth.peak} at ${x.truth.time}, threshold ${x.truth.threshold}, top ${x.truth.top}; said ${said}${x.valueErrPct != null ? ` (value ${x.valueErrPct > 0 ? '+' : ''}${x.valueErrPct}%)` : ''}`);
  }
  md.push('');
}
writeFileSync(`${ROOT}results/summary.md`, md.join('\n') + '\n');
console.log(md.slice(0, 40).join('\n'));
