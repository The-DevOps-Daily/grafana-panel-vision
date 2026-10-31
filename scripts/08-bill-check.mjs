// Stage 8 (optional): compare the usage every recorded call reported with the
// change in DigitalOcean's billed token lines between two snapshots (stage 7).
//
//   node scripts/08-bill-check.mjs before after
//
// The bill has monthly totals per model, so any other use of the same model
// between the snapshots shows up here too. Calls are counted when they were
// sent after the first snapshot's data was last updated. Writes
// results/bill-check.md.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [a = 'before', b = 'after'] = process.argv.slice(2);
const ROOT = new URL('..', import.meta.url).pathname;
const load = (label) => JSON.parse(readFileSync(`${ROOT}results/billing-${label}.json`, 'utf8'));
const before = load(a);
const after = load(b);
const since = before.updatedAt ?? before.takenAt;

const INVOICE_NAME = {
  'nemotron-3.5-super-vl': /nemotron 3\.5 super vl/i,
  'qwen3.8-max': /^qwen3\.8-max$/i,
  'gemma-4-31B-it': /^gemma 4$/i,
  'llama-4-maverick': /^llama 4 maverick/i,
};
const billed = (snap, model, kind) => snap.lines.filter((l) => INVOICE_NAME[model].test(l.model) && l.kind === kind).reduce((t, l) => t + l.tokens, 0);

function* jsonl(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* jsonl(p);
    else if (f.endsWith('.jsonl')) yield p;
  }
}
const api = {};
for (const f of jsonl(`${ROOT}results`)) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    const r = JSON.parse(line);
    if (!r.usage || !INVOICE_NAME[r.model] || !(r.ts > since)) continue;
    const t = (api[r.model] ??= { calls: 0, Input: 0, 'Cache Read Input': 0, Output: 0 });
    const cached = r.usage.prompt_tokens_details?.cached_tokens ?? 0;
    t.calls++;
    t.Input += (r.usage.prompt_tokens ?? 0) - cached;
    t['Cache Read Input'] += cached;
    t.Output += r.usage.completion_tokens ?? 0;
  }
}

const md = ['# Bill check', '', `Billed tokens: ${before.source} (data updated ${since}) to ${after.source} (data updated ${after.updatedAt ?? after.takenAt}). Reported tokens: every recorded call sent after ${since}.`, ''];
md.push('| model | calls | kind | reported by the API | billed change | difference |', '|---|---|---|---|---|---|');
for (const [model, t] of Object.entries(api)) {
  for (const kind of ['Input', 'Cache Read Input', 'Output']) {
    const change = billed(after, model, kind) - billed(before, model, kind);
    const diff = change - t[kind];
    const pct = t[kind] ? `${((100 * diff) / t[kind]).toFixed(2)}%` : '-';
    md.push(`| ${model} | ${t.calls} | ${kind} | ${t[kind]} | ${change} | ${diff >= 0 ? '+' : ''}${diff} (${pct}) |`);
  }
}
writeFileSync(`${ROOT}results/bill-check.md`, md.join('\n') + '\n');
console.log(md.join('\n'));
