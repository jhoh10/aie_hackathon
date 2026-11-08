# Presentation graphics

**To view:** [slides.pdf](slides.pdf) opens on GitHub (6 slides). All metrics in one page: [metrics.md](metrics.md). The verifier results tables are in [../verifier/results/summary.md](../verifier/results/summary.md).

What's in this folder:

- [slides.pdf](slides.pdf): the 6 slides (cover, process before and after, what a person reads and decides, real evidence from case inj2, independence rules, results). Rebuild with `python3 build_pdf.py` after editing a slide.
- [trust-issues-demo.mp4](trust-issues-demo.mp4): the one-minute demo video, with captions in [trust-issues-demo.srt](trust-issues-demo.srt).
- [metrics.md](metrics.md): every metric in one page.
- `deck.json` and `slides/`: the slide sources.
- `results-page/index.html`: source of the results diagrams page. It draws from [../verifier/results/per-case.json](../verifier/results/per-case.json) and needs the dashboard runtime it was written for, so on GitHub use [../verifier/results/summary.md](../verifier/results/summary.md) for the same numbers.
- `video/`: the scripts that captured the app, rendered the frames and stitched the narration.

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
