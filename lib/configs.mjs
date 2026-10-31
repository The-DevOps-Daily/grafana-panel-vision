// The model configurations stage 2 runs. A configuration is a model plus the
// request settings; its id names the results file (results/raw/<id>.jsonl).
// All use temperature 0, the usual setting for an extraction bot.
// Reasoning off uses reasoning_effort "none" (stage 0b: no reasoning text comes
// back and about 100 completion tokens are billed). Reasoning on is the model's
// default. The t0.6 configuration exists only to check whether reasoning-mode
// failures at temperature 0 are caused by temperature 0; it runs on those panels.
export const CONFIGS = {
  'nemotron-3.5-super-vl': { model: 'nemotron-3.5-super-vl', reasoning: 'off', extra: { reasoning_effort: 'none' }, maxTokens: 1024, temperature: 0 },
  'nemotron-3.5-super-vl+reasoning': { model: 'nemotron-3.5-super-vl', reasoning: 'on (default)', extra: {}, maxTokens: 16384, temperature: 0 },
  'qwen3.8-max': { model: 'qwen3.8-max', reasoning: 'none returned', extra: {}, maxTokens: 1024, temperature: 0 },
  'gemma-4-31B-it': { model: 'gemma-4-31B-it', reasoning: 'none returned', extra: {}, maxTokens: 1024, temperature: 0 },
  'llama-4-maverick': { model: 'llama-4-maverick', reasoning: 'none', extra: {}, maxTokens: 1024, temperature: 0 },
  'nemotron-3.5-super-vl+reasoning-t0.6': { model: 'nemotron-3.5-super-vl', reasoning: 'on (default)', extra: {}, maxTokens: 16384, temperature: 0.6 },
};

export function config(id) {
  const c = CONFIGS[id];
  if (!c) throw new Error(`unknown configuration ${id}; see lib/configs.mjs`);
  return { id, ...c };
}
