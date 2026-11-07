# Testing catalog

In phase C the agent goes through **every category below** and, for each, decides: **include**, **skip** (with a one-line reason) or **ask**. This is how it avoids defaulting to "a few unit tests".

Each entry: what it proves, when the agent should suggest it, and common tools.

## How the agent chooses

Signals from phase B push categories in or out:

| Signal in the change | Suggest |
| --- | --- |
| Pure logic, calculations, parsing | Unit, property-based, mutation |
| Touches a database, queue or another service | Integration, contract, migration |
| Changes what a user sees | E2E, visual regression, screenshot, accessibility, cross-browser/device |
| Auth, payments, personal data | Security, permission matrix, audit logging |
| Public API or SDK | Contract, schema, backward compatibility |
| Hot path or large data | Performance, load, memory |
| Calls an LLM or ML model | LLM evals, golden outputs, cost/latency budget |
| Concurrency, retries, background jobs | Concurrency/race, idempotency, resilience |
| Bug fix | A regression test that reproduces the bug first |
| Infra or config change | Smoke test, config validation, deploy check |

---

## 1. Correctness of code

### Unit tests
- **Proves:** a single function or class gives the right output for given inputs.
- **Suggest when:** almost always, for any new logic.
- **Tools:** Jest, Vitest, pytest, Go test, JUnit.

### Integration tests
- **Proves:** pieces work together for real: code + database, code + queue, two services.
- **Suggest when:** the change reads or writes data, or crosses a module boundary.
- **Tools:** the unit runner plus Testcontainers / Docker Compose test DB.

### Property-based tests
- **Proves:** a rule holds for thousands of generated inputs, not just the handful you thought of ("encode then decode returns the original").
- **Suggest when:** parsers, serializers, math, sorting, anything with an invariant.
- **Tools:** fast-check, Hypothesis, QuickCheck.

### Fuzz tests
- **Proves:** random or malformed input doesn't crash or hang the code.
- **Suggest when:** code accepts untrusted input (file uploads, parsers, network protocols).
- **Tools:** Atheris, go-fuzz, libFuzzer, Jazzer.

### Mutation testing
- **Proves:** the tests themselves are strong: small bugs injected into the code get caught.
- **Suggest when:** critical logic, or to check that agent-written tests aren't hollow. Slow, so usually scoped to the changed files.
- **Tools:** Stryker, mutmut, PIT.

### Static checks: types and lint
- **Proves:** whole classes of bugs can't happen (wrong types, unused variables, unsafe patterns).
- **Suggest when:** always, as a cheap baseline; add stricter rules for new code.
- **Tools:** TypeScript `tsc --noEmit`, mypy, ESLint, Ruff, Clippy.

### Doc / example tests
- **Proves:** code examples in docs and READMEs actually run.
- **Suggest when:** libraries, SDKs, public APIs with examples.
- **Tools:** doctest, mdx tests, `cargo test --doc`.

---

## 2. Behaviour from the user's side

### End-to-end (E2E) tests
- **Proves:** a real user flow works in a real browser or app, front to back.
- **Suggest when:** any user-facing flow is added or changed.
- **Tools:** Playwright, Cypress, Detox / Maestro (mobile).

### Smoke tests
- **Proves:** the app starts and the most important pages/endpoints respond, after a deploy.
- **Suggest when:** every deployable change; very cheap.
- **Tools:** a few `curl` checks, a short Playwright script.

### Acceptance tests (BDD)
- **Proves:** behaviour described in business language ("Given... When... Then...") holds.
- **Suggest when:** a non-engineer stakeholder needs to read and agree on the checks.
- **Tools:** Cucumber, Gherkin + Playwright.

---

## 3. How it looks

### Visual regression tests
- **Proves:** the page looks the same as an approved baseline; flags pixel differences.
- **Suggest when:** UI changes, shared components, CSS refactors.
- **Tools:** Playwright `toHaveScreenshot`, Chromatic, Percy, Applitools.

### Screenshot tests (evidence)
- **Proves:** gives a human a picture of each state (empty, loading, error, success) to approve. Different from visual regression: the goal is review, not diffing.
- **Suggest when:** new UI. The screenshots go in the verification report.
- **Tools:** Playwright / Puppeteer screenshots, Storybook stories.

### Component snapshot tests
- **Proves:** a component's rendered output doesn't change unexpectedly.
- **Suggest when:** stable components; use sparingly (they're easy to blindly update).
- **Tools:** Jest snapshots, Storybook test runner.

### Cross-browser and device tests
- **Proves:** works in Safari, Firefox, Chrome, on phone and tablet sizes.
- **Suggest when:** user-facing web; ask which browsers and devices matter.
- **Tools:** Playwright projects, BrowserStack, iOS Simulator / Android Emulator.

### Responsive / layout tests
- **Proves:** nothing overflows, overlaps or gets cut off at common widths.
- **Suggest when:** layout or CSS changes.
- **Tools:** Playwright at multiple viewports, plus visual regression.

### Dark mode / theming
- **Proves:** the UI is readable in every theme.
- **Suggest when:** the app supports themes.
- **Tools:** visual regression with `prefers-color-scheme` emulated.

---

## 4. Who can use it

### Accessibility tests
- **Proves:** screen readers, keyboard-only users and low-vision users can use it (labels, contrast, focus order).
- **Suggest when:** any UI change.
- **Tools:** axe-core, Lighthouse, Pa11y; plus a keyboard-only E2E walk-through.

### Internationalization (i18n) tests
- **Proves:** long translations, right-to-left text, dates and currencies display correctly; no hard-coded strings.
- **Suggest when:** the app is translated or will be.
- **Tools:** pseudo-localization, visual regression in each locale.

---

## 5. Contracts between systems

### Contract tests
- **Proves:** a service and its callers agree on the request/response shape, so one can change without breaking the other.
- **Suggest when:** microservices, a frontend and backend deployed separately, third-party APIs.
- **Tools:** Pact, Spring Cloud Contract.

### API schema validation
- **Proves:** responses match the published OpenAPI / GraphQL / JSON schema.
- **Suggest when:** public or documented APIs.
- **Tools:** Schemathesis, Dredd, GraphQL schema checks.

### Backward compatibility tests
- **Proves:** old clients, old saved data and old URLs still work.
- **Suggest when:** changing a public API, file format, database schema or URL.
- **Tools:** run the previous version's client tests against the new server; replay recorded requests.

### Database migration tests
- **Proves:** migrations apply cleanly to a copy of real-shaped data, and roll back.
- **Suggest when:** any schema change.
- **Tools:** run migrate up/down against a seeded test DB.

---

## 6. Safety and security

### Security tests
- **Proves:** common attacks fail: injection, XSS, CSRF, broken auth, insecure direct object access.
- **Suggest when:** auth, input handling, file uploads, anything public.
- **Tools:** Semgrep, CodeQL (static); OWASP ZAP (dynamic); hand-written tests for each threat.

### Permission matrix tests
- **Proves:** each role can do exactly what it should, and nothing more.
- **Suggest when:** anything behind roles or ownership.
- **Tools:** a table-driven test: role × action → allowed / denied.

### Dependency and secret scanning
- **Proves:** no known-vulnerable packages and no committed secrets.
- **Suggest when:** new dependencies; always as a baseline.
- **Tools:** `npm audit`, Dependabot, Snyk, gitleaks, trufflehog.

### Privacy / data-handling tests
- **Proves:** personal data isn't logged, is deleted when it should be, and doesn't leak in responses.
- **Suggest when:** user data, compliance needs (GDPR, HIPAA).
- **Tools:** log assertions, response-field allowlists.

---

## 7. Speed and scale

### Performance tests
- **Proves:** an operation stays within a time budget ("search returns in under 200 ms at p95").
- **Suggest when:** hot paths, the engineer stated a budget in phase A.
- **Tools:** benchmark harnesses (Vitest bench, pytest-benchmark), Lighthouse for pages.

### Load and stress tests
- **Proves:** the system holds up under expected (load) and extreme (stress) traffic.
- **Suggest when:** endpoints with real traffic, launches.
- **Tools:** k6, Locust, Artillery.

### Bundle size / resource budgets
- **Proves:** the page doesn't get heavier than a set limit.
- **Suggest when:** frontend changes, new dependencies.
- **Tools:** size-limit, bundlesize, Lighthouse budgets.

### Memory and leak tests
- **Proves:** memory doesn't keep growing over time.
- **Suggest when:** long-running processes, caches, websockets.
- **Tools:** heap snapshots, Valgrind, soak tests.

---

## 8. Reliability

### Concurrency and race-condition tests
- **Proves:** two things happening at once don't corrupt data (double-submit, two workers on one job).
- **Suggest when:** shared state, background jobs, payments, counters.
- **Tools:** parallel test clients, database transaction tests, thread sanitizers.

### Idempotency tests
- **Proves:** running the same request twice has the same effect as once.
- **Suggest when:** retries, webhooks, payments, queue consumers.
- **Tools:** send the same request twice and assert one effect.

### Resilience / chaos tests
- **Proves:** the app degrades gracefully when a dependency is slow or down.
- **Suggest when:** external services (email, payments, LLM APIs).
- **Tools:** fault-injecting fakes, Toxiproxy, timeouts in tests.

### Observability checks
- **Proves:** the right logs, metrics and alerts fire, so problems are visible in production.
- **Suggest when:** new features that ops will need to debug.
- **Tools:** assertions on emitted logs/metrics in integration tests.

### Config and feature-flag tests
- **Proves:** the feature behaves correctly with the flag on and off, and bad config fails fast at startup.
- **Suggest when:** behind a flag, new environment variables.
- **Tools:** parametrized tests over flag states; config schema validation.

---

## 9. AI-specific checks

### LLM evals
- **Proves:** an LLM-powered feature gives acceptable answers across a fixed set of cases, scored by rules or a judge model.
- **Suggest when:** any prompt or model change.
- **Tools:** promptfoo, OpenAI Evals, Braintrust, custom LLM-as-judge.

### Golden output tests
- **Proves:** output for known inputs matches an approved "golden" file (good for generators, reports, LLM output with fixed seeds).
- **Suggest when:** generated text, code or files.
- **Tools:** approval testing (ApprovalTests), file-diff assertions.

### Cost and latency budgets
- **Proves:** a request stays under a token / dollar / time budget.
- **Suggest when:** features calling paid models.
- **Tools:** assertions on usage metadata in tests.

### Prompt-injection and safety tests
- **Proves:** malicious user input can't make the model ignore its instructions or leak data.
- **Suggest when:** user text reaches a model that can take actions.
- **Tools:** a fixed set of adversarial prompts as eval cases.

---

## 10. Human checks

Some things can't be automated well. The agent lists them in the plan as **manual** rows so they're not forgotten:

- Does the copy read well? Is the tone right?
- Does the email look right in real mail clients?
- Does the feature feel fast enough?
- Exploratory testing: a person clicking around trying to break it.
- Approving visual baselines the first time.

---

## Default sets

To keep phase C quick, the agent starts from a default set based on the kind of change, then adjusts:

| Kind of change | Default checks |
| --- | --- |
| Backend logic | Unit, integration, static checks, regression |
| New API endpoint | Unit, integration, contract/schema, security, permission matrix |
| New UI page or flow | Unit, E2E, visual regression, screenshots, accessibility, responsive |
| Bug fix | Failing regression test first, then unit/E2E as fits |
| Database change | Migration up/down, integration, backward compatibility |
| LLM feature | Evals, golden outputs, cost/latency budget, prompt-injection |
| Refactor (no behaviour change) | Existing suite must stay green; add characterization tests where coverage is thin |
