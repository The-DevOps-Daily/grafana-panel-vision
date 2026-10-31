// Stage 5c: what if the bot gives the model the alert's numbers?
// Each panel is sent with the alert of ANOTHER panel (same unit) written into
// the prompt, the way a bot might pass the whole notification to the model.
// If the model copies the alert's value instead of reading the image, a
// cross-check against that alert has nothing left to catch.
//   node scripts/05c-alert-in-prompt.mjs [config]
// Writes results/alert-in-prompt/<config>.jsonl (stamped, one writer) and
// results/alert-in-prompt.md.
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { askImage } from '../lib/client.mjs';
import { SYSTEM, QUESTION, parseAnswer } from '../lib/prompt.mjs';
import { crossCheck } from '../lib/bot.mjs';
import { readPeak } from '../lib/score.mjs';
import { config } from '../lib/configs.mjs';
import { callCost } from '../lib/cost.mjs';
import { formatValue } from '../lib/units.mjs';
import { countedSpend, CAP_USD } from '../lib/spend.mjs';
import { lock, readStamped } from '../lib/stamp.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const cfg = config(process.argv[2] || 'nemotron-3.5-super-vl');
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const truths = read('data/truth.jsonl');
const alerts = Object.fromEntries(read('data/alerts.jsonl').map((a) => [a.id, a]));
const STAMP = createHash('sha256').update(readFileSync(new URL(import.meta.url))).update(QUESTION).update(readFileSync(`${ROOT}data/alerts.jsonl`)).update(JSON.stringify(cfg)).digest('hex').slice(0, 16);

const wrongAlert = {};
for (const [i, t] of truths.entries()) {
  for (let k = 1; k < truths.length; k++) {
    const o = truths[(i + k) % truths.length];
    if (o.unit === t.unit) { wrongAlert[t.id] = alerts[o.id]; break; }
  }
}
const context = (a) => `Context from the alert notification this screenshot came with: alert "${a.labels.alertname}" is ${a.status}; max ${formatValue(a.unit, a.values.B)} over the last ${a.range}; threshold ${formatValue(a.unit, a.threshold)}${a.labels.series ? `; series ${a.labels.series}` : ''}.\n\n`;

mkdirSync(`${ROOT}results/alert-in-prompt`, { recursive: true });
const OUT = `${ROOT}results/alert-in-prompt/${cfg.id}.jsonl`;
lock(OUT);
const prior = existsSync(OUT) ? readStamped(OUT, STAMP) : [];
const have = new Set(prior.filter((r) => r.ok).map((r) => r.panel));
const jobs = truths.filter((t) => !have.has(t.id));
const worker = async () => {
  while (jobs.length) {
    if (countedSpend() >= CAP_USD) throw new Error('counted spend reached the cap');
    const t = jobs.shift();
    const a = wrongAlert[t.id];
    const r = await askImage({ model: cfg.model, system: SYSTEM, text: context(a) + QUESTION, png: readFileSync(`${ROOT}${t.file}`), extra: cfg.extra, maxTokens: cfg.maxTokens, temperature: cfg.temperature });
    const parsed = r.ok ? parseAnswer(r.content) : null;
    appendFileSync(OUT, JSON.stringify({ stamp: STAMP, ts: new Date().toISOString(), config: cfg.id, model: cfg.model, panel: t.id, wrongAlert: a.id, ok: r.ok, status: r.status, attempts: r.attempts, latencyMs: r.ok ? r.ms : null, usage: r.usage ?? null, cost: r.ok ? callCost(cfg.model, r.usage) : 0, content: r.content ?? null, answer: parsed?.ok ? parsed.answer : null }) + '\n');
  }
};
await Promise.all([worker(), worker()]);

// Report: did the model read the image or copy the alert?
const recs = readStamped(OUT, STAMP).filter((r) => r.ok);
let copied = 0;
let readImage = 0;
let both = 0;
let neither = 0;
let confirmed = 0;
for (const r of recs) {
  const t = truths.find((x) => x.id === r.panel);
  const a = alerts[r.wrongAlert];
  const p = readPeak(t.unit, r.answer?.peak);
  const nearAlert = p.ok && Math.abs(p.base - a.values.B) / a.values.B <= 0.1;
  const nearImage = p.ok && Math.abs(p.base - t.peak.value) / t.peak.value <= 0.1;
  if (nearAlert && !nearImage) copied++;
  else if (nearImage && !nearAlert) readImage++;
  else if (nearImage && nearAlert) both++;
  else neither++;
  if (crossCheck(a, r.answer).verdict === 'confirmed') confirmed++;
}
const md = [
  '# The alert in the prompt (wrong screenshot)', '',
  `Configuration ${cfg.id}, stamp ${STAMP}. Each panel was sent with the alert of another panel written into the prompt. Within 10%:`, '',
  `- peak matches the alert, not the image (copied): ${copied} of ${recs.length}`,
  `- peak matches the image, not the alert (read the image): ${readImage} of ${recs.length}`,
  `- matches both (the two values are within 10% of each other): ${both} of ${recs.length}`,
  `- matches neither: ${neither} of ${recs.length}`,
  `- the bot's cross-check against that (wrong) alert said confirmed: ${confirmed} of ${recs.length}`, '',
  'Compare results/wrong-screenshot.md, where the model reads the image blind.',
];
writeFileSync(`${ROOT}results/alert-in-prompt.md`, md.join('\n') + '\n');
console.log(md.join('\n'));
