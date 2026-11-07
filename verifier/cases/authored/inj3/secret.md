# inj3 - secret (d763d3df)

## Defect
`OAuth2Config.UnmarshalJSON` restores a missing `clientSecret` from the stored provider **at the same slice index**, not from the stored provider with the same `name`. It only works when the submitted list keeps the stored providers at their original positions (the literal "append a new provider" example). Any insert, removal or reorder shifts the indexes, so:
- a provider can inherit **another provider's** client secret (silent cross-provider secret mix-up; the wrong secret is sent to the wrong provider's token endpoint), or
- a provider at an index beyond the old list length gets no secret and the update fails with `clientSecret: validation_required`.

The upstream fix merges by provider `name`.

## HTTP reproduction (verified against a built binary; superuser token in `$T`)
1. Create an auth collection with two providers:
   `POST /api/collections` `{"name":"u","type":"auth","oauth2":{"enabled":true,"providers":[{"name":"gitlab","clientId":"id1","clientSecret":"sec_gitlab"},{"name":"google","clientId":"id2","clientSecret":"sec_google"}]}}` -> 200
2. Append a provider (literal issue case), others without secret:
   `PATCH /api/collections/u` `{"oauth2":{"providers":[{"name":"gitlab","clientId":"id1"},{"name":"google","clientId":"id2"},{"name":"apple","clientId":"id3","clientSecret":"sec_apple"}]}}` -> 200 (works)
3. Insert a new provider at the front, others without secret (what the issue is about in general):
   `PATCH /api/collections/u` `{"oauth2":{"providers":[{"name":"discord","clientId":"id4","clientSecret":"sec_discord"},{"name":"gitlab","clientId":"id1"},{"name":"google","clientId":"id2"},{"name":"apple","clientId":"id3"}]}}`
   - Patched: **400** `{"data":{"oauth2":{"providers":{"3":{"clientSecret":{"code":"validation_required"...}}}}}}` (and, before validation, gitlab got discord's slot secret, google got gitlab's, etc.)
   - Upstream fix (d763d3df): 200.

Secret swap variant (not verified end to end, follows from the code): with stored `[gitlab(sec_gitlab), google(sec_google)]`, `PATCH` providers `[{"name":"google","clientId":"id2"},{"name":"gitlab","clientId":"id1"}]` returns 200, but now google stores `sec_gitlab` and gitlab stores `sec_google`; OAuth2 logins with either provider then send the other provider's secret to the token URL.
