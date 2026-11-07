# PocketBase HTTP API reference (for writing black-box checks)

Base app is empty apart from a superuser and the built-in `users` auth collection and `_superusers`.
Auth: send the token in `Authorization`. The optional `Bearer ` prefix is allowed. Errors look like
`{"status":400,"message":"...","data":{"field":{"code":"validation_...","message":"..."}}}`.

## Collections (superuser only)
- `GET /api/collections`, `GET /api/collections/{idOrName}`
- `POST /api/collections`, body e.g.
  `{"name":"posts","type":"base","listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"","fields":[{"name":"title","type":"text"},{"name":"score","type":"number","min":0,"max":10,"onlyInt":false},{"name":"parent","type":"relation","collectionId":"<id>","maxSelect":1,"cascadeDelete":true}],"indexes":["CREATE INDEX idx_posts_title ON posts (title)"]}`
- `PATCH /api/collections/{idOrName}` updates; send `fields` as the full list, with existing field `id`s to keep them.
- `DELETE /api/collections/{idOrName}`
- A rule of `null` means superuser only, `""` means public, and an expression filters e.g. `@request.auth.id != ""`.
- Types: `base`, `auth`, `view`. A view needs `viewQuery`, e.g. `{"name":"v","type":"view","viewQuery":"SELECT id, title FROM posts"}`.
- Auth collections have `passwordAuth`: `{"enabled":true,"identityFields":["email","username"]}` and
  `oauth2`: `{"enabled":true,"providers":[{"name":"google","clientId":"x","clientSecret":"y"}]}`. Secrets are hidden in responses.
  Add a custom field such as `{"name":"username","type":"text"}` and a unique index on it to use it as an identity field.

## Records
- `GET /api/collections/{c}/records?filter=&sort=&expand=&fields=&page=&perPage=`
- `GET /api/collections/{c}/records/{id}`, `POST /api/collections/{c}/records`, `PATCH .../{id}`, `DELETE .../{id}`
- Auth collection records need `email`, `password`, `passwordConfirm`.

## Auth
- `POST /api/collections/{authCollection}/auth-with-password` with `{"identity":"...","password":"..."}` and optional `identityField`. Returns `{token, record}`.
- `GET /api/collections/_superusers/records`, a simple superuser-only endpoint.
- `POST /api/collections/{authCollection}/auth-refresh`, with the auth token.

## Settings (superuser only)
- `GET /api/settings`, `PATCH /api/settings`, e.g. `{"meta":{"appName":"x"},"smtp":{"enabled":true,"host":"h","port":25,"username":"u","password":"p"}}`. Secrets are hidden in responses.
- SMTP password can't be read back. `POST /api/settings/test/email` can't reach a mail server in this sandbox.

## Other
- `GET /api/health` is public. `POST /api/batch` runs multiple record requests when enabled in settings.
