| Task | Kind | Arm | Hidden tests | Cost | Time | Engineer replies | Words read |
|---|---|---|---|---|---|---|---|
| number | ambiguous | default | pass | $0.47 | 1.5 min | 0 | 157 |
| number | ambiguous | harness | pass | $1.23 | 1.8 min | 1 | 419 |
| onlyint | ambiguous | default | pass | $0.54 | 1.4 min | 0 | 200 |
| onlyint | ambiguous | harness | pass | $1.13 | 2.3 min | 1 | 350 |
| oauth | ambiguous | default | FAIL | $0.63 | 3.6 min | 0 | 242 |
| oauth | ambiguous | harness | pass | $2.87 | 5.9 min | 2 | 563 |
| idchars | ambiguous | default | FAIL | $0.54 | 2.8 min | 0 | 258 |
| idchars | ambiguous | harness | pass | $1.39 | 3.0 min | 1 | 446 |
| refresh | ambiguous | default | pass | $0.51 | 2.2 min | 0 | 277 |
| refresh | ambiguous | harness | pass | $1.24 | 2.5 min | 1 | 436 |
| redirect | ambiguous | default | pass | $0.64 | 1.5 min | 0 | 186 |
| redirect | ambiguous | harness | pass | $1.07 | 2.9 min | 1 | 376 |
| realtime | ambiguous | default | pass | $0.57 | 1.9 min | 0 | 204 |
| realtime | ambiguous | harness | pass | $1.24 | 2.5 min | 1 | 391 |
| bearer | control | default | pass | $0.58 | 1.7 min | 0 | 185 |
| bearer | control | harness | pass | $1.18 | 2.4 min | 1 | 394 |
| excerpt | control | default | pass | $0.33 | 0.3 min | 0 | 67 |
| excerpt | control | harness | pass | $0.93 | 1.4 min | 1 | 256 |
| cascade | control | default | FAIL | $0.74 | 3.2 min | 0 | 306 |
| cascade | control | harness | FAIL | $2.11 | 3.1 min | 1 | 475 |

| Kind | Arm | Passed | Total cost | Median time |
|---|---|---|---|---|
| ambiguous | default | 5 of 7 | $3.89 | 1.9 min |
| ambiguous | harness | 7 of 7 | $10.17 | 2.5 min |
| control | default | 2 of 3 | $1.66 | 1.7 min |
| control | harness | 2 of 3 | $4.22 | 2.4 min |

## Did the setup surface the open question?

Mark each yes or no by hand: did the agent ask about it, or decide it explicitly in its plan?

Marked by Claude for JH from the first agent message. Ambiguous tasks: harness 7 of 7, default 0 of 7 (default always decided in code and reported after; it got 2 of those decisions wrong).

### number / default

**Open question:** Does 0 mean 'unset' or a real limit, and do min and max get the same treatment?

**First agent message:**

> I fixed it: a number field with min 1 and max 0 now fails settings validation with an error on `max`. The full `core` test package and `go vet` pass.
> 
> **Cause:** in `ValidateSettings`, the min ≤ max check used ozzo-validation's `validation.Min(*f.Min)`. That rule skips "empty" values, and ozzo counts `0` as empty, so a max of 0 was never compared to min.
> 
> **Fix** (`core/field_number.go`): I replaced that rule with a small `checkMaxNotLessThanMin` validator that compares the two whenever both are set. It returns the same error ozzo did (`validation_min_greater_equal_than_required`, "must be no less than {{.threshold}}"), so the API error and the UI messages stay the same.
> 
> **Tests** (`core/field_number_test.go`): I added three cases to `TestNumberFieldValidateSettings`:
> - min 1, max 0 → error on `max`. This failed before the fix and passes now.
> - min -1, max 0 → valid.
> - min 0, max 0 → valid.
> 
> I haven't committed anything; the changes are only in the working tree.

**Surfaced it?** No. Decided it in code and reported it only after building (max 0 counts as a real limit).

### number / harness

**Open question:** Does 0 mean 'unset' or a real limit, and do min and max get the same treatment?

**First agent message:**

> # Plan: Fix number field settings so a `max` of 0 is checked against `min` (for example, min 1 with max 0 should give an error on `max`)
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | Saving the settings gives an error on `max` whenever max is 0 and min is greater than 0 (for example min 1 with max 0, or min 0.5 with max 0) | behavior_change | Yes |
> | c2 | A max of 0 is still accepted when min is not greater than max (min 0 with max 0, min -5 with max 0) and when no min is set | no_behavior_change | Yes |
> | c3 | The other settings checks behave as before. Min 2 with max 1 gives an error on `max`. Min 2 with max 2 is accepted. A decimal min or max still gives an error when "only integers" is on. Leaving min and max empty is still accepted | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | Unit | New cases in `TestNumberFieldValidateSettings` (`core/field_number_test.go`) that expect an error on `max` | New |
> | c2 | Unit | New cases in the same test that expect no errors | New |
> | c3 | Unit | The current cases in `TestNumberFieldValidateSettings` and the other `TestNumberField*` tests still pass | Existing |
> 
> Regression scope: `go test ./core -run TestNumberField` · baseline: all passed, none failed
> Skipped: UI and API end-to-end checks. The settings check runs entirely in `ValidateSettings`, so unit tests cover it.
> 
> Approve, or edit?

**Surfaced it?** Yes. Claims c1 and c2 decide that max 0 is a real limit checked against min, before any code.

### onlyint / default

**Open question:** Which expressions are 'known' to be integer-only (count, sum, total, which casts), and what happens when we can't tell?

**First agent message:**

> View collections now mark number fields as integer-only (`OnlyInt`) when the column can only hold integers. The full `core` package tests pass, including a new test for this. I haven't committed anything.
> 
> **What changed** (in `parseQueryToFields`, `core/view.go`):
> - **`count(...)` columns** are now integer-only. This works in any letter case, since matching already ignored case.
> - **`cast(... as int)` and `cast(... as integer)` columns** are now integer-only.
> - **Left as decimals:** `total(...)` (SQLite's `total()` always returns a float) and casts to `real`, `decimal` or `numeric`.
> - **Columns that point straight at a field in another collection** already kept that field's own setting, so they didn't need a change.
> 
> **Test:** `TestCreateViewFieldsNumberOnlyInt` in `core/view_test.go` checks the flag for each of these column kinds, including upper-case `COUNT(*)` and `CAST(... AS INTEGER)`. The existing view test only checked field types, which is why it never caught this. I didn't run the new test against the old code to watch it fail, but it expects `OnlyInt` to be true for the count and int columns, and that was false before.
> 
> **One limit:** other integer cast names such as `bigint` are still treated as decimals. The pattern that reads casts only accepts the type names listed above.

**Surfaced it?** No. Decided it in code and reported it only after building (count and int casts; total and real stay decimal).

### onlyint / harness

**Open question:** Which expressions are 'known' to be integer-only (count, sum, total, which casts), and what happens when we can't tell?

**First agent message:**

> # Plan: View query column → generated NumberField with `OnlyInt` set when the column can only hold integers
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | `count(...)` columns (any case, e.g. `COUNT(*)`) generate a number field with `OnlyInt: true` | behavior_change | Yes |
> | c2 | `cast(... as int)` and `cast(... as integer)` (any case/spacing, multiline) generate a number field with `OnlyInt: true` | behavior_change | Yes |
> | c3 | `total(...)` and `cast(... as real/decimal/numeric)` still generate number fields with `OnlyInt: false` (SQLite `total()` always returns a float) | no_behavior_change | Yes |
> | c4 | Field types for all existing view queries are unchanged, and a number field copied from a source collection keeps its original `OnlyInt` value | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1, c2, c3 | Unit | New table test in `core/view_test.go`: build a view from a query with `count(*)`, `COUNT(a.id)`, the int/integer casts (including multiline and mixed case), `total`, and the real/decimal/numeric casts; assert each field's `OnlyInt` matches what's expected | New |
> | c4 | Unit | Existing `TestCreateViewFields` and `TestSaveView` pass unchanged; the new test also checks that an aliased `demo1.number` keeps the source field's `OnlyInt` | Existing + New |
> 
> Regression scope: `go test ./core -run View` · baseline: 10 passed, 0 failed
> Skipped: API/UI tests. The dashboard

**Surfaced it?** Yes. Claims c1 to c3 list which expressions are integer-only and which stay decimal.

### oauth / default

**Open question:** Merge or replace? What identifies 'the same provider', and what happens to fields that weren't sent and to providers left out of the list?

**First agent message:**

> I fixed the bug: adding an OAuth2 provider no longer wipes the client secrets of the providers already configured. I reproduced it with a new test, and the full `./core` and `./apis` test packages pass with the fix.
> 
> **Cause:** The API never sends client secrets back to the client, so when the collection is saved again the existing providers come back with an empty `clientSecret`. When an update request is applied, the stored collection is overwritten with what was sent. The only thing that kept the old secrets was the JSON decoder filling the existing list entry at the same position. Once a new provider changes the order, the secrets end up on the wrong entries or are lost.
> 
> **Fix** (`Collection.UnmarshalJSON` in `core/collection_model.go`): before applying the request, it now records each existing provider's secret by provider name. Afterwards, any submitted provider with an empty `clientSecret` gets its old secret back, matched by name rather than position. A secret that is actually submitted still replaces the old one.
> 
> **Test:** `TestCollectionUnmarshalJSONPreserveOAuth2ClientSecrets` in `core/collection_model_test.go` puts a new provider first and changes the order of the existing ones. It checks that a provider sent without a secret keeps its old one and that a newly sent secret replaces the old one. It failed before the fix and passes now.
> 
> One side effect: a secret can't be cleared by sending it empty. That was already true before, since the secret is required anyway

**Surfaced it?** No. Decided it in code and reported it only after building (match by provider name). Failed the hidden tests.

### oauth / harness

**Open question:** Merge or replace? What identifies 'the same provider', and what happens to fields that weren't sent and to providers left out of the list?

**First agent message:**

> # Plan: collection update with providers that have no `clientSecret` → the existing secrets are kept
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | You update an auth collection and send its existing providers without `clientSecret` (the UI does this), plus a new provider with a secret. The update succeeds, every existing provider keeps its stored secret, and the new provider gets its own. | behavior_change | Yes |
> | c2 | Secrets are matched by provider name, not by position. Reordering providers, or inserting one before the existing ones, still leaves each provider with its own secret. | behavior_change | Yes |
> | c3 | A non-empty `clientSecret` that is sent explicitly replaces the stored one. A provider removed from the list stays removed. | no_behavior_change | Yes |
> | c4 | Collection JSON responses still hide the secrets, and the cached collection is not changed. The existing `TestCollectionSerialize*` tests pass without edits. | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | API | `TestCollectionUpdate` scenario: PATCH `users` with `gitlab` and `google` (no secret) plus `github` (with a secret). Expect 200. Then load the collection from the DB: gitlab and google still have `test2`, github has the new secret. | New |
> | c2 | Unit | `core` test: unmarshal JSON into the loaded `users` collection with providers reordered or inserted. Each provider name keeps its own secret

**Surfaced it?** Yes. Claims c2 and c3: match by name, a sent secret replaces the old one, removed providers stay removed.

### idchars / default

**Open question:** Which characters and names are forbidden, is it exact-match or substring for reserved names, and does it apply regardless of the configured pattern?

**First agent message:**

> I've tightened the record id check, so new ids that aren't safe as directory names are now rejected. `go vet` and the full `./core` test suite pass.
> 
> PocketBase already blocked `/` and `\` in new ids, whatever the collection's id pattern says. These still got through and are now rejected, with the existing `validation_pk_forbidden` error:
> 
> - **`.` and `..` as the whole id.** The record's file directory `<collection>/<id>` would then point at the collection directory itself or above it, so deleting or overwriting that record's files could hit other records.
> - **Control characters**, such as NUL or a newline.
> - **Characters Windows doesn't allow in names:** `: * ? " < > |`.
> - **A dot or space at the end**, such as `abc.`. Windows drops these silently, so two different ids could end up in the same directory.
> 
> Dots and spaces elsewhere in an id are still allowed: `a.b c` passes.
> 
> The changes are in `core/field_text.go`: a new `checkPKPathSafety` helper, called where the old forbidden-character loop was. I added test cases for each of the above to `core/field_text_test.go`.
> 
> - **Existing records:** the check only runs when a record is created. Records that already have one of these ids are still accepted, as before.
> - **Possible breakage:** apps with a loosened pattern that use any of these characters, such as `:` in ids like `user:123`, can no longer create records with those ids. If that's too strict, the Windows-only part (the reserved characters and the trailing dot or space) 

**Surfaced it?** No. Decided it in code and reported it only after building (its own forbidden list). Failed the hidden tests.

### idchars / harness

**Open question:** Which characters and names are forbidden, is it exact-match or substring for reserved names, and does it apply regardless of the configured pattern?

**First agent message:**

> # Plan: new record id with path-unsafe chars (loose pattern, e.g. `.*`) → `validation_pk_forbidden` error
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | A new record's primary key is rejected if it contains a control character (any 0x00–0x1F or 0x7F, e.g. NUL, `\n`, `\t`), even when the pattern allows anything | behavior_change | Yes |
> | c2 | A new record's primary key is rejected if it contains any Windows-reserved character `: * ? " < > \|` | behavior_change | Yes |
> | c3 | A new record's primary key is rejected if it is exactly `.` or `..`, or if it ends with `.` or a space | behavior_change | Yes |
> | c4 | These ids are still accepted with a loose pattern: `abc`, `a.b`, `a-b_c`, `a b`, `.abc`, unicode `ид123` | no_behavior_change | Yes |
> | c5 | `/` and `\` are still rejected in primary keys. None of the new characters are rejected in non-primary-key text fields. Records already saved with such ids still pass validation on update | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1–c3 | Unit | New table cases in `TestTextFieldValidateValue` (`core/field_text_test.go`): primary-key field with `Pattern: ".*"`, one case per bad id, expect an error | New |
> | c4 | Unit | Same table: the valid ids above, primary-key field with `Pattern: ".*"`, expect no error | New |
> | c5 | Unit | The existing `/`, `\` and non-primary-key cases still pass. New non-primary-key cases for `:`, `..` and

**Surfaced it?** Yes. Claims c1 to c5 spell out the forbidden characters and names; the engineer corrected the list.

### refresh / default

**Open question:** Should a nonrenewable token get refreshed, be returned as-is, or keep failing?

**First agent message:**

> Calling `/auth-refresh` with an impersonate token (or any token marked non-refreshable) no longer returns a 403. It now returns the current record data along with the **same token**, so clients that refresh on startup work again.
> 
> I didn't just treat these tokens as refreshable. Impersonate tokens are deliberately non-refreshable so they expire on schedule. If refresh issued a new token, an impersonate session could be kept alive forever. Sending back the original token keeps its expiry as it was.
> 
> **Changes**
> - `apis/record_auth_refresh.go`: the refreshable check no longer rejects the request; it just records whether the token can be refreshed. Refreshable tokens are handled as before and get a new token. Non-refreshable tokens skip creating a new token and return the current one with the record.
> - `apis/record_auth_refresh_test.go`: the existing "static/unrefreshable" test now expects a 200, the original token unchanged in the response, the record, and the auth hooks firing.
> 
> **Things to be aware of**
> - **This changes the API.** Anything relying on the 403 to spot an impersonate token will now get a 200. Clients can still tell by checking the `refreshable` claim in the token or by noticing the same token came back.
> - **Hooks now run for these tokens too.** The refresh and auth hooks (`OnRecordAuthRefreshRequest` and `OnRecordAuthRequest`) used to be skipped because the request was rejected first.
> - **A hook can swap the record.** If one replaces it, the response pairs the n

**Surfaced it?** No. Decided it in code and reported it only after building (return the same token), though it explained the choice well.

### refresh / harness

**Open question:** Should a nonrenewable token get refreshed, be returned as-is, or keep failing?

**First agent message:**

> # Plan: auth-refresh with impersonate (non-refreshable) token → 200 with fresh record + the same token
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | `POST /auth-refresh` with a valid non-refreshable token returns 200 with the current `record` (expand still works). This covers impersonate tokens, tokens with `refreshable:false` and tokens with no `refreshable` claim. The returned `token` is exactly the request token: no new or longer-lived token is created. | behavior_change | Yes |
> | c2 | A non-refreshable refresh still triggers the `OnRecordAuthRefreshRequest` and `OnRecordAuthRequest` hooks and is still checked against the collection auth rule. Example: an unverified record in an onlyVerified collection still gets 403. | behavior_change | Yes |
> | c3 | These stay as they are: <br>• refreshable tokens still get a newly created token <br>• the 401/403 cases (no auth, wrong collection, superuser on another collection) <br>• rate limits <br>• the transaction-error case | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | API scenario | In `TestRecordAuthRefresh`, the static-token case expects 200, `"token":"<same token>"` and the record id. A second case gets a token from `/impersonate/{id}`, refreshes with it and expects the same token back. | Changed existing + New |
> | c2 | API scenario | A static token for an unverified `clients` record → 403. The c1 case also asserts the ho

**Surfaced it?** Yes. Claim c1 decides to return the same token, with no new token created.

### redirect / default

**Open question:** Optional everywhere, optional per provider, or keep required with a default? Do the other fields stay required?

**First agent message:**

> `auth-with-oauth2` no longer rejects requests that leave out `redirectURL`. The OAuth2 tests in `./apis` pass and gofmt reports nothing.
> 
> **Changes:**
> - **`apis/record_auth_with_oauth2.go`**: I removed the `validation.Required` rule on `RedirectURL` and noted in the field comment that it's optional. With no `redirectURL`, the provider's redirect URL is set to an empty string and the token exchange runs as usual. If the old `redirectUrl` field is sent instead, it is still copied over.
> - **`apis/record_auth_with_oauth2_test.go`**:
>   - In the two form-validation cases, `redirectURL` is now in `NotExpectedContent`, so the tests check that it no longer produces a validation error.
>   - I added a new case, "existing linked OAuth2 (empty redirectURL)", which sends only `provider` and `code` and expects a successful login (200).
> - **`ui/src/apiPreview/docsAuthWithOAuth2.js`**: the API docs in the admin UI now list `redirectURL` as `(optional)`.
> 
> I didn't run the new test against the old code to watch it fail. It should, because the old Required rule would have returned a 400. Nothing is committed.
> 
> One unrelated thing I noticed: the same docs table lists `codeVerifier` as `(required)`, but the server treats it as optional. I left it alone.

**Surfaced it?** No. Decided it in code and reported it only after building (optional everywhere).

### redirect / harness

**Open question:** Optional everywhere, optional per provider, or keep required with a default? Do the other fields stay required?

**First agent message:**

> # Plan: `auth-with-oauth2` with no `redirectURL` → request accepted and the code is exchanged
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | A POST to `auth-with-oauth2` with a valid provider and code but no `redirectURL` (missing or `""`) returns 200 and an auth token instead of 400 | behavior_change | Yes |
> | c2 | When the request body is incomplete, the validation errors no longer list `redirectURL`. `provider` and `code` are still required | behavior_change | Yes |
> | c3 | A `redirectURL` that is sent (or the deprecated `redirectUrl`) still reaches the provider unchanged | no_behavior_change | Yes |
> | c4 | All existing `TestRecordAuthWithOAuth2*` scenarios (linking, user creation, MFA, events) behave as before | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | API scenario | New case in `apis/record_auth_with_oauth2_test.go`: test provider, no `redirectURL` → 200 with `"token":` | New |
> | c2 | API scenario | Update the two "trigger form validations" cases: `redirectURL` moves to `NotExpectedContent`, and `provider`/`code` are still expected | Changed |
> | c3 | API scenario | New case: send `redirectURL` and assert the mocked test provider received it, via `RedirectURL()` | New |
> | c4 | Regression | `go test ./apis/ -run TestRecordAuthWithOAuth2` | Existing |
> 
> Regression scope: `./apis/ -run TestRecordAuthWithOAuth2` · baseline: all passed, 0 failed
> Skipped: UI and JS SDK 

**Surfaced it?** Yes. Claims c1 and c2: optional everywhere, provider and code stay required.

### realtime / default

**Open question:** Who gets hidden fields in realtime (superusers only, or the record owner too), and does anything else in the event change?

**First agent message:**

> Fixed: superusers now get hidden fields in realtime events, the same as they do through the REST API. Regular users and guests still don't see them.
> 
> **Cause:** the REST API runs records through `autoResolveRecordsFlags` (`apis/record_helpers.go:442`). For a superuser, that function shows the hidden fields and skips the email visibility check. The realtime broadcast in `realtimeBroadcastRecord` builds its own copy of each record with `record.Fresh()` and never does this. It only handled email visibility for the record's owner or a manager in auth collections. So hidden fields were always left out of realtime messages, even for superusers.
> 
> **Fix** (`apis/realtime.go`, inside the enrich callback): if the subscribing client is a superuser, the record copy now shows all fields and ignores email visibility. That matches the REST behaviour. It runs before the `fields` filter, so `?fields=` still works on top of it.
> 
> **Test:** I added `TestRealtimeBroadcastHiddenFields` to `apis/realtime_test.go`. It sets up a collection with a hidden `secret` field and three subscribers: a superuser, a regular user and a guest. Only the superuser should receive `secret`. The test failed before the fix (the superuser got no `secret`) and passes after it. The whole `apis` test package passes, and `go vet` and `gofmt` report nothing.
> 
> I haven't committed anything.

**Surfaced it?** No. Decided it in code and reported it only after building (superusers only).

### realtime / harness

**Open question:** Who gets hidden fields in realtime (superusers only, or the record owner too), and does anything else in the event change?

**First agent message:**

> # Plan: realtime record event for a superuser subscriber → includes hidden fields (like REST)
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | A superuser client subscribed to a collection (`col/*` or `col/<id>`) gets create/update events where the record JSON includes the values of hidden fields | behavior_change | Yes |
> | c2 | Same for a superuser on an auth collection: hidden fields are present, and `email` is shown whatever `emailVisibility` is set to | behavior_change | Yes |
> | c3 | Subscribers who aren't superusers (guests and regular auth users) still don't get hidden fields in the same events | no_behavior_change | Yes |
> | c4 | Existing realtime behaviour (subscribe/connect, auth event handling, rule checks, the `fields`/`expand` options) stays the same: all 30 existing `TestRealtime*` tests still pass | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1, c3 | Unit | `TestRealtimeSuperuserHiddenFields` in `apis/realtime_test.go`: a base collection with a hidden text field and public list/view rules. Subscribe a superuser client, a regular user client and a guest client, save a record, and assert that only the superuser's payload has the hidden value | New |
> | c2 | Unit | Same test, auth-collection case: a hidden field plus `emailVisibility=false`. The superuser's payload has both the hidden field and `email` | New |
> | c4 | Regression | `go test ./apis -run TestRealtime` |

**Surfaced it?** Yes. Claims c1 to c3: superusers only; regular users and guests still don't get hidden fields.

### bearer / default

**Open question:** None to speak of; a clear fix.

**First agent message:**

> The `Bearer` prefix is now matched without regard to case, so `bearer` and `BEARER` work like `Bearer`. The new tests pass, and so does the full `apis` package test suite.
> 
> **The fix** (`apis/middlewares.go:208`, `getAuthTokenFromRequest`): it used to strip only the exact text `"Bearer "`. With any other casing the whole header value was treated as the token, which failed to validate, so the request was handled as a guest (401 on protected routes). It now checks the first 7 characters against `"Bearer "` ignoring case, then removes them. RFC 9110 defines auth schemes as case-insensitive, and the code comment now says so. Tokens sent with no prefix behave as before.
> 
> **Tests** (`apis/middlewares_test.go`, `TestRequireAuth`): there was no test for the prefix at all, so I added three cases with a valid token and the prefixes `Bearer `, `bearer ` and `BEARER `. Each expects a 200. I didn't run the new tests against the old code to watch them fail; with the old code, the lowercase and uppercase cases would have sent the whole header as the token and got a 401.
> 
> I haven't committed anything.

**Surfaced it?** n/a (control task, no open question).

### bearer / harness

**Open question:** None to speak of; a clear fix.

**First agent message:**

> # Plan: Authorization header "bearer"/"BEARER <token>" → token accepted like "Bearer <token>"
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | A valid token after `Bearer `, `bearer `, `BEARER ` or mixed case (`bEaReR `) authenticates the request (RequireAuth route → 200) | behavior_change | Yes |
> | c2 | A valid bare token with no prefix still authenticates. Expired or invalid tokens, with or without a prefix in any case, still return 401 | no_behavior_change | Yes |
> | c3 | A value that starts with "Bearer" but has no space before the token (`Bearer<token>`) is not stripped and still returns 401 | no_behavior_change | Yes |
> | c4 | The existing guest, superuser and auth-refresh middleware tests still pass | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | API scenario | New `TestRequireAuth` scenarios: valid user token with `Bearer `, `bearer `, `BEARER `, `bEaReR ` → 200 `test123` | New |
> | c2 | API scenario | Existing bare-token, expired and invalid scenarios, plus new `bearer <expired token>` → 401 | Existing + New |
> | c3 | API scenario | `Bearer<valid token>` (no space) → 401 | New |
> | c4 | Regression | `go test ./apis -run 'TestRequireAuth\|TestRequireGuestOnly\|TestRequireSuperuser\|TestRecordAuthRefresh'` | Existing |
> 
> Regression scope: `./apis` tests matching `TestRequireAuth|TestRequireGuestOnly|TestRequireSuperuser|TestRecordAuthRefresh` · baseline: 38 passed, 0 fail

**Surfaced it?** n/a (control task, no open question).

### excerpt / default

**Open question:** None to speak of; a clear fix.

**First agent message:**

> A negative `max` in `:excerpt(max)` is now rejected with the existing 'max argument must be > 0' error. The excerpt tests in `tools/picker` pass.
> 
> - **Fix:** in `tools/picker/excerpt_modifier.go:56`, the check was `max == 0`, so negative values got through. It is now `max <= 0`.
> - **Test:** I added a "negative max argument" case to `tools/picker/excerpt_modifier_test.go` that passes `"-1"` and expects an error.
> 
> I haven't committed anything.

**Surfaced it?** n/a (control task, no open question).

### excerpt / harness

**Open question:** None to speak of; a clear fix.

**First agent message:**

> # Plan: `:excerpt(max)` with negative max → error "max argument must be > 0"
> 
> Status: DRAFT
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | `newExcerptModifier` returns an error when `max` is negative (e.g. `"-1"`, `"-100"`, and also when a withEllipsis arg is given) | behavior_change | Yes |
> | c2 | These cases behave as before: no args, more than 2 args, `"0"` and non-numeric max still return an error. Positive max (`"1"`, `"12"`) is still accepted with any withEllipsis. `Modify` output doesn't change. | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | Unit | New scenarios in `TestNewExcerptModifier` (`"-1"`, `"-100"`, `"-5","true"`) expect an error | New |
> | c2 | Unit | Existing `TestNewExcerptModifier` + `TestExcerptModifierModify` scenarios, plus new boundary scenarios for `"0"` and `"1"` | Partly new |
> 
> Regression scope: `./tools/picker/` · baseline: all passed, 0 failed
> Skipped: integration/API tests. The check happens only inside the constructor, so unit tests are enough.
> 
> Approve, or edit?

**Surfaced it?** n/a (control task, no open question).

### cascade / default

**Open question:** Little; the expected behaviour is clear, the work is in the implementation.

**First agent message:**

> I fixed the cascade delete bug in `core/record_model.go`, and the full `core` and `apis` test suites pass.
> 
> **Cause:** the cascade loads a batch of child records first and then works through them one at a time. Each child deletion can trigger more nested deletes that change or remove records still waiting in that batch. With self-referencing relations, the code then worked from those out-of-date copies. Example with a multi-value `parents` relation set to cascade:
> 
> - `b → [a]`, `c → [a, b]`, `d → [c]`; then delete `a`.
> - The batch for `a` holds `[b, c]`. Deleting `b` runs a nested cascade that changes `c` to `[a]` in the database.
> - The outer loop then uses its old copy of `c` (`[a, b]`), removes `a`, and saves `[b]` over the newer value.
> - Result: `c` and `d` are left behind, and `c` points at a record that no longer exists. In other orders, the loop can also act on a record a nested delete already removed.
> 
> **Fix (in `deleteRefRecords`):** each child record is reloaded from the database just before it's handled. If it's already gone, it's skipped. If it no longer points at the record being deleted, it's also skipped. Otherwise the normal remove-the-reference or cascade-delete logic runs on the fresh copy.
> 
> The cost is one extra lookup per child record during a cascade. It's applied to every cascade, not only self-referencing collections, because the same staleness can happen through relation chains across collections.
> 
> **Tests added (in `core/record_model_test.go`):**
> - `Te

**Surfaced it?** n/a (control task, no open question).

### cascade / harness

**Open question:** Little; the expected behaviour is clear, the work is in the implementation.

**First agent message:**

> # Plan: nested self-referenced cascade delete → every descendant deleted, no error, no dangling refs
> 
> Status: DRAFT
> 
> Reproduced with a scratch test: collection `selfc` has a multi `rel` field (cascade) pointing at itself, with `a.rel=[p]`, `b.rel=[p,a]`, `a1.rel=[a]`. Deleting `p` returns nil, but `b` survives with `rel=[a]`, which points at the deleted `a`. Cause: `p`'s children are loaded as one batch before `a`'s nested cascade runs, so `b` is handled from stale data.
> 
> ## Claims
> 
> | # | Claim | Kind | Blocks done? |
> | --- | --- | --- | --- |
> | c1 | Deleting a root in a self-referenced cascade tree (single and multi `rel`, 3+ levels, siblings) returns nil and removes every descendant; unrelated records in the collection stay | behavior_change | Yes |
> | c2 | A child that references both the deleted root and a sibling that gets cascade-deleted (`b.rel=[p,a]`) is deleted too, not left with a dangling id | behavior_change | Yes |
> | c3 | A record that a nested cascade deletes while it is also in the outer batch (two self-rel fields: `a.rel1=p`, `b.rel1=p`, `b.rel2=a`) causes no error and is gone afterwards | behavior_change | Yes |
> | c4 | Existing behaviour stays the same: non-cascade refs are unset (not deleted), required non-cascade refs still block the delete, cross-collection cascade and 4000-row batching work as before | no_behavior_change | Yes |
> 
> ## Checks
> 
> | Claim | Type | Check | New? |
> | --- | --- | --- | --- |
> | c1 | Unit | `TestRecordDeleteSelfReferencedCascade` (core

**Surfaced it?** n/a (control task, no open question).
