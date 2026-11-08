# Presentation graphics

**To view:** [slides.pdf](slides.pdf) opens on GitHub (6 slides). All metrics in one page: [metrics.md](metrics.md). The verifier results tables are in [../verifier/results/summary.md](../verifier/results/summary.md).

Editable originals on claude.ai. They are private to their owner's account until shared from each page's Share menu, so only the owner can open these links for now:

- Slide deck: https://claude.ai/artifact/7xuTH5ZMozXnB3w5Wa3WRW (downloads as PowerPoint or PDF)
- Results diagrams: https://claude.ai/artifact/7cH4e89QAiXjvaW2zWs3Ci

The files here are their sources, so the team keeps them if the links change:

- `deck.json` and `slides/`: the 6 slides in the Slides artifact format (cover, process before and after, what a person reads, real evidence from case inj2, independence rules, results).
- `results-page/index.html`: the diagrams page. It reads `verifier/results/per-case.json` through the dashboard runtime, so it only renders inside that artifact.

Every number on the slides comes from `verifier/results/`.

## Rebuilding the PDF

After changing `deck.json` or `slides/`, run `python3 presentation/build_pdf.py` (needs Google Chrome and a network connection for the fonts). It writes `slides.pdf`.

## Demo video

`trust-issues-demo.mp4`: 59.3 seconds, 1080p, narrated by Sebastian (his recording, sped up 1.19× with a pitch-preserving filter to fit the one-minute limit), with captions in `trust-issues-demo.srt`. It walks through the deployed claim review app (https://verify-first-claim-review.lovable.app): the developer approving claims, then the reviewer packet. It also shows a real recorded verifier run (case inj2) and the benchmark results, including where we fall short.

To rebuild it from this folder (needs ffmpeg, Google Chrome and macOS `say`):

```bash
node video/capture.mjs video/app                  # screenshots of the live app
python3 video/build.py slides trust-issues-demo.mp4  # renders frames (and a synthetic-voice version)
python3 video/stitch.py narration.wav trust-issues-demo.mp4  # puts a recorded narration under the frames
```

`video/timing.json` holds each scene's length, cut at the pauses in the recording, and the tempo. The narration text is in `video/script.json`.
