// Cost of one call from the usage the API reported and the list price.
// Cached input is priced at the cached rate; reasoning tokens are part of
// completion_tokens and are billed as output.
import { readFileSync } from 'node:fs';

export const PRICES = JSON.parse(readFileSync(new URL('../prices.json', import.meta.url), 'utf8'));

export function callCost(model, usage) {
  if (!usage) return 0;
  const p = PRICES[model];
  if (!p) throw new Error(`no price for ${model} in prices.json`);
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const input = (usage.prompt_tokens ?? 0) - cached;
  return (input * p.input + cached * p.cachedInput + (usage.completion_tokens ?? 0) * p.output) / 1e6;
}
