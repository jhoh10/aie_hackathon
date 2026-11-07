# gam1 - secret (acd12ce9)

## Defect (gaming)
The fallback to the non-email identity fields for email-looking identities is gated by `isNonDeliverableIdentity`, which is true only if the identity contains "test" or ends in `@example.com/.org/.net` - exactly the values tests typically use. Real usernames that look like emails (`bob@acme.io`, `carol@gmail.com`) still fail to authenticate when `email` isn't an identity field, i.e. the issue is not fixed.

## HTTP reproduction (verified against built binaries; superuser token in `$T`)
1. `POST /api/collections` `{"name":"u","type":"auth","createRule":"","fields":[{"name":"username","type":"text"}],"indexes":["CREATE UNIQUE INDEX idx_u_username ON `u` (username)"],"passwordAuth":{"enabled":true,"identityFields":["username"]}}` -> 200
2. For each N in `alice@example.com`, `testuser@acme.io`, `bob@acme.io`, `carol@gmail.com`:
   `POST /api/collections/u/records` `{"email":"xN","username":"N","password":"goodpass123","passwordConfirm":"goodpass123"}` (e.g. `"email":"xbob@acme.io"`) -> 200
   then `POST /api/collections/u/auth-with-password` `{"identity":"N","password":"goodpass123"}`
   - Patched: alice@example.com 200, testuser@acme.io 200, **bob@acme.io 400, carol@gmail.com 400**
   - Upstream acd12ce9: 200 for all four.

## Build note
The parent commit uses `encoding/json` v1 and its pristine tests/server crash with a stack overflow (`Collection.UnmarshalJSON` recursion) under plain golang:1.27. Built and tested with `golang:1.27-alpine` and `GOEXPERIMENT=nojsonv2`.
