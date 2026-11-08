# Presentation graphics

**To view:** [slides.pdf](slides.pdf) opens on GitHub (6 slides). All metrics in one page: [metrics.md](metrics.md). The verifier results tables are in [../verifier/results/summary.md](../verifier/results/summary.md).

What's in this folder:

- [slides.pdf](slides.pdf): the 6 slides (cover, process before and after, what a person reads and decides, real evidence from case inj2, independence rules, results). Rebuild with `python3 build_pdf.py` after editing a slide.
- [trust-issues-demo.mp4](trust-issues-demo.mp4): the one-minute demo video, with captions in [trust-issues-demo.srt](trust-issues-demo.srt).
- [metrics.md](metrics.md): every metric in one page.
- [compare-brief.html](compare-brief.html): the recorded side-by-side page from Act 1 of the live demo (pylint-8898, run `brief2`). Default Claude Code vs the verification-first harness, with the engineer knowing the intent. Both sides pass the hidden test: the harness was corrected at plan time, and the default agent reworked after building. Its source is `sim/out/pylint-dev__pylint-8898/brief2/compare.html`.
- [metrics-talk.html](metrics-talk.html): five light slides (background, then the numbers) for a one-minute metrics pitch. Open in a browser; arrow keys or click to advance, `f` for fullscreen.
- [live-demo.md](live-demo.md): a runbook for Claude Code. Say "Run presentation/live-demo.md" and it runs default vs the developer harness live on pylint-8898, then the reviewer harness on the result, and opens both pages. About 3–4 minutes and $1.60 (rehearsed 2026-11-07); outputs go to the git-ignored `sim/out/<task>/live/`.
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
