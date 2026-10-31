// Stage 5 demo: run the bot live on a few alerts and print what it would post.
//   node scripts/05b-bot-demo.mjs p004 p021 p030
//   CONFIG=nemotron-3.5-super-vl node scripts/05b-bot-demo.mjs p004
// Each call is recorded in results/bot/demo-<date>.jsonl (stamped, one writer).
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { explainAlert } from '../lib/bot.mjs';
import { config } from '../lib/configs.mjs';
import { callCost } from '../lib/cost.mjs';
import { countedSpend, CAP_USD } from '../lib/spend.mjs';
import { lock } from '../lib/stamp.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const cfg = config(process.env.CONFIG || 'nemotron-3.5-super-vl');
const ids = process.argv.slice(2);
if (!ids.length) throw new Error('give panel ids, for example p004 p021');
const alerts = Object.fromEntries(readFileSync(`${ROOT}data/alerts.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((a) => [a.id, a]));
const STAMP = createHash('sha256')
  .update(readFileSync(`${ROOT}lib/bot.mjs`))
  .update(readFileSync(`${ROOT}lib/prompt.mjs`))
  .update(readFileSync(new URL(import.meta.url)))
  .digest('hex')
  .slice(0, 16);
mkdirSync(`${ROOT}results/bot`, { recursive: true });
const OUT = `${ROOT}results/bot/demo-${new Date().toISOString().slice(0, 10)}.jsonl`;
lock(OUT);

for (const id of ids) {
  if (countedSpend() >= CAP_USD) throw new Error('counted spend reached the cap');
  const alert = alerts[id];
  const png = readFileSync(`${ROOT}${alert.image}`);
  const res = await explainAlert({ alert, png, model: cfg.model, extra: cfg.extra, maxTokens: cfg.maxTokens, temperature: cfg.temperature });
  const r = res.call;
  appendFileSync(OUT, JSON.stringify({ stamp: STAMP, ts: new Date().toISOString(), config: cfg.id, model: cfg.model, panel: id, status: r.status, attempts: r.attempts, latencyMs: r.ok ? r.ms : null, usage: r.usage ?? null, cost: r.ok ? callCost(cfg.model, r.usage) : 0, content: r.content ?? null, answer: res.answer, verdict: res.verdict, checks: res.check.checks, message: res.message }) + '\n');
  console.log(`--- ${id} (${alert.image}) -> ${res.verdict}, ${r.ms} ms`);
  console.log(res.message);
}
