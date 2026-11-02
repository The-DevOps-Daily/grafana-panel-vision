# grafana-panel-vision

```bash
npm ci
cp .env.example .env            # add a DigitalOcean Serverless Inference model access key
node scripts/01-render-panels.mjs && node scripts/01b-check-panels.mjs && node scripts/01c-break-renderer.mjs
node scripts/00-model-access.mjs
mv results/raw results/raw-ours  # keep our run; the runner resumes into results/raw
node scripts/02-run-models.mjs --configs nemotron-3.5-super-vl,qwen3.8-max,gemma-4-31B-it,llama-4-maverick --runs 3
node scripts/02-run-models.mjs --configs nemotron-3.5-super-vl+reasoning --runs 3 --subset
node scripts/03-score.mjs && node scripts/04-cost.mjs && node scripts/05-crosscheck.mjs && node scripts/06-wrong-screenshot.mjs
```

Can a vision model read a Grafana panel well enough for an on-call bot? This repo draws 100 Grafana-style time-series panels with known ground truth, asks vision models on DigitalOcean Serverless Inference four questions about each one, scores the answers, prices them from the reported token usage, and tests a small bot that checks the model's read against the alert payload before it trusts it.

One dependency (`@resvg/resvg-js`, SVG to PNG). Node 22 or later. Rerunning everything costs about $1 at list prices. The runner stops before its own count of spend passes `SPEND_CAP_USD` (default 3.5). That count includes every recorded call under `results/`, our run too (about $1.12), so set the cap to your budget plus that.

**These are not real Grafana screenshots.** Our renderer draws them in the style of Grafana's dark theme (panel colours, Inter font, classic palette, threshold lines and regions, list legend). Real panels have more variety, and a model trained on real Grafana screenshots may do better or worse on ours. See "What this cannot tell you" below.

## The claim it could have disproved

Set before measuring:

> nemotron-3.5-super-vl reads the key facts of a rendered metrics panel (peak value within 5%, time of the peak, whether a threshold was crossed, which series is highest) on at least 90 of 100 panels, for under $0.001 per screenshot.

**Result: the claim failed.** Nemotron 3.5 Super VL got all four facts right on 48 of 100 panels with reasoning off (95% CI 38.5 to 57.7%) and 54 of 100 with reasoning on (44.3 to 63.4%). The cost limit held only with reasoning off: $0.00026 per screenshot, against $0.0024 with reasoning on.

## What each script does

| script | output | what it does |
|---|---|---|
| `scripts/01-render-panels.mjs` | `data/panels/*.png`, `data/truth.jsonl`, `data/alerts.jsonl` | Draws 100 seeded panels (mulberry32) as SVG and converts them to PNG. Records the truth from the same numbers it draws, and the alert payload a Grafana rule on the same query (reduced with `max` over the panel's range) would send. |
| `scripts/01b-check-panels.mjs` | `results/panel-check.txt` | Reads every panel back from the drawn SVG only (tick labels, clock labels, line colours, legend; band heights at the peak on stacked panels) and compares it with the truth. Also checks that each PNG is byte-identical to a fresh render. |
| `scripts/01c-break-renderer.mjs` | `results/break-renderer.txt` | Breaks the renderer three times in a temporary copy (wrong byte labels, lines drawn 3% high, stacked bands in the wrong colours) and fails unless the check reports the expected kind of problem for each. |
| `scripts/00-model-access.mjs` | `results/model-access/<date>.jsonl`, `.txt` | Sends the question with no image, then with the smallest and the largest panel, to each candidate. A model "accepts images" only if the prompt token count rises with the image. |
| `scripts/00b-reasoning-switch.mjs` | `results/model-access/reasoning-switch-<date>.jsonl` | Tries the usual ways to turn reasoning off on one panel. |
| `scripts/02-run-models.mjs` | `results/raw/<config>.jsonl` | Asks each configuration (`lib/configs.mjs`) the same question per panel. Stamps every call, one writer per file, resumes after a crash, retries 429 and 5xx with backoff, stops before the spend cap. |
| `scripts/03-score.mjs` | `results/summary.md`, `summary.json`, `failures.json` | Scores every answer. Refuses unstamped, mixed or stale files, and any record whose configuration or model does not match its file (`lib/records.mjs`). Per question, per panel feature, repeat runs, paired sign tests, tolerance sensitivity, worst misses with PNG paths. |
| `scripts/04-cost.mjs` | `results/cost.md`, `cost.json` | Cost per screenshot from reported tokens and `prices.json`, run 1 only. Image tokens by panel size. |
| `scripts/05-crosscheck.mjs` | `results/crosscheck.md`, `.json` | Applies the bot's rules (`lib/bot.mjs`) to every recorded read. How many wrong reads it catches, and how many correct reads it blocks. No API calls. |
| `scripts/05b-bot-demo.mjs` | `results/bot/demo-<date>.jsonl` | Runs the bot live on the panels you name and prints what it would post. |
| `scripts/05c-alert-in-prompt.mjs` | `results/alert-in-prompt/`, `results/alert-in-prompt.md` | Puts the alert of another panel into the prompt. Does the model copy it? |
| `scripts/06-wrong-screenshot.mjs` | `results/wrong-screenshot.md` | Breaks it on purpose: checks each read against the alert of another panel. No API calls. |
| `scripts/07-billing-snapshot.mjs` | `results/billing-<label>.json` | Optional. Saves the billed token lines of the tested models from the invoice preview, or from a closed invoice (`after 2026-10`). Needs `DO_BILLING_TOKEN` with billing read access. |
| `scripts/08-bill-check.mjs` | `results/bill-check.md` | Compares the tokens every recorded call reported with the change in the billed lines between two snapshots. |

## Tolerances

Set before the first run, in `lib/score.mjs`:

- Peak value: within 5% of the true peak, after unit conversion. A unit from another family is wrong. MB and GB count as MiB and GiB, because the axis labels are IEC.
- Peak time: within 5% of the time range (3 min on 1h, 18 min on 6h, 72 min on 24h), as a clock time.
- Threshold crossed: exact (`yes`, `no`, `no threshold`).
- Top series: matched to the nearest legend name, at most 2 edits (1 for names shorter than 8 characters); a tie, or an answer that contains two legend names, is wrong. On stacked panels, the series with the thickest band at the peak.

A panel is read correctly only when all four are right. A reply with no parseable JSON counts as wrong.

## Result (31 October 2026)

| configuration | all four right, run 1 | peak value | peak time | threshold | top series | $ per 1,000 (run 1) | p50 / p95 latency (all runs) |
|---|---|---|---|---|---|---|---|
| qwen3.8-max | 65 | 77 | 97 | 97 | 91 | 1.47 | 1.5 s / 2.2 s |
| gemma-4-31B-it | 64 | 77 | 99 | 96 | 86 | 0.11 | 2.7 s / 3.4 s |
| nemotron-3.5-super-vl, reasoning on | 54 | 71 | 94 | 96 | 80 | 2.37 | 19.0 s / 58.5 s |
| nemotron-3.5-super-vl, reasoning off | 48 | 69 | 96 | 91 | 75 | 0.26 | 1.4 s / 1.8 s |
| llama-4-maverick | 21 | 34 | 89 | 86 | 81 | 0.28 | 2.7 s / 9.1 s |

All at temperature 0, with at most 1,024 output tokens (16,384 with reasoning on). Three runs per panel, except reasoning on: one run on all 100 panels and two more on a fixed 34-panel subset. A separate check ran reasoning on at temperature 0.6 on the subset. Full tables, including per feature, repeat runs and paired tests, are in `results/summary.md`.

- Log y-axis was the hardest feature: Nemotron read the peak value within 5% on 1 of 25 log panels.
- Qwen3.8-Max and Gemma 4 cannot be told apart (14 against 13 discordant panels). Both beat Nemotron with reasoning off. Reasoning on against off: 14 against 8, p = 0.29.
- At temperature 0, Nemotron gave the same four answers in all three runs on 13 of 100 panels; Qwen3.8-Max on 76, Llama 4 Maverick on 92.

The bot (`lib/bot.mjs`) caught 97 of Nemotron's 155 wrong reads (63%) at its default 10% value tolerance, and 125 (81%) at 5%. It blocked no correct read, by construction: our alert value is the true peak and the bot's checks are looser than the scorer's. A real alert that reduces differently from the panel would add false flags. With the wrong alert attached, it said "could not confirm" for 99 of 100 Nemotron reads (`results/wrong-screenshot.md`).

## Method notes

These changed what we report:

- **Cached images flattered the cost.** Runs 2 and 3 send the same image again, and Qwen3.8-Max, Gemma 4 and Llama 4 Maverick serve most of it from the prompt cache. Costs are now from run 1 only. That raised Qwen3.8-Max from $1.11 to $1.47 per 1,000.
- **Rate limits are not latency.** Latency is the attempt that succeeded. The parallel runs had retried 429 attempts: 88 for Nemotron with reasoning off, 7 with reasoning on, 99 for Qwen3.8-Max and 75 for Gemma 4, counted in `results/summary.md`.
- **`reasoning_tokens` is always 0** for Nemotron with reasoning on, while `completion_tokens` includes the reasoning. Cost uses `completion_tokens`.
- **Reasoning off** uses `reasoning_effort: "none"`. `chat_template_kwargs.enable_thinking: false` also works. `/no_think` in the system prompt does not (`results/model-access/reasoning-switch-2026-10-31.jsonl`).
- **Temperature 0 does not explain the reasoning result.** On the 34-panel subset, temperature 0.6 got 19 right, temperature 0 got 20, reasoning off got 20.
- **Two Qwen3.8-Max replies were invalid JSON** (`"thresholdCrossed": no`) and count as wrong. One Qwen3.8-Max reply hit the 1,024-token limit after a complete JSON answer; it counts, because the answer was already there.
- **The ground truth was checked three ways.** The SVG read-back agreed on all 100 panels (largest peak error 0.011%), including the thickest band on the 19 stacked panels. Three deliberate renderer bugs in a copy each made it fail with the expected kind of problem (`scripts/01c-break-renderer.mjs`, `results/break-renderer.txt`). 14 panels were viewed next to their truth records (`results/hand-check.md`).
- **One hypothesis was wrong.** We expected the model to copy the alert's value if the alert was in the prompt. With the wrong alert in the prompt, Nemotron read the image on 81 of 100 panels and copied the alert on 1 (`results/alert-in-prompt.md`).

The whole test, including probes and the live demo, came to about $1.12 at list prices, by our own count of the reported token usage.

## What this cannot tell you

- These are not real Grafana screenshots, and each panel has one clear peak and no legend values.
- 100 panels give wide intervals. Each feature row covers 17 to 36 panels.
- One prompt, no JSON response mode, temperature 0, the models DigitalOcean served on 31 October 2026.
- Prices come from list prices and reported token counts. DigitalOcean lists no separate image rate for these models, so we assume the image tokens inside `prompt_tokens` are billed at the input rate. The closed October 2026 invoice agrees with this (`results/bill-check.md`): for each tested model, the change in billed input, cached input and output tokens equals the totals the API reported for the 1,522 recorded calls. Each rate on the invoice is the list price (Nemotron had no cached tokens, so it has no cached-input line), and the invoice has no separate charge for images. `results/billing-before.json` is the invoice preview before the runs (last updated 06:19 UTC on 31 October, before the first call at 09:15 UTC), and `results/billing-after.json` is the closed October invoice.
- Our account gets HTTP 403 for the GPT models on DigitalOcean, so only open-weight models are in the test (`results/model-access/2026-10-31.txt`).

## Write-up

https://devops-daily.com/posts/vision-model-grafana-panel-digitalocean-inference

## License

MIT. `fonts/Inter.ttf` is the Inter font, under the SIL Open Font License (`fonts/OFL.txt`).
