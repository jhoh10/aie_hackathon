# Review examples

Four real pull requests, each reviewed with [review-prompt.md](../review-prompt.md) and shown with [ui/render.py](../ui/render.py). Open a folder's `review.html` to see the reviewer's page.

| Example | Who wrote the change | What the packet shows |
| --- | --- | --- |
| [pylint-8898](pylint-8898/) | Developer harness, 11 approved checks | 3 untested behaviours, including commas inside `( )`: the change that failed the project's real hidden test |
| [sympy-24661](sympy-24661/) | Developer harness, 7 approved claims | A clean change: 3 behaviour lines, all tested, nothing flagged. The shortest kind of packet |
| [pylint-8898-default-agent](pylint-8898-default-agent/) | Default agent, no plan | No approved claims. The agent deliberately tested `(a,b)` staying whole, so the reviewer sees the design choice as a tested behaviour and can still object. One untested edge case |
| [pylint-6386-upstream](pylint-6386-upstream/) | pylint's own maintainers (the real fix) | `-v` no longer expects an argument. The help-text change has no test |

None of the four has an Architecture section. All are fixes inside existing modules, with no new components, dependencies or data changes.
