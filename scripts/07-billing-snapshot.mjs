// Stage 7 (optional): save DigitalOcean's billed token lines for the tested
// models, so the usage the API reported can be checked against the bill.
//
//   node scripts/07-billing-snapshot.mjs before            # this month's invoice preview
//   node scripts/07-billing-snapshot.mjs after 2026-10     # the closed invoice for a month
//
// Needs DO_BILLING_TOKEN (an API token with billing read access) in the
// environment or in .env. Only Serverless Inference lines of the tested
// models are saved. Writes results/billing-<label>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { envValue } from '../lib/env.mjs';

const [label = 'snapshot', period] = process.argv.slice(2);
const token = envValue('DO_BILLING_TOKEN');
if (!token) {
  console.error('Set DO_BILLING_TOKEN (or put it in .env).');
  process.exit(1);
}
const API = 'https://api.digitalocean.com/v2/customers/my/invoices';
const get = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

// The preview is refreshed a few times a day, so keep when it was last
// updated: usage after that time is not in it yet.
const list = await get(`${API}?per_page=50`);
let source = `${API}/preview`;
let updatedAt = list.invoice_preview?.updated_at ?? null;
if (period) {
  const inv = (list.invoices ?? []).find((i) => i.invoice_period === period);
  if (!inv) throw new Error(`no closed invoice for ${period} yet`);
  source = `${API}/${inv.invoice_uuid}`;
  updatedAt = inv.updated_at ?? null;
}

const items = [];
for (let url = `${source}?per_page=200`; url; ) {
  const page = await get(url);
  items.push(...(page.invoice_items ?? []));
  url = page.links?.pages?.next ?? null;
}

// "Gemma 4 Input tokens (31 @ $0.00018/thousand)"
const TESTED = /nemotron 3\.5 super vl|gemma 4|qwen3\.8-max|llama 4 maverick/i;
const lines = [];
for (const item of items) {
  if (item.product !== 'GenAI Serverless Inference') continue;
  const m = /^(.*?) (Cache Read Input|Input|Output) tokens \((\d+) @ \$([\d.]+)\/thousand\)/.exec(item.description);
  if (m && TESTED.test(m[1])) lines.push({ model: m[1], kind: m[2], tokens: Number(m[3]), perThousand: Number(m[4]), amount: Number(item.amount) });
}
const out = new URL(`../results/billing-${label}.json`, import.meta.url).pathname;
mkdirSync(new URL('../results/', import.meta.url).pathname, { recursive: true });
writeFileSync(out, JSON.stringify({ takenAt: new Date().toISOString(), source: period ? `invoice ${period}` : 'invoice preview', updatedAt, lines }, null, 2) + '\n');
console.log(`${lines.length} lines saved to results/billing-${label}.json`);
