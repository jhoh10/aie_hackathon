# Presentation graphics

**To view:** [slides.pdf](slides.pdf) opens on GitHub (6 slides). The results tables are in [../verifier/results/summary.md](../verifier/results/summary.md).

Editable originals on claude.ai. They are private to their owner's account until shared from each page's Share menu, so only the owner can open these links for now:

- Slide deck: https://claude.ai/artifact/7xuTH5ZMozXnB3w5Wa3WRW (downloads as PowerPoint or PDF)
- Results diagrams: https://claude.ai/artifact/7cH4e89QAiXjvaW2zWs3Ci

The files here are their sources, so the team keeps them if the links change:

- `deck.json` and `slides/`: the 6 slides in the Slides artifact format (cover, process before and after, what a person reads, real evidence from case inj2, independence rules, results).
- `results-page/index.html`: the diagrams page. It reads `verifier/results/per-case.json` through the dashboard runtime, so it only renders inside that artifact.

Every number on the slides comes from `verifier/results/`.

## Rebuilding the PDF

After changing `deck.json` or `slides/`, run `python3 presentation/build_pdf.py` (needs Google Chrome and a network connection for the fonts). It writes `slides.pdf`.
