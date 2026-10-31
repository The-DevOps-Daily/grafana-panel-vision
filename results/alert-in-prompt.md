# The alert in the prompt (wrong screenshot)

Configuration nemotron-3.5-super-vl, stamp def21fbbfd0fdb16. Each panel was sent with the alert of another panel written into the prompt. Within 10%:

- peak matches the alert, not the image (copied): 1 of 100
- peak matches the image, not the alert (read the image): 81 of 100
- matches both (the two values are within 10% of each other): 6 of 100
- matches neither: 12 of 100
- the bot's cross-check against that (wrong) alert said confirmed: 2 of 100

Compare results/wrong-screenshot.md, where the model reads the image blind.
