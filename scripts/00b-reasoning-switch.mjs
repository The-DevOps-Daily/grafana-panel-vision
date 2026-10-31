// Stage 0b: can the reasoning models answer without reasoning first?
// Output tokens are most of their cost. Tries the common switches on one panel
// and records whether reasoning text came back and how many completion tokens
// were billed. Writes results/model-access/reasoning-switch-<date>.jsonl.
//   node scripts/00b-reasoning-switch.mjs nemotron-3.5-super-vl
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { askImage } from '../lib/client.mjs';
import { SYSTEM, QUESTION, parseAnswer } from '../lib/prompt.mjs';
import { callCost } from '../lib/cost.mjs';
import { countedSpend, CAP_USD } from '../lib/spend.mjs';
import { lock } from '../lib/stamp.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DATE = new Date().toISOString().slice(0, 10);
mkdirSync(`${ROOT}results/model-access`, { recursive: true });
const OUT = `${ROOT}results/model-access/reasoning-switch-${DATE}.jsonl`;
lock(OUT);
const STAMP = createHash('sha256').update(readFileSync(new URL(import.meta.url))).update(QUESTION).digest('hex').slice(0, 16);
const models = process.argv.slice(2);
const panelId = process.env.PANEL || 'p004';
const truth = readFileSync(`${ROOT}data/truth.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).find((t) => t.id === panelId);
const png = readFileSync(`${ROOT}${truth.file}`);

const SWITCHES = [
  { name: 'default', system: SYSTEM, extra: {} },
  { name: 'reasoning_effort=low', system: SYSTEM, extra: { reasoning_effort: 'low' } },
  { name: 'reasoning_effort=none', system: SYSTEM, extra: { reasoning_effort: 'none' } },
  { name: 'chat_template_kwargs.enable_thinking=false', system: SYSTEM, extra: { chat_template_kwargs: { enable_thinking: false } } },
  { name: 'system prompt /no_think', system: `/no_think\n${SYSTEM}`, extra: {} },
];

for (const model of models) {
  for (const sw of SWITCHES) {
    if (countedSpend() >= CAP_USD) throw new Error('counted spend reached the cap');
    const r = await askImage({ model, system: sw.system, text: QUESTION, png, extra: sw.extra });
    const parsed = r.ok ? parseAnswer(r.content) : null;
    const rec = {
      stamp: STAMP, ts: new Date().toISOString(), model, switch: sw.name, panel: panelId,
      status: r.status, attempts: r.attempts, ms: r.ms, finishReason: r.finishReason ?? null,
      usage: r.usage ?? null, cost: r.ok ? callCost(model, r.usage) : 0,
      reasoningChars: (r.reasoning ?? '').length, content: r.content ?? null, reasoning: r.reasoning ?? null,
      error: r.error ?? null, answer: parsed?.ok ? parsed.answer : null,
    };
    appendFileSync(OUT, JSON.stringify(rec) + '\n');
    console.log(`${model} | ${sw.name.padEnd(44)} | HTTP ${r.status} | ${r.ms} ms | completion ${r.usage?.completion_tokens ?? '-'} | reasoning chars ${rec.reasoningChars} | $${rec.cost.toFixed(5)}${r.error ? ' | ' + r.error.slice(0, 100).replace(/\s+/g, ' ') : ''}`);
  }
}
