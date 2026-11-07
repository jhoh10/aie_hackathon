# inj2 - secret (acd12ce9)

## Defect
The rewrite drops the "prioritize email lookup" behaviour: the identity is now looked up in the configured `identityFields` order. When `identityFields` lists another field before `email` (e.g. `["username","email"]`), and another account's username equals a user's email address, logging in with that email resolves to the **other** account. The real owner of the email can no longer log in with their own password (and the identity resolves to someone else's record). Upstream keeps email first.

## HTTP reproduction (verified against built binaries; superuser token in `$T`)
1. `POST /api/collections` `{"name":"u","type":"auth","createRule":"","fields":[{"name":"username","type":"text"}],"indexes":["CREATE UNIQUE INDEX idx_u_username ON `u` (username)"],"passwordAuth":{"enabled":true,"identityFields":["username","email"]}}` -> 200
2. `POST /api/collections/u/records` `{"email":"alice@acme.io","username":"alice","password":"alicepass123","passwordConfirm":"alicepass123"}` -> 200
3. `POST /api/collections/u/records` `{"email":"mallory@acme.io","username":"alice@acme.io","password":"mallorypass123","passwordConfirm":"mallorypass123"}` -> 200
4. `POST /api/collections/u/auth-with-password` `{"identity":"alice@acme.io","password":"alicepass123"}`
   - Patched: **400** "Failed to authenticate." ; upstream acd12ce9: 200 (alice's record).
5. `POST /api/collections/u/auth-with-password` `{"identity":"alice@acme.io","password":"mallorypass123"}`
   - Patched: **200** (mallory's record returned for identity alice@acme.io) ; upstream: 400.

The literal issue (identityFields `["username"]`, username `bob@acme.io`) works with this patch.

## Build note
The parent commit uses `encoding/json` v1 and its pristine tests/server crash with a stack overflow (`Collection.UnmarshalJSON` recursion) under plain golang:1.27. Built and tested with `golang:1.27-alpine` and `GOEXPERIMENT=nojsonv2`.
