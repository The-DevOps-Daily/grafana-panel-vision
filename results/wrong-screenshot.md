# Wrong screenshot attached to the alert

Stamp 47afe9459fbc1089. Run 1 reads, each checked against the alert of another panel with the same unit. Tolerance 10%.

| configuration | reads | could not confirm | confirmed anyway |
|---|---|---|---|
| gemma-4-31B-it | 100 | 100 | 0 |
| llama-4-maverick | 100 | 100 | 0 |
| nemotron-3.5-super-vl+reasoning-t0.6 | 34 | 34 | 0 |
| nemotron-3.5-super-vl+reasoning | 100 | 98 | 2 |
| nemotron-3.5-super-vl | 100 | 99 | 1 |
| qwen3.8-max | 100 | 99 | 1 |

Confirmed anyway (the wrong alert happened to agree with the read):

- nemotron-3.5-super-vl+reasoning: screenshot p015 confirmed for the alert of p016 (alert max 3.83K req/s, model read 3800 req/s, alert on a sum, no series check)
- nemotron-3.5-super-vl+reasoning: screenshot p030 confirmed for the alert of p032 (alert max 188.26 req/s, model read 200 req/s, series GET /api/search vs GET /api/search)
- nemotron-3.5-super-vl: screenshot p015 confirmed for the alert of p016 (alert max 3.83K req/s, model read 3500 req/s, alert on a sum, no series check)
- qwen3.8-max: screenshot p015 confirmed for the alert of p016 (alert max 3.83K req/s, model read 3500 req/s, alert on a sum, no series check)
