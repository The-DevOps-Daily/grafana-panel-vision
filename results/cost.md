# Cost per screenshot

Stamp 47afe9459fbc1089. From the usage block of every successful call and the list prices in prices.json (https://docs.digitalocean.com/products/inference/details/pricing/ (page says 'Last verified 30 Oct 2026'; read 2026-10-31). USD per 1M tokens, standard processing.). The page lists no separate image-input rate for these chat models. Image tokens are billed as input tokens here; that is our assumption, checked only against the usage the API reports.

Run 1 only (each image sent once).

| configuration | calls | input $/1M | output $/1M | mean prompt tokens | of which image (est.) | cached prompt tokens, run 1 | cached, runs 2-3 | mean completion tokens | input share of cost | $ per screenshot | $ per 1,000 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| nemotron-3.5-super-vl | 100 | 0.3 | 0.65 | 652 | 333 | 0 | 0 | 97 | 76% | 0.00026 | 0.258 |
| nemotron-3.5-super-vl+reasoning | 100 | 0.3 | 0.65 | 652 | 333 | 0 | 0 | 3349 | 8% | 0.00237 | 2.372 |
| qwen3.8-max | 100 | 2 | 6 | 594 | 263 | 262 | 531 | 126 | 49% | 0.00147 | 1.471 |
| gemma-4-31B-it | 100 | 0.18 | 0.5 | 604 | 262 | 325 | 488 | 102 | 55% | 0.00011 | 0.113 |
| llama-4-maverick | 100 | 0.25 | 0.87 | 1096 | 779 | 271 | 1044 | 72 | 78% | 0.00028 | 0.283 |
| nemotron-3.5-super-vl+reasoning-t0.6 | 34 | 0.3 | 0.65 | 635 | 316 | 0 | - | 2795 | 9% | 0.00201 | 2.007 |

## Image tokens by panel size (mean prompt tokens minus the text-only prompt)

| configuration | 1000x500 | 800x400 | 800x360 | 600x320 | 420x230 | 360x200 |
|---|---|---|---|---|---|---|
| nemotron-3.5-super-vl | 514 | 327 | 302 | 278 | 266 | 288 |
| nemotron-3.5-super-vl+reasoning | 514 | 327 | 302 | 278 | 266 | 288 |
| qwen3.8-max | 498 | 302 | 277 | 192 | 93 | 68 |
| gemma-4-31B-it | 255 | 255 | 266 | 266 | 266 | 266 |
| llama-4-maverick | 1017 | 1017 | 1017 | 437 | 437 | 437 |
| nemotron-3.5-super-vl+reasoning-t0.6 | 514 | 327 | 302 | 278 | 266 | 288 |
