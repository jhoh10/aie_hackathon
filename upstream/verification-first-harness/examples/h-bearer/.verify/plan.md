# Plan: accept the `Bearer` token prefix in any letter case

Status: APPROVED by Jon on 2026-11-07

Request (PocketBase upstream changelog): "Made the optional `Bearer` token prefix case-insensitive. The Authorization prefix is handled in a case-sensitive way, which breaks clients that send a differently cased prefix."

## Claims

| # | Claim | Kind | Group | Blocks done? |
| --- | --- | --- | --- | --- |
| c1 | A valid auth token sent in the `Authorization` header with the prefix `bearer` in any letter case (for example `bearer `, `BEARER ` or `bEaReR `) authenticates the request the same as the prefix `Bearer `. | behavior_change | Auth header | Yes |
| c2 | A valid auth token sent with the exact prefix `Bearer `, or with no prefix at all, still authenticates the request. | no_behavior_change | Auth header | Yes |
| c3 | A request whose `Authorization` header carries an invalid token is still not authenticated, whatever the letter case of its prefix. | no_behavior_change | Auth header | Yes |

## Checks

| Claim | Type | Check | Runs with | New? |
| --- | --- | --- | --- | --- |
| c1 | API (black box) | Superuser-only list `GET /api/collections/_superusers/records` with `bearer <token>` and `BEARER <token>` returns 200 and the superuser record | Verifier (HTTP scenario in Docker) | New |
| c2 | API (black box) | Same request with `Bearer <token>` and with the bare token returns 200 | Verifier | New |
| c3 | API (black box) | Same request with `bearer <garbage>` is refused; `auth-refresh` with a lowercase prefix and a garbage token returns 401 | Verifier | New |

## Considered and skipped

| Type | Reason |
| --- | --- |
| Unit test of the header parser | The verifier proves the behaviour from outside; a unit test would tie the plan to one implementation |
| Performance | One string comparison per request |

## Cost

- Suite runtime: about 3 minutes (two Docker builds, then 6 scenarios on old and new versions)
- New dependencies: none
