# Results (stamp 47afe9459fbc1089)

Tolerances: peak value within 5% (after unit conversion), peak time within 5% of the range (3/18/72 min), threshold exact, top series nearest legend name (<=2 edits, <=1 for short names, ties wrong). Run 1 covers all 100 panels; later runs cover the subset of 34.

## Run 1, 100 panels

| configuration | all four right | 95% CI | peak value | peak time | threshold | top series | non-answers | $ per 1,000 | p50 latency (all runs) | p95 latency (all runs) |
|---|---|---|---|---|---|---|---|---|---|---|
| nemotron-3.5-super-vl | 48/100 | 38.5-57.7% | 69 | 96 | 91 | 75 | 0 | 0.258 | 1.4 s | 1.8 s |
| nemotron-3.5-super-vl+reasoning | 54/100 | 44.3-63.4% | 71 | 94 | 96 | 80 | 0 | 2.372 | 19.0 s | 58.5 s |
| qwen3.8-max | 65/100 | 55.3-73.6% | 77 | 97 | 97 | 91 | 0 | 1.471 | 1.5 s | 2.2 s |
| gemma-4-31B-it | 64/100 | 54.2-72.7% | 77 | 99 | 96 | 86 | 0 | 0.113 | 2.7 s | 3.4 s |
| llama-4-maverick | 21/100 | 14.2-30% | 34 | 89 | 86 | 81 | 0 | 0.283 | 2.7 s | 9.1 s |
| nemotron-3.5-super-vl+reasoning-t0.6 | 19/34 | 39.5-71.1% | 24 | 33 | 32 | 30 | 0 | 2.007 | 21.2 s | 39.3 s |

Accuracy and cost are run 1. Latency covers every successful call in all runs, and is the attempt that succeeded; retried attempts are counted below, not timed. Non-answers count as wrong in "all four right".

## By panel feature, run 1 (all four right)

| feature | n | nemotron-3.5-super-vl | nemotron-3.5-super-vl+reasoning | qwen3.8-max | gemma-4-31B-it | llama-4-maverick | nemotron-3.5-super-vl+reasoning-t0.6 |
|---|---|---|---|---|---|---|---|
| all panels | 100 | 48 (48.0%) | 54 (54.0%) | 65 (65.0%) | 64 (64.0%) | 21 (21.0%) | 19 (55.9%) |
| log y-axis | 25 | 1 (4.0%) | 2 (8.0%) | 2 (8.0%) | 8 (32.0%) | 1 (4.0%) | 0 (0.0%) |
| stacked | 19 | 6 (31.6%) | 8 (42.1%) | 12 (63.2%) | 13 (68.4%) | 3 (15.8%) | 2 (33.3%) |
| 4-5 series | 36 | 11 (30.6%) | 16 (44.4%) | 21 (58.3%) | 20 (55.6%) | 3 (8.3%) | 5 (55.6%) |
| 1 series | 17 | 15 (88.2%) | 13 (76.5%) | 15 (88.2%) | 13 (76.5%) | 6 (35.3%) | 5 (83.3%) |
| small panel | 19 | 8 (42.1%) | 9 (47.4%) | 12 (63.2%) | 11 (57.9%) | 3 (15.8%) | 0 (0.0%) |
| similar colours | 27 | 7 (25.9%) | 10 (37.0%) | 15 (55.6%) | 13 (48.1%) | 5 (18.5%) | 3 (42.9%) |
| threshold shown | 65 | 31 (47.7%) | 38 (58.5%) | 42 (64.6%) | 41 (63.1%) | 14 (21.5%) | 15 (60.0%) |
| no threshold | 35 | 17 (48.6%) | 16 (45.7%) | 23 (65.7%) | 23 (65.7%) | 7 (20.0%) | 4 (44.4%) |
| peak at right edge | 28 | 13 (46.4%) | 16 (57.1%) | 20 (71.4%) | 16 (57.1%) | 4 (14.3%) | 5 (50.0%) |
| high noise | 26 | 15 (57.7%) | 13 (50.0%) | 18 (69.2%) | 17 (65.4%) | 5 (19.2%) | 5 (50.0%) |
| range 1h | 33 | 16 (48.5%) | 18 (54.5%) | 22 (66.7%) | 22 (66.7%) | 6 (18.2%) | 4 (44.4%) |
| range 6h | 36 | 17 (47.2%) | 19 (52.8%) | 23 (63.9%) | 20 (55.6%) | 6 (16.7%) | 10 (66.7%) |
| range 24h | 31 | 15 (48.4%) | 17 (54.8%) | 20 (64.5%) | 22 (71.0%) | 9 (29.0%) | 5 (50.0%) |

## By panel feature and question, run 1

### nemotron-3.5-super-vl

| feature | n | value | time | threshold | series | all four |
|---|---|---|---|---|---|---|
| all panels | 100 | 69 | 96 | 91 | 75 | 48 |
| log y-axis | 25 | 1 | 23 | 20 | 18 | 1 |
| stacked | 19 | 15 | 18 | 17 | 12 | 6 |
| 4-5 series | 36 | 19 | 35 | 33 | 24 | 11 |
| 1 series | 17 | 15 | 17 | 17 | 17 | 15 |
| small panel | 19 | 11 | 18 | 18 | 14 | 8 |
| similar colours | 27 | 18 | 27 | 26 | 11 | 7 |
| threshold shown | 65 | 44 | 62 | 58 | 51 | 31 |
| no threshold | 35 | 25 | 34 | 33 | 24 | 17 |
| peak at right edge | 28 | 18 | 26 | 23 | 23 | 13 |
| high noise | 26 | 23 | 25 | 23 | 22 | 15 |
| range 1h | 33 | 21 | 31 | 31 | 26 | 16 |
| range 6h | 36 | 25 | 35 | 33 | 27 | 17 |
| range 24h | 31 | 23 | 30 | 27 | 22 | 15 |

### nemotron-3.5-super-vl+reasoning

| feature | n | value | time | threshold | series | all four |
|---|---|---|---|---|---|---|
| all panels | 100 | 71 | 94 | 96 | 80 | 54 |
| log y-axis | 25 | 2 | 21 | 23 | 21 | 2 |
| stacked | 19 | 18 | 18 | 17 | 11 | 8 |
| 4-5 series | 36 | 21 | 33 | 34 | 27 | 16 |
| 1 series | 17 | 13 | 17 | 17 | 17 | 13 |
| small panel | 19 | 12 | 17 | 18 | 15 | 9 |
| similar colours | 27 | 19 | 23 | 25 | 14 | 10 |
| threshold shown | 65 | 47 | 62 | 61 | 56 | 38 |
| no threshold | 35 | 24 | 32 | 35 | 24 | 16 |
| peak at right edge | 28 | 22 | 23 | 27 | 21 | 16 |
| high noise | 26 | 21 | 25 | 25 | 19 | 13 |
| range 1h | 33 | 22 | 31 | 31 | 29 | 18 |
| range 6h | 36 | 26 | 34 | 36 | 27 | 19 |
| range 24h | 31 | 23 | 29 | 29 | 24 | 17 |

### qwen3.8-max

| feature | n | value | time | threshold | series | all four |
|---|---|---|---|---|---|---|
| all panels | 100 | 77 | 97 | 97 | 91 | 65 |
| log y-axis | 25 | 4 | 24 | 24 | 23 | 2 |
| stacked | 19 | 19 | 19 | 17 | 14 | 12 |
| 4-5 series | 36 | 24 | 35 | 34 | 34 | 21 |
| 1 series | 17 | 15 | 17 | 17 | 17 | 15 |
| small panel | 19 | 16 | 17 | 19 | 16 | 12 |
| similar colours | 27 | 21 | 25 | 26 | 22 | 15 |
| threshold shown | 65 | 50 | 64 | 62 | 59 | 42 |
| no threshold | 35 | 27 | 33 | 35 | 32 | 23 |
| peak at right edge | 28 | 24 | 27 | 28 | 24 | 20 |
| high noise | 26 | 22 | 26 | 24 | 23 | 18 |
| range 1h | 33 | 24 | 32 | 32 | 33 | 22 |
| range 6h | 36 | 28 | 35 | 35 | 30 | 23 |
| range 24h | 31 | 25 | 30 | 30 | 28 | 20 |

### gemma-4-31B-it

| feature | n | value | time | threshold | series | all four |
|---|---|---|---|---|---|---|
| all panels | 100 | 77 | 99 | 96 | 86 | 64 |
| log y-axis | 25 | 10 | 24 | 24 | 21 | 8 |
| stacked | 19 | 17 | 19 | 17 | 15 | 13 |
| 4-5 series | 36 | 27 | 36 | 34 | 29 | 20 |
| 1 series | 17 | 14 | 17 | 16 | 17 | 13 |
| small panel | 19 | 14 | 18 | 19 | 16 | 11 |
| similar colours | 27 | 21 | 27 | 26 | 17 | 13 |
| threshold shown | 65 | 49 | 64 | 61 | 57 | 41 |
| no threshold | 35 | 28 | 35 | 35 | 29 | 23 |
| peak at right edge | 28 | 18 | 27 | 28 | 25 | 16 |
| high noise | 26 | 19 | 26 | 24 | 25 | 17 |
| range 1h | 33 | 29 | 33 | 32 | 26 | 22 |
| range 6h | 36 | 24 | 36 | 35 | 31 | 20 |
| range 24h | 31 | 24 | 30 | 29 | 29 | 22 |

### llama-4-maverick

| feature | n | value | time | threshold | series | all four |
|---|---|---|---|---|---|---|
| all panels | 100 | 34 | 89 | 86 | 81 | 21 |
| log y-axis | 25 | 3 | 23 | 17 | 19 | 1 |
| stacked | 19 | 7 | 13 | 16 | 16 | 3 |
| 4-5 series | 36 | 9 | 33 | 30 | 22 | 3 |
| 1 series | 17 | 7 | 15 | 16 | 17 | 6 |
| small panel | 19 | 5 | 13 | 16 | 17 | 3 |
| similar colours | 27 | 11 | 26 | 24 | 17 | 5 |
| threshold shown | 65 | 24 | 57 | 52 | 52 | 14 |
| no threshold | 35 | 10 | 32 | 34 | 29 | 7 |
| peak at right edge | 28 | 9 | 21 | 24 | 25 | 4 |
| high noise | 26 | 8 | 23 | 24 | 21 | 5 |
| range 1h | 33 | 12 | 30 | 28 | 25 | 6 |
| range 6h | 36 | 8 | 32 | 31 | 31 | 6 |
| range 24h | 31 | 14 | 27 | 27 | 25 | 9 |

### nemotron-3.5-super-vl+reasoning-t0.6

| feature | n | value | time | threshold | series | all four |
|---|---|---|---|---|---|---|
| all panels | 34 | 24 | 33 | 32 | 30 | 19 |
| log y-axis | 8 | 0 | 7 | 7 | 8 | 0 |
| stacked | 6 | 5 | 6 | 5 | 4 | 2 |
| 4-5 series | 9 | 6 | 9 | 9 | 8 | 5 |
| 1 series | 6 | 5 | 6 | 6 | 6 | 5 |
| small panel | 5 | 2 | 4 | 4 | 3 | 0 |
| similar colours | 7 | 6 | 7 | 6 | 5 | 3 |
| threshold shown | 25 | 19 | 24 | 23 | 22 | 15 |
| no threshold | 9 | 5 | 9 | 9 | 8 | 4 |
| peak at right edge | 10 | 7 | 9 | 9 | 8 | 5 |
| high noise | 10 | 7 | 10 | 10 | 8 | 5 |
| range 1h | 9 | 5 | 9 | 9 | 8 | 4 |
| range 6h | 15 | 11 | 15 | 15 | 14 | 10 |
| range 24h | 10 | 8 | 9 | 8 | 8 | 5 |

## Repeat runs

Panels with every run recorded (all 100 for three full runs, the 34-panel subset otherwise).

| configuration | runs | all four right per run | same verdict in every run | same four facts in every run | right in every run |
|---|---|---|---|---|---|
| nemotron-3.5-super-vl | 1, 2, 3 | 48/100, 49/100, 48/100 | 71/100 | 13/100 | 33/100 |
| nemotron-3.5-super-vl+reasoning | 1, 2, 3 | 54/100, 16/34, 19/34 | 29/34 | 3/34 | 16/34 |
| qwen3.8-max | 1, 2, 3 | 65/100, 64/100, 62/100 | 97/100 | 76/100 | 62/100 |
| gemma-4-31B-it | 1, 2, 3 | 64/100, 62/100, 63/100 | 98/100 | 62/100 | 62/100 |
| llama-4-maverick | 1, 2, 3 | 21/100, 22/100, 21/100 | 99/100 | 92/100 | 21/100 |

## Peak value at looser tolerances, run 1 (sensitivity only; the claim uses 5%)

| configuration | within 5% | within 10% | within 20% | unit slips (x1000 or x1024), run 1 |
|---|---|---|---|---|
| nemotron-3.5-super-vl | 69 | 82 | 86 | 0 |
| nemotron-3.5-super-vl+reasoning | 71 | 82 | 88 | 0 |
| qwen3.8-max | 77 | 87 | 94 | 1 (p037) |
| gemma-4-31B-it | 77 | 93 | 97 | 0 |
| llama-4-maverick | 34 | 61 | 81 | 0 |
| nemotron-3.5-super-vl+reasoning-t0.6 | 24 | 28 | 29 | 0 |

## Calls, retries and tokens

Non-answers over all runs: nemotron-3.5-super-vl 0; nemotron-3.5-super-vl+reasoning 0; qwen3.8-max unparseable 2; gemma-4-31B-it 0; llama-4-maverick 0; nemotron-3.5-super-vl+reasoning-t0.6 0.

| configuration | calls | attempts | 429 | 5xx | network/timeout | other 4xx | truncated (finish=length) | mean prompt tokens | mean completion tokens | p95 completion | reasoning_tokens reported | calls with reasoning text | mean $ per call | max $ per call |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| nemotron-3.5-super-vl | 301 | 388 | 88 | 0 | 0 | 0 | 0 | 652 | 97 | 114 | 0 | 0 | 0.00026 | 0.00033 |
| nemotron-3.5-super-vl+reasoning | 168 | 175 | 7 | 0 | 0 | 0 | 0 | 645 | 3215 | 7969 | 0 | 168 | 0.00237 | 0.00755 |
| qwen3.8-max | 303 | 399 | 99 | 0 | 0 | 0 | 1 | 594 | 120 | 140 | 0 | 0 | 0.00147 | 0.00695 |
| gemma-4-31B-it | 301 | 375 | 75 | 0 | 0 | 0 | 0 | 604 | 101 | 115 | 0 | 0 | 0.00011 | 0.00012 |
| llama-4-maverick | 300 | 300 | 0 | 0 | 0 | 0 | 0 | 1096 | 72 | 86 | 0 | 0 | 0.00028 | 0.00036 |
| nemotron-3.5-super-vl+reasoning-t0.6 | 34 | 34 | 0 | 0 | 0 | 0 | 0 | 635 | 2795 | 5125 | 0 | 34 | 0.00201 | 0.00566 |

## Paired comparison, run 1 (panels right in one and wrong in the other)

| A | B | A only | B only | sign test p |
|---|---|---|---|---|
| nemotron-3.5-super-vl | nemotron-3.5-super-vl+reasoning | 8 | 14 | 0.286 |
| nemotron-3.5-super-vl | qwen3.8-max | 3 | 20 | 0 |
| nemotron-3.5-super-vl | gemma-4-31B-it | 8 | 24 | 0.007 |
| nemotron-3.5-super-vl | llama-4-maverick | 32 | 5 | 0 |
| nemotron-3.5-super-vl | nemotron-3.5-super-vl+reasoning-t0.6 | 4 | 3 | 1 |
| nemotron-3.5-super-vl+reasoning | qwen3.8-max | 6 | 17 | 0.035 |
| nemotron-3.5-super-vl+reasoning | gemma-4-31B-it | 10 | 20 | 0.099 |
| nemotron-3.5-super-vl+reasoning | llama-4-maverick | 36 | 3 | 0 |
| nemotron-3.5-super-vl+reasoning | nemotron-3.5-super-vl+reasoning-t0.6 | 2 | 1 | 1 |
| qwen3.8-max | gemma-4-31B-it | 14 | 13 | 1 |
| qwen3.8-max | llama-4-maverick | 49 | 5 | 0 |
| qwen3.8-max | nemotron-3.5-super-vl+reasoning-t0.6 | 5 | 0 | 0.063 |
| gemma-4-31B-it | llama-4-maverick | 48 | 5 | 0 |
| gemma-4-31B-it | nemotron-3.5-super-vl+reasoning-t0.6 | 3 | 1 | 0.625 |
| llama-4-maverick | nemotron-3.5-super-vl+reasoning-t0.6 | 1 | 14 | 0.001 |

## The claim

"nemotron-3.5-super-vl reads the key facts of a rendered metrics panel on at least 90 of 100 panels, for under $0.001 per screenshot."

- nemotron-3.5-super-vl: 48/100 all four right (misses 90), mean $0.00026 per screenshot (under $0.001).
- nemotron-3.5-super-vl+reasoning: 54/100 all four right (misses 90), mean $0.00237 per screenshot (over $0.001).

## Worst misses, run 1

### nemotron-3.5-super-vl

- p072 (data/panels/p072.png): wrong value, series; truth 245.87 ms at 07:18, threshold yes, top inventory; said 500 ms at 07:00, threshold yes, top cart (value +103.4%)
- p003 (data/panels/p003.png): wrong value, threshold; truth 21.33K req/s at 14:28, threshold no threshold, top POST /login; said 30 req/s at 14:30, threshold no, top POST /login (value -99.9%)
- p066 (data/panels/p066.png): wrong value, threshold; truth 161.06 req/s at 19:20, threshold no, top GET /static; said 300 req/s at 19:00, threshold yes, top GET /static (value +86.3%)
- p095 (data/panels/p095.png): wrong value, threshold; truth 365.84 ms at 07:54, threshold no threshold, top search; said 0.6 s at 07:53, threshold no, top search (value +64%)
- p005 (data/panels/p005.png): wrong value; truth 183.46 req/s at 20:12, threshold no, top POST /api/cart; said 300 req/s at 20:05, threshold no, top POST /api/cart (value +63.5%)
- p087 (data/panels/p087.png): wrong value; truth 6.64K req/s at 03:45, threshold yes, top POST /login; said 10000 req/s at 04:00, threshold yes, top POST /login (value +50.6%)
- p025 (data/panels/p025.png): wrong value; truth 1.39 GiB at 04:43, threshold no threshold, top worker-5c6b-z9p2; said 2 GiB at 04:43, threshold no threshold, top worker-5c6b-z9p2 (value +44%)
- p021 (data/panels/p021.png): wrong value, series; truth 5.78 GiB at 20:17, threshold yes, top web-7d9f-x2k4; said 8 GiB at 20:14, threshold yes, top worker-5c6b-h3t7 (value +38.3%)

### nemotron-3.5-super-vl+reasoning

- p082 (data/panels/p082.png): wrong value, time, threshold; truth 2.01 s at 10:35, threshold no, top search; said 4 s at 08:00, threshold yes, top search (value +98.9%)
- p064 (data/panels/p064.png): wrong value; truth 183.73 req/s at 06:26, threshold yes, top GET /api/orders; said 300 req/s at 06:30, threshold yes, top GET /api/orders (value +63.3%)
- p032 (data/panels/p032.png): wrong value, time, series; truth 188.26 req/s at 11:20, threshold no threshold, top GET /api/search; said 300 req/s at 10:00, threshold no threshold, top GET /api/orders (value +59.4%)
- p010 (data/panels/p010.png): wrong value, time; truth 330.77 ms at 17:36, threshold no threshold, top auth; said 500 ms at 17:30, threshold no threshold, top auth (value +51.2%)
- p003 (data/panels/p003.png): wrong value; truth 21.33K req/s at 14:28, threshold no threshold, top POST /login; said 30000 req/s at 14:30, threshold no threshold, top POST /login (value +40.7%)
- p095 (data/panels/p095.png): wrong value; truth 365.84 ms at 07:54, threshold no threshold, top search; said 500 ms at 07:52, threshold no threshold, top search (value +36.7%)
- p047 (data/panels/p047.png): wrong value; truth 461.1 ms at 13:24, threshold yes, top inventory; said 300 ms at 13:35, threshold yes, top inventory (value -34.9%)
- p037 (data/panels/p037.png): wrong value; truth 1.59K req/s at 05:58, threshold yes, top POST /login; said 2000 req/s at 06:00, threshold yes, top POST //login (value +25.8%)

### qwen3.8-max

- p037 (data/panels/p037.png): wrong value; truth 1.59K req/s at 05:58, threshold yes, top POST /login; said 1.6 req/s at 06:00, threshold yes, top POST /login (value -99.9%)
- p030 (data/panels/p030.png): wrong value; truth 238.45 req/s at 22:20, threshold no, top GET /api/orders; said 400 req/s at 22:20, threshold no, top GET /api/orders (value +67.7%)
- p005 (data/panels/p005.png): wrong value; truth 183.46 req/s at 20:12, threshold no, top POST /api/cart; said 300 req/s at 20:10, threshold no, top POST /api/cart (value +63.5%)
- p032 (data/panels/p032.png): wrong value; truth 188.26 req/s at 11:20, threshold no threshold, top GET /api/search; said 300 req/s at 11:00, threshold no threshold, top GET /api/search (value +59.4%)
- p066 (data/panels/p066.png): wrong value; truth 161.06 req/s at 19:20, threshold no, top GET /static; said 200 req/s at 19:00, threshold no, top GET /static (value +24.2%)
- p010 (data/panels/p010.png): wrong value; truth 330.77 ms at 17:36, threshold no threshold, top auth; said 400 ms at 17:38, threshold no threshold, top auth (value +20.9%)
- p097 (data/panels/p097.png): wrong value; truth 1.24 s at 07:50, threshold yes, top checkout; said 1 s at 07:00, threshold yes, top checkout (value -19.5%)
- p072 (data/panels/p072.png): wrong value, series; truth 245.87 ms at 07:18, threshold yes, top inventory; said 200 ms at 07:15, threshold yes, top cart (value -18.7%)

### gemma-4-31B-it

- p047 (data/panels/p047.png): wrong value, threshold; truth 461.1 ms at 13:24, threshold yes, top inventory; said 300 ms at 13:20, threshold no, top inventory (value -34.9%)
- p082 (data/panels/p082.png): wrong value, time; truth 2.01 s at 10:35, threshold no, top search; said 1.5 s at 09:00, threshold no, top search (value -25.4%)
- p032 (data/panels/p032.png): wrong value; truth 188.26 req/s at 11:20, threshold no threshold, top GET /api/search; said 150 req/s at 11:00, threshold no threshold, top GET /api/search (value -20.3%)
- p097 (data/panels/p097.png): wrong value; truth 1.24 s at 07:50, threshold yes, top checkout; said 1 s at 08:00, threshold yes, top checkout (value -19.5%)
- p072 (data/panels/p072.png): wrong value, series; truth 245.87 ms at 07:18, threshold yes, top inventory; said 200 ms at 07:15, threshold yes, top cart (value -18.7%)
- p064 (data/panels/p064.png): wrong value; truth 183.73 req/s at 06:26, threshold yes, top GET /api/orders; said 150 req/s at 06:20, threshold yes, top GET /api/orders (value -18.4%)
- p095 (data/panels/p095.png): wrong value; truth 365.84 ms at 07:54, threshold no threshold, top search; said 300 ms at 07:53, threshold no threshold, top search (value -18%)
- p087 (data/panels/p087.png): wrong value; truth 6.64K req/s at 03:45, threshold yes, top POST /login; said 6000 req/s at 04:00, threshold yes, top POST /login (value -9.7%)

### llama-4-maverick

- p003 (data/panels/p003.png): wrong value; truth 21.33K req/s at 14:28, threshold no threshold, top POST /login; said 60 K req/s at 14:40, threshold no threshold, top POST /login (value +181.3%)
- p090 (data/panels/p090.png): wrong value; truth 106.72 ms at 22:20, threshold yes, top search; said 200 ms at 22:00, threshold yes, top search (value +87.4%)
- p066 (data/panels/p066.png): wrong value; truth 161.06 req/s at 19:20, threshold no, top GET /static; said 300 req/s at 18:30, threshold no, top GET /static (value +86.3%)
- p010 (data/panels/p010.png): wrong value; truth 330.77 ms at 17:36, threshold no threshold, top auth; said 600 ms at 17:35, threshold no threshold, top auth (value +81.4%)
- p079 (data/panels/p079.png): wrong value; truth 269.13 ms at 22:58, threshold yes, top auth; said 480 ms at 22:50, threshold yes, top auth (value +78.3%)
- p001 (data/panels/p001.png): wrong value; truth 22.71K req/s at 23:30, threshold no threshold, top POST /api/cart; said 35 K req/s at 23:33, threshold no threshold, top POST /api/cart (value +54.1%)
- p097 (data/panels/p097.png): wrong value, threshold; truth 1.24 s at 07:50, threshold yes, top checkout; said 600 ms at 07:00, threshold no, top checkout (value -51.7%)
- p089 (data/panels/p089.png): wrong value; truth 68.63% at 12:48, threshold no, top node-a1; said 40 % at 12:30, threshold no, top node-a1 (value -41.7%)

### nemotron-3.5-super-vl+reasoning-t0.6

- p010 (data/panels/p010.png): wrong value; truth 330.77 ms at 17:36, threshold no threshold, top auth; said 1 s at 17:35, threshold no threshold, top auth (value +202.3%)
- p097 (data/panels/p097.png): wrong value; truth 1.24 s at 07:50, threshold yes, top checkout; said 2 s at 08:00, threshold yes, top checkout (value +60.9%)
- p082 (data/panels/p082.png): wrong value, time, threshold; truth 2.01 s at 10:35, threshold no, top search; said 3 s at 12:00, threshold yes, top search (value +49.2%)
- p079 (data/panels/p079.png): wrong value; truth 269.13 ms at 22:58, threshold yes, top auth; said 400 ms at 23:00, threshold yes, top auth (value +48.6%)
- p037 (data/panels/p037.png): wrong value; truth 1.59K req/s at 05:58, threshold yes, top POST /login; said 2000 req/s at 06:00, threshold yes, top POST /login (value +25.8%)
- p001 (data/panels/p001.png): wrong value; truth 22.71K req/s at 23:30, threshold no threshold, top POST /api/cart; said 20000 req/s at 23:30, threshold no threshold, top POST /api/cart (value -11.9%)
- p100 (data/panels/p100.png): wrong value; truth 1.37 s at 15:22, threshold no threshold, top orders; said 1.5 s at 15:05, threshold no threshold, top orders (value +9.2%)
- p064 (data/panels/p064.png): wrong value; truth 183.73 req/s at 06:26, threshold yes, top GET /api/orders; said 200 req/s at 06:30, threshold yes, top GET /api/orders (value +8.9%)

