<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- `upstream/` is a read-only copy of the team repo (jhoh10/aie_hackathon); the app imports example plans from it with `?raw`, so refresh it from GitHub rather than editing it here.
- Fresh Claims Review uses typed source data and review/import logic in `src/data/`, with UI in `src/components/review/`; the legacy markdown parser stays in `src/lib/review/` so its existing consumers remain compatible.
- Render plan explanations through a bold-only text renderer, never arbitrary HTML, because imported plans are untrusted.
- Keep review state per plan in memory and guard browser preference storage; approval locks mutation controls to preserve verifier handoff integrity.
- Poll the public GitHub HTML with a completion-scheduled minute timer and validate data-only AST literals before atomic plan replacement; never execute upstream scripts, carry approvals onto changed plans, or overwrite locked handoffs.
- The reviewer workspace parses repository Markdown packets into typed rows and exports the harness review decision format; diff citations are secondary, feedback stays in memory, and changed remote packets never overwrite active feedback.
