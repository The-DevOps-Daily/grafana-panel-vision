// Stage 4: what one screenshot costs, from the usage each call reported and the
// list prices in prices.json. Image tokens are estimated per model as the prompt
// tokens with the panel minus the prompt tokens of the same question with no
// image (the stage 0 text-only call). Writes results/cost.md and results/cost.json.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { runStamp, readStamped } from '../lib/stamp.mjs';
import { PRICES } from '../lib/cost.mjs';
import { CONFIGS } from '../lib/configs.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const STAMP = runStamp();
const truth = Object.fromEntries(readFileSync(`${ROOT}data/truth.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((t) => [t.id, t]));
const accessFiles = readdirSync(`${ROOT}results/model-access`).filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f));
const access = accessFiles.flatMap((f) => readFileSync(`${ROOT}results/model-access/${f}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l)));
const textOnly = (model) => access.find((a) => a.model === model && a.kind === 'text-only' && a.usage)?.usage.prompt_tokens ?? null;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const order = Object.keys(CONFIGS);
const files = readdirSync(`${ROOT}results/raw`).filter((f) => f.endsWith('.jsonl')).sort((a, b) => order.indexOf(a.replace('.jsonl', '')) - order.indexOf(b.replace('.jsonl', '')));
const out = { stamp: STAMP, prices: PRICES._source, configs: {} };
const md = ['# Cost per screenshot', '', `Stamp ${STAMP}. From the usage block of every successful call and the list prices in prices.json (${PRICES._source}). ${PRICES._note}`, ''];
md.push('| configuration | calls | input $/1M | output $/1M | mean prompt tokens | of which image (est.) | cached prompt tokens | mean completion tokens | input share of cost | $ per screenshot | $ per 1,000 |', '|---|---|---|---|---|---|---|---|---|---|---|');
const bySize = {};
for (const f of files) {
  const id = f.replace('.jsonl', '');
  const recs = readStamped(`${ROOT}results/raw/${f}`, STAMP).filter((r) => r.ok && r.usage);
  const model = recs[0].model;
  const p = PRICES[model];
  const prompt = recs.map((r) => r.usage.prompt_tokens);
  const cached = recs.map((r) => r.usage.prompt_tokens_details?.cached_tokens ?? 0);
  const completion = recs.map((r) => r.usage.completion_tokens);
  const inCost = recs.map((r, i) => ((prompt[i] - cached[i]) * p.input + cached[i] * p.cachedInput) / 1e6);
  const outCost = completion.map((c) => (c * p.output) / 1e6);
  const per = mean(inCost) + mean(outCost);
  const base = textOnly(model);
  const row = {
    model, calls: recs.length, promptMean: mean(prompt), cachedMean: mean(cached), completionMean: mean(completion),
    imageTokensEst: base != null ? mean(prompt) - base : null, textOnlyPrompt: base,
    inputShare: mean(inCost) / per, perScreenshot: per, per1000: per * 1000,
  };
  out.configs[id] = row;
  md.push(`| ${id} | ${row.calls} | ${p.input} | ${p.output} | ${row.promptMean.toFixed(0)} | ${row.imageTokensEst?.toFixed(0) ?? '-'} | ${row.cachedMean.toFixed(0)} | ${row.completionMean.toFixed(0)} | ${(100 * row.inputShare).toFixed(0)}% | ${row.perScreenshot.toFixed(5)} | ${row.per1000.toFixed(3)} |`);
  bySize[id] = {};
  for (const r of recs) {
    const t = truth[r.panel];
    const k = `${t.width}x${t.height}`;
    (bySize[id][k] ??= []).push(r.usage.prompt_tokens - (base ?? 0));
  }
}
const sizes = [...new Set(Object.values(bySize).flatMap((x) => Object.keys(x)))].sort((a, b) => Number(b.split('x')[0]) - Number(a.split('x')[0]));
md.push('', '## Image tokens by panel size (mean prompt tokens minus the text-only prompt)', '', `| configuration | ${sizes.join(' | ')} |`, `|---|${sizes.map(() => '---').join('|')}|`);
for (const [id, s] of Object.entries(bySize)) md.push(`| ${id} | ${sizes.map((k) => (s[k] ? mean(s[k]).toFixed(0) : '-')).join(' | ')} |`);
out.imageTokensBySize = Object.fromEntries(Object.entries(bySize).map(([id, s]) => [id, Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.round(mean(v))]))]));
writeFileSync(`${ROOT}results/cost.json`, JSON.stringify(out, null, 2) + '\n');
writeFileSync(`${ROOT}results/cost.md`, md.join('\n') + '\n');
console.log(md.join('\n'));
