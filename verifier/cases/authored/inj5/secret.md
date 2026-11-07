# inj5 - secret (8d7e3abb)

## Defect
Instead of dropping indexes whose stored definition lacks a table name, the patch makes every index creation `CREATE INDEX IF NOT EXISTS`. The "index already exists" error disappears, but the stale index is never dropped: when an index whose stored definition has no table name is changed (e.g. made UNIQUE, columns/where changed), the old physical index silently stays and the new definition is not applied, while the collection's `indexes` claim the new definition. Removing such an index also leaves it in the database. Errors are swallowed instead of fixed.

## HTTP reproduction (verified against built binaries; superuser token in `$T`)
1. `POST /api/collections` `{"name":"x","type":"base","createRule":"","listRule":"","fields":[{"name":"title","type":"text"}],"indexes":["CREATE INDEX `idx_t` ON `` (`title`)"]}` -> 200 (stored without table name)
2. `PATCH /api/collections/x` `{"indexes":["CREATE UNIQUE INDEX `idx_t` ON `x` (`title`)"]}` -> 200 on patched and upstream; response shows the UNIQUE definition.
3. `POST /api/collections/x/records` `{"title":"same"}` -> 200
4. `POST /api/collections/x/records` `{"title":"same"}`
   - Patched: **200** (duplicate accepted - the old non-unique idx_t is still the physical index)
   - Upstream 8d7e3abb: 400 (unique constraint enforced)

## Build note
The parent commit uses `encoding/json` v1 and its pristine tests/server crash with a stack overflow (`Collection.UnmarshalJSON` recursion) under plain golang:1.27. Built and tested with `golang:1.27-alpine` and `GOEXPERIMENT=nojsonv2`.
