// Stage 0: which models can our key call with an image?
// For each candidate: the stage 2 question with no image, then with the
// smallest and the largest panel. "Accepts images" needs an HTTP 200 AND more
// prompt tokens with the image than without it (an endpoint that drops the
// image silently would still answer 200). Writes results/model-access/<date>.jsonl
// and results/model-access/<date>.txt.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { askImage } from '../lib/client.mjs';
import { SYSTEM, QUESTION, parseAnswer } from '../lib/prompt.mjs';
import { callCost } from '../lib/cost.mjs';
import { countedSpend, CAP_USD } from '../lib/spend.mjs';
import { lock } from '../lib/stamp.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DATE = new Date().toISOString().slice(0, 10);
const DIR = `${ROOT}results/model-access`;
mkdirSync(DIR, { recursive: true });
const OUT = `${DIR}/${DATE}.jsonl`;
lock(OUT);
const STAMP = createHash('sha256').update(readFileSync(new URL(import.meta.url))).update(QUESTION).digest('hex').slice(0, 16);

const CANDIDATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['nemotron-3.5-super-vl', 'nemotron-nano-12b-v2-vl', 'nemotron-3-nano-omni', 'qwen3.8-max', 'qwen3.5-397b-a17b', 'deepseek-v4.1-flash',
     'kimi-k3', 'kimi-k2.6', 'glm-5.3-flash', 'llama-4-maverick', 'gemma-4-31B-it', 'mistral-3-14B', 'minimax-m3.1-flash',
     'openai-gpt-6-luna', 'openai-gpt-5.4-mini'];

const truths = readFileSync(`${ROOT}data/truth.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const smallest = truths.find((t) => t.width === 360);
const largest = truths.find((t) => t.width === 1000);
const probes = [
  { kind: 'text-only', panel: null },
  { kind: `image ${smallest.width}x${smallest.height}`, panel: smallest },
  { kind: `image ${largest.width}x${largest.height}`, panel: largest },
];

const done = existsSync(OUT) ? readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
for (const model of CANDIDATES) {
  for (const p of probes) {
    if (done.some((d) => d.model === model && d.kind === p.kind)) continue;
    if (countedSpend() >= CAP_USD) throw new Error(`counted spend reached $${CAP_USD}; stopping`);
    const png = p.panel ? readFileSync(`${ROOT}${p.panel.file}`) : null;
    const r = await askImage({ model, system: SYSTEM, text: QUESTION, png });
    const parsed = r.ok ? parseAnswer(r.content) : null;
    const rec = {
      stamp: STAMP, ts: new Date().toISOString(), model, kind: p.kind, panel: p.panel?.id ?? null,
      status: r.status, attempts: r.attempts, ms: r.ms, servedModel: r.servedModel ?? null, finishReason: r.finishReason ?? null,
      usage: r.usage ?? null, cost: r.ok ? callCost(model, r.usage) : 0,
      content: r.content ?? null, reasoning: r.reasoning ?? null, error: r.error ?? null,
      answer: parsed?.ok ? parsed.answer : null,
    };
    appendFileSync(OUT, JSON.stringify(rec) + '\n');
    done.push(rec);
    console.log(`${model.padEnd(26)} ${p.kind.padEnd(16)} ${r.status} ${String(r.ms).padStart(6)} ms  prompt=${r.usage?.prompt_tokens ?? '-'} out=${r.usage?.completion_tokens ?? '-'}${r.error ? '  ' + r.error.slice(0, 90).replace(/\s+/g, ' ') : ''}`);
    if (!r.ok && r.status >= 400 && r.status < 500) break;
  }
}

// Summary: one line per model.
const lines = [`Model access probe, ${DATE}. Same question as stage 2. Text-only, then panels ${smallest.id} (${smallest.width}x${smallest.height}) and ${largest.id} (${largest.width}x${largest.height}).`, ''];
lines.push('model | HTTP | text-only prompt tokens | +image tokens small | +image tokens large | accepts images | reply names the panel title (large)');
for (const model of CANDIDATES) {
  const rs = done.filter((d) => d.model === model);
  const t = rs.find((d) => d.kind === 'text-only');
  const s = rs.find((d) => d.kind === probes[1].kind);
  const l = rs.find((d) => d.kind === probes[2].kind);
  const base = t?.usage?.prompt_tokens;
  const plus = (x) => (x?.usage && base != null ? x.usage.prompt_tokens - base : '-');
  const accepts = s?.status === 200 && l?.status === 200 && plus(s) > 20 && plus(l) > 20;
  const reply = `${l?.content ?? ''} ${JSON.stringify(l?.answer ?? '')}`.toLowerCase();
  const namesTitle = l?.status === 200 ? (reply.includes(largest.title.toLowerCase()) || largest.series.some((n) => reply.includes(n.toLowerCase())) ? 'yes' : 'no') : '-';
  const status = [...new Set(rs.map((d) => d.status))].join('/');
  const err = rs.find((d) => d.error)?.error?.slice(0, 80).replace(/\s+/g, ' ');
  lines.push(`${model} | ${status} | ${base ?? '-'} | ${plus(s)} | ${plus(l)} | ${accepts ? 'yes' : 'no'} | ${namesTitle}${err ? ` | ${err}` : ''}`);
}
lines.push('', `Counted spend after the probe: $${countedSpend().toFixed(4)}`);
writeFileSync(`${DIR}/${DATE}.txt`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
