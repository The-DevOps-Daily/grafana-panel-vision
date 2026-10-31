# Visual check of 14 panels against data/truth.jsonl (2026-10-31)

Each panel PNG was viewed and read first (peak, time, threshold, top series), then compared with its truth record. This is a sanity check of the renderer, not a second ground truth. The automatic check (`scripts/01b-check-panels.mjs`, `results/panel-check.txt`) reads all 100 panels back from the drawn SVG.

| panel | features | read from the image | truth | agrees |
|---|---|---|---|---|
| p002 | 3 series, small, 24h | orders, about 3.2 s just before 18:00, no threshold | 3.23 s at 17:25, orders | yes |
| p003 | log, 4 series | POST /login spike to about 20K req/s at about 14:28 | 21.33K req/s at 14:28, POST /login | yes |
| p005 | log, region threshold | POST /api/cart about 180 req/s at about 20:12, stays under the red region (about 220) | 183.46 req/s at 20:12, not crossed | yes |
| p008 | stacked %, similar colours, line | top edge about 94% near 14:50, crosses the 65% dashed line, node-c3 band thickest | 93.94% at 14:52, crossed, node-c3 | yes |
| p010 | log, similar blues, peak at edge | auth rises at the right edge to about 330 ms near 17:36 | 330.77 ms at 17:36, auth | yes |
| p014 | log base 2, similar greens | palest line just over 1 GiB near 16:00; legend maps it to web-7d9f-q8m1 | 1.13 GiB at 15:58, web-7d9f-q8m1 | yes |
| p016 | small, stacked, line threshold | top edge about 3.8K near 17:00 over the dashed line; bottom green band thickest | 3.83K req/s at 17:05, crossed, GET /api/search | yes |
| p020 | stacked %, region at 49% | top edge about 39% at the right edge; thin red strip at the top is not reached | 39.01% at 12:50, not crossed, node-a1 | yes |
| p021 | log, 5 similar oranges, region | rise at the right edge to about 5.8 GiB, into the red region | 5.78 GiB at 20:17, crossed | yes (top series not readable by colour) |
| p022 | small, stacked, 5 series | top edge about 75 req/s near 01:58; the orange GET /static band grows, the red band on top stays thin | 75.92 req/s at 01:58, GET /static | yes |
| p030 | log, 5 similar oranges, line+region | spike to about 240 req/s at about 22:20, under the line at about 350 | 238.45 req/s at 22:20, not crossed | yes (top series not readable by colour) |
| p033 | small, 4 series, line | payments spike to about 125 ms near 06:25, over the dashed line at about 75 ms | 125.23 ms at 06:25, crossed, payments | yes |
| p034 | stacked bytes, high noise | top edge spike to about 3.2 GiB at about 08:22; green bottom band thickest | 3.19 GiB at 08:22, worker-5c6b-h3t7 | yes |
| p040 | bytes, region | api-66f4-n1r8 peak about 3.1 GiB near 08:10, into the red region (about 1.9 GiB) | 3.12 GiB at 08:10, crossed | yes |

Two observations for the write-up:

- On p021 and p030 (five shades of one colour), the top series cannot be confirmed by eye from the colour alone. The SVG read-back confirms it from the stroke colours.
- On stacked panels the band drawn on top is often thin (p022). A reader who names the top band gets the series wrong.
