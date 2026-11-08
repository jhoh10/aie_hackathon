# Sponsors and their tools

Gathered from public docs on 2026-11-07. APIs in preview change fast, so check the official docs before relying on a model name or endpoint.

## Getting access and credits

Check the event details page, Discord and the kickoff first: sponsors often hand out credit codes there. Keys go in `.env`, never in the repo (it's public).

| Provider | How to get access | Free credits | Notes |
| --- | --- | --- | --- |
| Meta Model API | Self-serve signup via the [product page](https://developer.meta.com/ai/products/meta-model-api/) | Reportedly $20 per new account | US developers only during preview. Each teammate can sign up. Ask Meta on site for hackathon credits. Set a spending cap before running evals. |
| Google Gemini | Google AI Studio, "Get API key" | Free tier with rate limits | Some new accounts may start on a prepaid plan. Ask DeepMind on site. |
| Subquadratic (SubQ) | Waitlist form at [subq.ai](https://www.subq.ai/) | Unknown | Won't come through today. Ask their team on site. |
| Fetch.ai | Agentverse: sign in, generate key in profile. ASI:One: developer portal account | Unknown | Save the Agentverse key right away; it can't be shown again. |
| MongoDB | Atlas free tier | Free tier is enough | Nothing to apply for. |

## Meta Model API

The $5,000 prize is for the best use of this one.

- Product page: https://developer.meta.com/ai/products/meta-model-api/
- Docs (models list): https://ai.developer.meta.com/docs/models/
- Getting started blog post: https://developer.meta.com/ai/resources/blog/build-with-muse-spark/
- Serves the **Muse Spark** models (e.g. `muse-spark-1.1`, `muse-spark-1.2`). Multimodal input (text, image, video, audio, PDF), text output, about 1M token context, tool calling.
- OpenAI-compatible: base URL `https://api.meta.ai/v1`, so the OpenAI SDK works by swapping the base URL and key. Keys come from the Meta developer site.
- Public preview, US developers.
- Using it through LiteLLM: https://docs.litellm.ai/docs/providers/meta

## Google DeepMind

- Gemini API docs: https://ai.google.dev/gemini-api/docs

## MongoDB

- Atlas Vector Search overview: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/

## Subquadratic

- Introducing SubQ: https://subq.ai/introducing-subq
- Long-context model (they claim up to 12M tokens; the public API is reported at 1M). Pitched for loading a whole codebase in one pass instead of RAG.
- API access was waitlist-only in public reports, so ask the sponsor team on site about hackathon access.

## Fetch.ai

- Agentverse docs: https://docs.agentverse.ai/home
- Build a local agent with uAgents: https://docs.agentverse.ai/documentation/create-agents/local-agent-u-agent
- uAgents (Python library): https://github.com/fetchai/uAgents
