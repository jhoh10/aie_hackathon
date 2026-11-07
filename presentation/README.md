# Presentation graphics

Live versions (private until shared from each page's Share menu):

- Slide deck: https://claude.ai/artifact/7xuTH5ZMozXnB3w5Wa3WRW (downloads as PowerPoint or PDF)
- Results diagrams: https://claude.ai/artifact/7cH4e89QAiXjvaW2zWs3Ci

The files here are their sources, so the team keeps them if the links change:

- `deck.json` and `slides/`: the 6 slides in the Slides artifact format (cover, process before and after, what a person reads, real evidence from case inj2, independence rules, results).
- `results-page/index.html`: the diagrams page. It reads `verifier/results/per-case.json` through the dashboard runtime, so it only renders inside that artifact.

Every number on the slides comes from `verifier/results/`.
