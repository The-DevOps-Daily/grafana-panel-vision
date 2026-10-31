# Cross-check: does the bot catch wrong reads?

Stamp 47afe9459fbc1089. Every recorded call, all runs. The bot compares the model's blind read with the alert payload: peak value within the tolerance, the series name when the alert has one, and the threshold state when the model reports a threshold. Peak time is not checked: the alert payload does not carry it.

| configuration | tolerance | reads | wrong reads | caught | missed | right reads flagged | confirmed reads that were wrong |
|---|---|---|---|---|---|---|---|
| nemotron-3.5-super-vl | 5% | 300 | 155 | 125 (81%) | 30 | 0 | 30 of 175 (17.1%) |
| nemotron-3.5-super-vl | 10% | 300 | 155 | 97 (63%) | 58 | 0 | 58 of 203 (28.6%) |
| nemotron-3.5-super-vl | 20% | 300 | 155 | 90 (58%) | 65 | 0 | 65 of 210 (31.0%) |
| nemotron-3.5-super-vl+reasoning | 5% | 168 | 79 | 61 (77%) | 18 | 0 | 18 of 107 (16.8%) |
| nemotron-3.5-super-vl+reasoning | 10% | 168 | 79 | 45 (57%) | 34 | 0 | 34 of 123 (27.6%) |
| nemotron-3.5-super-vl+reasoning | 20% | 168 | 79 | 36 (46%) | 43 | 0 | 43 of 132 (32.6%) |
| qwen3.8-max | 5% | 300 | 109 | 90 (83%) | 19 | 0 | 19 of 210 (9.0%) |
| qwen3.8-max | 10% | 300 | 109 | 58 (53%) | 51 | 0 | 51 of 242 (21.1%) |
| qwen3.8-max | 20% | 300 | 109 | 43 (39%) | 66 | 0 | 66 of 257 (25.7%) |
| gemma-4-31B-it | 5% | 300 | 111 | 98 (88%) | 13 | 0 | 13 of 202 (6.4%) |
| gemma-4-31B-it | 10% | 300 | 111 | 54 (49%) | 57 | 0 | 57 of 246 (23.2%) |
| gemma-4-31B-it | 20% | 300 | 111 | 45 (41%) | 66 | 0 | 66 of 255 (25.9%) |
| llama-4-maverick | 5% | 300 | 236 | 214 (91%) | 22 | 0 | 22 of 86 (25.6%) |
| llama-4-maverick | 10% | 300 | 236 | 143 (61%) | 93 | 0 | 93 of 157 (59.2%) |
| llama-4-maverick | 20% | 300 | 236 | 102 (43%) | 134 | 0 | 134 of 198 (67.7%) |
| nemotron-3.5-super-vl+reasoning-t0.6 | 5% | 34 | 15 | 12 (80%) | 3 | 0 | 3 of 22 (13.6%) |
| nemotron-3.5-super-vl+reasoning-t0.6 | 10% | 34 | 15 | 8 (53%) | 7 | 0 | 7 of 26 (26.9%) |
| nemotron-3.5-super-vl+reasoning-t0.6 | 20% | 34 | 15 | 7 (47%) | 8 | 0 | 8 of 27 (29.6%) |

## What the 10% check let through, by the facts that were wrong

- nemotron-3.5-super-vl: value 24, series 21, threshold 5, time 3, value+time 4, threshold+series 1
- nemotron-3.5-super-vl+reasoning: value 16, series 11, threshold 4, time+series 1, time 2
- qwen3.8-max: value 32, series 15, time 4
- gemma-4-31B-it: value 41, series 9, threshold 3, value+threshold+series 3, time 1
- llama-4-maverick: value 61, time 9, series 4, threshold 6, time+threshold 3, value+time 7, value+series 3
- nemotron-3.5-super-vl+reasoning-t0.6: series 2, value 4, threshold 1
