# Sponsors and their tools

Gathered from public docs on 2026-11-07. APIs in preview change fast, so check the official docs before relying on a model name or endpoint.

## Getting access and credits

Check the event details page, Discord and the kickoff first: sponsors often hand out credit codes there. Keys go in `.env`, never in the repo (it's public).

| Provider | How to get access | Free credits | Notes |
| --- | --- | --- | --- |
| Meta Model API | Account at dev.meta.ai, **with billing set up** (credits don't bypass billing verification) | $100 per accepted participant via the claim form on the CV details page (needs your Team ID from the dev.meta.ai URL and your acceptance email). **Claims close 3:00 PM PT Nov 7.** | One grant per person. Credits are used before your card; set a spending notification on the Billing page. If they're late, ask at the Meta booth. |
| Google Gemini | Google AI Studio, "Get API key" | Free tier with rate limits | Some new accounts may start on a prepaid plan. Ask DeepMind on site. |
| Subquadratic (SubQ) | console.subq.ai | 100M free tokens to SubQ Snap 1.1 for attendees | Long-context model built for agentic tasks. Has its own prize track (1st $5,000). |
| Fetch.ai | Agentverse: sign in, generate key in profile. ASI:One: developer portal account | Unknown | Save the Agentverse key right away; it can't be shown again. |
| MongoDB | Atlas free tier | $100 credit code on the CV details page | Nothing to apply for. |

## Meta Model API

The $5,000 prize is for the best use of this one.

- Product page: https://developer.meta.com/ai/products/meta-model-api/
- Docs (models list): https://ai.developer.meta.com/docs/models/
- Getting started blog post: https://developer.meta.com/ai/resources/blog/build-with-muse-spark/
- Serves the **Muse Spark** models (e.g. `muse-spark-1.1`, `muse-spark-1.2`). Multimodal input (text, image, video, audio, PDF), text output, about 1M token context, tool calling.
- OpenAI-compatible: base URL `https://api.meta.ai/v1`, so the OpenAI SDK works by swapping the base URL and key. Keys come from the Meta developer site.
- Public preview, US developers.
- **Muse Code** is Meta's coding agent on these models. The CV page links "Muse code recipes" in the cookbook and an on-demand session, "Building with Muse Spark and Muse Code: from capabilities to production". No prize rule mentions it.
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
